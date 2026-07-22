/**
 * Hand-delta animations (T-302) — the GSAP presets behind every hand size change.
 *
 * `diffObservable` emits ONE hand move type (`hand_delta`, seat + from/to counts). This module
 * gives that move real motion by classifying it — PRESENTATIONALLY — into one of four kinds
 * (`deal` / `draw` / `play` / `discard`) and dispatching a GSAP preset per kind. The classification
 * is a presentation heuristic derived from the same tick's already-fogged moves (did the round
 * advance? which phase did we enter?); it is NOT a game rule and nothing here can change state.
 *
 * TWO COMPILE GATES (the acceptance clause "a hand Move type without a preset is a compile error"):
 *   1. `HAND_MOVE_PRESETS: Record<HandDeltaMoveType, …>` — `HandDeltaMoveType` (in `moves.ts`) is the
 *      single place a new hand-carrying Move type is registered; adding one there without a resolver
 *      here is a `tsc` error.
 *   2. `HAND_DELTA_PRESETS: Record<HandDeltaKind, HandDeltaPreset>` — adding a kind without a preset
 *      is a `tsc` error. Both are EXPLICIT annotations (not `satisfies`), which is what makes the
 *      missing-key direction fail to compile.
 *
 * PRE-SETTLE vs POST-SETTLE: `settle()` replaces the whole app `innerHTML`, so outgoing cards can
 * only be tweened BEFORE it (`play` / `discard` → `'pre-settle'`) and incoming cards only AFTER it
 * (`deal` / `draw` → `'post-settle'`). Instant mode never builds a timeline at all.
 *
 * FOG (§7 D2 extends to presentation): `HandAnimator` reads ONLY DOM that `renderApp` already
 * produced from the viewer's fogged projection. A hand delta for a seat that is NOT the viewer
 * animates that house's hand COUNT CHIP only — never a `.card-slot`, never a card value. No `seed`,
 * no unflipped-token content, no rival card faces are read or written anywhere.
 *
 * DETERMINISM: fixed presentation constants only — no `Math.random`, no `Date.now`, no RNG at all
 * (so no `SeededRandom` instance is needed here), and nothing feeds back into commands or state.
 */

import { gsap } from 'gsap';
import type { HandDeltaMove, HandDeltaMoveType, Move } from './moves.js';

/** The four presentational flavours of a hand-size change. */
export type HandDeltaKind = 'deal' | 'draw' | 'play' | 'discard';

/** Same-tick temporal context, read from the batch's own (already fogged) moves. */
export interface HandTickContext {
  /** The phase entered this tick (`phase_advance.to`), or null when the phase did not change. */
  readonly toPhase: string | null;
  /** True when the batch contains a `round_advance`. */
  readonly roundAdvanced: boolean;
}

/** Derive the tick context from a batch of moves — pure, no state access. */
export function handTickContext(moves: readonly Move[]): HandTickContext {
  let toPhase: string | null = null;
  let roundAdvanced = false;
  for (const m of moves) {
    if (m.type === 'phase_advance') toPhase = m.to;
    else if (m.type === 'round_advance') roundAdvanced = true;
  }
  return { toPhase, roundAdvanced };
}

/**
 * Classify a hand delta. Presentation heuristic (documented, not a game rule):
 *   - grew at a round boundary / into DAWN or THREAT → `'deal'` (the round refill)
 *   - grew otherwise                                 → `'draw'` (AUDIT / STRIKE / RAID gains)
 *   - shrank at a round boundary / into DAWN         → `'discard'` (the Dawn hand-limit trim)
 *   - shrank otherwise                               → `'play'` (a PLEDGE / ACTION spend)
 * `from === to` cannot occur (the diff only emits on inequality); it falls through to `'play'`.
 */
export function classifyHandDelta(move: HandDeltaMove, ctx: HandTickContext): HandDeltaKind {
  const boundary = ctx.roundAdvanced || ctx.toPhase === 'DAWN';
  if (move.to > move.from) {
    return boundary || ctx.toPhase === 'THREAT' ? 'deal' : 'draw';
  }
  return boundary ? 'discard' : 'play';
}

/** When a preset's tweens can run, relative to the queue's `settle()` re-render. */
export type HandPresetStage = 'pre-settle' | 'post-settle';

/** One kind's motion recipe. `seconds` is a PRESENTATION constant, never a game tunable. */
export interface HandDeltaPreset {
  readonly kind: HandDeltaKind;
  /** Hold length in seconds (> 0) the queue burns for this kind. */
  readonly seconds: number;
  readonly stage: HandPresetStage;
  /** Attach the tweens. Must be a safe no-op when `targets` is empty or `tl` is null. */
  build(targets: readonly Element[], tl: gsap.core.Timeline | null): void;
}

/**
 * The preset registry. The EXPLICIT `Record<HandDeltaKind, HandDeltaPreset>` annotation is the
 * compile-time gate: a new kind without an entry here does not typecheck.
 */
export const HAND_DELTA_PRESETS: Record<HandDeltaKind, HandDeltaPreset> = {
  // Round refill: the new trailing slots sweep up into the fan, staggered left→right.
  deal: {
    kind: 'deal',
    seconds: 0.32,
    stage: 'post-settle',
    build(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.from(targets as Element[], {
        y: 48,
        opacity: 0,
        rotateZ: -6,
        duration: 0.32,
        stagger: 0.06,
        ease: 'power2.out',
      });
    },
  },
  // A single mid-turn gain: one card lifts in.
  draw: {
    kind: 'draw',
    seconds: 0.24,
    stage: 'post-settle',
    build(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.from(targets as Element[], {
        y: 28,
        opacity: 0,
        scale: 0.9,
        duration: 0.24,
        ease: 'power2.out',
      });
    },
  },
  // A spend: the outgoing slots rise off the dock and fade.
  play: {
    kind: 'play',
    seconds: 0.28,
    stage: 'pre-settle',
    build(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.to(targets as Element[], {
        y: -56,
        opacity: 0,
        scale: 1.05,
        duration: 0.28,
        ease: 'power1.in',
      });
    },
  },
  // The Dawn trim: the outgoing slots drop away.
  discard: {
    kind: 'discard',
    seconds: 0.22,
    stage: 'pre-settle',
    build(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.to(targets as Element[], {
        y: 36,
        opacity: 0,
        rotateZ: 8,
        duration: 0.22,
        ease: 'power1.in',
      });
    },
  },
};

/**
 * Every Move type that carries a hand delta must resolve to a preset. The EXPLICIT
 * `Record<HandDeltaMoveType, …>` annotation is the second compile gate — registering a new hand
 * move type in `moves.ts` without a resolver here is a `tsc` error.
 */
export const HAND_MOVE_PRESETS: Record<
  HandDeltaMoveType,
  (move: HandDeltaMove, ctx: HandTickContext) => HandDeltaPreset
> = {
  hand_delta: (move, ctx) => HAND_DELTA_PRESETS[classifyHandDelta(move, ctx)],
};

/** True when the move carries a hand delta (narrowing helper for the queue). */
export function isHandDeltaMove(move: Move): move is HandDeltaMove {
  return move.type === 'hand_delta';
}

/** Resolve the preset for a hand move (via the compile-gated registry). */
export function handPresetFor(move: HandDeltaMove, ctx: HandTickContext): HandDeltaPreset {
  return HAND_MOVE_PRESETS[move.type](move, ctx);
}

/**
 * The DOM-facing driver. Owns target resolution (fog-aware) and preset dispatch; owns no state.
 */
export class HandAnimator {
  readonly #rootFor: () => HTMLElement | null;
  readonly #viewerSeat: number;

  /**
   * @param rootFor    Getter for the app ROOT element (the animator scopes its own queries).
   * @param viewerSeat The fog viewer's seat — the ONLY seat whose `.card-slot`s may be touched.
   */
  constructor(rootFor: () => HTMLElement | null, viewerSeat: number) {
    this.#rootFor = rootFor;
    this.#viewerSeat = viewerSeat;
  }

  /**
   * Resolve the elements a hand delta may animate.
   *
   * FOG: the viewer's own seat gets the trailing |to − from| `.card-slot`s of the hand dock (which
   * slot is "the new one" is a presentational approximation over already-rendered, already-fogged
   * DOM). Any OTHER seat gets that house's hand count chip only — never a card slot.
   */
  targetsFor(move: HandDeltaMove): readonly Element[] {
    const root = this.#rootFor();
    if (root === null) return [];
    if (move.seat !== this.#viewerSeat) {
      const plaque = root.querySelectorAll('.house-plaque')[move.seat];
      const chip = plaque?.querySelector('[data-stat="hand"]') ?? null;
      return chip === null ? [] : [chip];
    }
    const slots = Array.from(root.querySelectorAll('.hand-dock .card-slot'));
    if (slots.length === 0) return [];
    const count = Math.min(Math.abs(move.to - move.from), slots.length);
    return count === 0 ? [] : slots.slice(slots.length - count);
  }

  /**
   * Fire the preset for one hand move. Returns the kind dispatched (so tests and the queue can
   * assert dispatch without a live GSAP timeline). Never throws on missing DOM.
   */
  fire(move: HandDeltaMove, ctx: HandTickContext, tl: gsap.core.Timeline | null): HandDeltaKind {
    const preset = handPresetFor(move, ctx);
    preset.build(this.targetsFor(move), tl);
    return preset.kind;
  }

  /** A fresh standalone timeline for post-settle entrances (fire-and-forget, never gates idle). */
  static entranceTimeline(): gsap.core.Timeline {
    return gsap.timeline();
  }
}
