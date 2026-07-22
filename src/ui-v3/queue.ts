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
 * HAND DELTAS (T-302) run REAL element tweens: an optional `HandAnimator` classifies each
 * `hand_delta` into deal / draw / play / discard and dispatches the matching GSAP preset. Outgoing
 * kinds (`play` / `discard`) are `'pre-settle'` and go on the batch timeline; incoming kinds
 * (`deal` / `draw`) are `'post-settle'` and run fire-and-forget on the freshly settled DOM (the
 * settle replaces the whole `innerHTML`, so an entrance can only exist after it). Every other move
 * type still burns a placeholder time-tween hold.
 *
 * REVEAL FLIPS (T-303) straddle the settle in TWO halves. `settle()` replaces the whole app DOM, so
 * it IS the flip midpoint: `flip.firstHalf` (the BACK rotating to edge-on) runs strictly BEFORE it,
 * `flip.secondHalf` (the FACE rotating back to square) strictly AFTER. That ordering is what makes
 * "face content enters the DOM only at the midpoint" a structural property rather than a timing
 * hope — and it holds in instant mode too, where both halves still dispatch with a null timeline
 * (no tweens, no overlay DOM), which is exactly what the frame-level fog test asserts.
 *
 * Determinism / guardrails: this module imports ONLY `gsap`, `hand-anim.js` / `flip-anim.js`
 * (presets, no state), the `Move`/`MoveType` TYPES from `moves.js` plus the `isRevealMove`
 * narrowing helper, and the `SoundManager` TYPE from `sound.js`
 * (type-only — no runtime coupling). It never imports the reducer / session / observable, never
 * touches full state or `seed`, and introduces NO randomness (no `Math.random`, no `Date.now`) —
 * every tween uses fixed preset durations. The queue only ever receives a `Move[]` already derived
 * from two fogged (§7 D2) projections, and settlement re-renders from the fogged view, so it adds
 * no leak surface; hand presets read only already-rendered fogged DOM.
 */

import { gsap } from 'gsap';
import { HandAnimator, handTickContext, isHandDeltaMove, handPresetFor } from './hand-anim.js';
import type { HandTickContext } from './hand-anim.js';
import { FlipAnimator, flipPresetFor } from './flip-anim.js';
import { isRevealMove } from './moves.js';
import type { HandDeltaMove, Move, MoveType, RevealMove } from './moves.js';
import type { SoundManager } from './sound.js';

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
 *
 * NOTE (T-302): `hand_delta` now resolves its hold PER KIND through `HAND_DELTA_PRESETS`
 * (`hand-anim.ts`) whenever a `HandAnimator` is wired in; the entry below stays as the no-animator
 * fallback and keeps this table's `Record<MoveType, number>` gate exhaustive.
 *
 * NOTE (T-303): likewise, the reveal types (`token_reveal` / `telegraph` / `bloodpact_exposed`)
 * resolve their hold through `REVEAL_PRESETS` (`flip-anim.ts`) whenever a `FlipAnimator` is wired
 * in; their entries below stay as the no-animator fallback and keep this gate exhaustive.
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

/**
 * Read-only accessor for a move type's animated preset hold (seconds). Exposed so presentation
 * tests (T-205) can assert an animated preset exists for a given move (e.g. `act_advance` > 0)
 * without reaching into the module-private table. Pure read — changes no value or behavior.
 */
export function presetSeconds(type: MoveType): number {
  return PRESET_SECONDS[type];
}

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
  readonly #sound: SoundManager | undefined;
  readonly #hand: HandAnimator | undefined;
  readonly #flip: FlipAnimator | undefined;
  readonly #pending: Move[][] = [];
  #timeline: gsap.core.Timeline | null = null;

  /**
   * @param settle       DOM-commit callback (a full re-render from the fogged view).
   * @param requestedMode `'auto'` (default) resolves per-enqueue via `resolveMode()` so a runtime
   *                      reduced-motion change is honored; `'instant'` / `'animated'` force a mode.
   * @param sound        Optional `SoundManager`; when present, `enqueue` fires `play(move.type)`
   *                      once per move (silent no-op under jsdom / with an empty registry).
   * @param hand         Optional `HandAnimator` (T-302); when present every `hand_delta` fires its
   *                      classified GSAP preset. Omitting it keeps the pre-T-302 hold behavior.
   * @param flip         Optional `FlipAnimator` (T-303); when present every reveal move flips in
   *                      two halves around the settle. Omitting it keeps the pre-T-303 hold.
   */
  constructor(
    settle: () => void,
    requestedMode: QueueMode | 'auto' = 'auto',
    sound?: SoundManager,
    hand?: HandAnimator,
    flip?: FlipAnimator,
  ) {
    this.#settle = settle;
    this.#requestedMode = requestedMode;
    this.#sound = sound;
    this.#hand = hand;
    this.#flip = flip;
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
    // Fire sound once per move, in BOTH modes, synchronously at enqueue time. Skeleton simplification:
    // clips are not yet tween-synced (a later M-task) — this is a fire-and-forget cue that no-ops
    // under jsdom and on any empty-registry lookup miss.
    if (this.#sound !== undefined) {
      for (const move of moves) this.#sound.play(move.type);
    }
    if (this.#mode() === 'instant') {
      // Hand presets still DISPATCH in instant mode (with a null timeline → no tweens are built),
      // so the deal/draw/play/discard path is exercised on the synchronous jsdom drive.
      if (this.#hand !== undefined) {
        const ctx = handTickContext(moves);
        for (const move of moves) {
          if (isHandDeltaMove(move)) this.#hand.fire(move, ctx, null);
        }
      }
      // Reveal flips dispatch BOTH halves around the settle, with a null timeline (no tweens, no
      // overlay DOM). The ordering below is the acceptance property: nothing dispatched before the
      // settle can see face content, because the face only enters the DOM when `settle()` runs.
      const flip = this.#flip;
      if (flip !== undefined) {
        for (const move of moves) if (isRevealMove(move)) flip.firstHalf(move, null);
      }
      // Synchronous settlement — no timeline built, queue stays idle on return. THE MIDPOINT.
      this.#settle();
      if (flip !== undefined) {
        for (const move of moves) if (isRevealMove(move)) flip.secondHalf(move, null);
      }
      return;
    }
    this.#pending.push(moves);
    if (this.#timeline === null) this.#play();
  }

  /** Build + start the timeline for the next pending batch (animated mode only). */
  #play(): void {
    const moves = this.#pending.shift();
    if (moves === undefined) return;

    const ctx: HandTickContext = handTickContext(moves);
    const hand = this.#hand;
    const flip = this.#flip;
    // Entrances (`deal` / `draw`) can only run AFTER the settle replaces the DOM.
    const postSettle: HandDeltaMove[] = [];
    // Face halves can only run AFTER the settle — the face does not exist in the DOM before it.
    const postSettleReveals: RevealMove[] = [];

    const proxy: TweenProxy = { _t: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        this.#timeline = null;
        this.#settle();
        if (hand !== undefined) {
          // Fire-and-forget entrances on the freshly rendered DOM — they must not gate `isIdle`.
          for (const move of postSettle) hand.fire(move, ctx, HandAnimator.entranceTimeline());
        }
        if (flip !== undefined) {
          // Same discipline for the face halves: fire-and-forget, never gating `isIdle`.
          for (const move of postSettleReveals) {
            flip.secondHalf(move, FlipAnimator.revealTimeline());
          }
        }
        this.#play();
      },
    });
    for (const move of moves) {
      if (flip !== undefined && isRevealMove(move)) {
        const preset = flipPresetFor(move);
        // Only the BACK half rides the batch timeline; the hold is that half's duration so the
        // settle lands exactly on the edge-on frame — the midpoint.
        const at = tl.duration();
        tl.to(proxy, { _t: 1, duration: preset.seconds / 2 }, at);
        const child = gsap.timeline();
        flip.firstHalf(move, child);
        tl.add(child, at);
        postSettleReveals.push(move);
        continue;
      }
      if (hand !== undefined && isHandDeltaMove(move)) {
        const preset = handPresetFor(move, ctx);
        // The hold is the preset's own duration; a pre-settle preset's tweens ride a child
        // timeline pinned to the SAME start, so the motion and the hold are one beat.
        const at = tl.duration();
        tl.to(proxy, { _t: 1, duration: preset.seconds }, at);
        if (preset.stage === 'pre-settle') {
          const child = gsap.timeline();
          hand.fire(move, ctx, child);
          tl.add(child, at);
        } else {
          postSettle.push(move);
        }
        continue;
      }
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
