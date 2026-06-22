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
import { hasSKForcesAtNode, hasRivalAtNode, areAdjacent } from './actions.js';
import { ASHED_TRAVERSE_EXTRA_COST, RESCUE_COST } from './tunables.js';
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

  // ── Stage 4b archetype knobs (OPTIONAL; neutral value reproduces the baseline) ──
  // These let the sim express diverse strategies (aggressor … defender) WITHOUT
  // changing DEFAULT_AI_POLICY. When a policy is the DEFAULT object, chooseAction
  // takes the untouched legacy path; these knobs only steer non-default policies.

  /** Scale the fair-share Pledge up (cooperator >1) or down (turtle <1). Neutral 1. */
  readonly pledgeGenerosity?: number;
  /** 0..1 — propensity to RAID a co-located/reachable rival. Neutral 0. */
  readonly aggression?: number;
  /** 0..1 — extra RAID propensity when the rival holds the Crown. Neutral 0. */
  readonly raidLeaderBias?: number;
  /** 0..1 — prefer holding/garrisoning home over expanding outward. Neutral 0. */
  readonly defensiveness?: number;
  /** 0..1 — 1 = pure expander (baseline), low = prefer hunting combat over claiming. Neutral 1. */
  readonly claimVsRaidPref?: number;
  /** 0..1 — propensity to march toward and seize the Keystone (the Gambit). Neutral 0. */
  readonly gambitAmbition?: number;
  /** 0..1 — propensity to RESCUE an adjacent Broken ally when affordable. Neutral 0. */
  readonly rescueWillingness?: number;
  /**
   * 0..1 — propensity to CONTEST a live rival Crown's Gambit: march to the Keystone
   * and raid the claimant off it (a Gambit win ends the game, so this is urgent).
   * Neutral 0. Without it the sweep measured passive opponents, not the mechanic.
   */
  readonly gambitContest?: number;
  /**
   * 0..1 — Blood Pact traitor only (active iff this seat holds the Pact): suppress
   * pledges toward the noise floor and stop pushing the front back, to let the
   * dark reach the Keystone (§10). Neutral 0 (and inert for non-traitors).
   */
  readonly saboteurPledgeSuppression?: number;
}

/** A moderately-cooperative economic player — the Stage-3c baseline (the neutral point). */
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

  // Archetype generosity (neutral 1 ⇒ no change ⇒ DEFAULT path byte-identical).
  const generosity = policy.pledgeGenerosity ?? 1;
  if (generosity !== 1) desired = Math.max(0, Math.round(desired * generosity));

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

  let amount = Math.max(0, Math.min(desired, available));

  // Saboteur (Blood Pact traitor only): hide a thin pledge in the noise so the
  // dark advances (§10). Inert for non-traitors and in competitive mode.
  const suppression = policy.saboteurPledgeSuppression ?? 0;
  if (suppression > 0 && player.hasBloodPact) {
    amount = Math.min(amount, Math.floor(amount * (1 - suppression)));
  }

  // Honor an active Rescue debt (§5.4): in open modes the reducer ENFORCES a
  // forced-minimum pledge, so never return below it — else applyCommand rejects
  // this pledge. (Baseline games never create a debt, so this is inert for DEFAULT.)
  const debt = player.rescueDebt;
  if (debt && state.mode !== 'blood_pact' && state.round <= debt.expiresRound) {
    return Math.max(amount, Math.min(debt.forcedMinPledge, handSize));
  }

  return amount;
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
 * The DEFAULT policy takes the untouched economic baseline (`baselineAction`),
 * guaranteed byte-identical via a referential-identity guard. Archetype policies
 * (Stage 4b) get the knob-driven `archetypeAction`. Both are pure `f(state, seed)`
 * and return only LEGAL actions (so the reducer never rejects an AI command).
 */
export function chooseAction(
  state: GameState,
  playerIndex: number,
  seed: number,
  policy: AIPolicy = DEFAULT_AI_POLICY,
): PlayerAction {
  if (policy === DEFAULT_AI_POLICY) {
    return baselineAction(state, playerIndex, seed);
  }
  return archetypeAction(state, playerIndex, seed, policy);
}

/**
 * The greedy economic baseline (the Stage-3c logic, unchanged).
 *   1. STRIKE favourable co-located Shadowking forces.
 *   2. CLAIM an unclaimed Holding/Forge under the Warlord.
 *   3. MARCH toward the best reachable claimable node.
 *   4. PASS.
 */
function baselineAction(state: GameState, playerIndex: number, seed: number): PlayerAction {
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

// ─── Archetype action logic (Stage 4b — knob-driven, non-default policies) ──

/** Does this player owe `rival` a rescue debt that forbids attacking them? */
function raidDebtBlocked(state: GameState, playerIndex: number, rival: number): boolean {
  const debt = state.players[playerIndex].rescueDebt;
  return !!debt && debt.creditor === rival && state.round <= debt.expiresRound;
}

/** Is `rival` the current leader (Crown holder)? */
function isLeader(state: GameState, rival: number): boolean {
  return state.crownHolder === rival || state.players[rival]?.crownHeld === true;
}

/** First legal step from the Warlord toward `goal` (BFS, ZoC-respecting), or null. */
function firstStepTowardNode(state: GameState, playerIndex: number, goal: string): string | null {
  const def = state.board.definition;
  const start = state.players[playerIndex].warlordNodeId;
  if (start === goal) return null;
  const visited = new Set<string>([start]);
  const queue: Array<{ node: string; firstStep: string | null }> = [{ node: start, firstStep: null }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of def.nodes[cur.node].connections) {
      if (visited.has(nb)) continue;
      if (stepBlocked(state, playerIndex, nb)) continue;
      const firstStep = cur.firstStep ?? nb;
      if (nb === goal) return firstStep;
      visited.add(nb);
      queue.push({ node: nb, firstStep });
    }
  }
  return null;
}

/** First legal step toward the nearest rival Warlord (BFS), or null. */
function firstStepTowardNearestRival(state: GameState, playerIndex: number): string | null {
  const def = state.board.definition;
  const start = state.players[playerIndex].warlordNodeId;
  const visited = new Set<string>([start]);
  const queue: Array<{ node: string; firstStep: string | null }> = [{ node: start, firstStep: null }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of def.nodes[cur.node].connections) {
      if (visited.has(nb)) continue;
      if (stepBlocked(state, playerIndex, nb)) continue;
      const firstStep = cur.firstStep ?? nb;
      if (hasRivalAtNode(state, playerIndex, nb) !== null) return firstStep;
      visited.add(nb);
      queue.push({ node: nb, firstStep });
    }
  }
  return null;
}

/** A Broken ally co-located with or adjacent to the Warlord (for RESCUE), or null. */
function rescuableAlly(state: GameState, playerIndex: number): number | null {
  const here = state.players[playerIndex].warlordNodeId;
  for (const p of state.players) {
    if (p.index === playerIndex || !p.isBroken) continue;
    if (p.warlordNodeId === here || areAdjacent(state, here, p.warlordNodeId)) return p.index;
  }
  return null;
}

/**
 * Knob-driven action for a non-default (archetype) policy. Every returned action
 * is validated legal here so the reducer never rejects it. Pure `f(state, seed)`.
 */
function archetypeAction(
  state: GameState,
  playerIndex: number,
  seed: number,
  policy: AIPolicy,
): PlayerAction {
  const player = state.players[playerIndex];
  const here = player.warlordNodeId;
  const rng = decisionRng(state, playerIndex, seed, 1 + player.actionsRemaining);

  const aggression = policy.aggression ?? 0;
  const raidLeaderBias = policy.raidLeaderBias ?? 0;
  const defensiveness = policy.defensiveness ?? 0;
  const claimVsRaid = policy.claimVsRaidPref ?? 1;
  const gambitAmbition = policy.gambitAmbition ?? 0;
  const rescueWillingness = policy.rescueWillingness ?? 0;
  const gambitContest = policy.gambitContest ?? 0;
  // A traitor sabotaging the table won't push the front back (it wants the doom).
  const sabotaging = (policy.saboteurPledgeSuppression ?? 0) > 0 && player.hasBloodPact;

  // 0. CONTEST a live rival Gambit — a Gambit win ends the game, so this is the
  //    most urgent thing on the board. Raid the claimant off the Keystone if
  //    co-located, else march toward it. (The saboteur traitor WANTS others to
  //    lose, so it doesn't bother contesting.)
  const gambit = state.gambit;
  if (gambitContest > 0 && !sabotaging && gambit && gambit.claimant !== playerIndex && !state.bloodPactExposed) {
    if (rng.float() < gambitContest) {
      const ks = state.board.definition.keystoneId;
      if (here === ks && hasRivalAtNode(state, playerIndex, here) === gambit.claimant
          && !raidDebtBlocked(state, playerIndex, gambit.claimant)) {
        return { type: 'RAID', targetPlayerIndex: gambit.claimant };
      }
      const step = firstStepTowardNode(state, playerIndex, ks);
      if (step !== null && player.banners >= marchCost(state, step)) {
        return { type: 'MARCH', targetNodeId: step };
      }
    }
  }

  // 1. RESCUE a Broken ally (cooperator).
  if (rescueWillingness > 0 && player.hand.length >= RESCUE_COST) {
    const ally = rescuableAlly(state, playerIndex);
    if (ally !== null && rng.float() < rescueWillingness) {
      return { type: 'RESCUE', targetPlayerIndex: ally };
    }
  }

  // 2. RAID a co-located rival we can beat (aggressor / opportunist).
  const rival = hasRivalAtNode(state, playerIndex, here);
  if (rival !== null && aggression > 0 && !raidDebtBlocked(state, playerIndex, rival)) {
    const mine = getPlayerPowerAtNode(state, playerIndex, here);
    const theirs = getPlayerPowerAtNode(state, rival, here);
    if (mine >= theirs) {
      const eff = Math.min(1, aggression + (isLeader(state, rival) ? raidLeaderBias : 0));
      if (rng.float() < eff) return { type: 'RAID', targetPlayerIndex: rival };
    }
  }

  // 3. STRIKE favourable co-located Shadowking forces (front pushback / defense).
  //    A sabotaging traitor skips this — it wants the dark to advance.
  if (!sabotaging && hasSKForcesAtNode(state, here) && player.hand.length > 0) {
    if (getPlayerPowerAtNode(state, playerIndex, here) >= getShadowkingPowerAtNode(state, here)) {
      return { type: 'STRIKE' };
    }
  }

  // 4. GAMBIT — march toward the Keystone (gambler).
  if (gambitAmbition > 0 && here !== state.board.definition.keystoneId && rng.float() < gambitAmbition) {
    const step = firstStepTowardNode(state, playerIndex, state.board.definition.keystoneId);
    if (step !== null && player.banners >= marchCost(state, step)) {
      return { type: 'MARCH', targetNodeId: step };
    }
  }

  // 5. HUNT — march toward the nearest rival (aggressor who prefers combat to claiming).
  if (aggression > 0 && claimVsRaid < 0.5 && rival === null && rng.float() < aggression) {
    const step = firstStepTowardNearestRival(state, playerIndex);
    if (step !== null && player.banners >= marchCost(state, step)) {
      return { type: 'MARCH', targetNodeId: step };
    }
  }

  // 6. CLAIM the node we're standing on.
  if (player.banners >= 1 && claimValue(state, here) > 0) {
    return { type: 'CLAIM' };
  }

  // 7. MARCH toward the best reachable claimable node. A defender only expands to a
  //    directly-adjacent claimable (the first step IS the prize); otherwise it holds.
  const step = bestStepToward(state, playerIndex, rng);
  if (step !== null && player.banners >= marchCost(state, step)) {
    if (defensiveness >= 0.7 && claimValue(state, step) <= 0) {
      return { type: 'PASS' }; // hold position rather than march out
    }
    return { type: 'MARCH', targetNodeId: step };
  }

  // 8. Nothing useful — end the turn.
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
