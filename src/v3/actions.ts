/**
 * Actions — real implementations for the ACTION phase (§4.3).
 *
 * Each action validates legality against current state, applies its
 * effects, and returns events. All actions route through the reducer.
 *
 * Actions:
 *   MARCH   — move a piece 1 node (cost 1 banner, extra if ashed node)
 *   CLAIM   — claim current unclaimed Holding/Forge (cost 1 banner)
 *   RAID    — initiate combat vs a co-located rival (§5.3); taking a rival's last
 *             stronghold flags them `deposed` (resolved at Dawn, §6)
 *   STRIKE  — initiate combat vs a co-located Shadowking force (§5.3)
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
  chooseLastStandCards,
  effectiveCaptureMargin,
  livingStrongholdCount,
  resolveCombat,
  resolveLastStand,
  stewardHomeDefenseBonus,
  trailingDefenseBonus,
  type CombatSetup,
} from './combat.js';
import {
  canCapture,
  capturePiece,
  legalRaidTargets,
  nearestStronghold,
  routPiece,
} from './capture.js';
import { applyPushback } from './blight.js';
import { getTunables } from './tunables.js';
import { canLastStand, archetypePower } from './court.js';
import { checkGambitSeize } from './gambit.js';
import { flipDiscoveryToken, redeemBlightSeed } from './discovery.js';

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
  let cost = getTunables().ACTION_BASE_COST;
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
  // Keep the canonical court roster in sync with the board (§2).
  const warlordCourt = player.court.find(c => c.archetype === 'warlord');
  if (warlordCourt) warlordCourt.node = targetNodeId;

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
  const heraldCourt = player.court.find(c => c.archetype === 'herald');
  if (heraldCourt) heraldCourt.node = targetNodeId;

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
    // Drop the Herald from the canonical court roster (§2).
    player.court = player.court.filter(c => c.archetype !== 'herald');
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
  const claimCost = getTunables().ACTION_BASE_COST;
  if (player.banners < claimCost) {
    throw new Error(`Cannot CLAIM: need ${claimCost} banner, have ${player.banners}`);
  }

  // Execute — pay, then take ownership of the claimed node (§12 #19: you OWN it, even when
  // the flip is a risk).
  player.banners -= claimCost;
  nodeState.owner = playerIndex;

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'CLAIM',
    details: { nodeId, tier: nodeDef.tier },
  });

  // Discovery (§5.1, §12 #19): a Holding's face-down token FLIPS first — reveal of frozen,
  // pre-bound state (§7 D1), never a live draw. Forges carry no token (hiddenToken === null).
  events.push(...flipDiscoveryToken(state, playerIndex, nodeId));

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
  const outcomeEvents = applyCombatOutcome(state, setup, combatResult.winner);
  events.push(...outcomeEvents);

  // Discovery redemption (§5.1, §7 D9): if this STRIKE cleared a Blight-seed's fightable
  // threat, the pre-bound bonus recruit joins the striker's court — a bad flip became a
  // decision, not a dice-loss.
  events.push(...redeemBlightSeed(state, playerIndex, nodeId));

  return { state, events, actionConsumed: true };
}

/** The one effect a winning RAID may ELECT (§5.2) — one-effect-per-combat (never combined). */
export type RaidEffect = 'TAKE_LAND' | 'ROUT_PIECE' | 'CAPTURE_PIECE';

/** A winning RAID's elected outcome (§5.2). `targetPieceId` picks the routed/captured retainer;
 *  omitted ⇒ the deterministic default (lowest-pieceId legal target). */
export interface RaidElect {
  readonly effect: RaidEffect;
  readonly targetPieceId?: string;
}

/**
 * RAID — initiate combat vs a co-located rival (§5.2/§5.3). On a win the attacker ELECTS exactly
 * ONE of {TAKE_LAND, ROUT_PIECE, CAPTURE_PIECE} (`elect`; default TAKE_LAND): node-loss and
 * capture are NEVER combined (one-effect-per-combat). CAPTURE_PIECE requires the final combat
 * margin ≥ `effectiveCaptureMargin` (rises with the attacker's standing — §13 P0-2) and is
 * blocked against a defender's LAST retainer in Whisper (§13 P0-10). ROUT is a tempo loss, not
 * removal (§13 P0-1). The catch-up + Steward-home defense grades are folded into the combat
 * (§13 P0-2/P0-3) via `defenseBonus`.
 */
export function executeRaid(
  state: GameState,
  playerIndex: number,
  defenderIndex: number,
  attackerCards: number[],
  defenderCards: number[],
  elect: RaidElect = { effect: 'TAKE_LAND' },
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

  // Resolve combat. The defender's standing (catch-up, §13 P0-2) + Steward home grade
  // (§13 P0-3) are added as a defenseBonus — the production leader's RAIDs are harder.
  const defenseBonus =
    trailingDefenseBonus(state, playerIndex, defenderIndex) +
    stewardHomeDefenseBonus(state, defenderIndex, nodeId);
  const setup: CombatSetup = {
    combatType: 'RAID',
    attackerIndex: playerIndex,
    nodeId,
    attackerCards,
    defenderCards,
    defenderIndex,
    defenseBonus,
  };

  const combatResult = resolveCombat(state, setup);
  events.push(...combatResult.events);

  // ── Last Stand (§5.3) — one-sided, final defender reversal ──
  let winner = combatResult.winner;
  let finalMargin = combatResult.margin;
  let lastStandCards: number[] = [];
  // Only "the muscle" (a Warlord or Marshal — §2) may stand. In a legal RAID the
  // defender's Warlord is co-located, so this never narrows existing combat.
  if (combatResult.lastStandAvailable && canLastStand(state, defenderIndex, nodeId)) {
    lastStandCards = chooseLastStandCards(
      state, defenderIndex, combatResult.attackPower, combatResult.defensePower, defenderCards,
    );
    if (lastStandCards.length > 0) {
      const stand = resolveLastStand(combatResult, lastStandCards);
      winner = stand.winner;
      finalMargin = stand.margin;
      events.push({
        type: 'PLAYER_ACTED',
        playerIndex: defenderIndex,
        action: 'PASS',
        details: { lastStand: true, cards: lastStandCards.length, held: winner === 'defender' },
      });
    }
  }

  // Apply outcome with the FINAL winner (discards the originally-committed cards).
  const outcomeEvents = applyCombatOutcome(state, setup, winner);
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

  // If the attacker (still) won, apply the ELECTED outcome — exactly ONE effect (§5.2). Node-loss
  // and capture are never combined.
  if (winner === 'attacker') {
    if (elect.effect === 'CAPTURE_PIECE') {
      // Margin-gated (§5.2) by the standing-scaled threshold (§13 P0-2).
      const need = effectiveCaptureMargin(state, playerIndex);
      if (finalMargin < need) {
        throw new Error(`Cannot CAPTURE: margin ${finalMargin} < required ${need} (standing-scaled)`);
      }
      const target = elect.targetPieceId ?? legalRaidTargets(state, defenderIndex, nodeId)[0];
      if (target === undefined || !canCapture(state, defenderIndex, nodeId, target)) {
        throw new Error(
          'Cannot CAPTURE: no legal target (none present, immune, or Whisper last-retainer protection §13 P0-10)',
        );
      }
      events.push(...capturePiece(state, playerIndex, defenderIndex, target));
    } else if (elect.effect === 'ROUT_PIECE') {
      const target = elect.targetPieceId ?? legalRaidTargets(state, defenderIndex, nodeId)[0];
      if (target === undefined) throw new Error('Cannot ROUT: no legal target retainer present');
      events.push(...routPiece(state, defenderIndex, target));
    } else {
      // TAKE_LAND (default): transfer ownership of the contested node only.
      const nodeState = state.board.state.nodes[nodeId];
      if (nodeState && nodeState.owner === defenderIndex) {
        nodeState.owner = playerIndex;

        // Depose pressure (§5.5/§6): taking a rival's LAST living stronghold flags them
        // `deposed`. The flag is set here in ACTION; the elimination RESOLVES AT DAWN in
        // seat order (resolveDeposals). Whisper protects against hopelessness (§12 #13,
        // §13 P0-10) — a last stronghold cannot be lost pre-March.
        if (state.act !== 'WHISPER' && livingStrongholdCount(state, defenderIndex) === 0) {
          state.players[defenderIndex].deposed = true;
          events.push({
            type: 'PLAYER_ACTED',
            playerIndex: defenderIndex,
            action: 'PASS',
            details: { deposed: true, by: playerIndex, reason: 'last_stronghold_raided' },
          });
        }
      }
    }
  }

  return { state, events, actionConsumed: true };
}

/**
 * RANSOM — free a captive (yours or an ally's), replacing the retired RESCUE (§5.3, §8). The
 * ransomer spends RANSOM_COST cards (DESTROYED) + RANSOM_BANNERS banners; of those banners a
 * fixed RANSOM_SINK_CUT is DESTROYED (the sink — resource-negative to the pair, no laundering
 * loop, stress-test E2) and the rest go to the captor. The freed piece returns to the owner's
 * nearest stronghold, capture/rout-immune for RECAPTURE_IMMUNE rounds. An ALLY-ransom (actor ≠
 * owner) with BOTH parties oath-free and consenting forges an Oath (§5.3, §M).
 *
 * Locality: the actor must be the owner, or have its Warlord co-located/adjacent to the captor's
 * hold (the captor's Warlord node).
 */
export function executeRansom(
  state: GameState,
  actorIndex: number,
  captivePieceId: string,
  consent: boolean = true,
): ActionResult {
  const events: GameEvent[] = [];
  const t = getTunables();

  const record = state.captives.find(r => r.pieceId === captivePieceId);
  if (!record) throw new Error(`Cannot RANSOM: no captive ${captivePieceId}`);

  const actor = state.players[actorIndex];
  const owner = state.players[record.ownerSeat];
  const captor = state.players[record.captorSeat];
  if (actor.isEliminated) throw new Error('Cannot RANSOM: actor is eliminated');

  // Locality (§5.3): actor is the owner, or its Warlord is at/adjacent to the captor's hold.
  if (actorIndex !== record.ownerSeat) {
    const hold = captor.warlordNodeId;
    const here = actor.warlordNodeId;
    if (here !== hold && !areAdjacent(state, here, hold)) {
      throw new Error("Cannot RANSOM: actor's Warlord is not at/adjacent to the captor's hold");
    }
  }

  // Affordability — RANSOM_COST cards + RANSOM_BANNERS banners.
  if (actor.hand.length < t.RANSOM_COST) {
    throw new Error(`Cannot RANSOM: need ${t.RANSOM_COST} cards, have ${actor.hand.length}`);
  }
  if (actor.banners < t.RANSOM_BANNERS) {
    throw new Error(`Cannot RANSOM: need ${t.RANSOM_BANNERS} banners, have ${actor.banners}`);
  }

  // Pay: destroy RANSOM_COST cards (lowest-value first, keeping the best for combat — 4g fidelity).
  for (let k = 0; k < t.RANSOM_COST && actor.hand.length > 0; k++) {
    let minIdx = 0;
    for (let j = 1; j < actor.hand.length; j++) if (actor.hand[j] < actor.hand[minIdx]) minIdx = j;
    actor.hand.splice(minIdx, 1);
  }
  // Pay banners: the sink is DESTROYED; the remainder goes to the captor (resource-negative pair).
  actor.banners -= t.RANSOM_BANNERS;
  captor.banners += t.RANSOM_BANNERS - t.RANSOM_SINK_CUT;

  // Free the piece → owner's nearest stronghold (fallback: the owner's Warlord node), immune.
  state.captives = state.captives.filter(r => r !== record);
  const cp = owner.court.find(c => c.id === record.pieceId);
  if (cp) {
    const node = nearestStronghold(state, owner.index) ?? owner.warlordNodeId;
    cp.captiveOf = null;
    cp.routedReturnRound = null;
    cp.recaptureImmuneUntil = state.round + t.RECAPTURE_IMMUNE;
    cp.node = node;
    const ns = state.board.state.nodes[node];
    if (ns) {
      ns.pieces.push({
        id: cp.id, type: cp.archetype, owner: owner.index,
        power: archetypePower(cp.archetype), nodeId: node,
      });
    }
  }

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex: actorIndex,
    action: 'RANSOM',
    details: {
      captive: captivePieceId, owner: record.ownerSeat, captor: record.captorSeat,
      cards: t.RANSOM_COST, banners: t.RANSOM_BANNERS, sink: t.RANSOM_SINK_CUT,
    },
  });

  // Ally-ransom (§5.3, §M): both oath-free + consenting → forge an Oath (its non-aggression
  // replaces the retired rescue-debt). Self-ransom never forges.
  if (
    actorIndex !== record.ownerSeat && consent &&
    findOath(state, actorIndex) === null && findOath(state, record.ownerSeat) === null
  ) {
    events.push(...forgeOath(state, actorIndex, record.ownerSeat, 'ransom'));
  }

  return { state, events, actionConsumed: true };
}

// RESCUE removed (§8): the Broken Court is retired, so there is no Broken ally to un-break.
// It was rebuilt as RANSOM (free a captive; §5.3) — see `executeRansom` above.

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
 * the cost is the betrayal risk, not tempo. Legal iff both are living, distinct,
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
  if (me.isEliminated || them.isEliminated) throw new Error('Cannot SWEAR_OATH with an eliminated player');
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
  // Record the Herald in the canonical court roster (§2).
  player.court.push({
    id: `herald-${playerIndex}`,
    archetype: 'herald',
    node: player.warlordNodeId,
    captiveOf: null,
    routedReturnRound: null,
    recaptureImmuneUntil: 0,
  });

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

// Broken recovery removed (§8): the Broken Court is retired. Elimination is now
// terminal (no auto-recovery); deposal resolves at Dawn via resolveDeposals (§6).
