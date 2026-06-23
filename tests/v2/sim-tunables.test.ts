/**
 * Tunable injectability tests (Stage 5b).
 *
 * The `withTunables`/`getTunables` seam lets the sim vary balance constants per
 * run. These prove: (1) the DEFAULT path is byte-identical to before (the §7.12
 * invariant must survive the seam); (2) overrides actually take effect and are
 * deterministic; (3) the override scope is leak-safe (restored afterward).
 */

import { describe, expect, it } from 'vitest';
import { doomCost, deathKnightCount, getTunables, withTunables, DEFAULT_TUNABLES } from '../../src/v2/tunables.js';
import { playHeadlessGame } from '../../src/v2/sim/driver.js';
import { runTunableCandidates } from '../../src/v2/sim/search.js';
import { MIXED_CANONICAL } from '../../src/v2/sim/matchups.js';

describe('tunable seam', () => {
  it('getTunables returns the defaults outside any override', () => {
    expect(getTunables()).toEqual(DEFAULT_TUNABLES);
  });

  // The formula tests PIN every doomCost lever explicitly so they assert the
  // FORMULA, not the (Stage-5c-tuned) defaults — a later re-tune of the defaults
  // must not silently break them.
  const FLAT = { DOOM_COST_WHISPER: 3, DOOM_COST_PER_PLAYER: 0, DOOM_COST_PLAYER_DIVISOR: 4 };

  it('withTunables applies overrides, then restores (leak-safe)', () => {
    const baseline = withTunables(FLAT, () => doomCost('WHISPER', 4));
    expect(baseline).toBe(3); // ceil(3*4/4 + 0)
    const inside = withTunables({ ...FLAT, DOOM_COST_WHISPER: 9 }, () => doomCost('WHISPER', 4));
    expect(inside).toBe(9); // ceil(9*4/4 + 0)
    expect(getTunables()).toEqual(DEFAULT_TUNABLES); // restored to the shipped defaults
  });

  it('the player-count divisor lever changes the doom-cost scaling', () => {
    expect(withTunables(FLAT, () => doomCost('WHISPER', 2))).toBe(2); // ceil(3*2/4)
    expect(withTunables({ ...FLAT, DOOM_COST_PLAYER_DIVISOR: 2 }, () => doomCost('WHISPER', 2))).toBe(3); // ceil(3*2/2)
  });

  it('DOOM_COST_PER_PLAYER tilts the curve — lowers low-pc, raises high-pc (5c lever)', () => {
    // FLAT (tilt 0): flat per-player share.
    expect(withTunables(FLAT, () => doomCost('WHISPER', 2))).toBe(2);
    expect(withTunables(FLAT, () => doomCost('WHISPER', 4))).toBe(3);
    const tilted = { ...FLAT, DOOM_COST_PER_PLAYER: 1 };
    expect(withTunables(tilted, () => doomCost('WHISPER', 2))).toBe(1); // max(1, ceil(1.5 + 1*(2-3))) = 1
    expect(withTunables(tilted, () => doomCost('WHISPER', 4))).toBe(4); // ceil(3 + 1*(4-3)) = 4
  });

  it('ships the locked doom curve (DOOM_COST_PER_PLAYER 6→5 at Stage S) + spread', () => {
    expect(doomCost('WHISPER', 2)).toBe(1);    // 2p floors: ceil(6*2/4 + 5*(2-3)) = max(1, -2)
    expect(doomCost('WHISPER', 3)).toBe(5);    // pivot: ceil(6*3/4 + 0)
    expect(doomCost('WHISPER', 4)).toBe(11);   // ceil(6*4/4 + 5*1) = 6 + 5
    expect(doomCost('RECKONING', 4)).toBe(17); // ceil(12*4/4 + 5*1) = 12 + 5
    expect(getTunables().SPREAD_AMOUNT_BASE).toBe(5); // 5c 5 → 5-dark 4 → Oaths retune 5
  });

  it('deathKnightCount scales the dark army with player count when DK_PER_PLAYER>0', () => {
    // Default is FLAT 2 (5-dark retune kept DK_PER_PLAYER=0 — scaling backfires once
    // kills pay; see tuning-log §5-dark). The seam still scales when turned on.
    expect(deathKnightCount(2)).toBe(2); // default flat
    expect(deathKnightCount(4)).toBe(2);
    withTunables({ DK_PER_PLAYER: 1 }, () => {
      expect(deathKnightCount(2)).toBe(1); // round(2 + 1*(2-3))
      expect(deathKnightCount(4)).toBe(3); // round(2 + 1*(4-3))
    });
  });

  it('a DK-scaling override actually changes the initial forces', () => {
    const base = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const moreDk = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive', tunables: { DK_PER_PLAYER: 1 } });
    expect(JSON.stringify(moreDk.finalState)).not.toBe(JSON.stringify(base.finalState));
  });
});

describe('playHeadlessGame with tunables', () => {
  it('no override is byte-identical to an empty override and to omitting it (§7.12)', () => {
    const a = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const b = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive', tunables: {} });
    expect(JSON.stringify(a.finalState)).toBe(JSON.stringify(b.finalState));
  });

  it('an override actually changes the game (the seam is wired through createGame)', () => {
    const base = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const harder = playHeadlessGame({
      seed: 7, playerCount: 4, mode: 'competitive',
      tunables: { DOOM_COST_WHISPER: 9, DOOM_COST_MARCH: 12, DOOM_COST_RECKONING: 16 },
    });
    expect(JSON.stringify(harder.finalState)).not.toBe(JSON.stringify(base.finalState));
  });

  it('same override + seed ⇒ byte-identical (deterministic)', () => {
    const cfg = { seed: 11, playerCount: 4, mode: 'competitive' as const, tunables: { DOOM_COST_PLAYER_DIVISOR: 2 } };
    expect(JSON.stringify(playHeadlessGame(cfg).finalState)).toBe(JSON.stringify(playHeadlessGame(cfg).finalState));
  });

  it('leaves no leak: a default game after an override game is still default', () => {
    playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive', tunables: { DOOM_COST_WHISPER: 99 } });
    expect(getTunables()).toEqual(DEFAULT_TUNABLES);
  });
});

describe('search harness', () => {
  it('runTunableCandidates runs each candidate and ranks by ascending loss', () => {
    const base = { seeds: [1, 2, 3], playerCounts: [4], modes: ['competitive'] as const, matchups: [MIXED_CANONICAL] };
    const ranked = runTunableCandidates(base, [
      { label: 'default', tunables: {} },
      { label: 'much-harder-doom', tunables: { DOOM_COST_WHISPER: 12, DOOM_COST_MARCH: 16, DOOM_COST_RECKONING: 20 } },
    ]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].loss).toBeLessThanOrEqual(ranked[1].loss); // sorted best-first
    expect(typeof ranked[0].summary.checks[0].measured).toBe('number');
  });

  it('is deterministic — same candidates ⇒ same losses', () => {
    const base = { seeds: [5], playerCounts: [4], modes: ['competitive'] as const, matchups: [MIXED_CANONICAL] };
    const c = [{ label: 'x', tunables: { DOOM_COST_PLAYER_DIVISOR: 2 } }];
    expect(runTunableCandidates(base, c)[0].loss).toBe(runTunableCandidates(base, c)[0].loss);
  });
});
