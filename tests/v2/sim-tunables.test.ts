/**
 * Tunable injectability tests (Stage 5b).
 *
 * The `withTunables`/`getTunables` seam lets the sim vary balance constants per
 * run. These prove: (1) the DEFAULT path is byte-identical to before (the §7.12
 * invariant must survive the seam); (2) overrides actually take effect and are
 * deterministic; (3) the override scope is leak-safe (restored afterward).
 */

import { describe, expect, it } from 'vitest';
import { doomCost, getTunables, withTunables, DEFAULT_TUNABLES } from '../../src/v2/tunables.js';
import { playHeadlessGame } from '../../src/v2/sim/driver.js';
import { runTunableCandidates } from '../../src/v2/sim/search.js';
import { MIXED_CANONICAL } from '../../src/v2/sim/matchups.js';

describe('tunable seam', () => {
  it('getTunables returns the defaults outside any override', () => {
    expect(getTunables()).toEqual(DEFAULT_TUNABLES);
  });

  it('withTunables applies overrides, then restores (leak-safe)', () => {
    expect(doomCost('WHISPER', 4)).toBe(3);
    const inside = withTunables({ DOOM_COST_WHISPER: 9 }, () => doomCost('WHISPER', 4));
    expect(inside).toBe(9);
    expect(doomCost('WHISPER', 4)).toBe(3); // restored
    expect(getTunables().DOOM_COST_WHISPER).toBe(3);
  });

  it('the player-count divisor lever changes the doom-cost scaling', () => {
    expect(doomCost('WHISPER', 2)).toBe(2); // ceil(3*2/4)
    const harder = withTunables({ DOOM_COST_PLAYER_DIVISOR: 2 }, () => doomCost('WHISPER', 2));
    expect(harder).toBe(3); // ceil(3*2/2)
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
    playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive', tunables: { DOOM_COST_WHISPER: 9 } });
    expect(getTunables().DOOM_COST_WHISPER).toBe(3);
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
