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
 *   4. Margin = |atk - def| → loser takes wounds toward Broken
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
import { GRUDGE_PER_DK_KILL, GRUDGE_PER_FORGE_RECLAIM } from './tunables.js';

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
 * 0-based territory rank of a player (0 = leader). A player ranks ahead of another
 * with more production, or equal production and a lower seat index (matches the
 * §7.6 tiebreak). Broken players sink to the bottom (forfeit standing). Pure.
 *
 * Used by the asymmetric grudge Mark: only the leading seats pay the "the dark
 * now hunts you" tax for wounding it; trailing seats hunt for free (catch-up).
 */
export function territoryRank(state: GameState, playerIndex: number): number {
  const meBroken = state.players[playerIndex]?.isBroken === true;
  const mine = meBroken ? -1 : productionOf(state, playerIndex);
  let rank = 0;
  for (const p of state.players) {
    if (p.index === playerIndex) continue;
    const theirs = p.isBroken ? -1 : productionOf(state, p.index);
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
 * Calculate base piece power for a player at a node.
 * Warlord + any retinue pieces present.
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
 * Apply combat outcome to state: wounds, pushback, grudge, etc.
 *
 * For RAID: loser takes `margin` wounds toward Broken.
 * For STRIKE: if attacker wins, destroy SK force + pushback + grudge.
 *             if no_result (tie), return cards.
 */
export function applyCombatOutcome(
  state: GameState,
  setup: CombatSetup,
  winner: 'attacker' | 'defender' | 'no_result',
  margin: number,
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
      }

      // Asymmetric grudge Mark (Stage 5-dark): only the LEADING seats pay the "the
      // dark now hunts you" tax for wounding it — trailing seats hunt for free. This
      // makes dark-engagement a catch-up lever and keeps "leading is dangerous" honest.
      if (territoryRank(state, attackerIndex) < getTunables().GRUDGE_MARK_TOP_N) {
        events.push(...addGrudge(state, attackerIndex, GRUDGE_PER_DK_KILL, 'dk_kill'));
        // If this is a Forge, also grudge for the reclaim (same standing gate).
        if (nodeDef?.tier === 'forge') {
          events.push(...addGrudge(state, attackerIndex, GRUDGE_PER_FORGE_RECLAIM, 'forge_reclaim'));
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
    } else {
      // Defender (SK) wins — attacker takes wounds
      const attacker2 = state.players[attackerIndex];
      attacker2.wounds += margin;
    }
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

    // Loser takes wounds
    const loserIndex = winner === 'attacker' ? defenderIndex : attackerIndex;
    if (loserIndex !== null) {
      const loser = state.players[loserIndex];
      loser.wounds += margin;
    }
  }

  return events;
}

/**
 * Check if a player should enter Broken state after accumulating wounds.
 * Returns events produced (including NODE_ASHED for lost Holdings).
 */
export function checkBrokenState(state: GameState, playerIndex: number): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];

  if (player.isBroken) return events; // Already Broken
  if (player.wounds < getTunables().BREAK_THRESHOLD) return events; // Not enough wounds

  // Enter Broken state
  player.isBroken = true;
  player.brokenSince = state.round;
  player.brokenRoundsConsecutive = 0;

  // Dissolve any Oath this player held (§ Oaths): a Broken lord can't honor a pact —
  // stops the Dawn fealty dividend leaking to a downed player and frees the ally to
  // act (no raid-shield by a corpse-state ally). Inline to avoid an actions↔combat cycle.
  state.oaths = state.oaths.filter(o => o.a !== playerIndex && o.b !== playerIndex);
  player.crownHeld = false; // Forfeit Crown eligibility (P1 anti-exploit)

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'PASS',
    details: { broken: true, round: state.round },
  });

  // Voice line
  events.push({
    type: 'SK_VOICE_LINE',
    line: `Player ${playerIndex + 1} falls. Their lands feed my hunger now.`,
    trigger: 'player_broken',
  });

  // Broken player's lost Holdings turn to ash (§5.4)
  for (const [nodeId, nodeState] of Object.entries(state.board.state.nodes)) {
    if (nodeState.owner === playerIndex && !nodeState.ashed) {
      const nodeDef = state.board.definition.nodes[nodeId];
      // Holdings owned by the broken player ash immediately
      // Keeps cannot be ashed until owner is Broken — now they can be targeted
      if (nodeDef && nodeDef.tier === 'holding') {
        const prevOwner = nodeState.owner;
        nodeState.ashed = true;
        nodeState.blightLevel = getTunables().BLIGHT_TO_ASH;
        nodeState.owner = null;
        events.push({
          type: 'NODE_ASHED',
          nodeId,
          previousOwner: prevOwner,
        });
      }
    }
  }

  return events;
}
