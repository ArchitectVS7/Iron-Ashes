/**
 * Actions — real implementations for the ACTION phase (§4.3).
 *
 * Each action validates legality against current state, applies its
 * effects, and returns events. All actions route through the reducer.
 *
 * Actions:
 *   MARCH   — move a piece 1 node (cost 1 banner, extra if ashed node)
 *   CLAIM   — claim current unclaimed Holding/Forge (cost 1 banner)
 *   RAID    — initiate combat vs a co-located rival (§5.3)
 *   STRIKE  — initiate combat vs a co-located Shadowking force (§5.3)
 *   RESCUE  — un-Break a co-located/adjacent ally (§5.4)
 *   RECRUIT — recruit a retinue piece (stub for now)
 *   PASS    — end actions early
 *
 * Zone-of-Control (P0-2): enemy entering a held Approach must STRIKE/RAID
 * to pass — no free march-through.
 */

import type { GameEvent } from './events.js';
import type { GameState } from './types.js';
import {
  ASHED_TRAVERSE_EXTRA_COST,
  BREAK_THRESHOLD,
  BROKEN_MAX_ROUNDS,
  RESCUE_COST,
  RESCUE_DEBT_MIN_PLEDGE,
  WARLORD_POWER,
} from './tunables.js';
import {
  applyCombatOutcome,
  checkBrokenState,
  chooseLastStandCards,
  resolveCombat,
  resolveLastStand,
  type CombatSetup,
} from './combat.js';
import { applyPushback } from './blight.js';
import { PUSHBACK } from './tunables.js';
import { checkGambitSeize } from './gambit.js';

// ─── Action Result ────────────────────────────────────────────────

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
  /** Whether the action consumed an action point. */
  actionConsumed: boolean;
  /** If combat was initiated, the pending combat setup (needs card commits). */
  pendingCombat?: CombatSetup;
}

// ─── Validation Helpers ───────────────────────────────────────────

/**
 * Check if two nodes are adjacent.
 */
export function areAdjacent(state: GameState, nodeA: string, nodeB: string): boolean {
  const nodeDef = state.board.definition.nodes[nodeA];
  return nodeDef ? nodeDef.connections.includes(nodeB) : false;
}

/**
 * Check if a player's Warlord is at a given node.
 */
export function isPlayerAtNode(state: GameState, playerIndex: number, nodeId: string): boolean {
  return state.players[playerIndex].warlordNodeId === nodeId;
}

/**
 * Check if a rival has forces at a node.
 */
export function hasRivalAtNode(state: GameState, playerIndex: number, nodeId: string): number | null {
  for (const p of state.players) {
    if (p.index !== playerIndex && p.warlordNodeId === nodeId) {
      return p.index;
    }
  }
  return null;
}

/**
 * Check if Shadowking forces are at a node.
 */
export function hasSKForcesAtNode(state: GameState, nodeId: string): boolean {
  const nodeState = state.board.state.nodes[nodeId];
  return nodeState ? nodeState.shadowkingForces.length > 0 : false;
}

// ─── Action Implementations ──────────────────────────────────────

/**
 * MARCH — move the Warlord 1 node (cost 1 banner, +1 if ashed).
 *
 * Zone-of-Control (P0-2): cannot march through a held Approach
 * without STRIKE/RAID first.
 */
export function executeMarch(
  state: GameState,
  playerIndex: number,
  targetNodeId: string,
): ActionResult {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  const currentNodeId = player.warlordNodeId;

  // Validate adjacency
  if (!areAdjacent(state, currentNodeId, targetNodeId)) {
    throw new Error(`Cannot MARCH: ${targetNodeId} is not adjacent to ${currentNodeId}`);
  }

  // Compute cost
  const targetNodeState = state.board.state.nodes[targetNodeId];
  let cost = 1;
  if (targetNodeState?.ashed) {
    cost += ASHED_TRAVERSE_EXTRA_COST;
  }

  // Validate banners
  if (player.banners < cost) {
    throw new Error(`Cannot MARCH: need ${cost} banners, have ${player.banners}`);
  }

  // Zone-of-Control check: if target is an Approach held by a rival, must STRIKE/RAID
  const targetDef = state.board.definition.nodes[targetNodeId];
  if (targetDef?.tier === 'approach') {
    const rivalAtApproach = hasRivalAtNode(state, playerIndex, targetNodeId);
    if (rivalAtApproach !== null) {
      throw new Error(
        `Cannot MARCH through held Approach ${targetNodeId}: rival Player ${rivalAtApproach + 1} controls it. Must RAID first.`
      );
    }
    // Also check for SK forces blocking
    if (hasSKForcesAtNode(state, targetNodeId)) {
      throw new Error(
        `Cannot MARCH through ${targetNodeId}: Shadowking forces present. Must STRIKE first.`
      );
    }
  }

  // Execute
  player.banners -= cost;

  // Move Warlord
  // Remove from old node's pieces
  const oldNodeState = state.board.state.nodes[currentNodeId];
  if (oldNodeState) {
    oldNodeState.pieces = oldNodeState.pieces.filter(
      p => !(p.owner === playerIndex && p.type === 'warlord')
    );
  }

  // Add to new node's pieces
  if (targetNodeState) {
    targetNodeState.pieces.push({
      id: `warlord-${playerIndex}`,
      type: 'warlord',
      owner: playerIndex,
      power: WARLORD_POWER, // Consistent with setup — moving must not weaken the Warlord
      nodeId: targetNodeId,
    });
  }

  player.warlordNodeId = targetNodeId;

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'MARCH',
    details: { from: currentNodeId, to: targetNodeId, cost },
  });

  // Check if player just marched onto the Keystone (§6 — Gambit seize)
  if (targetNodeId === state.board.definition.keystoneId) {
    events.push(...checkGambitSeize(state, playerIndex));
  }

  return { state, events, actionConsumed: true };
}

/**
 * CLAIM — claim an unclaimed living Holding or Forge at the Warlord's location.
 * Cost: 1 banner.
 */
export function executeClaim(
  state: GameState,
  playerIndex: number,
): ActionResult {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  const nodeId = player.warlordNodeId;
  const nodeState = state.board.state.nodes[nodeId];
  const nodeDef = state.board.definition.nodes[nodeId];

  if (!nodeState || !nodeDef) {
    throw new Error(`Cannot CLAIM: invalid node ${nodeId}`);
  }

  // Validate it's a claimable type
  if (nodeDef.tier !== 'holding' && nodeDef.tier !== 'forge') {
    throw new Error(`Cannot CLAIM: ${nodeId} is a ${nodeDef.tier}, not a Holding or Forge`);
  }

  // Validate unclaimed and not ashed
  if (nodeState.ashed) {
    throw new Error(`Cannot CLAIM: ${nodeId} is ashed`);
  }
  if (nodeState.owner !== null) {
    throw new Error(`Cannot CLAIM: ${nodeId} is already owned by Player ${nodeState.owner + 1}`);
  }

  // Validate banners
  if (player.banners < 1) {
    throw new Error(`Cannot CLAIM: need 1 banner, have ${player.banners}`);
  }

  // Execute
  player.banners -= 1;
  nodeState.owner = playerIndex;

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'CLAIM',
    details: { nodeId, tier: nodeDef.tier },
  });

  return { state, events, actionConsumed: true };
}

/**
 * STRIKE — initiate combat vs a Shadowking force at the Warlord's location (§5.3).
 *
 * Returns an ActionResult. The actual combat resolution requires card commits
 * via a separate COMBAT_COMMIT command (or handled inline for AI).
 *
 * For headless/sim: resolve immediately with auto-committed cards.
 */
export function executeStrike(
  state: GameState,
  playerIndex: number,
  attackerCards: number[],
): ActionResult {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  const nodeId = player.warlordNodeId;

  // Validate SK forces present
  if (!hasSKForcesAtNode(state, nodeId)) {
    throw new Error(`Cannot STRIKE: no Shadowking forces at ${nodeId}`);
  }

  // Validate committed cards are in hand
  const handCopy = [...player.hand];
  for (const card of attackerCards) {
    const idx = handCopy.indexOf(card);
    if (idx === -1) {
      throw new Error(`Cannot STRIKE: card ${card} not in hand`);
    }
    handCopy.splice(idx, 1);
  }

  // Resolve combat
  const setup: CombatSetup = {
    combatType: 'STRIKE',
    attackerIndex: playerIndex,
    nodeId,
    attackerCards,
    defenderCards: [],
    defenderIndex: null,
  };

  const combatResult = resolveCombat(state, setup);
  events.push(...combatResult.events);

  // Apply outcome
  const outcomeEvents = applyCombatOutcome(
    state, setup, combatResult.winner, combatResult.margin
  );
  events.push(...outcomeEvents);

  // Check if attacker is now Broken
  events.push(...checkBrokenState(state, playerIndex));

  return { state, events, actionConsumed: true };
}

/**
 * RAID — initiate combat vs a co-located rival (§5.3).
 */
export function executeRaid(
  state: GameState,
  playerIndex: number,
  defenderIndex: number,
  attackerCards: number[],
  defenderCards: number[],
): ActionResult {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  const nodeId = player.warlordNodeId;

  // Validate rival is at the same node
  const defender = state.players[defenderIndex];
  if (defender.warlordNodeId !== nodeId) {
    throw new Error(`Cannot RAID: Player ${defenderIndex + 1} is not at ${nodeId}`);
  }

  // Rescue debt (§5.4): a debtor may not attack their creditor while the debt binds.
  const debt = player.rescueDebt;
  if (debt && debt.creditor === defenderIndex && state.round <= debt.expiresRound) {
    throw new Error(
      `Cannot RAID: you owe Player ${defenderIndex + 1} a rescue debt (withheld attack) until round ${debt.expiresRound}`,
    );
  }

  // Validate attacker cards
  const atkHandCopy = [...player.hand];
  for (const card of attackerCards) {
    const idx = atkHandCopy.indexOf(card);
    if (idx === -1) throw new Error(`Cannot RAID: attacker card ${card} not in hand`);
    atkHandCopy.splice(idx, 1);
  }

  // Validate defender cards
  const defHandCopy = [...defender.hand];
  for (const card of defenderCards) {
    const idx = defHandCopy.indexOf(card);
    if (idx === -1) throw new Error(`Cannot RAID: defender card ${card} not in hand`);
    defHandCopy.splice(idx, 1);
  }

  // Resolve combat
  const setup: CombatSetup = {
    combatType: 'RAID',
    attackerIndex: playerIndex,
    nodeId,
    attackerCards,
    defenderCards,
    defenderIndex,
  };

  const combatResult = resolveCombat(state, setup);
  events.push(...combatResult.events);

  // ── Last Stand (§5.3) — one-sided, final defender reversal ──
  let winner = combatResult.winner;
  let margin = combatResult.margin;
  let lastStandCards: number[] = [];
  if (combatResult.lastStandAvailable) {
    lastStandCards = chooseLastStandCards(
      state, defenderIndex, combatResult.attackPower, combatResult.defensePower, defenderCards,
    );
    if (lastStandCards.length > 0) {
      const stand = resolveLastStand(combatResult, lastStandCards);
      winner = stand.winner;
      margin = stand.margin;
      events.push({
        type: 'PLAYER_ACTED',
        playerIndex: defenderIndex,
        action: 'PASS',
        details: { lastStand: true, cards: lastStandCards.length, held: winner === 'defender' },
      });
    }
  }

  // Apply outcome with the FINAL winner/margin (discards the originally-committed cards).
  const outcomeEvents = applyCombatOutcome(state, setup, winner, margin);
  events.push(...outcomeEvents);

  // Discard the additional Last Stand cards the defender spent.
  if (lastStandCards.length > 0) {
    const defender = state.players[defenderIndex];
    for (const c of lastStandCards) {
      const i = defender.hand.indexOf(c);
      if (i !== -1) defender.hand.splice(i, 1);
    }
    // A successful Stand also pushes the tide back here (§5.3).
    if (winner === 'defender') {
      events.push(...applyPushback(state, nodeId, PUSHBACK));
    }
  }

  // If the attacker (still) won, transfer ownership of the node
  if (winner === 'attacker') {
    const nodeState = state.board.state.nodes[nodeId];
    if (nodeState && nodeState.owner === defenderIndex) {
      nodeState.owner = playerIndex;
    }
  }

  // Check if loser is now Broken
  const loserIndex = winner === 'attacker' ? defenderIndex : playerIndex;
  events.push(...checkBrokenState(state, loserIndex));

  return { state, events, actionConsumed: true };
}

/**
 * RESCUE — un-Break a co-located or adjacent ally (§5.4).
 * Cost: RESCUE_COST cards from hand.
 * Creates a binding one-round debt (forced minimum Pledge contribution).
 */
export function executeRescue(
  state: GameState,
  playerIndex: number,
  targetPlayerIndex: number,
): ActionResult {
  const events: GameEvent[] = [];
  const rescuer = state.players[playerIndex];
  const target = state.players[targetPlayerIndex];

  // Validate target is Broken
  if (!target.isBroken) {
    throw new Error(`Cannot RESCUE: Player ${targetPlayerIndex + 1} is not Broken`);
  }

  // Validate co-located or adjacent
  const rescuerNode = rescuer.warlordNodeId;
  const targetNode = target.warlordNodeId;
  if (rescuerNode !== targetNode && !areAdjacent(state, rescuerNode, targetNode)) {
    throw new Error(`Cannot RESCUE: Player ${targetPlayerIndex + 1} is not co-located or adjacent`);
  }

  // Validate rescuer has enough cards
  if (rescuer.hand.length < RESCUE_COST) {
    throw new Error(
      `Cannot RESCUE: need ${RESCUE_COST} cards, have ${rescuer.hand.length}`
    );
  }

  // Validate not rescuing self
  if (playerIndex === targetPlayerIndex) {
    throw new Error('Cannot RESCUE yourself');
  }

  // Execute: spend cards
  rescuer.hand.splice(0, RESCUE_COST);

  // Un-Break the target
  target.isBroken = false;
  target.brokenSince = null;
  target.brokenRoundsConsecutive = 0;
  target.wounds = Math.floor(BREAK_THRESHOLD / 2); // Recover to half wounds

  // Bind the one-round debt (§5.4): a forced minimum Pledge next round (enforced
  // in open modes) AND a withheld attack on the creditor (enforced in all modes).
  // Cleared at the Dawn of the obligation round.
  target.rescueDebt = {
    creditor: playerIndex,
    forcedMinPledge: RESCUE_DEBT_MIN_PLEDGE,
    expiresRound: state.round + 1,
  };

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'RESCUE',
    details: {
      targetPlayerIndex,
      cost: RESCUE_COST,
      debt: 'forced_minimum_pledge',
      creditor: playerIndex,
      expiresRound: target.rescueDebt.expiresRound,
    },
  });

  return { state, events, actionConsumed: true };
}

/**
 * RECRUIT — recruit a retinue piece (stub — minimal piece types for now).
 */
export function executeRecruit(
  state: GameState,
  playerIndex: number,
): ActionResult {
  const events: GameEvent[] = [];

  // Stub — minimal piece economy per §2 scope note
  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'RECRUIT',
    details: { note: 'Retinue recruitment not yet implemented (minimal pieces)' },
  });

  return { state, events, actionConsumed: true };
}

// ─── Broken Recovery (Dawn check, §5.4) ──────────────────────────

/**
 * Check if a Broken player should auto-recover at Dawn.
 * Auto-recovers after BROKEN_MAX_ROUNDS consecutive rounds Broken.
 */
export function checkBrokenRecovery(state: GameState, playerIndex: number): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];

  if (!player.isBroken) return events;
  if (player.brokenRoundsConsecutive < BROKEN_MAX_ROUNDS) return events;

  // Auto-recover to minimum strength
  player.isBroken = false;
  player.brokenSince = null;
  player.brokenRoundsConsecutive = 0;
  player.wounds = Math.floor(BREAK_THRESHOLD / 2); // Minimum strength

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'PASS',
    details: { recovered: true, reason: 'auto_recovery_cap' },
  });

  return events;
}
