/**
 * Flip reveals (T-303) — the 3D card/token flip behind every reveal Move.
 *
 * A reveal is a TWO-HALF animation straddling the queue's `settle()`:
 *   • FIRST half  (pre-settle)  — the BACK rotates from 0° to edge-on (90°). Only public back
 *     content exists in the DOM here.
 *   • the settle                — `settle()` replaces the whole app `innerHTML` from the freshly
 *     fogged projection. **This is the flip midpoint**, and the exact frame at which face content
 *     first enters the DOM.
 *   • SECOND half (post-settle) — the FACE rotates from −90° back to 0°.
 *
 * FOG (§7 D2 extends to presentation): the first half may touch only already-rendered, already-
 * fogged DOM plus an overlay the animator builds ITSELF — and that overlay is constructed through
 * `tokenFace({ flipped: false, sigil })`, whose union makes carrying `kind` / `archetype` / name on
 * a face-DOWN token a COMPILE error. So no face data can exist before the midpoint, by type, not by
 * discipline. The second half reads the post-settle DOM, where the token is public anyway.
 *
 * COMPILE GATE (the acceptance clause "all reveal Move types route through the flip preset"):
 * `REVEAL_PRESETS: Record<RevealMoveType, FlipPreset>` is an EXPLICIT annotation, so registering a
 * new reveal type in `moves.ts` without a preset here is a `tsc` error.
 *
 * INSTANT MODE: presets still DISPATCH with a `null` timeline — no tween is built and, critically,
 * NO overlay DOM is created. jsdom, the E2E suite and `scripts/shots-v3.mjs` (which runs Playwright
 * with `reducedMotion: 'reduce'`) therefore see byte-identical DOM to the pre-T-303 build.
 *
 * DETERMINISM: fixed presentation constants only — no `Math.random`, no `Date.now`, no RNG at all
 * (so no `SeededRandom` instance is needed here). Nothing reads `session` / `GameState` / `seed`,
 * and nothing feeds back into commands or state.
 */

import { gsap } from 'gsap';
import { nodeScreenPct } from './board-view.js';
import { tokenFace } from './card-face.js';
import type { RevealMove, RevealMoveType } from './moves.js';

/** Which side of the settle a half runs on. `'first'` = pre-settle back, `'second'` = post-settle face. */
export type FlipHalf = 'first' | 'second';

/** One reveal type's motion recipe. `seconds` is a PRESENTATION constant, never a game tunable. */
export interface FlipPreset {
  readonly type: RevealMoveType;
  /** TOTAL flip length in seconds (> 0); each half burns `seconds / 2`. */
  readonly seconds: number;
  /** Back half: rotateY 0 → 90°. Must be a safe no-op when `targets` is empty or `tl` is null. */
  buildFirst(targets: readonly Element[], tl: gsap.core.Timeline | null): void;
  /** Face half: rotateY −90° → 0. Must be a safe no-op when `targets` is empty or `tl` is null. */
  buildSecond(targets: readonly Element[], tl: gsap.core.Timeline | null): void;
}

/** Split a preset's total length into its per-half duration. */
function half(seconds: number): number {
  return seconds / 2;
}

/**
 * The preset registry. The EXPLICIT `Record<RevealMoveType, FlipPreset>` annotation is the
 * compile-time gate: a reveal Move type without an entry here does not typecheck.
 */
export const REVEAL_PRESETS: Record<RevealMoveType, FlipPreset> = {
  // The archetypal flip: an overlay CARD (HTML, so the 3D transform is not flattened as it would be
  // inside the board `<svg>`) turns over the node, with a small lift on the way up.
  token_reveal: {
    type: 'token_reveal',
    seconds: 0.42,
    buildFirst(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.to(targets as Element[], {
        rotationY: 90,
        scale: 1.15,
        duration: half(0.42),
        ease: 'power1.in',
      });
    },
    buildSecond(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.fromTo(
        targets as Element[],
        { rotationY: -90, scale: 1.15 },
        { rotationY: 0, scale: 1, duration: half(0.42), ease: 'power2.out' },
      );
      // The overlay lingers a beat on its face, then fades; the animator removes it on complete.
      tl.to(targets as Element[], { opacity: 0, duration: 0.18, ease: 'power1.in' }, '+=0.35');
    },
  },
  // The Shadowking's intent turning face-up — an ordinary HTML panel, flipped in place.
  telegraph: {
    type: 'telegraph',
    seconds: 0.36,
    buildFirst(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.to(targets as Element[], {
        transformPerspective: 800,
        rotationY: 90,
        duration: half(0.36),
        ease: 'power1.in',
      });
    },
    buildSecond(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.fromTo(
        targets as Element[],
        { transformPerspective: 800, rotationY: -90 },
        { rotationY: 0, duration: half(0.36), ease: 'power2.out' },
      );
    },
  },
  // The traitor's sealed identity turning face-up — the accuse plaque, flipped in place.
  bloodpact_exposed: {
    type: 'bloodpact_exposed',
    seconds: 0.4,
    buildFirst(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.to(targets as Element[], {
        transformPerspective: 800,
        rotationY: 90,
        duration: half(0.4),
        ease: 'power1.in',
      });
    },
    buildSecond(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.fromTo(
        targets as Element[],
        { transformPerspective: 800, rotationY: -90 },
        { rotationY: 0, duration: half(0.4), ease: 'power2.out' },
      );
    },
  },
};

/** Resolve the preset for a reveal move (via the compile-gated registry). */
export function flipPresetFor(move: RevealMove): FlipPreset {
  return REVEAL_PRESETS[move.type];
}

/** In-place flip targets, per reveal type — plain CSS selectors over already-fogged DOM. */
const IN_PLACE_SELECTORS: Record<RevealMoveType, string> = {
  // `token_reveal` also animates the still-rendered back-sigil in its node group (see `targetsFor`).
  token_reveal: '',
  telegraph: '.villain-line, .threat-detail',
  bloodpact_exposed: '.accuse',
};

/**
 * The DOM-facing driver. Owns fog-scoped target resolution, the transient overlay layer, and preset
 * dispatch; owns no game state.
 */
export class FlipAnimator {
  readonly #rootFor: () => HTMLElement | null;
  readonly #viewerSeat: number;

  /**
   * @param rootFor    Getter for the app ROOT element (the animator scopes its own queries).
   * @param viewerSeat The fog viewer's seat. Retained for symmetry with `HandAnimator` and for any
   *                   future seat-scoped reveal; the current presets touch only public content.
   */
  constructor(rootFor: () => HTMLElement | null, viewerSeat: number) {
    this.#rootFor = rootFor;
    this.#viewerSeat = viewerSeat;
  }

  /** The viewer this animator renders for (read-only; nothing here may render another seat's face). */
  get viewerSeat(): number {
    return this.#viewerSeat;
  }

  /** The lazily-created overlay layer inside `.board-region`, or null when there is no board yet. */
  #fxLayer(create: boolean): HTMLElement | null {
    const root = this.#rootFor();
    if (root === null) return null;
    const existing = root.querySelector<HTMLElement>('.fx-layer');
    if (existing !== null) return existing;
    if (!create) return null;
    const region = root.querySelector('.board-region');
    if (region === null) return null;
    const layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    region.appendChild(layer);
    return layer;
  }

  /**
   * Build the transient overlay card for a `token_reveal` half.
   *
   * FOG: the `first` half passes `{ flipped: false, sigil }` — the `TokenFaceInput` union makes it a
   * COMPILE error to attach kind / archetype / name to a face-down token, so the pre-midpoint
   * overlay provably carries public back content only. Created ONLY when a real timeline exists, so
   * instant mode / jsdom / `shots:v3` never see this element at all.
   */
  #overlayFor(move: RevealMove & { type: 'token_reveal' }, side: FlipHalf): readonly Element[] {
    const layer = this.#fxLayer(true);
    if (layer === null) return [];
    const at = nodeScreenPct(move.node);
    const card = document.createElement('div');
    card.className = 'flip-card';
    card.style.left = `${at.left.toFixed(2)}%`;
    card.style.top = `${at.top.toFixed(2)}%`;
    const inner = document.createElement('div');
    inner.className = 'flip-card-inner';
    inner.innerHTML =
      side === 'first'
        ? tokenFace({ flipped: false, sigil: move.sigil })
        : tokenFace({ flipped: true, kind: move.kind, archetype: move.archetype });
    card.appendChild(inner);
    layer.appendChild(card);
    return [inner];
  }

  /** Remove every overlay card this animator created (called once the face half completes). */
  #clearOverlay(): void {
    const layer = this.#fxLayer(false);
    if (layer !== null) layer.remove();
  }

  /**
   * Resolve the elements this half may animate — ALWAYS from already-rendered, already-fogged DOM
   * (plus, for `token_reveal`, the animator's own overlay, which only exists with a live timeline).
   *
   * FOG per type:
   *   • `token_reveal`      — the node's own group only (its back-sigil pre-settle, its revealed
   *     `.token-face` post-settle). Never a `.card-slot`, never a rival plaque.
   *   • `telegraph`         — the public villain line / threat detail panel.
   *   • `bloodpact_exposed` — the public accuse plaque.
   * Missing DOM is expected (a panel not rendered this phase) and yields `[]` — a silent no-op.
   */
  targetsFor(
    move: RevealMove,
    side: FlipHalf,
    tl: gsap.core.Timeline | null = null,
  ): readonly Element[] {
    const root = this.#rootFor();
    if (root === null) return [];
    if (move.type === 'token_reveal') {
      // Match the node group by attribute VALUE (not a built selector) so an exotic node id can
      // never form a selector, and so no `CSS.escape` dependency is taken on the jsdom path.
      const group =
        Array.from(root.querySelectorAll('g[data-node]')).find(
          g => g.getAttribute('data-node') === move.node,
        ) ?? null;
      const inNode =
        group === null
          ? []
          : Array.from(group.querySelectorAll(side === 'first' ? '.sigil' : '.token-face'));
      // The overlay is a MOTION-only element: never built without a live timeline.
      const overlay = tl === null ? [] : this.#overlayFor(move, side);
      return [...overlay, ...inNode];
    }
    const selector = IN_PLACE_SELECTORS[move.type];
    return selector === '' ? [] : Array.from(root.querySelectorAll(selector));
  }

  /**
   * Fire the BACK half (pre-settle). Returns the reveal type dispatched, so tests and the queue can
   * assert dispatch without a live GSAP timeline. Never throws on missing DOM.
   */
  firstHalf(move: RevealMove, tl: gsap.core.Timeline | null): RevealMoveType {
    const preset = flipPresetFor(move);
    preset.buildFirst(this.targetsFor(move, 'first', tl), tl);
    return preset.type;
  }

  /**
   * Fire the FACE half (post-settle). The overlay (if any) is removed when the timeline completes,
   * so the transient layer never survives the reveal.
   */
  secondHalf(move: RevealMove, tl: gsap.core.Timeline | null): RevealMoveType {
    const preset = flipPresetFor(move);
    const targets = this.targetsFor(move, 'second', tl);
    preset.buildSecond(targets, tl);
    if (tl !== null && move.type === 'token_reveal') {
      tl.eventCallback('onComplete', () => this.#clearOverlay());
    }
    return preset.type;
  }

  /** A fresh standalone timeline for the post-settle face half (fire-and-forget, never gates idle). */
  static revealTimeline(): gsap.core.Timeline {
    return gsap.timeline();
  }
}
