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
import { BREAK_THRESHOLD, PUSHBACK } from './tunables.js';
import { applyPushback } from './blight.js';
import { addGrudge } from './shadowking-policy.js';
import { GRUDGE_PER_DK_KILL, GRUDGE_PER_FORGE_RECLAIM } from './tunables.js';

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
      events.push(...applyPushback(state, nodeId, PUSHBACK));

      // Add grudge (heroic action)
      events.push(...addGrudge(state, attackerIndex, GRUDGE_PER_DK_KILL, 'dk_kill'));

      // Voice line
      events.push({
        type: 'SK_VOICE_LINE',
        line: 'So. You draw the blade. Noted.',
        trigger: 'dk_killed',
      });

      // If this is a Forge, also pushback + grudge for reclaim
      const nodeDef = state.board.definition.nodes[nodeId];
      if (nodeDef?.tier === 'forge') {
        events.push(...addGrudge(state, attackerIndex, GRUDGE_PER_FORGE_RECLAIM, 'forge_reclaim'));
      }
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
  if (player.wounds < BREAK_THRESHOLD) return events; // Not enough wounds

  // Enter Broken state
  player.isBroken = true;
  player.brokenSince = state.round;
  player.brokenRoundsConsecutive = 0;
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
        nodeState.blightLevel = 3;
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
