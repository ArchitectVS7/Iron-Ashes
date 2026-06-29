/**
 * AI Player — deterministic decision policy for pledge + actions (Stage 3c).
 *
 * ALGORITHM §7.9: "AI decisions are pure `f(state, seed)`" — both the AI
 * *pledge* and the AI *action* choices must be reproducible from the seed so the
 * "scripted inputs ⇒ identical game" invariant (§7.12) holds for AI-driven games.
 * This is what the Stage-4/5 ML harness drives to measure balance against the REAL
 * rules (never a parallel rules path — see docs/design-history/ML-SYSTEM-ANALYSIS.md).
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
import {
  getPlayerPowerAtNode, getShadowkingPowerAtNode, chooseCombatCommit, chooseRaidAttackCommit,
  effectiveCaptureMargin, trailingDefenseBonus, stewardHomeDefenseBonus,
} from './combat.js';
import { hasSKForcesAtNode, hasRivalAtNode, findOath, areSworn, parleyTarget } from './actions.js';
import { legalRaidTargets, canCapture, capturableRetainerOwnersAt } from './capture.js';
import {
  ASHED_TRAVERSE_EXTRA_COST, COMBAT_COMMIT_MAX, FORGE_WEIGHT, getTunables,
} from './tunables.js';
import type { RaidEffect } from './commands.js';
import { SeededRandom } from '../utils/seeded-random.js';

/**
 * Hunt radius (board steps) for the DEFAULT policy's modest capture-positioning (Stage 5a). The
 * greedy baseline only detours toward a capturable rival hostage within this many steps — an
 * opportunistic pounce-on-the-way, never a cross-map chase — so captures stay rare-but-dramatic
 * and never become a dominant strategy. Not a balance tunable (an AI-heuristic constant).
 */
const CAPTURE_HUNT_RADIUS = 3;

/**
 * Per-turn chance the DEFAULT policy redeems one of its own captured retainers (Stage 5a). Held
 * below 1 so only SOME captures are bought back — the capture→ransom-back attachment proxy (§13)
 * should land in the ~20–40% band, not redeem every hostage. Not a balance tunable (AI heuristic).
 */
const DEFAULT_SELF_RANSOM_CHANCE = 0.10;

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
  /**
   * 0..1 — propensity to HUNT the dark: march toward and STRIKE a beatable Death
   * Knight (Stage 5-dark). Neutral 0 (baseline never hunts). The kill clears the
   * forcing-function block AND claims the node, so hunters contest DK-held ground.
   */
  readonly darkHuntBias?: number;
  /**
   * 0..1 — willingness to pay a Forge toll to charge through a rival's gate (§ tolls).
   * ≥0.5 pays/charges through; <0.5 routes around (skips the tolled step). Neutral 0.
   */
  readonly forgeValuation?: number;
  /** 0..1 — propensity to RECRUIT a Herald (commit to the political/deep-hand build). Neutral 0. */
  readonly heraldAffinity?: number;
  /** 0..1 — propensity to PARLEY (Herald pushback vs the dark) when political. Neutral 0. */
  readonly parleyBias?: number;
  /** 0..1 — propensity to SWEAR an Oath with an oath-free rival (§ Oaths). Neutral 0. */
  readonly oathWillingness?: number;
  /**
   * 0..1 — loyalty to a sworn Oath: 1 = honor to maturity, low = BREAK when able for
   * the banner burst (climbing the dark's Ledger). Neutral undefined ⇒ never breaks.
   */
  readonly oathLoyalty?: number;
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
  /**
   * 0..1 — willingness to BAIL OUT a Gambit claimant: pledge extra to keep the dark
   * off the Keystone during a named Gambit, even though it may let the claimant WIN
   * (§B — the sealed-pledge volunteer's dilemma). Neutral 0 ⇒ never bails (DEFAULT
   * path byte-identical). The SEAL changes HOW this fires: when the claimant's pledge
   * is OPEN the table coordinates (one designated rival covers); when SEALED each rival
   * volunteers INDEPENDENTLY with prob BAILOUT_BASE_PCT·bailoutTrust — a real bluff
   * (under-provision when everyone hopes someone else covers; waste when several do).
   */
  readonly bailoutTrust?: number;

  // ── Stage V3-4b verb knobs (OPTIONAL; the new v3 verbs the sim must exercise) ──
  // Neutral (undefined ⇒ 0) reproduces the pre-4b archetype behaviour. They only steer
  // NON-default policies (archetypeAction); the DEFAULT_AI_POLICY path is untouched.

  /**
   * 0..1 — on a winning RAID, propensity to ELECT a piece-effect (CAPTURE/ROUT) over the
   * default TAKE_LAND (§5.2). CAPTURE fires when the predicted margin clears the standing-
   * scaled gate AND a legal capturable retainer is present; otherwise it ROUTs (a throw-safe
   * tempo blow). Neutral 0 ⇒ the RAID always takes land (the pre-4b path). Captures feed the
   * RANSOM/attachment economy the sim measures.
   */
  readonly captureBias?: number;
  /**
   * 0..1 — propensity to RANSOM one of your OWN captured retainers back when affordable
   * (RANSOM_COST cards + RANSOM_BANNERS banners). Self-ransom has no locality cost (§5.3).
   * Neutral 0. The capture→ransom-back loop is the §13 attachment proxy.
   */
  readonly ransomBias?: number;
  /**
   * 0..1 — in RECKONING, propensity to ASSAULT_HEART the dark's exposed heart (and to MARCH
   * the Warlord toward the Keystone to reach it) — the kill-the-dark commit (§5.6). Neutral 0.
   */
  readonly heartBias?: number;
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

  // Gambit bail-out (§B — the sealed-pledge volunteer's dilemma). A rival may pledge
  // EXTRA to keep the dark off the Keystone during a named Gambit, even though it may
  // hand the claimant the win. The SEAL is what makes this a bluff:
  //   • OPEN   → the table coordinates: exactly ONE designated rival (most spare cards,
  //              seat tiebreak) covers. Reliable, no waste.
  //   • SEALED → no coordination: each rival volunteers INDEPENDENTLY (prob below), so
  //              coverage is noisy — sometimes nobody covers, sometimes several do.
  const bailoutTrust = policy.bailoutTrust ?? 0;
  const gambit = state.gambit;
  if (bailoutTrust > 0 && gambit?.named === true && gambit.claimant !== playerIndex && !amInDanger) {
    const coverNeed = Math.min(Math.max(0, available - amount), Math.ceil(C * getTunables().GAMBIT_COVER_FRACTION));
    if (coverNeed > 0) {
      // SEALED → each rival volunteers independently (a bluff); OPEN → the single
      // best-positioned rival covers (coordination, no waste).
      const bail = isClaimantSealed(state)
        ? decisionRng(state, playerIndex, seed, 1).float() < getTunables().BAILOUT_BASE_PCT * bailoutTrust
        : designatedBailer(state, playerIndex);
      if (bail) amount = Math.min(available, amount + coverNeed);
    }
  }

  // Saboteur (Blood Pact traitor only) — the cover-vs-sabotage bluff (§5e). Inert for
  // non-traitors and in competitive mode.
  const suppression = policy.saboteurPledgeSuppression ?? 0;
  if (suppression > 0 && player.hasBloodPact) {
    // The cover-vs-sabotage bluff (§5e). SABOTEUR_COVER = the fraction of rounds the traitor
    // plays COVER (pledges into the 'medium' tier → invisible to the Suspicion Log) instead of
    // sabotaging. Higher = blends more = survives longer = wins more, but the dark advances less.
    // Cover pledges genuinely help the table block — the price of passing as loyal.
    const cover = getTunables().SABOTEUR_COVER;
    const blend = decisionRng(state, playerIndex, seed, 2).float() < cover;
    if (blend) {
      amount = Math.max(amount, Math.min(available, Math.ceil(handSize * getTunables().SABOTEUR_COVER_PLEDGE_FRACTION)));
    } else {
      // SABOTAGE: suppress toward the noise floor so the dark advances (the detectable tell).
      amount = Math.min(amount, Math.floor(amount * (1 - suppression)));
    }
  }

  return amount;
}

/** Is the current Gambit claimant's pledge SEALED this round? (§B — mirrors the
 *  reducer's isPledgeSealed for the claimant: blood_pact always; competitive per
 *  SEALED_CORE_PLEDGE 'all' | 'gambit_claimant'.) */
export function isClaimantSealed(state: GameState): boolean {
  if (state.gambit?.named !== true) return false;
  if (state.mode === 'blood_pact') return true;
  const m = getTunables().SEALED_CORE_PLEDGE;
  return m === 'all' || m === 'gambit_claimant';
}

/** In OPEN play the table coordinates: the non-claimant rival with the most spare
 *  cards (seat-index tiebreak) is the single designated bail-out coverer. Pure. */
function designatedBailer(state: GameState, playerIndex: number): boolean {
  const claimant = state.gambit?.claimant;
  let bestSeat = -1;
  let bestHand = -1;
  for (const p of state.players) {
    if (p.index === claimant || p.isEliminated) continue;
    if (p.hand.length > bestHand) {
      bestHand = p.hand.length;
      bestSeat = p.index;
    }
  }
  return bestSeat === playerIndex;
}

// ─── Action policy (§4.3) ─────────────────────────────────────────

/** Value of claiming/holding `nodeId` from `playerIndex`'s perspective (0 = not worth it). */
function claimValue(state: GameState, nodeId: string): number {
  const nodeState = state.board.state.nodes[nodeId];
  const nodeDef = state.board.definition.nodes[nodeId];
  if (!nodeState || !nodeDef) return 0;
  if (nodeState.ashed || nodeState.owner !== null) return 0;
  // The dark holds the ground (Stage 5-dark): a DK on the node blocks the claim, so
  // it is not a CLAIM/MARCH target for any policy — hunters route to it via the Hunt
  // path instead (and the kill itself claims it). Keeps the AI from proposing an
  // illegal CLAIM the reducer would reject.
  if (getTunables().DK_BLOCKS_CLAIM && nodeState.shadowkingForces.length > 0) return 0;
  if (nodeDef.tier === 'forge') return FORGE_WEIGHT; // Forges drive the Crown (matches the territory weight)
  if (nodeDef.tier === 'holding') return 1;
  return 0;
}

/**
 * Can `playerIndex` WIN a STRIKE against the Shadowking force at `nodeId`? Mirrors
 * the reducer's value-aware auto-commit (`chooseCombatCommit`): true iff base power
 * plus the best affordable card commit strictly exceeds the SK force power. Fixes
 * the old gate that compared base power ALONE (a power-3 Warlord never struck a
 * power-4 DK even holding a winning card). Pure `f(state)`.
 */
function canStrikeWin(state: GameState, playerIndex: number, nodeId: string): boolean {
  const skPower = getShadowkingPowerAtNode(state, nodeId);
  if (skPower <= 0) return false;
  const base = getPlayerPowerAtNode(state, playerIndex, nodeId);
  const cards = chooseCombatCommit(state.players[playerIndex].hand, base, skPower, COMBAT_COMMIT_MAX);
  const total = base + cards.reduce((s, v) => s + v, 0);
  return total > skPower;
}

/**
 * Predict the FINAL margin of a RAID by `attacker` on `defender` at `node`, mirroring the
 * reducer's value-aware commits (combat-arithmetic only — no RNG). The reducer sizes the
 * attacker to beat the defender's BASE power + RAID_DEFENSE_MARGIN and gives the defender its
 * single best card; `executeRaid` adds the standing/Steward defenseBonus.
 *
 * Margin = atkPower − defPower. A POSITIVE margin means the attacker wins the FIRST exchange.
 * Crucially, `chooseLastStandCards` only ever commits cards when they FULLY reverse the result
 * (else it commits none) — so when the attacker ultimately WINS, the final margin equals THIS
 * predicted margin. That makes a margin-gated CAPTURE election throw-safe: either the defender
 * reverses (defender wins ⇒ no capture branch) or it cannot (margin unchanged ⇒ gate holds).
 * Pure `f(state)`.
 */
function predictRaidMargin(
  state: GameState, attacker: number, defender: number, node: string, capture = false,
): number {
  const atkBase = getPlayerPowerAtNode(state, attacker, node);
  const defBase = getPlayerPowerAtNode(state, defender, node);
  // Mirror the reducer's INTENT-sized commit (chooseRaidAttackCommit) so a capture
  // check predicts the SAME margin the reducer will realize (throw-safe, §5.2 / Stage 5a).
  const atkCards = chooseRaidAttackCommit(state, attacker, defender, node, capture);
  const defCards = chooseCombatCommit(state.players[defender].hand, defBase, atkBase, 1);
  const defenseBonus = trailingDefenseBonus(state, attacker, defender) + stewardHomeDefenseBonus(state, defender, node);
  const atkPower = atkBase + atkCards.reduce((s, v) => s + v, 0);
  const defPower = defBase + defCards.reduce((s, v) => s + v, 0) + defenseBonus;
  return atkPower - defPower;
}

/**
 * Build a RAID action, electing a piece-effect when `captureBias` fires and a retainer is present
 * (§5.2). Throw-safe by construction (see `predictRaidMargin`):
 *   • CAPTURE — only when a legal capturable target exists AND the predicted margin clears the
 *     standing-scaled `effectiveCaptureMargin` (so the reducer's margin gate can never reject it).
 *   • ROUT    — when we predict a win (margin > 0) but cannot or will not capture; no margin gate.
 *   • TAKE_LAND (default) — otherwise, the unchanged pre-4b shape `{ type, targetPlayerIndex }`
 *     (NO raidEffect/pieceId fields), so an empty-roster RAID stays byte-identical.
 * Pure `f(state, seed)` via the supplied decision RNG.
 */
function raidWithElect(
  state: GameState, attacker: number, defender: number, node: string,
  captureBias: number, rng: SeededRandom,
): PlayerAction {
  const plain: PlayerAction = { type: 'RAID', targetPlayerIndex: defender };
  const targets = legalRaidTargets(state, defender, node);
  if (targets.length === 0 || captureBias <= 0 || rng.float() >= captureBias) return plain;

  const capTarget = targets.find(id => canCapture(state, defender, node, id));
  // Capture uses the INTENT-sized margin (the reducer up-sizes a capture commit); ROUT/land
  // use the thin default-sized margin — each predicted exactly as the reducer will realize.
  if (capTarget !== undefined
      && predictRaidMargin(state, attacker, defender, node, true) >= effectiveCaptureMargin(state, attacker)) {
    const effect: RaidEffect = 'CAPTURE_PIECE';
    return { type: 'RAID', targetPlayerIndex: defender, raidEffect: effect, pieceId: capTarget };
  }
  if (predictRaidMargin(state, attacker, defender, node) > 0) {
    const effect: RaidEffect = 'ROUT_PIECE';
    return { type: 'RAID', targetPlayerIndex: defender, raidEffect: effect, pieceId: targets[0] };
  }
  return plain;
}

/**
 * The best CAPTURE the attacker can elect at `node` under the loosened rule (§5.2, Stage 5e):
 * the lowest-seat unsworn rival with a co-located capturable retainer whose intent-sized RAID
 * clears the standing-scaled `effectiveCaptureMargin` (so the reducer's gate can never reject it
 * — predictRaidMargin is mirror-exact). The retainer's Warlord NEED NOT be present. Returns the
 * defender seat + piece, or null when no margin-clearing hostage stands here. Pure `f(state)`.
 */
function bestLooseCaptureAt(
  state: GameState, attacker: number, node: string,
): { defender: number; pieceId: string } | null {
  for (const seat of capturableRetainerOwnersAt(state, attacker, node)) {
    if (areSworn(state, attacker, seat)) continue;
    const pieceId = legalRaidTargets(state, seat, node).find(id => canCapture(state, seat, node, id));
    if (pieceId !== undefined
        && predictRaidMargin(state, attacker, seat, node, true) >= effectiveCaptureMargin(state, attacker)) {
      return { defender: seat, pieceId };
    }
  }
  return null;
}

/**
 * First legal step from the Warlord toward the nearest huntable Death Knight — one
 * sitting on a claimable (unclaimed, living Holding/Forge) node, i.e. ground the
 * dark is denying us. Returns null if none reachable (Stage 5-dark). BFS,
 * ZoC-respecting, deterministic; the win check happens on arrival via `canStrikeWin`.
 */
function bestStepTowardHuntableDK(state: GameState, playerIndex: number): string | null {
  const def = state.board.definition;
  const start = state.players[playerIndex].warlordNodeId;
  const visited = new Set<string>([start]);
  const queue: Array<{ node: string; firstStep: string | null }> = [{ node: start, firstStep: null }];

  const isHuntable = (nodeId: string): boolean => {
    const ns = state.board.state.nodes[nodeId];
    const nd = def.nodes[nodeId];
    if (!ns || !nd) return false;
    if (ns.shadowkingForces.length === 0) return false;
    if (ns.ashed || ns.owner !== null) return false;
    return nd.tier === 'holding' || nd.tier === 'forge';
  };

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.firstStep !== null && isHuntable(cur.node)) return cur.firstStep;
    for (const nb of def.nodes[cur.node].connections) {
      if (visited.has(nb)) continue;
      if (stepBlocked(state, playerIndex, nb)) continue;
      visited.add(nb);
      queue.push({ node: nb, firstStep: cur.firstStep ?? nb });
    }
  }
  return null;
}

/** Banner cost to MARCH into `nodeId` (1, +extra if the node is ashed). */
function marchCost(state: GameState, nodeId: string): number {
  return 1 + (state.board.state.nodes[nodeId]?.ashed ? ASHED_TRAVERSE_EXTRA_COST : 0);
}

/** Forge-as-Gate toll `playerIndex` owes to march INTO `nodeId` (0 if none); mirrors executeMarch. */
function forgeToll(state: GameState, playerIndex: number, nodeId: string): number {
  const t = getTunables().FORGE_TOLL_COST;
  if (t <= 0) return 0;
  const ns = state.board.state.nodes[nodeId];
  const def = state.board.definition.nodes[nodeId];
  if (def?.tier !== 'forge' || !ns || ns.ashed) return 0;
  if (ns.owner === null || ns.owner === playerIndex) return 0;
  if (areSworn(state, playerIndex, ns.owner)) return 0;
  return t;
}

/** Total banners to MARCH into `nodeId` (march cost + any Forge toll) — keeps the AI's affordability honest. */
function marchCostFor(state: GameState, playerIndex: number, nodeId: string): number {
  return marchCost(state, nodeId) + forgeToll(state, playerIndex, nodeId);
}

/**
 * Will this archetype pay a Forge toll to take `step`? High `forgeValuation` charges through
 * the gate; low routes around (skips the tolled step). Free steps are always acceptable. (When
 * the toll is 0 — e.g. a sworn ally or FORGE_TOLL_COST=0 — every step is free, so this collapses
 * to "always acceptable"; it is NOT a balance no-op now that FORGE_TOLL_COST is locked at 1.)
 */
function tollAcceptable(state: GameState, playerIndex: number, nodeId: string, forgeValuation: number): boolean {
  return forgeToll(state, playerIndex, nodeId) === 0 || forgeValuation >= 0.5;
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
 * The DEFAULT policy (DEFAULT_AI_POLICY by reference) takes the untouched economic baseline
 * (`baselineAction`); archetype policies (Stage 4b) get the knob-driven `archetypeAction`. The
 * referential-identity guard guarantees byte-identical *AI POLICY* selection for the default —
 * it does NOT mean the baseline *game* matches any pre-Stage-5 build (engine tunables like
 * SPREAD_AMOUNT_BASE / LANDED_STRIKE_WOUNDS / FORGE_TOLL_COST are live for all games, incl.
 * all-baseline; see state.json "BYTE-IDENTICAL SCOPE"). Both paths are pure `f(state, seed)`
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
  const rng = decisionRng(state, playerIndex, seed, 1 + player.actionsRemaining);

  // 1. STRIKE co-located Shadowking forces if we can win and have a card to commit.
  if (hasSKForcesAtNode(state, nodeId) && player.hand.length > 0) {
    const mine = getPlayerPowerAtNode(state, playerIndex, nodeId);
    const theirs = getShadowkingPowerAtNode(state, nodeId);
    if (mine >= theirs) {
      return { type: 'STRIKE' };
    }
  }

  // 1b. CAPTURE POUNCE (Stage 5a; Stage 5e loosened). Even the greedy economic baseline seizes a
  //     clean hostage: if an unsworn rival has a capturable retainer here — its Warlord present OR
  //     NOT (§5.2 loosened rule) — and the intent-sized RAID clears the standing-scaled gate (so
  //     the reducer can't reject it — predictRaidMargin is mirror-exact), it elects CAPTURE. This
  //     is deterministic and self-limiting: a margin-clearing hostage is uncommon, so it fires as
  //     a real scene, not a dominant tactic. (No positioning detour here — the baseline doesn't
  //     hunt; it only pounces what its claim-march path already walks it onto.)
  const pounce = bestLooseCaptureAt(state, playerIndex, nodeId);
  if (pounce !== null) {
    return { type: 'RAID', targetPlayerIndex: pounce.defender, raidEffect: 'CAPTURE_PIECE', pieceId: pounce.pieceId };
  }

  // 1c. SELF-RANSOM (Stage 5a) — buy a captured retainer of our own back when affordable, so the
  //     capture→ransom-back loop closes in normal play (the §13 attachment proxy) rather than
  //     leaving hostages to rot. Resource-negative (RANSOM_COST cards + RANSOM_BANNERS), so it's
  //     self-limiting; the default policy only redeems when it can comfortably pay.
  const tr = getTunables();
  const mineCaptive = state.captives.find(r => r.ownerSeat === playerIndex);
  if (mineCaptive && player.hand.length > tr.RANSOM_COST && player.banners >= tr.RANSOM_BANNERS
      && rng.float() < DEFAULT_SELF_RANSOM_CHANCE) {
    return { type: 'RANSOM', pieceId: mineCaptive.pieceId };
  }

  // 2. CLAIM the node we're standing on, if it's worth banking and we can afford it.
  if (player.banners >= 1 && claimValue(state, nodeId) > 0) {
    return { type: 'CLAIM' };
  }

  // 2b. CAPTURE APPROACH (Stage 5a — modest positioning) — if no claim under us and a capturable
  //     rival hostage sits within a short radius, step toward it so the pounce (1b) can fire next
  //     turn. Distance-bounded so the greedy baseline makes an opportunistic detour, never a
  //     cross-map chase — captures stay rare-but-dramatic, not a dominant strategy.
  if (hasRivalAtNode(state, playerIndex, nodeId) === null) {
    const capStep = bestStepTowardCapturableRival(state, playerIndex, CAPTURE_HUNT_RADIUS);
    if (capStep !== null && player.banners >= marchCostFor(state, playerIndex, capStep)) {
      return { type: 'MARCH', targetNodeId: capStep };
    }
  }

  // 3. MARCH toward the best reachable claimable node, if affordable.
  const step = bestStepToward(state, playerIndex, rng);
  if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)) {
    return { type: 'MARCH', targetNodeId: step };
  }

  // 4. Nothing useful — end the turn.
  return { type: 'PASS' };
}

// ─── Archetype action logic (Stage 4b — knob-driven, non-default policies) ──

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

/**
 * First legal step toward the nearest node hosting an unsworn rival's capturable retainer (§5.2,
 * Stage 5e loosened — the retainer's Warlord NEED NOT be present) — the capture-hunt target. Such
 * a node is where a winning RAID can elect CAPTURE; retainers cluster on a rival's freshly-recruited
 * Holdings, so this steers a capture-biased raider toward a real hostage opportunity (the alternative
 * — waiting to stand on one by chance — never fires). Skips sworn allies. BFS, ZoC-respecting,
 * deterministic. Null if none reachable or already co-located with one (the RAID step then fires).
 * Pure `f(state)`.
 */
function bestStepTowardCapturableRival(
  state: GameState, playerIndex: number, maxDist = Infinity,
): string | null {
  const def = state.board.definition;
  const start = state.players[playerIndex].warlordNodeId;
  // Loosened (§5.2, Stage 5e): a node "hosts a hostage" if ANY unsworn rival has a capturable
  // retainer there — its Warlord NEED NOT be co-located. This is the common case (retainers
  // cluster on freshly-recruited Holdings away from the Warlord), so the capture-hunt now finds
  // far more real opportunities than the old Warlord-co-location gate.
  const hostsCapturable = (nodeId: string): boolean =>
    capturableRetainerOwnersAt(state, playerIndex, nodeId).some(r => !areSworn(state, playerIndex, r));
  const visited = new Set<string>([start]);
  const queue: Array<{ node: string; firstStep: string | null; dist: number }>
    = [{ node: start, firstStep: null, dist: 0 }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.firstStep !== null && hostsCapturable(cur.node)) return cur.firstStep;
    if (cur.dist >= maxDist) continue; // bound the hunt radius (modest positioning)
    for (const nb of def.nodes[cur.node].connections) {
      if (visited.has(nb)) continue;
      if (stepBlocked(state, playerIndex, nb)) continue;
      visited.add(nb);
      queue.push({ node: nb, firstStep: cur.firstStep ?? nb, dist: cur.dist + 1 });
    }
  }
  return null;
}

/** First step for the Herald (§HL) toward a SAFE node ADJACENT to the blighted front (so it
 *  can PARLEY from cover — parleyTarget reads here+neighbours). The runner ROUTES AROUND nodes
 *  held by a Death Knight or a rival Warlord (stepping onto one = certain capture), so it only
 *  dies when the dark/rival ACTIVELY moves onto it — "will he make it?", not a suicide run.
 *  Null if it is already in parley range or no safe approach exists. */
function bestStepTowardFront(state: GameState, playerIndex: number, heraldNode: string): string | null {
  const def = state.board.definition;
  const hostile = (n: string): boolean =>
    hasSKForcesAtNode(state, n) ||
    state.players.some(r => r.index !== playerIndex && r.warlordNodeId === n);
  const blighted = (n: string): boolean => {
    const ns = state.board.state.nodes[n];
    return !!ns && !ns.ashed && ns.blightLevel > 0;
  };
  // Already in parley range? (on or adjacent to blight) → don't move, just PARLEY.
  if (blighted(heraldNode) || def.nodes[heraldNode].connections.some(blighted)) return null;
  const visited = new Set<string>([heraldNode]);
  const queue: Array<{ node: string; firstStep: string | null }> = [{ node: heraldNode, firstStep: null }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of def.nodes[cur.node].connections) {
      if (visited.has(nb) || hostile(nb)) continue; // never route onto a hostile node
      const firstStep = cur.firstStep ?? nb;
      // A safe node from which we could PARLEY (adjacent to blight) is the goal.
      if (def.nodes[nb].connections.some(blighted) || blighted(nb)) return firstStep;
      visited.add(nb);
      queue.push({ node: nb, firstStep });
    }
  }
  return null;
}

/** Lowest-index oath-free, living rival to swear an Oath with, or null. */
function oathTargetFor(state: GameState, playerIndex: number): number | null {
  for (const p of state.players) {
    if (p.index === playerIndex || p.isEliminated) continue;
    if (findOath(state, p.index) === null) return p.index;
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
  const gambitContest = policy.gambitContest ?? 0;
  const darkHunt = policy.darkHuntBias ?? 0;
  const forgeValuation = policy.forgeValuation ?? 0;
  const heraldAffinity = policy.heraldAffinity ?? 0;
  const parleyBias = policy.parleyBias ?? 0;
  const oathWillingness = policy.oathWillingness ?? 0;
  const oathLoyalty = policy.oathLoyalty ?? 1;
  const captureBias = policy.captureBias ?? 0;
  const ransomBias = policy.ransomBias ?? 0;
  const heartBias = policy.heartBias ?? 0;
  // A traitor sabotaging the table won't push the front back (it wants the doom).
  const sabotaging = (policy.saboteurPledgeSuppression ?? 0) > 0 && player.hasBloodPact;

  // 0a. BREAK_OATH — a treacherous holder betrays for the banner burst (then the dark
  //     hunts the traitor). Only once the Oath has been held across a Dawn.
  const myOath = findOath(state, playerIndex);
  if (myOath !== null && state.round > myOath.swornRound && oathLoyalty < 1
      && rng.float() < (1 - oathLoyalty) * 0.5) {
    return { type: 'BREAK_OATH' };
  }

  // 0b. SWEAR_OATH — forge a pact with an oath-free rival. FREE (no action point), so
  //     it doesn't compete with the real turn; the loop proceeds after swearing.
  if (oathWillingness > 0 && myOath === null && rng.float() < oathWillingness) {
    const ally = oathTargetFor(state, playerIndex);
    if (ally !== null) return { type: 'SWEAR_OATH', targetPlayerIndex: ally };
  }

  // 0c. RECRUIT a Herald — commit to the political/deep-hand build (§ Herald). Sticky,
  //     consumes an action; only once, when affordable.
  if (heraldAffinity > 0 && player.stance !== 'political'
      && player.banners >= getTunables().HERALD_RECRUIT_COST && rng.float() < heraldAffinity) {
    return { type: 'RECRUIT' };
  }

  // 0d. PARLEY — the political player pushes back the dark without a card (§ Herald),
  //     when the Herald (the lone runner) has reached a blighted front.
  if (parleyBias > 0 && player.stance === 'political' && !sabotaging
      && parleyTarget(state, playerIndex) !== null && rng.float() < parleyBias) {
    return { type: 'PARLEY' };
  }

  // 0d.5 RUN THE HERALD (§HL): if political with a Herald in play that hasn't reached the
  //      front yet, MARCH the lone runner one step toward the nearest blight (then it can
  //      PARLEY next turn) — the escort/intercept drama. Gated on parleyBias.
  if (parleyBias > 0 && player.stance === 'political' && !sabotaging
      && player.heraldNodeId !== null && rng.float() < parleyBias) {
    const step = bestStepTowardFront(state, playerIndex, player.heraldNodeId);
    // Herald march pays no toll/ZoC — just 1 banner (+ashed extra). Only propose if affordable.
    if (step !== null) {
      const cost = 1 + (state.board.state.nodes[step]?.ashed ? ASHED_TRAVERSE_EXTRA_COST : 0);
      if (player.banners >= cost) return { type: 'MARCH', targetNodeId: step, pieceId: 'herald' };
    }
  }

  // 0e. RANSOM one of your OWN captured retainers back (§5.3) — self-ransom (no locality cost)
  //     when affordable. The capture→ransom-back loop is the §13 attachment proxy the sim measures.
  if (ransomBias > 0) {
    const tr = getTunables();
    const mineCaptive = state.captives.find(r => r.ownerSeat === playerIndex);
    if (mineCaptive && player.hand.length >= tr.RANSOM_COST && player.banners >= tr.RANSOM_BANNERS
        && rng.float() < ransomBias) {
      return { type: 'RANSOM', pieceId: mineCaptive.pieceId };
    }
  }

  // 0f. KILL THE DARK (§5.6) — in Reckoning, ASSAULT the dark's exposed heart at the Keystone (or
  //     MARCH the Warlord toward it to get there). A saboteur traitor WANTS the doom, so it abstains.
  const heart = state.shadowking.heart;
  if (heartBias > 0 && !sabotaging && state.act === 'RECKONING'
      && heart !== null && heart.exposed && heart.hp > 0) {
    if (here === heart.nodeId) {
      if (player.hand.length >= getTunables().HEART_ASSAULT_MIN_COMMIT && rng.float() < heartBias) {
        return { type: 'ASSAULT_HEART' };
      }
    } else if (rng.float() < heartBias) {
      const step = firstStepTowardNode(state, playerIndex, heart.nodeId);
      if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
            && tollAcceptable(state, playerIndex, step, forgeValuation)) {
        return { type: 'MARCH', targetNodeId: step };
      }
    }
  }

  // 0. CONTEST a live rival Gambit — a Gambit win ends the game, so this is the
  //    most urgent thing on the board. Raid the claimant off the Keystone if
  //    co-located, else march toward it. (The saboteur traitor WANTS others to
  //    lose, so it doesn't bother contesting.)
  const gambit = state.gambit;
  if (gambitContest > 0 && !sabotaging && gambit && gambit.claimant !== playerIndex && !state.bloodPactExposed) {
    if (rng.float() < gambitContest) {
      const ks = state.board.definition.keystoneId;
      if (here === ks && hasRivalAtNode(state, playerIndex, here) === gambit.claimant
          && !areSworn(state, playerIndex, gambit.claimant)) {
        return { type: 'RAID', targetPlayerIndex: gambit.claimant };
      }
      const step = firstStepTowardNode(state, playerIndex, ks);
      if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
            && tollAcceptable(state, playerIndex, step, forgeValuation)) {
        return { type: 'MARCH', targetNodeId: step };
      }
    }
  }

  // RESCUE step removed (§8): no Broken ally to rescue. The cooperator's coop verb
  // returns as ally-RANSOM when capture lands in 3d.

  // 2. RAID a co-located rival we can beat (aggressor / opportunist). Sworn allies
  //    are off-limits (BREAK_OATH first) — guard so we never propose an illegal RAID.
  const rival = hasRivalAtNode(state, playerIndex, here);

  // 2-pre. CAPTURE POUNCE (Stage 5e loosened) — if an unsworn rival has a capturable retainer here
  //        — its Warlord present OR NOT (§5.2 loosened rule) — and the predicted margin clears the
  //        standing-scaled gate (so the reducer can't reject it), elect CAPTURE now, independent of
  //        `aggression` (a capture-biased cooperator/turtle still pounces a winnable hostage). The
  //        margin gate makes this throw-safe (see predictRaidMargin).
  if (captureBias > 0 && rng.float() < captureBias) {
    const loose = bestLooseCaptureAt(state, playerIndex, here);
    if (loose !== null) {
      const effect: RaidEffect = 'CAPTURE_PIECE';
      return { type: 'RAID', targetPlayerIndex: loose.defender, raidEffect: effect, pieceId: loose.pieceId };
    }
  }
  if (rival !== null && aggression > 0 && !areSworn(state, playerIndex, rival)) {
    const mine = getPlayerPowerAtNode(state, playerIndex, here);
    const theirs = getPlayerPowerAtNode(state, rival, here);
    if (mine >= theirs) {
      const eff = Math.min(1, aggression + (isLeader(state, rival) ? raidLeaderBias : 0));
      if (rng.float() < eff) return raidWithElect(state, playerIndex, rival, here, captureBias, rng);
    }
  }

  // 3. STRIKE a co-located Death Knight (Stage 5-dark). Fire when we can WIN
  //    (cards-aware) AND either the dark is denying a claim we're standing on, or we
  //    have the appetite to hunt. The kill clears the forcing-function block, claims
  //    the node, and (if we trail) steers the dark at the leaders. Saboteurs skip it.
  if (!sabotaging && hasSKForcesAtNode(state, here) && canStrikeWin(state, playerIndex, here)) {
    const nd = state.board.definition.nodes[here];
    const ns = state.board.state.nodes[here];
    const blocksClaim = !!nd && (nd.tier === 'holding' || nd.tier === 'forge')
      && !!ns && !ns.ashed && ns.owner === null;
    if (blocksClaim || rng.float() < darkHunt) {
      return { type: 'STRIKE' };
    }
  }

  // 4. GAMBIT — march toward the Keystone (gambler). Risk-aware (§ Sealed Pledge): when
  //    a claimant's pledge will be SEALED, you can't count on rivals bailing you out, so
  //    only seize if you hold enough cards to self-defend the named strike.
  const t = getTunables();
  const gambitTooRisky = t.SEALED_CORE_PLEDGE !== 'off'
    && player.hand.length < t.GAMBIT_SELF_COVER_CARDS;
  if (gambitAmbition > 0 && !gambitTooRisky
      && here !== state.board.definition.keystoneId && rng.float() < gambitAmbition) {
    const step = firstStepTowardNode(state, playerIndex, state.board.definition.keystoneId);
    if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
          && tollAcceptable(state, playerIndex, step, forgeValuation)) {
      return { type: 'MARCH', targetNodeId: step };
    }
  }

  // 4b. HUNT the dark — march toward the nearest Death Knight holding claimable
  //     ground we want (Stage 5-dark). The arrival STRIKE (step 3 next turn) does
  //     the win check; here we just close the distance.
  if (darkHunt > 0 && rng.float() < darkHunt) {
    const step = bestStepTowardHuntableDK(state, playerIndex);
    if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
          && tollAcceptable(state, playerIndex, step, forgeValuation)) {
      return { type: 'MARCH', targetNodeId: step };
    }
  }

  // 4c. CAPTURE HUNT — a capture-biased raider marches toward the nearest unsworn rival's capturable
  //     retainer (§5.2, Stage 5e loosened — the retainer's Warlord need not be there), so the pounce
  //     (2-pre) can elect CAPTURE on arrival. Without this the raider would have to stand on a hostage
  //     by chance — which essentially never happens.
  if (captureBias > 0 && aggression > 0 && rival === null && rng.float() < captureBias) {
    const step = bestStepTowardCapturableRival(state, playerIndex);
    if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
          && tollAcceptable(state, playerIndex, step, forgeValuation)) {
      return { type: 'MARCH', targetNodeId: step };
    }
  }

  // 5. HUNT — march toward the nearest rival (aggressor who prefers combat to claiming).
  if (aggression > 0 && claimVsRaid < 0.5 && rival === null && rng.float() < aggression) {
    const step = firstStepTowardNearestRival(state, playerIndex);
    if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
          && tollAcceptable(state, playerIndex, step, forgeValuation)) {
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
  if (step !== null && player.banners >= marchCostFor(state, playerIndex, step)
        && tollAcceptable(state, playerIndex, step, forgeValuation)) {
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
