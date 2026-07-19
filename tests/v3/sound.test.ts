// @vitest-environment jsdom
/**
 * SoundManager skeleton (T-105).
 *
 * Proves the acceptance clauses: silent no-op under jsdom (no Web Audio), an empty registry is
 * tolerated (`play` never throws, even when force-enabled), master volume clamps to `[0, 1]`, mute
 * round-trips, and the animation queue invokes `play(move.type)` once per move in order (asserted
 * via a spy) while an empty diff triggers zero calls.
 */

import { describe, expect, it, vi } from 'vitest';
import { SoundManager } from '../../src/ui-v3/sound.js';
import { AnimationQueue } from '../../src/ui-v3/queue.js';
import type { Move } from '../../src/ui-v3/moves.js';

describe('SoundManager silent no-op under jsdom', () => {
  it('is silent (jsdom has no AudioContext) and play never throws', () => {
    const sm = new SoundManager();
    expect(sm.silent).toBe(true);
    expect(() => sm.play('capture')).not.toThrow();
    // Empty-registry tolerance on a different type.
    expect(() => sm.play('game_end')).not.toThrow();
  });

  it('force-enabled still no-ops safely with the empty registry (no real audio needed)', () => {
    const sm = new SoundManager({ enabled: true });
    expect(sm.silent).toBe(false);
    expect(() => sm.play('capture')).not.toThrow();
  });
});

describe('SoundManager volume', () => {
  it('stores an in-range volume', () => {
    const sm = new SoundManager();
    sm.setVolume(0.5);
    expect(sm.getVolume()).toBe(0.5);
  });

  it('clamps volume to [0, 1]', () => {
    const sm = new SoundManager();
    sm.setVolume(2);
    expect(sm.getVolume()).toBe(1);
    sm.setVolume(-1);
    expect(sm.getVolume()).toBe(0);
  });
});

describe('SoundManager mute', () => {
  it('round-trips the mute flag', () => {
    const sm = new SoundManager();
    expect(sm.isMuted()).toBe(false);
    sm.setMuted(true);
    expect(sm.isMuted()).toBe(true);
    sm.setMuted(false);
    expect(sm.isMuted()).toBe(false);
  });
});

describe('AnimationQueue invokes SoundManager.play per move', () => {
  const MOVES: Move[] = [
    { type: 'phase_advance', from: 'THREAT', to: 'PLEDGE' },
    { type: 'round_advance', from: 1, to: 2 },
    { type: 'crown_change', from: null, to: 0 },
  ];

  it('calls play once per move, in order, on enqueue', () => {
    const sm = new SoundManager();
    const spy = vi.spyOn(sm, 'play');
    new AnimationQueue(vi.fn(), 'instant', sm).enqueue(MOVES);
    expect(spy).toHaveBeenCalledTimes(MOVES.length);
    expect(spy.mock.calls.map((c) => c[0])).toEqual(MOVES.map((m) => m.type));
  });

  it('an empty diff triggers zero play calls', () => {
    const sm = new SoundManager();
    const spy = vi.spyOn(sm, 'play');
    new AnimationQueue(vi.fn(), 'instant', sm).enqueue([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('is optional — a two-arg queue still settles with no SoundManager', () => {
    const settle = vi.fn();
    expect(() => new AnimationQueue(settle, 'instant').enqueue(MOVES)).not.toThrow();
    expect(settle).toHaveBeenCalledTimes(1);
  });
});
