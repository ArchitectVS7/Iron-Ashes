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
 *   RECRUIT — recruit a Herald → the political-stance build (§Herald)
 *   PASS    — end actions early
 *
 * Zone-of-Control (P0-2): enemy entering a held Approach must STRIKE/RAID
 * to pass — no free march-through.
 */

import type { GameEvent } from './events.js';
import type { GameState, Oath } from './types.js';
import { addGrudge } from './shadowking-policy.js';
import {
  ASHED_TRAVERSE_EXTRA_COST,
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
import { getTunables } from './tunables.js';
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
  const targetDef = state.board.definition.nodes[targetNodeId];
  let cost = 1;
  if (targetNodeState?.ashed) {
    cost += ASHED_TRAVERSE_EXTRA_COST;
  }

  // Forge-as-Gate toll (§ tolls): marching INTO a rival-owned, living Forge pays the
  // owner a toll, in the open — the chokepoint tax that makes holding a Forge leverage.
  // Sworn allies pass free (Oath non-aggression).
  let toll = 0;
  let tollOwner: number | null = null;
  if (
    getTunables().FORGE_TOLL_COST > 0 && targetDef?.tier === 'forge' &&
    targetNodeState && targetNodeState.owner !== null &&
    targetNodeState.owner !== playerIndex && !targetNodeState.ashed &&
    !areSworn(state, playerIndex, targetNodeState.owner)
  ) {
    toll = getTunables().FORGE_TOLL_COST;
    tollOwner = targetNodeState.owner;
  }

  // Validate banners (march cost + any Forge toll)
  if (player.banners < cost + toll) {
    throw new Error(`Cannot MARCH: need ${cost + toll} banners (cost ${cost} + toll ${toll}), have ${player.banners}`);
  }

  // Zone-of-Control check: if target is an Approach held by a rival, must STRIKE/RAID
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
  // Pay the Forge toll to the owner (zero-sum banner transfer, in the open).
  if (tollOwner !== null && toll > 0) {
    player.banners -= toll;
    state.players[tollOwner].banners += toll;
  }

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
    details: { from: currentNodeId, to: targetNodeId, cost, toll, paidTo: tollOwner },
  });

  // Check if player just marched onto the Keystone (§6 — Gambit seize)
  if (targetNodeId === state.board.definition.keystoneId) {
    events.push(...checkGambitSeize(state, playerIndex));
  }

  return { state, events, actionConsumed: true };
}

/**
 * MARCH the Herald — the political build's lone runner (§HL). A lightweight courier move:
 * 1 banner (+ashed extra), adjacency only, NO Forge toll, NO Zone-of-Control block, NO Gambit
 * seize. The Herald may walk into the dark's path — that is the interception RISK (resolved at
 * Dawn, §HL): a rival Warlord or a Death Knight co-located with it captures it.
 */
export function executeHeraldMarch(
  state: GameState,
  playerIndex: number,
  targetNodeId: string,
): ActionResult {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  const from = player.heraldNodeId;
  if (from === null) {
    throw new Error('Cannot MARCH Herald: no Herald in play (RECRUIT one first)');
  }
  if (!areAdjacent(state, from, targetNodeId)) {
    throw new Error(`Cannot MARCH Herald: ${targetNodeId} is not adjacent to ${from}`);
  }
  const targetNodeState = state.board.state.nodes[targetNodeId];
  let cost = 1;
  if (targetNodeState?.ashed) cost += ASHED_TRAVERSE_EXTRA_COST;
  if (player.banners < cost) {
    throw new Error(`Cannot MARCH Herald: need ${cost} banners, have ${player.banners}`);
  }

  player.banners -= cost;
  const oldNodeState = state.board.state.nodes[from];
  if (oldNodeState) {
    oldNodeState.pieces = oldNodeState.pieces.filter(
      p => !(p.owner === playerIndex && p.type === 'herald'),
    );
  }
  if (targetNodeState) {
    targetNodeState.pieces.push({
      id: `herald-${playerIndex}`,
      type: 'herald',
      owner: playerIndex,
      power: 0,
      nodeId: targetNodeId,
    });
  }
  player.heraldNodeId = targetNodeId;

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'MARCH',
    details: { piece: 'herald', from, to: targetNodeId, cost },
  });

  return { state, events, actionConsumed: true };
}

/**
 * Capture-check for Heralds (§HL — the interception drama). Any Herald sharing a node with a
 * rival Warlord or a Shadowking force is captured: the piece is removed, the owner reverts to
 * the martial stance (loses the hand bonus, regains combat), and the dark notes the kill
 * (grudge) when a Death Knight took it. Called at Dawn. Returns events.
 */
export function resolveHeraldCaptures(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const t = getTunables();
  for (const player of state.players) {
    const node = player.heraldNodeId;
    if (node === null) continue;
    const rivalWarlord = state.players.some(
      r => r.index !== player.index && r.warlordNodeId === node,
    );
    const darkForce = hasSKForcesAtNode(state, node);
    if (!rivalWarlord && !darkForce) continue;

    // Capture: remove the piece + revert the political bonuses to martial.
    const ns = state.board.state.nodes[node];
    if (ns) {
      ns.pieces = ns.pieces.filter(p => !(p.owner === player.index && p.type === 'herald'));
    }
    player.heraldNodeId = null;
    player.stance = 'martial';
    player.handLimit = Math.max(0, player.handLimit - t.HERALD_HAND_BONUS);
    player.combatPenalty = Math.max(0, player.combatPenalty - t.HERALD_COMBAT_PENALTY);
    events.push({
      type: 'PLAYER_ACTED',
      playerIndex: player.index,
      action: 'RECRUIT',
      details: { heraldCaptured: true, by: darkForce ? 'dark' : 'rival', at: node },
    });
  }
  return events;
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

  // The dark holds the ground (Stage 5-dark forcing function): a Death Knight on the
  // node blocks the claim — you must STRIKE it off first (which then claims it for you).
  if (getTunables().DK_BLOCKS_CLAIM && hasSKForcesAtNode(state, nodeId)) {
    throw new Error(`Cannot CLAIM: Shadowking forces hold ${nodeId}. Strike them off first.`);
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

  // Oath (§ Oaths): sworn allies cannot RAID each other — you must BREAK_OATH first.
  // (A rescue forges such an Oath — §M — so this also covers "don't stab your rescuer".)
  if (areSworn(state, playerIndex, defenderIndex)) {
    throw new Error(
      `Cannot RAID Player ${defenderIndex + 1}: you are sworn by an Oath. Break it first.`,
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
      events.push(...applyPushback(state, nodeId, getTunables().PUSHBACK));
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
  const rescueCost = getTunables().RESCUE_COST;
  if (rescuer.hand.length < rescueCost) {
    throw new Error(
      `Cannot RESCUE: need ${rescueCost} cards, have ${rescuer.hand.length}`
    );
  }

  // Validate not rescuing self
  if (playerIndex === targetPlayerIndex) {
    throw new Error('Cannot RESCUE yourself');
  }

  // Execute: spend cards
  rescuer.hand.splice(0, rescueCost);

  // Win-currency payoff (Stage 5d): the rescued ally pays the rescuer a banner tribute
  // (capped at what they hold). Banners are the claim/march currency, so rescue moves
  // the rescuer's win math THIS round — "strings with teeth", not charity.
  const tribute = Math.min(getTunables().RESCUE_TRIBUTE_BANNERS, target.banners);
  if (tribute > 0) {
    target.banners -= tribute;
    rescuer.banners += tribute;
  }

  // Un-Break the target
  target.isBroken = false;
  target.brokenSince = null;
  target.brokenRoundsConsecutive = 0;
  target.wounds = Math.floor(getTunables().BREAK_THRESHOLD / 2); // Recover to half wounds

  // Rescue forges ONE bond — the dramatic, earned Oath (§ Oaths, §M). It replaces the
  // old separate rescue-debt: the Oath's non-aggression already withholds the rescued's
  // attack on the rescuer, and the dark hunts oathbreakers, so a saved player who turns on
  // their saviour pays the Ledger. (One slot each — forms only if both are oath-free; the
  // banner tribute above is the always-present "string" when an Oath can't form.)
  let oathForged = false;
  if (findOath(state, playerIndex) === null && findOath(state, targetPlayerIndex) === null) {
    events.push(...forgeOath(state, playerIndex, targetPlayerIndex, 'rescue'));
    oathForged = true;
  }

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'RESCUE',
    details: {
      targetPlayerIndex,
      cost: rescueCost,
      tribute,
      bond: oathForged ? 'oath' : 'none',
    },
  });

  return { state, events, actionConsumed: true };
}

// ─── Oaths (§ Oaths) ──────────────────────────────────────────────

/** This player's active Oath, or null. */
export function findOath(state: GameState, playerIndex: number): Oath | null {
  return state.oaths.find(o => o.a === playerIndex || o.b === playerIndex) ?? null;
}

/** Are these two players bound by an Oath? */
export function areSworn(state: GameState, x: number, y: number): boolean {
  return state.oaths.some(o => (o.a === x && o.b === y) || (o.a === y && o.b === x));
}

/** Create an Oath between two players (low seat first) and emit the event. */
function forgeOath(state: GameState, x: number, y: number, via: string): GameEvent[] {
  const a = Math.min(x, y);
  const b = Math.max(x, y);
  state.oaths.push({ a, b, swornRound: state.round, strain: 0 });
  return [{
    type: 'PLAYER_ACTED',
    playerIndex: x,
    action: 'SWEAR_OATH',
    details: { with: y, via },
  }];
}

/**
 * SWEAR_OATH — forge a public pact with a rival (§ Oaths). FREE (no action point):
 * the cost is the betrayal risk, not tempo. Legal iff both are non-Broken, distinct,
 * and each oath-free (one Oath per player).
 */
export function executeSwearOath(
  state: GameState,
  playerIndex: number,
  targetIndex: number,
): ActionResult {
  if (targetIndex === playerIndex) throw new Error('Cannot SWEAR_OATH with yourself');
  const me = state.players[playerIndex];
  const them = state.players[targetIndex];
  if (!them) throw new Error(`Cannot SWEAR_OATH: no Player ${targetIndex + 1}`);
  if (me.isBroken || them.isBroken) throw new Error('Cannot SWEAR_OATH while either is Broken');
  if (findOath(state, playerIndex) !== null) throw new Error('Cannot SWEAR_OATH: you already hold an Oath');
  if (findOath(state, targetIndex) !== null) throw new Error(`Cannot SWEAR_OATH: Player ${targetIndex + 1} already holds an Oath`);

  const events = forgeOath(state, playerIndex, targetIndex, 'swear');
  return { state, events, actionConsumed: false }; // free declaration
}

/**
 * BREAK_OATH — betray a sworn ally (§ Oaths). Consumes an action (a deliberate stab).
 * The breaker seizes a banner burst and is freed to RAID the ex-ally, but climbs the
 * dark's Ledger (grudge) — the villain hunts the traitor.
 */
export function executeBreakOath(
  state: GameState,
  playerIndex: number,
): ActionResult {
  const oath = findOath(state, playerIndex);
  if (oath === null) throw new Error('Cannot BREAK_OATH: you hold no Oath');
  // No same-round swear→break farming: an Oath must be held across at least one Dawn.
  if (state.round <= oath.swornRound) throw new Error('Cannot BREAK_OATH the round you swore it');
  const betrayed = oath.a === playerIndex ? oath.b : oath.a;

  // Dissolve the pact.
  state.oaths = state.oaths.filter(o => o !== oath);

  const t = getTunables();
  state.players[playerIndex].banners += t.OATH_BREAK_BANNERS; // seize the moment

  const events: GameEvent[] = [{
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'BREAK_OATH',
    details: { betrayed, banners: t.OATH_BREAK_BANNERS },
  }];
  // Climb the Ledger — the dark now hunts the traitor (the betrayed's Vendetta).
  events.push(...addGrudge(state, playerIndex, t.GRUDGE_OATHBREAK, 'oathbreak'));
  events.push({ type: 'SK_VOICE_LINE', line: 'An oath broken. Such a sweet smell. I follow it.', trigger: 'oathbreak' });

  return { state, events, actionConsumed: true };
}

/**
 * Dawn upkeep for Oaths (§ Oaths): pay each sworn player the fealty dividend, tick
 * strain, and mature (dissolve with a loyalty bonus) any Oath that has reached
 * OATH_DURATION. Called from the Dawn phase after banner income is generated.
 */
export function runOathUpkeep(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const t = getTunables();
  const survivors: Oath[] = [];
  for (const oath of state.oaths) {
    state.players[oath.a].banners += t.OATH_DIVIDEND; // fealty dividend
    state.players[oath.b].banners += t.OATH_DIVIDEND;
    oath.strain += 1;
    if (oath.strain >= t.OATH_DURATION) {
      state.players[oath.a].banners += t.OATH_LOYALTY_BONUS; // honored to the end
      state.players[oath.b].banners += t.OATH_LOYALTY_BONUS;
      events.push({
        type: 'PLAYER_ACTED',
        playerIndex: oath.a,
        action: 'PASS',
        details: { oathMatured: true, a: oath.a, b: oath.b },
      });
    } else {
      survivors.push(oath);
    }
  }
  state.oaths = survivors;
  return events;
}

/**
 * RECRUIT — recruit a Herald: raises this player's hand limit (+HERALD_HAND_BONUS) and
 * lowers combat (−HERALD_COMBAT_PENALTY) → the deep-hand political build vs the martial default
 * (§Herald). Herald-only by design today (not a stub — the piece roster is deliberately minimal).
 */
export function executeRecruit(
  state: GameState,
  playerIndex: number,
): ActionResult {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  const t = getTunables();

  // Recruit a Herald: commit to the POLITICAL stance (§ Herald). One-time, sticky.
  if (player.stance === 'political') {
    throw new Error('Cannot RECRUIT: already committed to the political stance');
  }
  if (player.banners < t.HERALD_RECRUIT_COST) {
    throw new Error(`Cannot RECRUIT: need ${t.HERALD_RECRUIT_COST} banners, have ${player.banners}`);
  }

  player.banners -= t.HERALD_RECRUIT_COST;
  player.stance = 'political';
  player.handLimit += t.HERALD_HAND_BONUS;       // deep hand
  player.combatPenalty += t.HERALD_COMBAT_PENALTY; // a fighter off the board

  // Spawn the literal Herald piece (§HL) at the Warlord's node — the lone runner starts
  // home and must MARCH to the blighted front to PARLEY (and risk interception en route).
  player.heraldNodeId = player.warlordNodeId;
  const spawnNode = state.board.state.nodes[player.warlordNodeId];
  if (spawnNode) {
    spawnNode.pieces.push({
      id: `herald-${playerIndex}`,
      type: 'herald',
      owner: playerIndex,
      power: 0, // a courier, not a fighter
      nodeId: player.warlordNodeId,
    });
  }

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'RECRUIT',
    details: { stance: 'political', handLimit: player.handLimit, combatPenalty: player.combatPenalty, heraldNodeId: player.heraldNodeId },
  });

  return { state, events, actionConsumed: true };
}

/** A node on/adjacent to the Warlord that the dark holds (blighted, not ashed), for PARLEY. */
export function parleyTarget(state: GameState, playerIndex: number): string | null {
  // §HL: the Herald PARLEYs from where the RUNNER stands, not the Warlord — so a
  // political player must MARCH the Herald to the blighted front before it can push back.
  const here = state.players[playerIndex].heraldNodeId;
  if (here === null) return null;
  const candidates = [here, ...state.board.definition.nodes[here].connections];
  for (const nodeId of candidates) {
    const ns = state.board.state.nodes[nodeId];
    if (ns && !ns.ashed && ns.blightLevel > 0) return nodeId;
  }
  return null;
}

/**
 * PARLEY — the political player's Herald walks out to push back the dark WITHOUT
 * spending a card (§ Herald, the non-card anti-dark verb): reduce blight on a nearby
 * blighted front by HERALD_PUSHBACK. Requires the political stance + a front in reach.
 */
export function executeParley(
  state: GameState,
  playerIndex: number,
): ActionResult {
  const events: GameEvent[] = [];
  if (state.players[playerIndex].stance !== 'political') {
    throw new Error('Cannot PARLEY: only a political (Herald) player may parley the dark');
  }
  if (state.players[playerIndex].heraldNodeId === null) {
    throw new Error('Cannot PARLEY: your Herald has been captured — recruit again');
  }
  const target = parleyTarget(state, playerIndex);
  if (target === null) {
    throw new Error('Cannot PARLEY: no blighted front on or adjacent to the Herald');
  }
  events.push(...applyPushback(state, target, getTunables().HERALD_PUSHBACK));
  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'PARLEY',
    details: { nodeId: target, pushback: getTunables().HERALD_PUSHBACK },
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
  if (player.brokenRoundsConsecutive < getTunables().BROKEN_MAX_ROUNDS) return events;

  // Auto-recover to minimum strength
  player.isBroken = false;
  player.brokenSince = null;
  player.brokenRoundsConsecutive = 0;
  player.wounds = Math.floor(getTunables().BREAK_THRESHOLD / 2); // Minimum strength

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'PASS',
    details: { recovered: true, reason: 'auto_recovery_cap' },
  });

  return events;
}
