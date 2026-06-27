/**
 * Combat System — sealed-commit card combat + Last Stand (§5.3).
 *
 * Deterministic base + concealed-choice uncertainty (judge) + opt-in gamble (40K).
 * No random target selection, no hidden dice.
 *
 * Flow:
 *   1. Attacker + defender each commit cards (sealed) → combat power
 *   2. Reveal simultaneously, discard committed cards
 *   3. Winner = higher power (ties → defender, except STRIKE vs SK → no-result)
 *   4. Margin = |atk - def| → drives capture-margin election (§5.2, built in 3d)
 *   5. If defender would lose a stronghold, they may Last Stand (one-sided, final)
 *
 * Last Stand (§5.3):
 *   - One-sided: only the defender commits additional cards (no attacker re-raise)
 *   - Final: the result stands after the Stand
 *   - Win → hold node + destroy DK / pushback. Lose → node falls, cards gone.
 */

import type { GameEvent } from './events.js';
import type { GameState } from './types.js';
import { FORGE_WEIGHT, getTunables } from './tunables.js';
import { applyPushback } from './blight.js';
import { addGrudge } from './shadowking-policy.js';
import { flipDiscoveryToken } from './discovery.js';

// ─── Territory standing (Stage 5-dark) ────────────────────────────

/**
 * Living owned production for a seat (Forges weighted) — the single source of
 * truth shared with `computeCrownHolder` / `computeTerritoryWinner`.
 */
function productionOf(state: GameState, seat: number): number {
  let t = 0;
  for (const [id, ns] of Object.entries(state.board.state.nodes)) {
    if (ns.owner !== seat || ns.ashed) continue;
    const tier = state.board.definition.nodes[id]?.tier;
    if (tier === 'forge') t += FORGE_WEIGHT;
    else if (tier === 'keep' || tier === 'holding') t += 1;
  }
  return t;
}

/**
 * Count a seat's living strongholds (§6, §12 #14): any owned, non-ashed PRODUCTION node
 * (Keep / Forge / Holding). A Warlord with zero strongholds is `deposed` and eliminated
 * at Dawn (§6). Unweighted — this is a survival census, not a standing score. Pure.
 */
export function livingStrongholdCount(state: GameState, seat: number): number {
  let n = 0;
  for (const [id, ns] of Object.entries(state.board.state.nodes)) {
    if (ns.owner !== seat || ns.ashed) continue;
    const tier = state.board.definition.nodes[id]?.tier;
    if (tier === 'forge' || tier === 'keep' || tier === 'holding') n++;
  }
  return n;
}

/**
 * 0-based territory rank of a player (0 = leader). A player ranks ahead of another
 * with more production, or equal production and a lower seat index (matches the
 * §7.6 tiebreak). Eliminated players sink to the bottom (forfeit standing). Pure.
 *
 * Used by the asymmetric grudge Mark: only the leading seats pay the "the dark
 * now hunts you" tax for wounding it; trailing seats hunt for free (catch-up).
 */
export function territoryRank(state: GameState, playerIndex: number): number {
  const meGone = state.players[playerIndex]?.isEliminated === true;
  const mine = meGone ? -1 : productionOf(state, playerIndex);
  let rank = 0;
  for (const p of state.players) {
    if (p.index === playerIndex) continue;
    const theirs = p.isEliminated ? -1 : productionOf(state, p.index);
    if (theirs > mine || (theirs === mine && p.index < playerIndex)) rank++;
  }
  return rank;
}

// ─── Types ────────────────────────────────────────────────────────

export type CombatType = 'RAID' | 'STRIKE';

export interface CombatSetup {
  /** The type of combat (RAID = vs rival, STRIKE = vs SK). */
  combatType: CombatType;
  /** Index of the attacking player. */
  attackerIndex: number;
  /** Node where combat occurs. */
  nodeId: string;
  /** Cards the attacker commits (card power values from hand). */
  attackerCards: number[];
  /** Cards the defender commits (card power values from hand). For STRIKE, this is 0. */
  defenderCards: number[];
  /** Index of the defending player (for RAID). null for STRIKE. */
  defenderIndex: number | null;
}

export interface CombatResult {
  /** Who won: 'attacker' | 'defender' | 'no_result' (STRIKE tie). */
  winner: 'attacker' | 'defender' | 'no_result';
  /** Total attack power. */
  attackPower: number;
  /** Total defense power. */
  defensePower: number;
  /** Absolute margin (damage to loser). */
  margin: number;
  /** Whether a Last Stand is available (defender may commit more cards). */
  lastStandAvailable: boolean;
  /** Events produced. */
  events: GameEvent[];
}

export interface LastStandResult {
  /** Who won after the Last Stand. */
  winner: 'attacker' | 'defender';
  /** Final attack power (unchanged from initial). */
  attackPower: number;
  /** Final defense power (initial + last stand cards). */
  defensePower: number;
  /** Final margin. */
  margin: number;
  /** Events produced. */
  events: GameEvent[];
}

// ─── Combat Resolution ───────────────────────────────────────────

/**
 * Calculate base piece power for a player at a node — the sum of every court piece
 * they have there (§2): Warlord/Marshal (high combat), Steward (low), Herald (none).
 * Each on-board `Piece` carries its archetype power (`archetypePower`, court.ts).
 */
export function getPlayerPowerAtNode(state: GameState, playerIndex: number, nodeId: string): number {
  let power = 0;
  const nodeState = state.board.state.nodes[nodeId];
  if (!nodeState) return 0;

  for (const piece of nodeState.pieces) {
    if (piece.owner === playerIndex) {
      power += piece.power;
    }
  }

  // Political stance (§ Herald): a recruited Herald is "a fighter off the board" —
  // the player fights weaker. Only bites when it actually has a piece here.
  if (power > 0) {
    power = Math.max(0, power - (state.players[playerIndex]?.combatPenalty ?? 0));
  }

  return power;
}

/**
 * Calculate Shadowking force power at a node.
 */
export function getShadowkingPowerAtNode(state: GameState, nodeId: string): number {
  let power = 0;
  const nodeState = state.board.state.nodes[nodeId];
  if (!nodeState) return 0;

  for (const skForce of nodeState.shadowkingForces) {
    power += skForce.power;
  }

  return power;
}

/**
 * Resolve combat between an attacker and a defender.
 *
 * @param setup — combat parameters (who, where, committed cards)
 * @returns CombatResult with winner, margin, and whether Last Stand is available
 */
export function resolveCombat(state: GameState, setup: CombatSetup): CombatResult {
  const events: GameEvent[] = [];
  const { combatType, attackerIndex, nodeId, attackerCards, defenderCards, defenderIndex } = setup;

  // Calculate power
  const basePowerAtk = getPlayerPowerAtNode(state, attackerIndex, nodeId);
  const cardPowerAtk = attackerCards.reduce((sum, v) => sum + v, 0);
  const attackPower = basePowerAtk + cardPowerAtk;

  let defensePower: number;
  if (combatType === 'STRIKE') {
    // STRIKE vs Shadowking — SK forces defend
    defensePower = getShadowkingPowerAtNode(state, nodeId);
  } else {
    // RAID vs rival
    const basePowerDef = defenderIndex !== null
      ? getPlayerPowerAtNode(state, defenderIndex, nodeId)
      : 0;
    const cardPowerDef = defenderCards.reduce((sum, v) => sum + v, 0);
    defensePower = basePowerDef + cardPowerDef;
  }

  // Determine winner
  let winner: 'attacker' | 'defender' | 'no_result';
  if (attackPower > defensePower) {
    winner = 'attacker';
  } else if (attackPower < defensePower) {
    winner = 'defender';
  } else {
    // Tie resolution per spec:
    //   RAID (rival): ties → defender wins
    //   STRIKE (vs SK): ties → no-result, cards returned (P1/A5)
    winner = combatType === 'STRIKE' ? 'no_result' : 'defender';
  }

  const margin = Math.abs(attackPower - defensePower);

  // Last Stand is available if:
  //   - Defender lost
  //   - This is a stronghold (the node is owned by defender or is a Forge/Keep)
  //   - Defender has cards remaining in hand
  const nodeDef = state.board.definition.nodes[nodeId];
  const nodeState = state.board.state.nodes[nodeId];
  const isStronghold = nodeDef && (
    nodeDef.tier === 'keep' ||
    nodeDef.tier === 'forge' ||
    (nodeState && nodeState.owner !== null)
  );

  const defenderHasCards = combatType === 'RAID' && defenderIndex !== null
    ? state.players[defenderIndex].hand.length > defenderCards.length
    : false;

  const lastStandAvailable = winner === 'attacker' && isStronghold && defenderHasCards;

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex: attackerIndex,
    action: combatType,
    details: {
      nodeId,
      attackPower,
      defensePower,
      winner,
      margin,
      lastStandAvailable,
      defenderIndex,
    },
  });

  return {
    winner,
    attackPower,
    defensePower,
    margin,
    lastStandAvailable,
    events,
  };
}

/**
 * Choose an attacker's combat commit deterministically and by VALUE (§5.3).
 *
 * Pre-4g the engine auto-committed `hand[0]` — so combat strength was whatever the
 * first card in hand-order happened to be (draw-order noise that biased every
 * combat metric). This commits the FEWEST highest-value cards needed to exceed
 * `targetPower` from `basePower` (a real win), capped at `maxCards`; if it can't
 * win, it commits the single best card (always put up a fight, never dump the
 * hand) — or nothing if already winning on base power alone (save cards).
 */
export function chooseCombatCommit(
  hand: readonly number[],
  basePower: number,
  targetPower: number,
  maxCards: number,
): number[] {
  if (hand.length === 0) return [];
  const sorted = [...hand].sort((a, b) => b - a);
  const need = targetPower - basePower + 1; // strictly exceed to win
  if (need <= 0) return []; // already winning on pieces — no cards needed

  const chosen: number[] = [];
  let sum = 0;
  for (const c of sorted) {
    if (sum >= need || chosen.length >= maxCards) break;
    chosen.push(c);
    sum += c;
  }
  if (sum >= need) return chosen;
  return [sorted[0]]; // can't win — commit the best single card, not the whole hand
}

/**
 * Decide the defender's Last Stand cards (§5.3) — deterministic, pure `f(state)`.
 *
 * The defender commits the FEWEST additional cards (largest first) needed to
 * survive (def + committed ≥ atk; ties go to the defender). If their remaining
 * hand can't reach it, they commit nothing rather than waste the cards. This is
 * what makes Last Stand actually fire in real games and the sim. [TUNABLE behaviour]
 */
export function chooseLastStandCards(
  state: GameState,
  defenderIndex: number,
  attackPower: number,
  defensePower: number,
  committedCards: number[],
): number[] {
  const defender = state.players[defenderIndex];

  // Cards still in hand (excluding those already committed to this combat).
  const remaining = [...defender.hand];
  for (const c of committedCards) {
    const i = remaining.indexOf(c);
    if (i !== -1) remaining.splice(i, 1);
  }

  const needed = attackPower - defensePower; // > 0 because the attacker won
  if (needed <= 0) return [];

  const sorted = [...remaining].sort((a, b) => b - a);
  const chosen: number[] = [];
  let sum = 0;
  for (const c of sorted) {
    if (sum >= needed) break;
    chosen.push(c);
    sum += c;
  }
  // Only stand if it actually reverses the result.
  return sum >= needed ? chosen : [];
}

/**
 * Resolve a Last Stand — defender commits additional cards (one-sided, final).
 */
export function resolveLastStand(
  originalResult: CombatResult,
  lastStandCards: number[],
): LastStandResult {
  const events: GameEvent[] = [];

  const newDefensePower = originalResult.defensePower + lastStandCards.reduce((s, v) => s + v, 0);
  const winner: 'attacker' | 'defender' = originalResult.attackPower > newDefensePower
    ? 'attacker'
    : 'defender'; // Ties go to defender in Last Stand too

  const margin = Math.abs(originalResult.attackPower - newDefensePower);

  return {
    winner,
    attackPower: originalResult.attackPower,
    defensePower: newDefensePower,
    margin,
    events,
  };
}

// ─── Combat Outcome Application ──────────────────────────────────

/**
 * Apply combat outcome to state: card discard, pushback, grudge, etc.
 *
 * For RAID: the loser only forfeits committed cards (Broken Court retired §8 — no
 *           wounds; node transfer + capture/rout election handled by the caller / 3d).
 * For STRIKE: if attacker wins, destroy SK force + pushback + grudge.
 *             if no_result (tie), return cards.
 */
export function applyCombatOutcome(
  state: GameState,
  setup: CombatSetup,
  winner: 'attacker' | 'defender' | 'no_result',
): GameEvent[] {
  const events: GameEvent[] = [];
  const { combatType, attackerIndex, nodeId, defenderIndex, attackerCards, defenderCards } = setup;

  if (combatType === 'STRIKE') {
    // Discard attacker's committed cards
    const attacker = state.players[attackerIndex];
    for (let i = 0; i < attackerCards.length; i++) {
      const idx = attacker.hand.indexOf(attackerCards[i]);
      if (idx !== -1) attacker.hand.splice(idx, 1);
    }

    if (winner === 'attacker') {
      // Destroy SK force at this node + pushback + grudge
      const nodeState = state.board.state.nodes[nodeId];
      if (nodeState) {
        // Remove the first SK force
        const removedForce = nodeState.shadowkingForces.shift();
        if (removedForce) {
          // Also remove from the global forces array
          const globalIdx = state.shadowking.forces.findIndex(f => f.id === removedForce.id);
          if (globalIdx !== -1) state.shadowking.forces.splice(globalIdx, 1);
        }
      }

      // Pushback Blight on this node
      events.push(...applyPushback(state, nodeId, getTunables().PUSHBACK));

      // Spoils of the breach (Stage 5-dark): clearing the dark off an unclaimed,
      // living Holding/Forge CLAIMS it for free — heroism paid in the win currency.
      // (The claim is what makes hunting rational; without it a player would just
      //  claim around the DK. The forcing function — DKs block CLAIM — lives in
      //  executeClaim, so the kill is the only way to take a DK-held node.)
      const nodeDef = state.board.definition.nodes[nodeId];
      const clearedNode = state.board.state.nodes[nodeId];
      if (
        getTunables().DK_KILL_CLAIMS_NODE &&
        clearedNode && nodeDef &&
        (nodeDef.tier === 'holding' || nodeDef.tier === 'forge') &&
        !clearedNode.ashed && clearedNode.owner === null &&
        clearedNode.shadowkingForces.length === 0
      ) {
        clearedNode.owner = attackerIndex;
        events.push({
          type: 'PLAYER_ACTED',
          playerIndex: attackerIndex,
          action: 'CLAIM',
          details: { nodeId, tier: nodeDef.tier, viaDkKill: true },
        });
        // Acquiring a Holding this way still FLIPS its face-down Discovery token (§5.1) —
        // an owned Holding must never linger with an unrevealed token (the token sits UNDER
        // the node, distinct from the guardian DK just cleared). No-op for a Forge.
        events.push(...flipDiscoveryToken(state, attackerIndex, nodeId));
      }

      // Asymmetric grudge Mark (Stage 5-dark): only the LEADING seats pay the "the
      // dark now hunts you" tax for wounding it — trailing seats hunt for free. This
      // makes dark-engagement a catch-up lever and keeps "leading is dangerous" honest.
      if (territoryRank(state, attackerIndex) < getTunables().GRUDGE_MARK_TOP_N) {
        events.push(...addGrudge(state, attackerIndex, getTunables().GRUDGE_PER_DK_KILL, 'dk_kill'));
        // If this is a Forge, also grudge for the reclaim (same standing gate).
        if (nodeDef?.tier === 'forge') {
          events.push(...addGrudge(state, attackerIndex, getTunables().GRUDGE_PER_FORGE_RECLAIM, 'forge_reclaim'));
        }
      }

      // Voice line
      events.push({
        type: 'SK_VOICE_LINE',
        line: 'So. You draw the blade. Noted.',
        trigger: 'dk_killed',
      });
    } else if (winner === 'no_result') {
      // Tie vs SK: cards returned (P1/A5)
      // Cards already discarded above — re-add them
      const attacker2 = state.players[attackerIndex];
      attacker2.hand.push(...attackerCards);
    }
    // Defender (SK) wins → the attacker simply loses the committed cards (no wounds:
    // Broken Court is retired §8; land-strip/capture pressure arrives in 3d).
  } else {
    // RAID — PvP combat
    // Discard committed cards from both sides
    const attacker = state.players[attackerIndex];
    for (let i = 0; i < attackerCards.length; i++) {
      const idx = attacker.hand.indexOf(attackerCards[i]);
      if (idx !== -1) attacker.hand.splice(idx, 1);
    }

    if (defenderIndex !== null) {
      const defender = state.players[defenderIndex];
      for (let i = 0; i < defenderCards.length; i++) {
        const idx = defender.hand.indexOf(defenderCards[i]);
        if (idx !== -1) defender.hand.splice(idx, 1);
      }
    }
    // No wounds on a RAID loss (Broken Court retired, §8). The node transfer toward
    // depose pressure is applied by the caller (executeRaid); capture/rout election
    // arrives in 3d (§5.2).
  }

  return events;
}
