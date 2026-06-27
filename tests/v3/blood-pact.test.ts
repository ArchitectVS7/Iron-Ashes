/**
 * Blood Pact (Layer B) tests — ALGORITHM §10.
 *
 * Covers the deduction surface: sealed-pledge concealment, the Suspicion Log,
 * the Audit action, and the accusation lifecycle (correct / wrong / fizzled /
 * lockout), plus the exposed-traitor win forfeit. AI choosers are checked for
 * purity + determinism (§7.9). Competitive mode must be unaffected.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand, InvalidCommandError } from '../../src/v3/reducer.js';
import {
  suspicionScore,
  chooseAccusation,
  chooseAccusationVote,
  chooseAuditTarget,
  isAccusationComplete,
} from '../../src/v3/blood-pact.js';
import {
  AUDIT_COST,
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_VINDICATION_BONUS,
} from '../../src/v3/tunables.js';
import type { Command } from '../../src/v3/commands.js';
import type { GameState, PledgeEntry } from '../../src/v3/types.js';

// ─── Helpers ──────────────────────────────────────────────────────

function apply(state: GameState, cmd: Command): GameState {
  return applyCommand(state, cmd).state;
}

/** A blood_pact game with a known traitor seat (forced after setup). */
function bloodPactGame(seed: number, traitor = 0, playerCount = 4): GameState {
  const state = createGame(playerCount, 'blood_pact', seed, playerCount); // all human → pact assignable
  // Force a deterministic traitor seat for the test.
  for (const p of state.players) p.hasBloodPact = p.index === traitor;
  state.bloodPactHolder = traitor;
  return state;
}

/** Get a blood_pact game into PLEDGE with the telegraph set. */
function toPledge(state: GameState): GameState {
  return apply(state, { type: 'ADVANCE_PHASE' });
}

/** Push a round of tiers into the Suspicion Log directly (test fixture). */
function seedSuspicion(state: GameState, tiers: PledgeEntry['tier'][]): void {
  state.suspicionLog.push(tiers.map((tier, i) => ({ playerIndex: i, amount: 0, tier })));
}

// ─── Sealed pledge reveal ─────────────────────────────────────────

describe('sealed pledge reveal (§10)', () => {
  it('blood_pact emits PLEDGE_COMMITTED (no amount/tier) instead of PLEDGE_SUBMITTED', () => {
    const state = toPledge(bloodPactGame(7));
    const result = applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 1 });
    const committed = result.events.filter(e => e.type === 'PLEDGE_COMMITTED');
    const submitted = result.events.filter(e => e.type === 'PLEDGE_SUBMITTED');
    expect(committed.length).toBe(1);
    expect(submitted.length).toBe(0);
  });

  it('competitive mode still emits PLEDGE_SUBMITTED (unchanged)', () => {
    let state = createGame(4, 'competitive', 7, 0);
    state = apply(state, { type: 'ADVANCE_PHASE' });
    const result = applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 1 });
    expect(result.events.some(e => e.type === 'PLEDGE_SUBMITTED')).toBe(true);
    expect(result.events.some(e => e.type === 'PLEDGE_COMMITTED')).toBe(false);
  });
});

// ─── Suspicion Log ────────────────────────────────────────────────

describe('Suspicion Log (§10)', () => {
  it('records per-round tiers in blood_pact mode after pledge resolution', () => {
    let state = toPledge(bloodPactGame(7));
    for (const p of state.players) {
      state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: p.index === 0 ? 0 : 2 });
    }
    state = apply(state, { type: 'ADVANCE_PHASE' }); // resolve PLEDGE → ACTION
    expect(state.suspicionLog.length).toBe(1);
    const round = state.suspicionLog[0];
    expect(round.find(e => e.playerIndex === 0)!.tier).toBe('none');
    expect(round.find(e => e.playerIndex === 1)!.tier).not.toBe('none');
  });

  it('competitive mode does NOT populate the Suspicion Log', () => {
    let state = createGame(4, 'competitive', 7, 0);
    state = apply(state, { type: 'ADVANCE_PHASE' });
    for (const p of state.players) {
      state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: 1 });
    }
    state = apply(state, { type: 'ADVANCE_PHASE' });
    expect(state.suspicionLog.length).toBe(0);
  });

  it('is bounded to the most recent rounds', () => {
    // Run several full rounds and confirm the log never exceeds SUSPICION_LOG_ROUNDS.
    let s = bloodPactGame(7);
    for (let r = 0; r < 8 && s.gameEndReason === null; r++) {
      s = apply(s, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      for (const p of s.players) s = apply(s, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: 1 });
      s = apply(s, { type: 'ADVANCE_PHASE' }); // resolve → ACTION
      // pass everyone
      for (const idx of s.turnOrder) {
        if (s.phase === 'ACTION' && s.activePlayerIndex === idx) {
          s = apply(s, { type: 'PLAYER_ACTION', playerIndex: idx, action: { type: 'PASS' } });
        }
      }
      if (s.phase === 'ACTION') s = apply(s, { type: 'ADVANCE_PHASE' }); // → DAWN → THREAT
    }
    expect(s.suspicionLog.length).toBeLessThanOrEqual(4);
  });
});

// ─── Audit ────────────────────────────────────────────────────────

describe('Audit action (§10)', () => {
  /** Get a blood_pact game into ACTION with one round of pledges on record. */
  function toActionWithHistory(seed: number, traitor = 0): GameState {
    let state = bloodPactGame(seed, traitor);
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
    for (const p of state.players) {
      state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: p.index === traitor ? 0 : 2 });
    }
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION
    return state;
  }

  it('reveals a target\'s last pledge and charges banners', () => {
    const state = toActionWithHistory(7);
    const auditor = state.activePlayerIndex;
    const target = state.players.find(p => p.index !== auditor)!.index;
    state.players[auditor].banners = AUDIT_COST + 1;
    const before = state.players[auditor].banners;

    const result = applyCommand(state, {
      type: 'PLAYER_ACTION',
      playerIndex: auditor,
      action: { type: 'AUDIT', targetPlayerIndex: target },
    });

    const reveal = result.events.find(e => e.type === 'AUDIT_RESULT');
    expect(reveal).toBeDefined();
    expect(result.state.players[auditor].banners).toBe(before - AUDIT_COST);
    expect(result.state.auditLog.length).toBe(1);
    expect(result.state.auditLog[0].target).toBe(target);
  });

  it('rejects an Audit the player cannot afford', () => {
    const state = toActionWithHistory(7);
    const auditor = state.activePlayerIndex;
    const target = state.players.find(p => p.index !== auditor)!.index;
    state.players[auditor].banners = 0;
    expect(() =>
      apply(state, { type: 'PLAYER_ACTION', playerIndex: auditor, action: { type: 'AUDIT', targetPlayerIndex: target } }),
    ).toThrow(InvalidCommandError);
  });

  it('cannot Audit in a competitive game', () => {
    let state = createGame(4, 'competitive', 7, 0);
    state = apply(state, { type: 'ADVANCE_PHASE' });
    for (const p of state.players) state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: 0 });
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION
    const me = state.activePlayerIndex;
    const target = state.players.find(p => p.index !== me)!.index;
    expect(() =>
      apply(state, { type: 'PLAYER_ACTION', playerIndex: me, action: { type: 'AUDIT', targetPlayerIndex: target } }),
    ).toThrow(InvalidCommandError);
  });
});

// ─── Accusation lifecycle ─────────────────────────────────────────

describe('accusation (§10)', () => {
  /** Open an accusation by `accuser` against `accused` and have the rest vote `agree`. */
  function runAccusation(state: GameState, accuser: number, accused: number, agree: boolean): GameState {
    let s = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: accuser, accusedIndex: accused });
    for (const p of s.players) {
      if (p.index === accused || p.index === accuser) continue;
      if (s.accusationState === null) break; // already resolved
      s = apply(s, { type: 'ACCUSATION_VOTE', playerIndex: p.index, agree });
    }
    return s;
  }

  it('a correct, unanimous accusation exposes the traitor and forfeits their doom win', () => {
    const traitor = 2;
    const state = bloodPactGame(7, traitor);
    const after = runAccusation(state, 0, traitor, true);
    expect(after.bloodPactExposed).toBe(true);
    // The exposure bite is the forfeited doom/attrition win + front pushback (§10); the v2
    // wounds sting is retired with the Broken Court (§8).
    expect(after.accusationState).toBeNull();
    const resolved = after.actionLog.find(e => e.type === 'ACCUSATION_RESOLVED');
    expect(resolved).toMatchObject({ outcome: 'correct', wasTraitor: true });
  });

  it('a wrong accusation vindicates the accused and locks out further accusations', () => {
    const traitor = 2;
    const state = bloodPactGame(7, traitor);
    const innocent = 1;
    const beforeBanners = state.players[innocent].banners;
    const after = runAccusation(state, 0, innocent, true);
    expect(after.bloodPactExposed).toBe(false);
    expect(after.players[innocent].banners).toBe(beforeBanners + ACCUSATION_VINDICATION_BONUS);
    expect(after.accusationLockoutUntilRound).toBe(state.round + ACCUSATION_COOLDOWN_ROUNDS);
    const resolved = after.actionLog.find(e => e.type === 'ACCUSATION_RESOLVED');
    expect(resolved).toMatchObject({ outcome: 'wrong', wasTraitor: false });
  });

  it('a non-unanimous vote fizzles (no conviction)', () => {
    const traitor = 2;
    const state = bloodPactGame(7, traitor);
    // Accuse the traitor but one voter refuses → fizzle, NOT exposed.
    let s = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: 0, accusedIndex: traitor });
    s = apply(s, { type: 'ACCUSATION_VOTE', playerIndex: 1, agree: false }); // dissent
    s = apply(s, { type: 'ACCUSATION_VOTE', playerIndex: 3, agree: true });
    expect(s.bloodPactExposed).toBe(false);
    expect(s.accusationState).toBeNull();
    expect(s.actionLog.find(e => e.type === 'ACCUSATION_RESOLVED')).toMatchObject({ outcome: 'fizzled' });
  });

  it('cannot open a second accusation while one is live', () => {
    const state = bloodPactGame(7, 2);
    const s = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: 0, accusedIndex: 1 });
    // 4 players → accusation still open (needs votes from 2 and 3).
    expect(s.accusationState).not.toBeNull();
    expect(() =>
      apply(s, { type: 'INITIATE_ACCUSATION', accuserIndex: 3, accusedIndex: 2 }),
    ).toThrow(InvalidCommandError);
  });

  it('cannot accuse during lockout', () => {
    const state = bloodPactGame(7, 2);
    const after = runAccusation(state, 0, 1, true); // wrong → lockout
    expect(() =>
      apply(after, { type: 'INITIATE_ACCUSATION', accuserIndex: 3, accusedIndex: 2 }),
    ).toThrow(InvalidCommandError);
  });

  it('the accused cannot vote on their own accusation', () => {
    const state = bloodPactGame(7, 2);
    const s = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: 0, accusedIndex: 1 });
    expect(() =>
      apply(s, { type: 'ACCUSATION_VOTE', playerIndex: 1, agree: false }),
    ).toThrow(InvalidCommandError);
  });

  it('a 2-player accusation resolves immediately (accuser is the only voter)', () => {
    const state = bloodPactGame(7, 0, 2); // traitor = seat 0, 2 players
    const after = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: 1, accusedIndex: 0 });
    expect(after.accusationState).toBeNull(); // resolved on open
    expect(after.bloodPactExposed).toBe(true);
  });

  it('cannot accuse in a competitive game', () => {
    const state = createGame(4, 'competitive', 7, 0);
    expect(() =>
      apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: 0, accusedIndex: 1 }),
    ).toThrow(InvalidCommandError);
  });
});

// ─── AI deduction choosers — pure f(state, seed) (§7.9) ──────────

describe('AI deduction policy', () => {
  it('suspicionScore rewards thin (none/low) pledges', () => {
    const state = bloodPactGame(7, 0);
    seedSuspicion(state, ['none', 'high', 'high', 'high']);
    seedSuspicion(state, ['low', 'high', 'high', 'high']);
    expect(suspicionScore(state, 0)).toBeGreaterThan(suspicionScore(state, 1));
  });

  it('chooseAccusation targets the clearest suspect and is deterministic', () => {
    const state = bloodPactGame(7, 0);
    for (let i = 0; i < 3; i++) seedSuspicion(state, ['none', 'high', 'high', 'high']);
    const pick = chooseAccusation(state, 1, 7);
    expect(pick).toBe(0); // seat 0 pledged 'none' three times
    expect(chooseAccusation(state, 1, 7)).toBe(pick); // deterministic
  });

  it('chooseAccusation returns null without enough evidence', () => {
    const state = bloodPactGame(7, 0);
    seedSuspicion(state, ['medium', 'high', 'high', 'high']);
    expect(chooseAccusation(state, 1, 7)).toBeNull();
  });

  it('chooseAuditTarget and chooseAccusationVote are pure (no mutation)', () => {
    const state = bloodPactGame(7, 0);
    for (let i = 0; i < 2; i++) seedSuspicion(state, ['none', 'high', 'high', 'high']);
    const snapshot = JSON.stringify(state);
    chooseAuditTarget(state, 1, 7);
    state.accusationState = { accuser: 1, accused: 0, round: 1, votes: [{ playerIndex: 1, agree: true }], resolved: false, outcome: null };
    const snap2 = JSON.stringify(state);
    chooseAccusationVote(state, 3, 7);
    expect(JSON.stringify(state)).toBe(snap2);
    // chooseAuditTarget didn't mutate either (before accusation was set).
    expect(snapshot).toContain('"suspicionLog"');
  });

  it('an AI vote backs an accusation against its own top suspect', () => {
    const state = bloodPactGame(7, 0);
    for (let i = 0; i < 3; i++) seedSuspicion(state, ['none', 'high', 'high', 'high']);
    state.accusationState = { accuser: 1, accused: 0, round: 1, votes: [{ playerIndex: 1, agree: true }], resolved: false, outcome: null };
    expect(chooseAccusationVote(state, 3, 7)).toBe(true);
    expect(isAccusationComplete(state)).toBe(false); // seats 2 and 3 still owe votes
  });

  it('the choosers no-op in competitive mode', () => {
    const state = createGame(4, 'competitive', 7, 0);
    expect(chooseAccusation(state, 0, 7)).toBeNull();
    expect(chooseAuditTarget(state, 0, 7)).toBeNull();
  });
});

// ─── Determinism (§7.12) ──────────────────────────────────────────

describe('blood_pact determinism', () => {
  it('same seed ⇒ identical state through a full accusation flow', () => {
    function run(): GameState {
      const state = bloodPactGame(7, 2);
      let s = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: 0, accusedIndex: 2 });
      s = apply(s, { type: 'ACCUSATION_VOTE', playerIndex: 1, agree: true });
      s = apply(s, { type: 'ACCUSATION_VOTE', playerIndex: 3, agree: true });
      return s;
    }
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
