/**
 * Blood Pact — Layer B hidden-traitor mechanics (ALGORITHM §10).
 *
 * Active only when `state.mode === 'blood_pact'`. Built on the same sealed-pledge
 * substrate as Layer A, this module adds the *deduction surface* that turns "the
 * defector you can't prove" into a real social-deduction game:
 *
 *   - SUSPICION LOG — a bounded, tier-only history of who pledged how heavily.
 *   - AUDIT — spend banners to reveal ONE opponent's last pledge in full.
 *   - ACCUSATION — every other Warlord must unanimously agree to convict; a
 *     correct call exposes the traitor (forfeiting their doom_complete win and
 *     pushing the front back), a wrong call costs the accusers and vindicates
 *     the accused, and either way a cooldown blocks spam.
 *
 * Determinism (§7): all mutation flows back through the reducer; the AI choosers
 * here are pure `f(state, seed)` (§7.9 — AI accusation must be reproducible).
 */

import type { GameEvent } from './events.js';
import type { GameState, PledgeEntry } from './types.js';
import {
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_PUSHBACK,
  ACCUSATION_VINDICATION_BONUS,
  ACCUSATION_WRONG_PENALTY,
  AUDIT_COST,
  SUSPICION_LOG_ROUNDS,
  TRAITOR_EXPOSED_WOUNDS,
} from './tunables.js';
import { applyPushback, getBlightFrontier } from './blight.js';
import { checkBrokenState } from './combat.js';
import { SeededRandom } from '../utils/seeded-random.js';

// ─── Result type ──────────────────────────────────────────────────

export interface BloodPactResult {
  state: GameState;
  events: GameEvent[];
}

/** Audit is an ACTION-phase action; it reports whether it consumed an action point. */
export interface AuditResult extends BloodPactResult {
  actionConsumed: boolean;
}

// ─── Suspicion Log (§10) ──────────────────────────────────────────

/**
 * Append this round's pledge tiers to the Suspicion Log, bounded to the last
 * `SUSPICION_LOG_ROUNDS` rounds. Blood Pact only — the traitor's thin pledges
 * are what the table mines here. `entries` must already be in seat order.
 */
export function recordSuspicionLog(state: GameState, entries: PledgeEntry[]): void {
  if (state.mode !== 'blood_pact') return;
  state.suspicionLog.push(entries.map(e => ({ ...e })));
  while (state.suspicionLog.length > SUSPICION_LOG_ROUNDS) {
    state.suspicionLog.shift();
  }
}

// ─── Audit (§10) ──────────────────────────────────────────────────

/**
 * AUDIT — pay `AUDIT_COST` banners to reveal one opponent's *last* pledge.
 * A real cost and a real tool. Records the reveal in `auditLog` (the auditor's
 * persistent knowledge) and emits an AUDIT_RESULT event. Consumes an action.
 */
export function executeAudit(
  state: GameState,
  auditorIndex: number,
  targetIndex: number,
): AuditResult {
  const events: GameEvent[] = [];

  if (state.mode !== 'blood_pact') {
    throw new Error('Cannot AUDIT: not a Blood Pact game');
  }
  if (auditorIndex === targetIndex) {
    throw new Error('Cannot AUDIT yourself');
  }
  const auditor = state.players[auditorIndex];
  const target = state.players[targetIndex];
  if (!target) {
    throw new Error(`Cannot AUDIT: player ${targetIndex} does not exist`);
  }
  if (auditor.banners < AUDIT_COST) {
    throw new Error(`Cannot AUDIT: need ${AUDIT_COST} banners, have ${auditor.banners}`);
  }

  // Find the target's most recent recorded pledge.
  const lastRound = state.pledgeHistory[state.pledgeHistory.length - 1];
  const entry = lastRound?.find(e => e.playerIndex === targetIndex);
  if (!entry) {
    throw new Error('Cannot AUDIT: no pledge on record yet to reveal');
  }

  auditor.banners -= AUDIT_COST;
  state.auditLog.push({
    round: state.round,
    auditor: auditorIndex,
    target: targetIndex,
    amount: entry.amount,
    tier: entry.tier,
  });

  events.push({
    type: 'AUDIT_RESULT',
    auditorIndex,
    targetIndex,
    amount: entry.amount,
    tier: entry.tier,
    round: state.round,
  });

  return { state, events, actionConsumed: true };
}

// ─── Accusation (§10) ─────────────────────────────────────────────

/** Every player except the accused must vote; unanimity is required to convict. */
function requiredVoters(state: GameState, accused: number): number[] {
  return state.players.filter(p => p.index !== accused).map(p => p.index);
}

/**
 * Open an accusation against a suspected traitor. The accuser auto-agrees.
 * Validates mode, lockout, a clean board (no open accusation), and indices.
 */
export function initiateAccusation(
  state: GameState,
  accuserIndex: number,
  accusedIndex: number,
): BloodPactResult {
  const events: GameEvent[] = [];

  if (state.mode !== 'blood_pact') {
    throw new Error('Cannot accuse: not a Blood Pact game');
  }
  if (state.accusationState && !state.accusationState.resolved) {
    throw new Error('Cannot accuse: an accusation is already open');
  }
  if (state.round < state.accusationLockoutUntilRound) {
    throw new Error(`Cannot accuse: locked out until round ${state.accusationLockoutUntilRound}`);
  }
  if (accuserIndex === accusedIndex) {
    throw new Error('Cannot accuse yourself');
  }
  if (!state.players[accuserIndex] || !state.players[accusedIndex]) {
    throw new Error('Cannot accuse: invalid player index');
  }

  state.accusationState = {
    accuser: accuserIndex,
    accused: accusedIndex,
    round: state.round,
    votes: [{ playerIndex: accuserIndex, agree: true }], // accuser pre-agrees
    resolved: false,
    outcome: null,
  };

  events.push({ type: 'ACCUSATION_OPENED', accuser: accuserIndex, accused: accusedIndex });

  // If the accuser is the only required voter (2-player game), resolve immediately.
  if (isAccusationComplete(state)) {
    events.push(...resolveAccusation(state));
  }

  return { state, events };
}

/** Have all required voters cast a vote on the open accusation? */
export function isAccusationComplete(state: GameState): boolean {
  const acc = state.accusationState;
  if (!acc || acc.resolved) return false;
  const required = requiredVoters(state, acc.accused);
  return required.every(idx => acc.votes.some(v => v.playerIndex === idx));
}

/**
 * Cast a vote on the open accusation. Resolves automatically once every required
 * voter has weighed in. The accused cannot vote; no one votes twice.
 */
export function submitAccusationVote(
  state: GameState,
  playerIndex: number,
  agree: boolean,
): BloodPactResult {
  const events: GameEvent[] = [];
  const acc = state.accusationState;

  if (!acc || acc.resolved) {
    throw new Error('Cannot vote: no open accusation');
  }
  if (playerIndex === acc.accused) {
    throw new Error('Cannot vote: the accused cannot vote on their own accusation');
  }
  if (!requiredVoters(state, acc.accused).includes(playerIndex)) {
    throw new Error(`Cannot vote: player ${playerIndex} is not a required voter`);
  }
  if (acc.votes.some(v => v.playerIndex === playerIndex)) {
    throw new Error(`Cannot vote: player ${playerIndex} has already voted`);
  }

  acc.votes.push({ playerIndex, agree });
  events.push({ type: 'ACCUSATION_VOTE_CAST', playerIndex, agree });

  if (isAccusationComplete(state)) {
    events.push(...resolveAccusation(state));
  }

  return { state, events };
}

/**
 * Resolve the (now fully-voted) accusation. Unanimous agreement is required to
 * convict; otherwise it fizzles. Consequences per §10.
 */
function resolveAccusation(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const acc = state.accusationState;
  if (!acc) return events;

  const unanimous = acc.votes.every(v => v.agree);
  const wasTraitor = state.bloodPactHolder === acc.accused;

  let outcome: 'correct' | 'wrong' | 'fizzled';

  if (!unanimous) {
    // Someone refused — the accusation collapses with no conviction.
    outcome = 'fizzled';
    state.accusationLockoutUntilRound = state.round + ACCUSATION_COOLDOWN_ROUNDS;
  } else if (wasTraitor) {
    // Correct conviction — the traitor is exposed.
    outcome = 'correct';
    state.bloodPactExposed = true;

    // The front pushes back: relieve the worst frontier node.
    const frontier = getBlightFrontier(state);
    if (frontier.length > 0) {
      const worst = [...frontier].sort((a, b) => {
        const la = state.board.state.nodes[a]?.blightLevel ?? 0;
        const lb = state.board.state.nodes[b]?.blightLevel ?? 0;
        if (lb !== la) return lb - la;
        return a < b ? -1 : 1;
      })[0];
      events.push(...applyPushback(state, worst, ACCUSATION_PUSHBACK));
    }

    // The exposed traitor takes wounds (may Break them).
    state.players[acc.accused].wounds += TRAITOR_EXPOSED_WOUNDS;
    events.push(...checkBrokenState(state, acc.accused));
  } else {
    // Wrong conviction — accusers pay, the accused is vindicated.
    outcome = 'wrong';
    for (const vote of acc.votes) {
      if (vote.agree) {
        const accuser = state.players[vote.playerIndex];
        accuser.hand.splice(0, Math.min(ACCUSATION_WRONG_PENALTY, accuser.hand.length));
      }
    }
    state.players[acc.accused].banners += ACCUSATION_VINDICATION_BONUS;
    state.accusationLockoutUntilRound = state.round + ACCUSATION_COOLDOWN_ROUNDS;
  }

  acc.resolved = true;
  acc.outcome = outcome;

  events.push({
    type: 'ACCUSATION_RESOLVED',
    accuser: acc.accuser,
    accused: acc.accused,
    outcome,
    wasTraitor,
  });

  // Clear the slot so a new accusation can open later (subject to lockout).
  state.accusationState = null;

  return events;
}

// ─── AI deduction policy — pure f(state, seed) (§7.9) ─────────────

/**
 * Suspicion score for `targetIndex`: how often they pledged thinly (none/low)
 * across the Suspicion Log. The traitor's tell is a thin pledge hidden in the
 * noise, so higher = more suspect.
 */
export function suspicionScore(state: GameState, targetIndex: number): number {
  let score = 0;
  for (const round of state.suspicionLog) {
    const entry = round.find(e => e.playerIndex === targetIndex);
    if (!entry) continue;
    if (entry.tier === 'none') score += 2;
    else if (entry.tier === 'low') score += 1;
  }
  return score;
}

/**
 * Pick the opponent `playerIndex` most wants to Audit (its top suspect), or null
 * if nothing stands out. Deterministic; ties broken by lowest seat then seed.
 */
export function chooseAuditTarget(
  state: GameState,
  playerIndex: number,
  seed: number,
): number | null {
  if (state.mode !== 'blood_pact') return null;
  return mostSuspect(state, playerIndex, seed, 1);
}

/**
 * Decide whether `playerIndex` opens an accusation this turn, and against whom.
 * Only fires when a single opponent looks clearly guiltier than the rest.
 * Returns the accused index or null. Pure `f(state, seed)`.
 */
export function chooseAccusation(
  state: GameState,
  playerIndex: number,
  seed: number,
): number | null {
  if (state.mode !== 'blood_pact') return null;
  if (state.bloodPactExposed) return null;
  if (state.accusationState && !state.accusationState.resolved) return null;
  if (state.round < state.accusationLockoutUntilRound) return null;
  // Need real evidence before accusing (a high bar — accusing wrongly is costly).
  return mostSuspect(state, playerIndex, seed, 3);
}

/**
 * How `playerIndex` votes on the open accusation: agree iff the accused is also
 * this voter's own top suspect (or clearly suspicious). Pure `f(state, seed)`.
 */
export function chooseAccusationVote(
  state: GameState,
  playerIndex: number,
  seed: number,
): boolean {
  const acc = state.accusationState;
  if (!acc) return false;
  // The accused's suspicion in this voter's eyes vs. the field.
  const accusedScore = suspicionScore(state, acc.accused);
  const myTop = mostSuspect(state, playerIndex, seed, 1);
  return myTop === acc.accused || accusedScore >= 3;
}

/**
 * Shared helper: the opponent of `playerIndex` with the highest suspicion score
 * that clears `minScore`, or null. When several opponents tie at the top score,
 * the seed picks among them — so the choice is pure `f(state, seed)`.
 */
function mostSuspect(
  state: GameState,
  playerIndex: number,
  seed: number,
  minScore: number,
): number | null {
  let topScore = -1;
  for (const p of state.players) {
    if (p.index === playerIndex) continue;
    const score = suspicionScore(state, p.index);
    if (score >= minScore && score > topScore) topScore = score;
  }
  if (topScore < minScore) return null;

  // Collect every opponent tied at the top score (seat order = stable).
  const tied = state.players
    .filter(p => p.index !== playerIndex && suspicionScore(state, p.index) === topScore)
    .map(p => p.index);

  if (tied.length === 1) return tied[0];
  const rng = new SeededRandom(seed + state.round * 31 + playerIndex);
  return tied[rng.int(0, tied.length - 1)];
}
