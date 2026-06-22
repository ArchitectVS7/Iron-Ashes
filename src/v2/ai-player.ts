/**
 * AI Player — deterministic decision policy for pledge + actions (Stage 3c).
 *
 * ALGORITHM §7.9: "AI decisions are pure `f(state, seed)`" — both the AI
 * *pledge* and the AI *action* choices must be reproducible from the seed so the
 * "scripted inputs ⇒ identical game" invariant (§7.12) holds for AI-driven games.
 * This is what the Stage-4/5 ML harness drives to measure balance against the REAL
 * rules (never a parallel rules path — see docs/ML-SYSTEM-ANALYSIS.md).
 *
 * Design:
 *   - The CHOOSERS (`choosePledge`, `chooseAction`) are pure functions of
 *     `(state, playerIndex, seed, policy)`. They read live state but draw any
 *     randomness only from a `SeededRandom` derived deterministically from the
 *     inputs — never `Math.random()` / `Date.now()` (§7.1).
 *   - The DRIVERS (`runAIPledge`, `runAITurn`) route every decision through the
 *     ONE `applyCommand` reducer (no shortcut mutation), so AI and human inputs
 *     share a single code path.
 *
 * The policy is a small, named, tunable object (`AIPolicy`) so Stage 5 can sweep
 * its knobs. The default is a moderately-cooperative economic player: it pledges
 * a fair share against the threat (more if it is the named target, sometimes less
 * if it is inclined to free-ride), then greedily expands its territory.
 */

import type { Command, PlayerAction } from './commands.js';
import type { GameEvent } from './events.js';
import type { GameState } from './types.js';
import { applyCommand, type CommandResult } from './reducer.js';
import { getPlayerPowerAtNode, getShadowkingPowerAtNode } from './combat.js';
import { hasSKForcesAtNode } from './actions.js';
import { ASHED_TRAVERSE_EXTRA_COST } from './tunables.js';
import { SeededRandom } from '../utils/seeded-random.js';

// ─── Policy ───────────────────────────────────────────────────────

/**
 * Tunable knobs for the AI's behaviour (Stage 5 sweeps these).
 * Kept deliberately small — the policy is a heuristic, not a planner.
 */
export interface AIPolicy {
  /**
   * 0..1 — chance a NON-targeted player shaves one card off its fair-share
   * pledge (the free-rider lean). 0 = always pay fair share; 1 = always shave.
   * This is the lever the Stage-5 sim uses to probe the free-rider incentive
   * (ALGORITHM §4.2 step 5 — the primary balance risk).
   */
  readonly selfishness: number;
  /**
   * Fraction of the doom threshold a NAMED/STRUCK player tries to cover on its
   * own (it has the most to lose, so it pledges harder).
   */
  readonly targetCover: number;
  /**
   * Keep at least this many cards in hand when pledging, as a reserve for
   * combat commits / Rescue (cards — not banners — pay for those).
   */
  readonly handReserve: number;
}

/** A moderately-cooperative economic player — the Stage-3c baseline. */
export const DEFAULT_AI_POLICY: AIPolicy = {
  selfishness: 0.34,
  targetCover: 0.5,
  handReserve: 1,
};

// ─── Deterministic sub-stream ─────────────────────────────────────

/**
 * Derive a per-decision `SeededRandom`. Folding the round, a phase ordinal, the
 * player index and a salt into the seed gives each decision point an independent
 * but fully reproducible stream (§7.1 — single source of randomness, threaded).
 */
function decisionRng(state: GameState, playerIndex: number, seed: number, salt: number): SeededRandom {
  const phaseOrdinal = ['THREAT', 'PLEDGE', 'ACTION', 'DAWN'].indexOf(state.phase);
  const derived = seed + state.round * 1000 + phaseOrdinal * 100 + playerIndex * 10 + salt;
  return new SeededRandom(derived);
}

// ─── Pledge policy (§4.2) ─────────────────────────────────────────

/**
 * Decide how many cards player `playerIndex` pledges this round (0..hand.length).
 *
 * Heuristic: cover a fair share of the threshold; pay harder if named/struck;
 * sometimes shave a card if inclined to free-ride; never spend below the combat
 * reserve. Pure `f(state, seed)` — same inputs ⇒ same amount.
 */
export function choosePledge(
  state: GameState,
  playerIndex: number,
  seed: number,
  policy: AIPolicy = DEFAULT_AI_POLICY,
): number {
  const player = state.players[playerIndex];
  const telegraph = state.shadowking.telegraph;
  if (!telegraph) return 0;

  const handSize = player.hand.length;
  if (handSize === 0) return 0;

  const C = telegraph.doomCost;
  if (C <= 0) return 0;

  // Am I the one in the crosshairs? (named by the strike, or named by my Gambit)
  const struck = telegraph.struckPlayerIndex === playerIndex;
  const gambitNamed = state.gambit?.named === true && state.gambit.claimant === playerIndex;
  const amInDanger = struck || gambitNamed;

  // Fair share of the threshold, split across all (Pledge-eligible) players.
  const fairShare = Math.ceil(C / Math.max(state.players.length, 1));
  let desired = amInDanger ? Math.ceil(C * policy.targetCover) : fairShare;

  // Free-rider lean: when not personally threatened, sometimes contribute less.
  if (!amInDanger) {
    const rng = decisionRng(state, playerIndex, seed, 0);
    if (rng.float() < policy.selfishness) {
      desired = Math.max(0, desired - 1);
    }
  }

  // Never pledge below the combat reserve (cards also pay for combat / Rescue).
  // A player in danger will dip into the reserve to save itself.
  const reserve = amInDanger ? 0 : policy.handReserve;
  const available = Math.max(0, handSize - reserve);

  return Math.max(0, Math.min(desired, available));
}

// ─── Action policy (§4.3) ─────────────────────────────────────────

/** Value of claiming/holding `nodeId` from `playerIndex`'s perspective (0 = not worth it). */
function claimValue(state: GameState, nodeId: string): number {
  const nodeState = state.board.state.nodes[nodeId];
  const nodeDef = state.board.definition.nodes[nodeId];
  if (!nodeState || !nodeDef) return 0;
  if (nodeState.ashed || nodeState.owner !== null) return 0;
  if (nodeDef.tier === 'forge') return 3; // matches FORGE_WEIGHT — Forges drive the Crown
  if (nodeDef.tier === 'holding') return 1;
  return 0;
}

/** Banner cost to MARCH into `nodeId` (1, +extra if the node is ashed). */
function marchCost(state: GameState, nodeId: string): number {
  return 1 + (state.board.state.nodes[nodeId]?.ashed ? ASHED_TRAVERSE_EXTRA_COST : 0);
}

/**
 * Can `playerIndex` step from `fromId` into `toId` without hitting a hard wall?
 * Mirrors the reducer's Zone-of-Control rule: a held/garrisoned Approach can't be
 * marched into — so the AI never proposes a MARCH the reducer would reject.
 */
function stepBlocked(state: GameState, playerIndex: number, toId: string): boolean {
  const toDef = state.board.definition.nodes[toId];
  if (toDef?.tier !== 'approach') return false;
  // A rival Warlord holding the Approach blocks it.
  for (const p of state.players) {
    if (p.index !== playerIndex && p.warlordNodeId === toId) return true;
  }
  // Shadowking forces on the Approach block it too.
  return hasSKForcesAtNode(state, toId);
}

/**
 * Breadth-first search from the Warlord for the best reachable claimable node,
 * returning the FIRST step toward it (or null if nothing worth moving to).
 *
 * Ranking (all integer / deterministic): higher value-per-distance wins, then
 * shorter distance, then lexicographically-smaller first step. A `SeededRandom`
 * breaks only exact full ties, so the choice is reproducible from the seed.
 */
function bestStepToward(state: GameState, playerIndex: number, rng: SeededRandom): string | null {
  const def = state.board.definition;
  const start = state.players[playerIndex].warlordNodeId;

  const visited = new Set<string>([start]);
  const queue: Array<{ node: string; firstStep: string | null; dist: number }> = [
    { node: start, firstStep: null, dist: 0 },
  ];

  let best: { firstStep: string; value: number; dist: number } | null = null;

  while (queue.length > 0) {
    const cur = queue.shift()!;

    // Evaluate `cur` as a candidate target (the start node itself is handled by CLAIM).
    if (cur.firstStep !== null) {
      const value = claimValue(state, cur.node);
      if (value > 0) {
        if (best === null) {
          best = { firstStep: cur.firstStep, value, dist: cur.dist };
        } else {
          // Compare value/dist via cross-multiply (avoid floating point).
          const lhs = value * best.dist;
          const rhs = best.value * cur.dist;
          if (
            lhs > rhs ||
            (lhs === rhs && cur.dist < best.dist) ||
            (lhs === rhs && cur.dist === best.dist && cur.firstStep < best.firstStep) ||
            (lhs === rhs && cur.dist === best.dist && cur.firstStep === best.firstStep && rng.float() < 0.5)
          ) {
            best = { firstStep: cur.firstStep, value, dist: cur.dist };
          }
        }
      }
    }

    for (const nb of def.nodes[cur.node].connections) {
      if (visited.has(nb)) continue;
      if (stepBlocked(state, playerIndex, nb)) continue;
      visited.add(nb);
      queue.push({ node: nb, firstStep: cur.firstStep ?? nb, dist: cur.dist + 1 });
    }
  }

  return best ? best.firstStep : null;
}

/**
 * Decide a single ACTION for player `playerIndex`. Called repeatedly by
 * `runAITurn` until the player passes or runs out of actions.
 *
 * Priority (greedy economic baseline):
 *   1. STRIKE  — clear co-located Shadowking forces when the fight is favourable
 *                (pushes back the Blight, defends the player's lands).
 *   2. CLAIM   — bank an unclaimed Holding/Forge the Warlord is standing on.
 *   3. MARCH   — step toward the best reachable claimable node.
 *   4. PASS    — nothing useful to do (no banners / nowhere worth going).
 *
 * Pure `f(state, seed)`.
 */
export function chooseAction(
  state: GameState,
  playerIndex: number,
  seed: number,
  _policy: AIPolicy = DEFAULT_AI_POLICY,
): PlayerAction {
  const player = state.players[playerIndex];
  const nodeId = player.warlordNodeId;

  // 1. STRIKE co-located Shadowking forces if we can win and have a card to commit.
  if (hasSKForcesAtNode(state, nodeId) && player.hand.length > 0) {
    const mine = getPlayerPowerAtNode(state, playerIndex, nodeId);
    const theirs = getShadowkingPowerAtNode(state, nodeId);
    if (mine >= theirs) {
      return { type: 'STRIKE' };
    }
  }

  // 2. CLAIM the node we're standing on, if it's worth banking and we can afford it.
  if (player.banners >= 1 && claimValue(state, nodeId) > 0) {
    return { type: 'CLAIM' };
  }

  // 3. MARCH toward the best reachable claimable node, if affordable.
  const rng = decisionRng(state, playerIndex, seed, 1 + player.actionsRemaining);
  const step = bestStepToward(state, playerIndex, rng);
  if (step !== null && player.banners >= marchCost(state, step)) {
    return { type: 'MARCH', targetNodeId: step };
  }

  // 4. Nothing useful — end the turn.
  return { type: 'PASS' };
}

// ─── Drivers (route through applyCommand) ─────────────────────────

/** Hard upper bound on AI actions per turn — defends against any decision loop. */
const MAX_AI_ACTIONS_PER_TURN = 16;

/**
 * Submit player `playerIndex`'s pledge through the reducer.
 * No-op-safe: throws only if the engine itself rejects the (valid) amount.
 */
export function runAIPledge(
  state: GameState,
  playerIndex: number,
  seed: number = state.seed,
  policy: AIPolicy = DEFAULT_AI_POLICY,
): CommandResult {
  const amount = choosePledge(state, playerIndex, seed, policy);
  const command: Command = { type: 'SUBMIT_PLEDGE', playerIndex, amount };
  return applyCommand(state, command);
}

/**
 * Run player `playerIndex`'s entire ACTION turn through the reducer: choose and
 * apply actions until the player passes, exhausts its actions (the reducer then
 * advances the active pointer away), or the game ends. Returns the resulting
 * state plus the accumulated events.
 *
 * The `MAX_AI_ACTIONS_PER_TURN` guard is a belt-and-braces stop: the loop already
 * terminates naturally when `activePlayerIndex` moves off this player.
 */
export function runAITurn(
  state: GameState,
  playerIndex: number,
  seed: number = state.seed,
  policy: AIPolicy = DEFAULT_AI_POLICY,
): CommandResult {
  let current = state;
  const events: GameEvent[] = [];
  let guard = 0;

  // Stop on actionsRemaining too: after the LAST player in turn order exhausts
  // its actions, `advanceActivePlayer` leaves `activePlayerIndex` pointing at it
  // (the pointer only moves while positions remain) — so the index alone would
  // loop us back into a player with 0 actions left.
  while (
    current.gameEndReason === null &&
    current.phase === 'ACTION' &&
    current.activePlayerIndex === playerIndex &&
    current.players[playerIndex].actionsRemaining > 0 &&
    guard < MAX_AI_ACTIONS_PER_TURN
  ) {
    guard++;
    const action = chooseAction(current, playerIndex, seed, policy);
    const result = applyCommand(current, { type: 'PLAYER_ACTION', playerIndex, action });
    current = result.state;
    events.push(...result.events);
    if (action.type === 'PASS') break;
  }

  return { state: current, events };
}
