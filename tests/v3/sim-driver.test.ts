/**
 * Headless driver tests (Stage 4a).
 *
 * The canonical `playHeadlessGame` (src/v3/sim/driver.ts) is the single game loop
 * the Monte-Carlo sweep runs on. These confirm it is deterministic (same config ⇒
 * byte-identical final state, the §7.12 invariant) and that the no-policy default
 * reproduces a plain all-baseline AI game without hanging.
 */

import { describe, expect, it } from 'vitest';
import { playHeadlessGame } from '../../src/v3/sim/driver.js';
import { DEFAULT_AI_POLICY } from '../../src/v3/ai-player.js';

describe('playHeadlessGame', () => {
  it('drives a full game to a terminal state within the guard', () => {
    const r = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    expect(r.finalState.gameEndReason).not.toBeNull();
    expect(r.hitGuard).toBe(false);
    expect(r.steps).toBeGreaterThan(0);
  });

  it('is deterministic — same config ⇒ byte-identical final state (§7.12)', () => {
    const a = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const b = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    expect(JSON.stringify(a.finalState)).toBe(JSON.stringify(b.finalState));
  });

  it('explicitly passing DEFAULT_AI_POLICY to every seat is identical to passing none', () => {
    const none = playHeadlessGame({ seed: 11, playerCount: 4, mode: 'competitive' });
    const explicit = playHeadlessGame({
      seed: 11, playerCount: 4, mode: 'competitive',
      seatPolicies: [DEFAULT_AI_POLICY, DEFAULT_AI_POLICY, DEFAULT_AI_POLICY, DEFAULT_AI_POLICY],
    });
    expect(JSON.stringify(explicit.finalState)).toBe(JSON.stringify(none.finalState));
  });

  it('terminates for 2- and 3-player counts and blood_pact mode', () => {
    expect(playHeadlessGame({ seed: 7, playerCount: 2, mode: 'competitive' }).finalState.gameEndReason).not.toBeNull();
    expect(playHeadlessGame({ seed: 7, playerCount: 3, mode: 'competitive' }).finalState.gameEndReason).not.toBeNull();
    const bp = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'blood_pact' });
    expect(bp.finalState.gameEndReason).not.toBeNull();
  });

  it('different seeds generally diverge', () => {
    const a = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const b = playHeadlessGame({ seed: 99, playerCount: 4, mode: 'competitive' });
    expect(JSON.stringify(a.finalState.actionLog)).not.toBe(JSON.stringify(b.finalState.actionLog));
  });
});
