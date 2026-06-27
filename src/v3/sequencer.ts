/**
 * Phase Sequencer — pure functions driving the round structure.
 *
 * ALGORITHM §4: four phases, fixed order: THREAT → PLEDGE → ACTION → DAWN.
 * Each phase has a "run" function that applies its effects to state.
 *
 * Stage 3b: THREAT runs the real Shadowking policy (§5.6);
 * PLEDGE resolves strikes with proportional Blight spread (§5.1);
 * DAWN applies baseline Blight advance (anti-turtle) and Act escalation.
 */

import type { GameEvent } from './events.js';
import type { GamePhase, GameState, PledgeTier } from './types.js';
import {
  ACTIONS_NORMAL,
  CROWN_PLEDGE_DISCOUNT,
  FORGE_WEIGHT,
  PATIENCE_CAP,
  PATIENCE_ON_BLOCK,
  ROUND_CAP,
  getTunables,
} from './tunables.js';
import { livingStrongholdCount } from './combat.js';
import { stewardIncome } from './court.js';
import { SeededRandom } from '../utils/seeded-random.js';
import {
  applyDawnBlightAdvance,
  checkActAdvance,
  isKeystoneAshed,
} from './blight.js';
import { applyShadowkingStrike, respawnDeathKnights } from './shadowking-effects.js';
import {
  chooseShadowkingIntent,
  decayGrudge,
  generateReactiveVoiceLine,
} from './shadowking-policy.js';
import {
  runOathUpkeep,
  resolveHeraldCaptures,
} from './actions.js';
import {
  evaluateGambitAtDawn,
  getEffectivePledgeWeight,
  computeTerritoryWinner,
} from './gambit.js';
import { recordSuspicionLog } from './blood-pact.js';

// ─── Result type ──────────────────────────────────────────────────

export interface SequencerResult {
  state: GameState;
  events: GameEvent[];
}

// ─── Phase Ordering ───────────────────────────────────────────────

const PHASE_ORDER: readonly GamePhase[] = ['THREAT', 'PLEDGE', 'ACTION', 'DAWN'];

/** Get the next phase in sequence (wraps DAWN → THREAT). */
export function nextPhase(current: GamePhase): GamePhase {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}

// ─── Threat Phase (§4.1) ──────────────────────────────────────────

/**
 * Run the THREAT phase: the Shadowking declares its next strike.
 *
 * Stage 3b: uses the real Shadowking policy (§5.6) to choose
 * target, effect, and voice line. Also decays grudge.
 */
export function runThreatPhase(state: GameState): SequencerResult {
  const events: GameEvent[] = [];

  // Decay grudge at the start of each round (before targeting)
  events.push(...decayGrudge(state));

  // Use the reactive policy to generate the telegraph
  const telegraph = chooseShadowkingIntent(state);
  state.shadowking.telegraph = telegraph;

  events.push({ type: 'THREAT_DECLARED', telegraph });

  return { state, events };
}

// ─── Pledge Phase (§4.2) ──────────────────────────────────────────

/**
 * Check whether all active players have submitted their pledge.
 */
export function isPledgeComplete(state: GameState): boolean {
  // Every living player pledges; eliminated players have no pledge rights (§6).
  const living = state.players.filter(p => !p.isEliminated).length;
  return state.pledgeBuffer.length >= living;
}

/**
 * Classify a pledge amount into a tier for the Suspicion Log.
 */
export function classifyPledgeTier(amount: number, handSize: number): PledgeTier {
  if (amount === 0) return 'none';
  const ratio = amount / Math.max(handSize, 1);
  if (ratio >= getTunables().PLEDGE_TIER_HIGH_RATIO) return 'high';
  if (ratio >= getTunables().PLEDGE_TIER_MEDIUM_RATIO) return 'medium';
  return 'low';
}

/**
 * Resolve the Pledge phase after all pledges are submitted.
 *
 * Stage 3b: computes effective total, applies proportional strike
 * via the Blight system, handles patience ratchet, and emits
 * reactive Shadowking voice lines (P0-5).
 *
 * Net-front ordering (P1/C3): strike spread happens HERE (step 1),
 * pushback during ACTION (step 2), Dawn advance later (step 3).
 */
export function resolvePledgePhase(state: GameState): SequencerResult {
  const events: GameEvent[] = [];
  const telegraph = state.shadowking.telegraph;
  if (!telegraph) {
    throw new Error('Cannot resolve Pledge: no telegraph set (THREAT phase not run)');
  }

  const C = telegraph.doomCost;

  // Compute effective total with Crown discount + Gambit surcharge (§6)
  let effective = 0;
  // Process in seat order (determinism §7)
  const sortedPledges = [...state.pledgeBuffer].sort((a, b) => a.playerIndex - b.playerIndex);

  // Track who actually contributed — drives the anti-free-rider reward (§4.2 step 5).
  const pledgers = new Set<number>();

  for (const pledge of sortedPledges) {
    const player = state.players[pledge.playerIndex];
    // getEffectivePledgeWeight handles: Gambit surcharge > Crown discount > 1.0
    const weight = getEffectivePledgeWeight(state, pledge.playerIndex, CROWN_PLEDGE_DISCOUNT);
    effective += pledge.amount * weight;

    // Discard pledged cards (cards spent regardless of outcome). Spend the
    // LOWEST-value cards first (keep the best for combat) so the shared hand
    // resource is valued coherently between pledging and fighting (4g fidelity).
    for (let k = 0; k < pledge.amount && player.hand.length > 0; k++) {
      let minIdx = 0;
      for (let j = 1; j < player.hand.length; j++) {
        if (player.hand[j] < player.hand[minIdx]) minIdx = j;
      }
      player.hand.splice(minIdx, 1);
    }

    // Anti-free-rider (§4.2 step 5b): a contributor earns a persistent FAVOR —
    // grudge-reduction. Free-riders (amount 0) earn nothing.
    if (pledge.amount > 0) {
      pledgers.add(pledge.playerIndex);
      const g = state.shadowking.grudge;
      g[pledge.playerIndex] = Math.max(0, (g[pledge.playerIndex] ?? 0) - getTunables().PLEDGE_FAVOR_GRUDGE_REDUCTION);
    }
  }

  const ratio = C > 0 ? Math.min(effective / C, 1) : 1;
  const averted = ratio >= 1;

  events.push({
    type: 'PLEDGE_RESOLVED',
    effective,
    threshold: C,
    ratio,
    averted,
  });

  // ── Apply the un-averted strike (§5.6 effect table / §5.1 Blight spread) ──
  // Pledgers' own lands are shielded first (§4.2 step 5a).
  const strikeResult = applyShadowkingStrike(state, telegraph, ratio, pledgers);
  state = strikeResult.state;
  events.push(...strikeResult.events);

  // The dark's un-averted strike now bites the MAP only (Blight spread, above): it ashes
  // production toward depose pressure, which resolves at Dawn (§6). The v2 "landed strike
  // wounds the warlord" break-vector is retired with the Broken Court (§8).

  // ── Reactive voice line (P0-5) ──
  if (averted) {
    const voiceLine = generateReactiveVoiceLine(state, 'full_block');
    if (voiceLine) events.push(voiceLine);
  } else if (ratio < 0.5) {
    const voiceLine = generateReactiveVoiceLine(state, 'thin_pledge');
    if (voiceLine) events.push(voiceLine);
  }

  // Record pledge history in canonical SEAT ORDER (not submission order) so the
  // resulting state is submission-order-invariant (determinism §7.2).
  state.pledgeHistory.push([...sortedPledges]);

  // Blood Pact: feed this round's tiers into the bounded Suspicion Log (§10).
  recordSuspicionLog(state, sortedPledges);

  // Patience ratchet (§4.2 step 6)
  if (averted) {
    state.shadowking.patience = Math.min(
      state.shadowking.patience + PATIENCE_ON_BLOCK,
      PATIENCE_CAP,
    );
  }

  // Clear buffer for next round
  state.pledgeBuffer = [];

  return { state, events };
}

// ─── Action Phase (§4.3) ──────────────────────────────────────────

/**
 * Check whether the ACTION phase is complete
 * (all players in turnOrder have exhausted actions or passed).
 */
export function isActionPhaseComplete(state: GameState): boolean {
  return state.turnOrderPosition >= state.turnOrder.length;
}

/**
 * Set up the ACTION phase: reset actions for all players,
 * set activePlayerIndex to first in turnOrder.
 */
export function beginActionPhase(state: GameState): SequencerResult {
  const events: GameEvent[] = [];

  for (const p of state.players) {
    // Eliminated Warlords take no actions (§4.3: "where not isEliminated").
    p.actionsRemaining = p.isEliminated ? 0 : ACTIONS_NORMAL;
  }

  // Advance to the first LIVING player in turn order (skip eliminated seats).
  state.turnOrderPosition = 0;
  while (
    state.turnOrderPosition < state.turnOrder.length &&
    state.players[state.turnOrder[state.turnOrderPosition]].isEliminated
  ) {
    state.turnOrderPosition++;
  }

  if (state.turnOrderPosition < state.turnOrder.length) {
    state.activePlayerIndex = state.turnOrder[state.turnOrderPosition];
    events.push({
      type: 'ACTIVE_PLAYER_CHANGED',
      playerIndex: state.activePlayerIndex,
    });
  }

  return { state, events };
}

/**
 * Advance to the next LIVING player in turn order (eliminated seats are skipped, §4.3).
 * Called when the current player exhausts actions or passes.
 */
export function advanceActivePlayer(state: GameState): SequencerResult {
  const events: GameEvent[] = [];

  do {
    state.turnOrderPosition++;
  } while (
    state.turnOrderPosition < state.turnOrder.length &&
    state.players[state.turnOrder[state.turnOrderPosition]].isEliminated
  );

  if (state.turnOrderPosition < state.turnOrder.length) {
    state.activePlayerIndex = state.turnOrder[state.turnOrderPosition];
    events.push({
      type: 'ACTIVE_PLAYER_CHANGED',
      playerIndex: state.activePlayerIndex,
    });
  }

  return { state, events };
}

// ─── Dawn Phase (§4.4) ────────────────────────────────────────────

/**
 * Run the DAWN phase: income, recovery, escalation, victory check.
 *
 * Stage 3b: implements real Blight advance (anti-turtle) and Act
 * escalation via ashed-node thresholds.
 *
 * Order (§7 check ordering, §4.4):
 *   1. Discard banners, generate new
 *   2. Draw cards up to hand limit
 *   3. Anti-turtle Blight advance + Act escalation
 *   4. resolveDeposals — zero-stronghold / flagged Warlords eliminated, seat order (§6)
 *   5. Recompute Crown (living players only)
 *   6. End-conditions — loss preempts win: doom_complete → attrition → last_standing
 *      → Gambit → territory (§6)
 *   7. Round increment, phase → THREAT
 */
export function runDawnPhase(state: GameState, rng: SeededRandom): SequencerResult {
  const events: GameEvent[] = [];

  // 1. Discard banners, generate new
  for (const p of state.players) {
    p.banners = generateBannersForPlayer(state, p.index);
  }

  // 1b. Oath upkeep (§ Oaths): fealty dividend on fresh income, strain, maturity.
  events.push(...runOathUpkeep(state));

  // 1c. Herald captures (§HL): a lone runner caught by a rival Warlord or the dark is lost.
  events.push(...resolveHeraldCaptures(state));

  // 2. Draw cards up to each player's hand limit (per-player — a Herald raises it; §Herald).
  for (const playerIndex of state.turnOrder) {
    const p = state.players[playerIndex];
    while (p.hand.length < p.handLimit) {
      p.hand.push(rng.int(getTunables().CARD_VALUE_MIN, getTunables().CARD_VALUE_MAX));
    }
  }

  // 3. Anti-turtle Blight advance + Act escalation (§5.1, §5.5)
  // Net-front step 3: Dawn baseline advance on the steered spoke
  const steerQuadrant = state.shadowking.telegraph?.steerQuadrant ?? 0;
  const dawnBlightResult = applyDawnBlightAdvance(state, steerQuadrant);
  state = dawnBlightResult.state;
  events.push(...dawnBlightResult.events);

  // Patience-triggered + threshold-based Act escalation (§5.5, §7.11)
  // At most ONE Act advance per Dawn — coalesce if both fire.
  let patienceForced = false;
  if (state.shadowking.patience >= PATIENCE_CAP) {
    state.shadowking.patience = 0; // Reset patience after triggered escalation
    patienceForced = true;
  }

  // Check threshold-based Act escalation
  const thresholdAct = checkActAdvance(state);

  // Coalesce: patience forces an advance even if threshold hasn't crossed,
  // but at most one advance per Dawn (§7.11)
  const ACT_ORDER: readonly string[] = ['WHISPER', 'MARCH', 'RECKONING'];
  const currentActIdx = ACT_ORDER.indexOf(state.act);
  let newAct = thresholdAct;

  if (newAct === null && patienceForced && currentActIdx < ACT_ORDER.length - 1) {
    newAct = ACT_ORDER[currentActIdx + 1] as 'MARCH' | 'RECKONING';
  }

  if (newAct !== null) {
    const previousAct = state.act;
    state.act = newAct;
    events.push({
      type: 'ACT_ESCALATED',
      previousAct,
      newAct,
    });

    // The noose tightens: the dark's fallen Death Knights rise again (P1a) so its
    // MARCH_DK/RAID_DK pressure doesn't permanently collapse after a couple kills.
    events.push(...respawnDeathKnights(state));

    // Escalation voice line (P0-5) — cites the block that caused it if patience-triggered
    if (patienceForced) {
      events.push({
        type: 'SK_VOICE_LINE',
        line: 'You held the line too many times. Now I change the rules.',
        trigger: 'patience_escalation',
      });
    }
  }

  // 4. Resolve deposals (§6, §7 D5): zero-stronghold / flagged Warlords are eliminated
  //    HERE, at Dawn, in seat order — never mid-action.
  events.push(...resolveDeposals(state));

  // 5. Recompute Crown (§5.2) — living players only
  const prevCrown = state.crownHolder;
  state.crownHolder = computeCrownHolder(state);
  for (const p of state.players) {
    p.crownHeld = (p.index === state.crownHolder);
  }
  if (prevCrown !== state.crownHolder) {
    events.push({
      type: 'CROWN_CHANGED',
      previousHolder: prevCrown,
      newHolder: state.crownHolder,
    });

    // Crown handoff voice line (P0-4/P0-5)
    const voiceLine = generateReactiveVoiceLine(state, 'crown_changed');
    if (voiceLine) events.push(voiceLine);
  }

  // 6. End-conditions (§6) — loss preempts win, fixed deterministic order.
  const endResult = checkEndConditions(state);
  if (endResult) {
    events.push(...endResult.events);
    return { state, events };
  }

  // Gambit lifecycle (§6) — evaluated BEFORE territory, AFTER the loss/last-standing
  // checks above (loss preempts a same-Dawn Gambit win, §12 #8/#9).
  const gambitResult = evaluateGambitAtDawn(state);
  events.push(...gambitResult.events);
  if (gambitResult.outcome === 'gambit_victory') {
    return { state, events };
  }

  // Territory victory at round cap (§6) — full tiebreakers
  if (state.round >= ROUND_CAP) {
    state.gameEndReason = 'territory_victory';
    state.winner = computeTerritoryWinner(state);
    events.push({
      type: 'GAME_OVER',
      reason: 'territory_victory',
      winner: state.winner,
    });
    return { state, events };
  }

  // 8. Round increment, phase → THREAT
  events.push({ type: 'ROUND_ENDED', round: state.round });

  state.round++;
  state.phase = 'THREAT';

  events.push({
    type: 'ROUND_STARTED',
    round: state.round,
    act: state.act,
  });

  return { state, events };
}

// ─── Elimination & End-Conditions (§5.5/§6, §7 D5) ───────────────

/**
 * Resolve deposals at Dawn (§6, determinism §7 D5). A living Warlord is eliminated when
 * it holds ZERO living strongholds (any owned living production node, §12 #14) OR carries
 * the `deposed` flag (its last stronghold was taken in ACTION). Whisper protects against
 * hopelessness (§12 #13, §13 P0-10): no deposal can resolve pre-March.
 *
 * Determinism (§12 #1): eligibility is SNAPSHOT first, then resolved in ascending seat
 * order — eliminating one player never changes another's eligibility retroactively.
 */
export function resolveDeposals(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];

  // Whisper opening protection — last-stronghold loss / depose is forbidden pre-March.
  if (state.act === 'WHISPER') return events;

  // Snapshot the eligible set BEFORE mutating anything (§12 #1).
  const eligible: number[] = [];
  for (const p of state.players) {
    if (p.isEliminated) continue;
    if (p.deposed || livingStrongholdCount(state, p.index) === 0) eligible.push(p.index);
  }

  // Resolve in ascending seat order.
  for (const seat of [...eligible].sort((a, b) => a - b)) {
    const p = state.players[seat];
    p.isEliminated = true;
    p.eliminatedRound = state.round;
    p.deposed = true;
    p.crownHeld = false;
    p.actionsRemaining = 0;

    // Eliminated player's standing Oaths dissolve cleanly — no oathbreaker grudge to the
    // surviving partner (§12 #11).
    state.oaths = state.oaths.filter(o => o.a !== seat && o.b !== seat);

    // The deposed Warlord's remaining holdings ash (§2 Keep-ashing rule). Normally none
    // remain (they are at zero strongholds), but ash any owned living node defensively.
    for (const [nodeId, ns] of Object.entries(state.board.state.nodes)) {
      if (ns.owner === seat && !ns.ashed) {
        ns.ashed = true;
        ns.blightLevel = getTunables().BLIGHT_TO_ASH;
        ns.owner = null;
        events.push({ type: 'NODE_ASHED', nodeId, previousOwner: seat });
      }
    }

    events.push({ type: 'PLAYER_ELIMINATED', playerIndex: seat, round: state.round });
    const voiceLine = generateReactiveVoiceLine(state, 'player_eliminated');
    if (voiceLine) events.push(voiceLine);
  }

  return events;
}

/**
 * Check the §6 end-conditions in fixed deterministic order — LOSS PREEMPTS WIN. Returns
 * the terminal events when the game ends, or null if play continues. Snapshots are taken
 * post-escalation, post-deposal, in seat order.
 *
 * Order: doom_complete → attrition (zero living, the all_broken successor) →
 * last_standing (one living). Gambit/territory are checked by the caller AFTER this.
 */
export function checkEndConditions(state: GameState): SequencerResult | null {
  const events: GameEvent[] = [];

  // The dark wins on doom — and the Blood-Pact traitor takes that win unless exposed (§10).
  const darkWinner = (state.mode === 'blood_pact' && !state.bloodPactExposed)
    ? state.bloodPactHolder
    : null;

  // 1. Doom Complete (§6) — the Keystone is ash. Preempts everything.
  if (isKeystoneAshed(state)) {
    state.gameEndReason = 'doom_complete';
    state.winner = darkWinner;
    events.push({ type: 'GAME_OVER', reason: 'doom_complete', winner: state.winner });
    return { state, events };
  }

  const living = state.players.filter(p => !p.isEliminated);

  // 2. Attrition (§6, §12 #2) — zero living Warlords ⇒ Shadowking wins (the all_broken
  //    successor; simultaneous/last-two deposals land here). Traitor wins unless exposed.
  if (living.length === 0) {
    state.gameEndReason = 'attrition';
    state.winner = darkWinner;
    events.push({ type: 'GAME_OVER', reason: 'attrition', winner: state.winner });
    return { state, events };
  }

  // 3. Last Warlord standing (§6) — exactly one living Warlord remains (an elimination has
  //    happened, since games start with ≥2). Loss-preempt above already fired (§12 #8).
  if (living.length === 1) {
    state.gameEndReason = 'last_standing';
    state.winner = living[0].index;
    events.push({ type: 'GAME_OVER', reason: 'last_standing', winner: state.winner });
    return { state, events };
  }

  return null;
}

// ─── Crown Computation (§5.2) ─────────────────────────────────────

/**
 * Compute who holds the Crown — the player with the most living
 * owned production (Holdings + Forges weighted).
 *
 * Tie: most Banners → seat order (lowest index).
 * Eliminated players are ineligible (§6).
 */
export function computeCrownHolder(state: GameState): number | null {
  const scores: Array<{ index: number; production: number; banners: number }> = [];

  for (const p of state.players) {
    // Eliminated players forfeit Crown eligibility (§6)
    if (p.isEliminated) continue;

    let production = 0;
    for (const [nodeId, nodeState] of Object.entries(state.board.state.nodes)) {
      if (nodeState.owner !== p.index || nodeState.ashed) continue;
      const nodeDef = state.board.definition.nodes[nodeId];
      if (!nodeDef) continue;
      if (nodeDef.tier === 'forge') {
        production += FORGE_WEIGHT;
      } else if (nodeDef.tier === 'keep' || nodeDef.tier === 'holding') {
        production += 1;
      }
    }

    scores.push({ index: p.index, production, banners: p.banners });
  }

  if (scores.length === 0) return null;

  // Sort: highest production → highest banners → lowest seat index
  scores.sort((a, b) => {
    if (b.production !== a.production) return b.production - a.production;
    if (b.banners !== a.banners) return b.banners - a.banners;
    return a.index - b.index;
  });

  return scores[0].index;
}

// ─── Banner Generation ────────────────────────────────────────────

/**
 * Generate banners for a player based on their owned living territory.
 */
export function generateBannersForPlayer(state: GameState, playerIndex: number): number {
  let income = getTunables().BASE_BANNER_INCOME;

  for (const [nodeId, nodeState] of Object.entries(state.board.state.nodes)) {
    if (nodeState.owner !== playerIndex || nodeState.ashed) continue;
    const nodeDef = state.board.definition.nodes[nodeId];
    if (nodeDef) {
      income += nodeDef.income;
    }
  }

  // Steward income (§2/§4.4): each free Steward adds STEWARD_INCOME Banners at its node.
  income += stewardIncome(state, playerIndex);

  // No Broken income subsidy (§8): the comeback economy is retired. Catch-up is now
  // capture-side (§5.4), not a flat income bonus.
  return income;
}

// ─── Phase Advancement ────────────────────────────────────────────

/**
 * Advance to the next phase. Called by the reducer on ADVANCE_PHASE.
 * Handles phase-specific entry logic.
 */
export function advanceToNextPhase(state: GameState, rng: SeededRandom): SequencerResult {
  const currentPhase = state.phase;
  const allEvents: GameEvent[] = [];

  switch (currentPhase) {
    case 'THREAT': {
      // Transition to PLEDGE
      state.phase = 'PLEDGE';
      state.pledgeBuffer = [];
      allEvents.push({ type: 'PHASE_CHANGED', phase: 'PLEDGE', round: state.round });
      break;
    }

    case 'PLEDGE': {
      // Resolve pledges then transition to ACTION
      const resolveResult = resolvePledgePhase(state);
      state = resolveResult.state;
      allEvents.push(...resolveResult.events);

      state.phase = 'ACTION';
      allEvents.push({ type: 'PHASE_CHANGED', phase: 'ACTION', round: state.round });

      const actionResult = beginActionPhase(state);
      state = actionResult.state;
      allEvents.push(...actionResult.events);
      break;
    }

    case 'ACTION': {
      // Transition to DAWN
      state.phase = 'DAWN';
      allEvents.push({ type: 'PHASE_CHANGED', phase: 'DAWN', round: state.round });

      const dawnResult = runDawnPhase(state, rng);
      state = dawnResult.state;
      allEvents.push(...dawnResult.events);
      break;
    }

    case 'DAWN': {
      // Dawn already ran — this shouldn't normally be called directly.
      // The Dawn phase auto-transitions to THREAT via runDawnPhase.
      // If we get here, just move to THREAT of next round.
      state.phase = 'THREAT';
      allEvents.push({ type: 'PHASE_CHANGED', phase: 'THREAT', round: state.round });
      break;
    }
  }

  return { state, events: allEvents };
}
