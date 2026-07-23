/**
 * One-time global GSAP tuning (T-310 — smooth choppy motion).
 *
 * `force3D: true` keeps every tweened element promoted to the GPU compositor for the whole tween,
 * avoiding the promote/demote hitch GSAP otherwise does at a tween's start/end. `overwrite: 'auto'`
 * makes a new tween cancel conflicting inline transforms on the same target — important because
 * post-settle entrances re-fire on freshly-rendered elements, and without it two tweens can stack
 * conflicting inline transforms and jump.
 *
 * GUARDED FOR THE INSTANT PATH: this touches nothing unless playback is actually animated. It gates
 * on `resolveMode()` — the SAME signal the queue uses — so any environment that plays instant (jsdom,
 * where `window.matchMedia` throws; a `prefers-reduced-motion: reduce` viewer; a headless run) never
 * applies these defaults, and the snap-count replay and `shots:v3` runs are unaffected. Idempotent —
 * the module-level flag makes repeat calls (many `mountView`s in one session) a no-op.
 *
 * DETERMINISM: no RNG, no state — a presentation-only compositor hint that never feeds a command.
 */

import { gsap } from 'gsap';
import { resolveMode } from './queue.js';

let configured = false;

/** Apply the global GSAP smoothness defaults once, only when playback is animated (real browser). */
export function configureGsap(): void {
  if (configured) return;
  if (resolveMode() !== 'animated') return;
  gsap.defaults({ force3D: true, overwrite: 'auto' });
  configured = true;
}
