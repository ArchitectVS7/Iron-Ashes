/**
 * Animation queue + instant mode (T-103) — the single render path for the v3 UI.
 *
 * Every state change in the v3 frontend renders through this queue: `view.ts` computes a
 * `Move[]` for the tick (`diffObservable(prev, next)`) and calls `enqueue(moves)`. The queue
 * sequences those moves through per-move-type GSAP timelines (placeholder time-tweens for now)
 * and then commits the DOM via the `settle` callback the view owns. There is NO direct re-render
 * path left in the view — `renderApp(session)` is invoked ONLY inside `settle`, which is called
 * ONLY by this queue.
 *
 * INSTANT MODE collapses playback to synchronous DOM settlement: `enqueue` calls `settle()`
 * immediately, builds no timeline, and returns idle. This is the path jsdom and the E2E suite
 * drive (they click a control and re-query the DOM in the same synchronous frame), and it is the
 * path taken whenever `prefers-reduced-motion: reduce` matches or `window.matchMedia` is absent.
 *
 * Determinism / guardrails: this module imports ONLY `gsap` and the `Move`/`MoveType` TYPES from
 * `moves.js`. It never imports the reducer / session / observable, never touches full state or
 * `seed`, and introduces NO randomness (no `Math.random`, no `Date.now`) — placeholder tweens use
 * fixed preset durations. The queue only ever receives a `Move[]` already derived from two fogged
 * (§7 D2) projections, and settlement re-renders from the fogged view, so it adds no leak surface.
 */

import { gsap } from 'gsap';
import type { Move, MoveType } from './moves.js';

export type QueueMode = 'instant' | 'animated';

/**
 * Resolve the runtime playback mode. jsdom has no `window.matchMedia` → `'instant'`, which keeps
 * the synchronous E2E drive pattern intact without touching those tests. A user who prefers
 * reduced motion also gets `'instant'`. Everyone else gets `'animated'`.
 */
export function resolveMode(): QueueMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'instant';
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'instant';
  } catch {
    return 'instant';
  }
  return 'animated';
}

/**
 * Placeholder per-move-type hold durations (seconds). The explicit `Record<MoveType, number>`
 * annotation is the compile-time gate: adding a new `MoveType` (or renaming one) without a preset
 * here is a `tsc` error. Real per-element card/piece/token tweens land in later M-tasks; this
 * milestone only sequences the holds and then commits.
 */
const PRESET_SECONDS: Record<MoveType, number> = {
  piece_move: 0.3,
  piece_recruited: 0.3,
  capture: 0.4,
  ransom: 0.3,
  rout: 0.3,
  token_reveal: 0.35,
  node_claimed: 0.25,
  node_blighted: 0.25,
  node_ashed: 0.4,
  banners_delta: 0.2,
  hand_delta: 0.2,
  pledge: 0.2,
  telegraph: 0.3,
  dark_force: 0.4,
  phase_advance: 0.2,
  round_advance: 0.2,
  act_advance: 0.5,
  crown_change: 0.4,
  oath_sworn: 0.3,
  oath_broken: 0.3,
  accusation_opened: 0.3,
  accusation_resolved: 0.4,
  bloodpact_exposed: 0.5,
  heart_spawn: 0.5,
  heart_assault: 0.5,
  dark_defeated: 0.6,
  wraith_joined: 0.4,
  elimination: 0.6,
  game_end: 0.6,
};

/** A dummy tween target — placeholder tweens animate this, not real DOM elements (yet). */
interface TweenProxy {
  _t: number;
}

/**
 * Sequences one state-change's `Move[]` through GSAP timelines, then commits the DOM via `settle`.
 * In instant mode, `enqueue` settles synchronously and stays idle. In animated mode, batches are
 * serialized through a FIFO so overlapping ticks (several synchronous `onChange` calls in one
 * action) play in order.
 */
export class AnimationQueue {
  readonly #settle: () => void;
  readonly #requestedMode: QueueMode | 'auto';
  readonly #pending: Move[][] = [];
  #timeline: gsap.core.Timeline | null = null;

  /**
   * @param settle       DOM-commit callback (a full re-render from the fogged view).
   * @param requestedMode `'auto'` (default) resolves per-enqueue via `resolveMode()` so a runtime
   *                      reduced-motion change is honored; `'instant'` / `'animated'` force a mode.
   */
  constructor(settle: () => void, requestedMode: QueueMode | 'auto' = 'auto') {
    this.#settle = settle;
    this.#requestedMode = requestedMode;
  }

  /** True when nothing is playing or waiting to play. */
  get isIdle(): boolean {
    return this.#timeline === null && this.#pending.length === 0;
  }

  /** The effective mode for the current enqueue (resolved live when `'auto'`). */
  #mode(): QueueMode {
    return this.#requestedMode === 'auto' ? resolveMode() : this.#requestedMode;
  }

  /**
   * Drive one state-change: sequence its moves, then settle the DOM. Instant mode settles
   * synchronously and immediately; animated mode plays placeholder holds first (serialized).
   */
  enqueue(moves: Move[]): void {
    if (this.#mode() === 'instant') {
      // Synchronous settlement — no timeline built, queue stays idle on return.
      this.#settle();
      return;
    }
    this.#pending.push(moves);
    if (this.#timeline === null) this.#play();
  }

  /** Build + start the timeline for the next pending batch (animated mode only). */
  #play(): void {
    const moves = this.#pending.shift();
    if (moves === undefined) return;

    const proxy: TweenProxy = { _t: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        this.#timeline = null;
        this.#settle();
        this.#play();
      },
    });
    for (const move of moves) {
      tl.to(proxy, { _t: 1, duration: PRESET_SECONDS[move.type] ?? 0.3 });
    }
    // Empty diffs (idle ticks / the initial paint) still need a settle: hold a zero-duration
    // beat so `onComplete` fires and commits.
    if (moves.length === 0) tl.to(proxy, { _t: 1, duration: 0 });
    this.#timeline = tl;
  }

  /**
   * Kill the live timeline, drain every pending batch, and settle the DOM to its final state
   * immediately. Because `settle` is a full re-render from the (final) fogged view, one settle
   * reaches the terminal DOM regardless of how many batches were queued. Used by teardown and
   * tests; leaves the queue idle. A settle still runs even when already idle (cheap, exact).
   */
  flush(): void {
    if (this.#timeline !== null) {
      this.#timeline.kill();
      this.#timeline = null;
    }
    this.#pending.length = 0;
    this.#settle();
  }
}
