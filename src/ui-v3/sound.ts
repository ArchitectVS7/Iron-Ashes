/**
 * SoundManager skeleton (T-105) — Howler-backed per-move audio for the v3 UI.
 *
 * The animation queue calls `play(move.type)` once per presentation Move. This skeleton wires the
 * plumbing (master volume, mute, a per-`MoveType` Howl registry) but ships NO audio assets yet —
 * an empty registry is fully tolerated: `play` no-ops on any lookup miss. Real clips land in a
 * later M-task alongside their `docs/CREDITS.md` entries.
 *
 * Silent-under-test: the manager is silent whenever no real Web Audio capability exists (jsdom has
 * no `AudioContext`), so the unit / E2E / parity suites drive it without touching audio. A real
 * browser has `AudioContext` → audible. `{ enabled }` can force either state for testability.
 *
 * Determinism / guardrails: this module imports ONLY `howler` and the `MoveType` TYPE from
 * `moves.js`. It keys purely on `Move['type']` (an already-fogged §7 D2 projection) — it never
 * imports the reducer / session / observable, never touches full state or `seed`, and introduces
 * NO randomness (no `Math.random`, no `Date.now`). Sound is a fire-and-forget side effect that
 * never mutates `GameState` and never feeds back into commands, so it adds no leak or nondeterminism
 * surface.
 */

import { Howl } from 'howler';
import type { MoveType } from './moves.js';

/** Optional construction overrides — `enabled` forces audible/silent, bypassing the probe. */
export interface SoundManagerOptions {
  /** Force the manager audible (`true`) or silent (`false`); omit to probe Web Audio capability. */
  readonly enabled?: boolean;
}

/** Probe whether the host has real Web Audio (jsdom does not; a browser does). */
function hasWebAudio(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
  return typeof w.AudioContext !== 'undefined' || typeof w.webkitAudioContext !== 'undefined';
}

export class SoundManager {
  /** Per-move-type clips. Empty for the skeleton — every `play` lookup misses and no-ops. */
  readonly #registry = new Map<MoveType, Howl>();
  readonly #silent: boolean;
  #volume = 1;
  #muted = false;

  /**
   * @param opts `{ enabled }` forces audible/silent; omit to derive silence from Web Audio support
   *             (silent under jsdom / SSR, audible in a real browser).
   */
  constructor(opts: SoundManagerOptions = {}) {
    this.#silent = opts.enabled === undefined ? !hasWebAudio() : !opts.enabled;
  }

  /** True when the manager will never emit audio (no Web Audio, or force-disabled). */
  get silent(): boolean {
    return this.#silent;
  }

  /**
   * Play the clip registered for `moveType`. No-ops silently when the manager is silent (test/jsdom)
   * or when no clip is registered for the type (empty-registry tolerance). Never throws.
   */
  play(moveType: MoveType): void {
    if (this.#silent) return;
    const clip = this.#registry.get(moveType);
    if (clip === undefined) return;
    clip.volume(this.#muted ? 0 : this.#volume);
    clip.play();
  }

  /** Set master volume, clamped to `[0, 1]`. */
  setVolume(v: number): void {
    this.#volume = Math.min(1, Math.max(0, v));
  }

  /** Current master volume in `[0, 1]`. */
  getVolume(): number {
    return this.#volume;
  }

  /** Mute (`true`) or unmute (`false`) all playback. */
  setMuted(m: boolean): void {
    this.#muted = m;
  }

  /** Whether playback is currently muted. */
  isMuted(): boolean {
    return this.#muted;
  }
}
