/**
 * Shadowking effect resolution (§5.6) — the villain's telegraphed effect table.
 *
 * The THREAT phase chooses an `effect` per Act (shadowking-policy.ts); THIS is
 * where that effect is actually applied to the board when the strike lands
 * (un-averted). Before Stage 3f the effect was computed but discarded and every
 * strike was a plain SPREAD — this module makes the table real:
 *
 *   SPREAD   — advance Blight down the steered spoke (contributors shielded).
 *   SURGE    — double SPREAD (Reckoning).
 *   SEIZE    — the dark encroaches on the nearest living Holding.
 *   MARCH_DK — a Death Knight maneuvers toward the target, plus a creeping spread.
 *   RAID_DK  — the dark assaults the target's nearest living stronghold.
 *   REAP     — every exposed border stronghold takes Blight (Reckoning sweep).
 *
 * Gambit guardrail (§6): while the Keystone is garrisoned, the dark CANNOT ash it
 * directly — the strike is redirected to the garrison's keystone-adjacent ring.
 *
 * Pure, deterministic: no RNG; all targeting reads live state in fixed order.
 */

import type { GameEvent } from './events.js';
import type { GameState, ShadowkingForce, ShadowkingTelegraph } from './types.js';
import {
  DK_MARCH_DISTANCE,
  GAMBIT_ADJACENT_STRIKE_MULT,
  SURGE_SPREAD_MULT,
  deathKnightCount,
  getTunables,
} from './tunables.js';
import {
  advanceBlightOnNode,
  resolveStrike,
  spreadShieldedOnSpoke,
  type BlightResult,
} from './blight.js';
import { isKeystoneGarrisoned } from './gambit.js';
import type { ShadowkingEffect } from './shadowking-policy.js';

/**
 * Apply the un-averted Shadowking strike for this round, dispatching on the
 * telegraphed effect. A full block (ratio >= 1) averts the strike entirely.
 */
export function applyShadowkingStrike(
  state: GameState,
  telegraph: ShadowkingTelegraph,
  ratio: number,
  pledgers: ReadonlySet<number> = new Set(),
): BlightResult {
  const events: GameEvent[] = [];
  if (ratio >= 1) return { state, events };

  // Gambit guardrail (§6): never ash the garrisoned Keystone — strike adjacent.
  if (isKeystoneGarrisoned(state)) {
    return strikeAdjacentToKeystone(state, ratio);
  }

  const effect = telegraph.effect as ShadowkingEffect;
  const steer = telegraph.steerQuadrant;
  const target = telegraph.struckPlayerIndex;
  const baseSpread = Math.ceil((1 - ratio) * getTunables().SPREAD_AMOUNT_BASE);

  switch (effect) {
    case 'SPREAD':
      return resolveStrike(state, ratio, steer, pledgers);

    case 'SURGE': {
      // Reckoning: a doubled spread down the steered spoke.
      const amount = Math.ceil((1 - ratio) * getTunables().SPREAD_AMOUNT_BASE * SURGE_SPREAD_MULT);
      events.push(...spreadShieldedOnSpoke(state, steer, amount, pledgers));
      return { state, events };
    }

    case 'SEIZE': {
      // The dark encroaches on the nearest living Holding (telegraph already
      // resolved it). Fall back to a spoke spread if it's gone/ashed.
      const node = state.board.state.nodes[telegraph.targetNodeId];
      if (node && !node.ashed) {
        events.push(...advanceBlightOnNode(state, telegraph.targetNodeId, baseSpread, 'strike'));
        return { state, events };
      }
      return resolveStrike(state, ratio, steer, pledgers);
    }

    case 'MARCH_DK': {
      // A Death Knight makes a deep raid toward the target — and the front still
      // creeps (a small spread) so the March act is never a free pass.
      if (target !== null) events.push(...marchDeathKnight(state, target));
      events.push(...spreadShieldedOnSpoke(state, steer, baseSpread, pledgers));
      return { state, events };
    }

    case 'RAID_DK': {
      // Direct assault on the target's nearest living stronghold.
      const node = target !== null ? nearestLivingStronghold(state, target) : null;
      if (node) {
        events.push(...advanceBlightOnNode(state, node, baseSpread, 'strike'));
        return { state, events };
      }
      return resolveStrike(state, ratio, steer, pledgers);
    }

    case 'REAP': {
      // Reckoning sweep: every exposed border stronghold bleeds.
      events.push(...reapExposedBorders(state, baseSpread));
      return { state, events };
    }

    default:
      return resolveStrike(state, ratio, steer, pledgers);
  }
}

// ─── Death Knight respawn (P1a — the villain's forces renew) ──────

/**
 * Replenish Death Knights up to `targetCount` at non-ashed Blight seams. Without
 * this, two STRIKE kills permanently disabled the MARCH_DK / RAID_DK effects for
 * the rest of the game (only 2 DKs, no respawn) — a balance cliff. Called when an
 * Act escalates ("the noose tightens"). Deterministic: fixed seam order, unique ids.
 */
export function respawnDeathKnights(state: GameState, targetCount?: number): GameEvent[] {
  const events: GameEvent[] = [];
  // Default replenishes to the player-count-scaled army (Stage 5-dark) so the
  // scaling holds after Act escalations, not just at setup.
  const target = targetCount ?? deathKnightCount(state.players.length);
  const current = state.shadowking.forces.filter(f => f.type === 'death_knight').length;
  const seams = state.board.definition.blightEntrySeams.filter(s => !state.board.state.nodes[s]?.ashed);
  if (seams.length === 0) return events;

  for (let i = current; i < target; i++) {
    const seam = seams[i % seams.length];
    const force: ShadowkingForce = { id: `dk-r${state.round}-${i}`, type: 'death_knight', power: getTunables().DK_POWER, nodeId: seam };
    state.shadowking.forces.push({ ...force });
    state.board.state.nodes[seam].shadowkingForces.push({ ...force });
    events.push({ type: 'SK_VOICE_LINE', line: 'The fallen rise to my call again.', trigger: 'dk_respawn' });
  }
  return events;
}

// ─── Gambit guardrail (§6) ────────────────────────────────────────

/**
 * While the Keystone is garrisoned the dark cannot ash it; it strikes the
 * keystone-adjacent ring (the Approaches) instead, at normal rate. If every
 * Approach is already ashed the strike fizzles — the garrison holds.
 */
function strikeAdjacentToKeystone(state: GameState, ratio: number): BlightResult {
  const events: GameEvent[] = [];
  const def = state.board.definition;
  const amount = Math.ceil((1 - ratio) * getTunables().SPREAD_AMOUNT_BASE * GAMBIT_ADJACENT_STRIKE_MULT);

  // Hit the first non-ashed Approach in fixed order (deterministic).
  for (const approachId of def.approachIds) {
    const ns = state.board.state.nodes[approachId];
    if (ns && !ns.ashed) {
      events.push(...advanceBlightOnNode(state, approachId, amount, 'strike'));
      break;
    }
  }
  return { state, events };
}

// ─── Effect helpers ───────────────────────────────────────────────

/** The target's nearest living owned stronghold (BFS from their Warlord). */
function nearestLivingStronghold(state: GameState, playerIndex: number): string | null {
  const start = state.players[playerIndex]?.warlordNodeId;
  if (!start) return null;
  // BFS outward; return the first owned, non-ashed node found.
  for (const nodeId of bfsOrder(state, start)) {
    const ns = state.board.state.nodes[nodeId];
    if (ns && !ns.ashed && ns.owner === playerIndex) return nodeId;
  }
  return null;
}

/** Move one Death Knight up to DK_MARCH_DISTANCE nodes toward the target. */
function marchDeathKnight(state: GameState, targetPlayerIndex: number): GameEvent[] {
  const events: GameEvent[] = [];
  // Pick the lowest-id Death Knight (deterministic).
  const dk = [...state.shadowking.forces]
    .filter(f => f.type === 'death_knight')
    .sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  if (!dk) return events;

  const goal = state.players[targetPlayerIndex]?.warlordNodeId;
  if (!goal) return events;

  const path = shortestPath(state, dk.nodeId, goal); // includes start
  if (path.length <= 1) return events;

  const steps = Math.min(DK_MARCH_DISTANCE, path.length - 1);
  const dest = path[steps];
  if (dest === dk.nodeId) return events;

  moveForce(state, dk.id, dest);
  events.push({
    type: 'PLAYER_ACTED',
    playerIndex: targetPlayerIndex,
    action: 'PASS',
    details: { shadowking: 'MARCH_DK', force: dk.id, from: dk.nodeId, to: dest },
  });
  return events;
}

/** Blight every owned, non-ashed node that borders ashed/blighted territory. */
function reapExposedBorders(state: GameState, amount: number): GameEvent[] {
  const events: GameEvent[] = [];
  // Snapshot exposed targets BEFORE mutating, in fixed node-id order.
  const exposed: string[] = [];
  for (const [nodeId, ns] of Object.entries(state.board.state.nodes).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (ns.ashed || ns.owner === null) continue;
    const def = state.board.definition.nodes[nodeId];
    const onBorder = def.connections.some(c => {
      const cs = state.board.state.nodes[c];
      return cs && (cs.ashed || cs.blightLevel > 0);
    });
    if (onBorder) exposed.push(nodeId);
  }
  for (const nodeId of exposed) {
    events.push(...advanceBlightOnNode(state, nodeId, amount, 'strike'));
  }
  return events;
}

// ─── Force movement ───────────────────────────────────────────────

/** Move a Shadowking force to a new node, keeping node arrays + global list in sync. */
function moveForce(state: GameState, forceId: string, toNodeId: string): void {
  const fromNode = Object.values(state.board.state.nodes).find(n =>
    n.shadowkingForces.some(f => f.id === forceId),
  );
  let moved: ShadowkingForce | undefined;
  if (fromNode) {
    const idx = fromNode.shadowkingForces.findIndex(f => f.id === forceId);
    if (idx !== -1) moved = fromNode.shadowkingForces.splice(idx, 1)[0];
  }
  const toNode = state.board.state.nodes[toNodeId];
  if (moved && toNode) {
    moved.nodeId = toNodeId;
    toNode.shadowkingForces.push(moved);
  }
  // Keep the global mirror's location in sync.
  const global = state.shadowking.forces.find(f => f.id === forceId);
  if (global) global.nodeId = toNodeId;
}

// ─── Graph helpers (deterministic BFS over the fixed board) ───────

/** Node ids in BFS order from `start` (start first), fixed connection order. */
function bfsOrder(state: GameState, start: string): string[] {
  const def = state.board.definition;
  const seen = new Set<string>([start]);
  const queue = [start];
  const order: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const nb of def.nodes[cur]?.connections ?? []) {
      if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  return order;
}

/** Shortest path start→goal (inclusive), or [start] if unreachable. */
function shortestPath(state: GameState, start: string, goal: string): string[] {
  if (start === goal) return [start];
  const def = state.board.definition;
  const prev = new Map<string, string>();
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of def.nodes[cur]?.connections ?? []) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      prev.set(nb, cur);
      if (nb === goal) {
        const path = [goal];
        let p = goal;
        while (prev.has(p)) { p = prev.get(p)!; path.unshift(p); }
        return path;
      }
      queue.push(nb);
    }
  }
  return [start];
}
