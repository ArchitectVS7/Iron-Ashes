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
  ACTIONS_BROKEN,
  ACTIONS_NORMAL,
  BASE_BANNER_INCOME,
  BROKEN_INCOME_BONUS,
  CROWN_PLEDGE_DISCOUNT,
  FORGE_WEIGHT,
  HAND_LIMIT,
  PATIENCE_CAP,
  PATIENCE_ON_BLOCK,
  ROUND_CAP,
} from './tunables.js';
import { SeededRandom } from '../utils/seeded-random.js';
import {
  applyDawnBlightAdvance,
  checkActAdvance,
  isKeystoneAshed,
  resolveStrike,
} from './blight.js';
import {
  chooseShadowkingIntent,
  decayGrudge,
  generateReactiveVoiceLine,
} from './shadowking-policy.js';
import {
  checkBrokenRecovery,
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
  // All players have Pledge rights, including Broken (per spec)
  return state.pledgeBuffer.length >= state.players.length;
}

/**
 * Classify a pledge amount into a tier for the Suspicion Log.
 */
export function classifyPledgeTier(amount: number, handSize: number): PledgeTier {
  if (amount === 0) return 'none';
  const ratio = amount / Math.max(handSize, 1);
  if (ratio >= 0.6) return 'high';
  if (ratio >= 0.3) return 'medium';
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

  for (const pledge of sortedPledges) {
    const player = state.players[pledge.playerIndex];
    // getEffectivePledgeWeight handles: Gambit surcharge > Crown discount > 1.0
    const weight = getEffectivePledgeWeight(state, pledge.playerIndex, CROWN_PLEDGE_DISCOUNT);
    effective += pledge.amount * weight;

    // Discard pledged cards from hand (cards spent regardless of outcome)
    player.hand.splice(0, pledge.amount);
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

  // ── Apply the un-averted strike (§5.1 — Blight spread) ──
  const strikeResult = resolveStrike(
    state,
    ratio,
    telegraph.steerQuadrant,
  );
  state = strikeResult.state;
  events.push(...strikeResult.events);

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

  state.turnOrderPosition = 0;

  for (const p of state.players) {
    p.actionsRemaining = p.isBroken ? ACTIONS_BROKEN : ACTIONS_NORMAL;
  }

  if (state.turnOrder.length > 0) {
    state.activePlayerIndex = state.turnOrder[0];
    events.push({
      type: 'ACTIVE_PLAYER_CHANGED',
      playerIndex: state.activePlayerIndex,
    });
  }

  return { state, events };
}

/**
 * Advance to the next player in turn order.
 * Called when the current player exhausts actions or passes.
 */
export function advanceActivePlayer(state: GameState): SequencerResult {
  const events: GameEvent[] = [];

  state.turnOrderPosition++;

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
 * Order (§7 check ordering):
 *   1. Discard banners, generate new
 *   2. Draw cards up to hand limit
 *   3. Broken recovery check
 *   4. Anti-turtle Blight advance + Act escalation
 *   5. Recompute Crown
 *   6. Loss check (doom_complete, all_broken)
 *   7. Victory check (territory at round cap, Gambit)
 *   8. Round increment, phase → THREAT
 */
export function runDawnPhase(state: GameState, rng: SeededRandom): SequencerResult {
  const events: GameEvent[] = [];

  // 1. Discard banners, generate new
  for (const p of state.players) {
    p.banners = generateBannersForPlayer(state, p.index);
  }

  // 2. Draw cards up to hand limit (seeded deck, seat order — §7.8)
  for (const playerIndex of state.turnOrder) {
    const p = state.players[playerIndex];
    while (p.hand.length < HAND_LIMIT) {
      // Generate a card value (1-4 range for now — Stage 3b refines)
      p.hand.push(rng.int(1, 4));
    }
  }

  // 3. Broken recovery check (§5.4 — auto-recover after BROKEN_MAX_ROUNDS)
  // Recovery evaluated before all_broken check (§7.10)
  for (const p of state.players) {
    if (p.isBroken) {
      p.brokenRoundsConsecutive++;
      events.push(...checkBrokenRecovery(state, p.index));
    }
  }

  // 4. Anti-turtle Blight advance + Act escalation (§5.1, §5.5)
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

    // Escalation voice line (P0-5) — cites the block that caused it if patience-triggered
    if (patienceForced) {
      events.push({
        type: 'SK_VOICE_LINE',
        line: 'You held the line too many times. Now I change the rules.',
        trigger: 'patience_escalation',
      });
    }
  }

  // 5. Recompute Crown (§5.2)
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

  // 6. Loss checks (§7.10 — doom_complete before all_broken)
  if (isKeystoneAshed(state)) {
    state.gameEndReason = 'doom_complete';
    // In blood_pact mode the traitor wins — unless exposed by a correct accusation (§10).
    state.winner = (state.mode === 'blood_pact' && !state.bloodPactExposed)
      ? state.bloodPactHolder
      : null;
    events.push({
      type: 'GAME_OVER',
      reason: 'doom_complete',
      winner: state.winner,
    });
    return { state, events };
  }

  // all_broken check (§7.10 — recovery evaluated before all_broken)
  const allBroken = state.players.every(p => p.isBroken);
  if (allBroken) {
    state.gameEndReason = 'all_broken';
    state.winner = null;
    events.push({
      type: 'GAME_OVER',
      reason: 'all_broken',
      winner: null,
    });
    return { state, events };
  }

  // 7. Victory checks
  // Gambit lifecycle (§6) — evaluated BEFORE territory
  // Gambit held into round cap resolves at that cap's Dawn BEFORE territory check
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

// ─── Crown Computation (§5.2) ─────────────────────────────────────

/**
 * Compute who holds the Crown — the player with the most living
 * owned production (Holdings + Forges weighted).
 *
 * Tie: most Banners → seat order (lowest index).
 * Broken players are ineligible (§5.4 anti-exploit).
 */
export function computeCrownHolder(state: GameState): number | null {
  const scores: Array<{ index: number; production: number; banners: number }> = [];

  for (const p of state.players) {
    // Broken players forfeit Crown eligibility (§5.4)
    if (p.isBroken) continue;

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
  let income = BASE_BANNER_INCOME;

  for (const [nodeId, nodeState] of Object.entries(state.board.state.nodes)) {
    if (nodeState.owner !== playerIndex || nodeState.ashed) continue;
    const nodeDef = state.board.definition.nodes[nodeId];
    if (nodeDef) {
      income += nodeDef.income;
    }
  }

  // Broken income bonus (§5.4) — decays each consecutive round
  const player = state.players[playerIndex];
  if (player && player.isBroken) {
    const decayedBonus = Math.max(BROKEN_INCOME_BONUS - player.brokenRoundsConsecutive + 1, 0);
    income += decayedBonus;
  }

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
