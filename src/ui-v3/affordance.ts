/**
 * Affordances (T-304) — legal glow, illegal shake.
 *
 * Two halves, both driven from data the UI ALREADY has (no new engine call on the render path):
 *
 *   1. `marchLegality` — a PURE, PRESENTATIONAL MIRROR of `executeMarch` (`src/v3/actions.ts`)
 *      computed over the viewer's fogged `ObservableState`. It answers, per board node, "may the
 *      human March there right now, and if not, why not". The verdict drives the `is-legal` /
 *      `is-illegal` classes `renderBoard` stamps on each `g.node-group`, and it pre-empts the
 *      illegal click in the view's handler so no doomed command is ever dispatched.
 *      The ENGINE stays the authority: `applyCommand` is the only thing that may accept or reject
 *      a MARCH. Any drift between this mirror and the engine is caught two ways — a parity test in
 *      `tests/v3/affordance.test.ts`, and the view's post-dispatch funnel, which turns ANY engine
 *      rejection (mirror-predicted or not) into the same shake.
 *
 *   2. `SHAKE_PRESETS` + `AffordanceAnimator` — the GSAP feedback for an illegal interaction. There
 *      is NO `window.alert`, no `confirm`, no `prompt`, and no visible text error anywhere on an
 *      illegality path: rejection is communicated by motion (animated mode) plus a static, class-
 *      driven rejection mark (reduced-motion / instant mode), with the reason kept in a polite
 *      live region for screen readers.
 *
 * COMPILE GATE (mirrors `hand-anim.ts`): `SHAKE_PRESETS: Record<ShakeKind, ShakePreset>` is an
 * EXPLICIT annotation, not a `satisfies` — adding a `ShakeKind` without a preset is a `tsc` error.
 *
 * FOG (§7 D2 extends to presentation): every input here is the already-fogged projection. The
 * legality mirror reads only board definition/state, the viewer's own banners/actions, and public
 * warlord positions + oaths — never `seed`, never unflipped-token content. `AffordanceAnimator`
 * resolves targets ONLY by `[data-node]` / `[data-action]` inside the app root, i.e. DOM that
 * `renderApp` already produced from the viewer's own projection; it never selects another seat's
 * `.card-slot`, never reads a token face.
 *
 * DETERMINISM: fixed presentation constants only — no `Math.random`, no `Date.now`, no RNG at all
 * (no jitter is introduced, so no `SeededRandom` instance is needed here), and nothing this module
 * computes ever feeds back into a command or into GameState.
 */

import { gsap } from 'gsap';
import { TWEENING_CLASS } from './anim-util.js';
import { TUNABLES, type ObservableState } from '../v3/index.js';

// ─── 1. The legality mirror ───────────────────────────────────────

/**
 * Why a MARCH to a node is illegal. Every reason is derivable from PUBLIC/fogged information —
 * none of these strings can encode anything the viewer is not entitled to see.
 */
export type MarchIllegalReason =
  | 'not-your-turn'
  | 'no-actions'
  | 'not-adjacent'
  | 'no-banners'
  | 'zoc-rival'
  | 'zoc-dark';

/** One node's verdict. `cost` is the full banner price (base + ash surcharge + any Forge toll). */
export interface NodeVerdict {
  readonly legal: boolean;
  readonly reason: MarchIllegalReason | null;
  readonly cost: number;
}

/** Sworn check off the observable oath list — the `areSworn` rule without needing full state. */
function sworn(s: ObservableState, x: number, y: number): boolean {
  return s.oaths.some(o => (o.a === x && o.b === y) || (o.a === y && o.b === x));
}

/**
 * The full banner price of marching from the viewer's Warlord node into `targetId`
 * (base + ashed surcharge + rival-Forge toll, tolls waived between sworn seats).
 * Mirrors the cost block of `executeMarch`. Pure.
 */
export function marchCost(s: ObservableState, viewerSeat: number, targetId: string): number {
  const ns = s.board.state.nodes[targetId];
  const def = s.board.definition.nodes[targetId];
  let cost = TUNABLES.ACTION_BASE_COST;
  if (ns?.ashed) cost += TUNABLES.ASHED_TRAVERSE_EXTRA_COST;
  if (
    TUNABLES.FORGE_TOLL_COST > 0 && def?.tier === 'forge' &&
    ns && ns.owner !== null && ns.owner !== viewerSeat && !ns.ashed &&
    !sworn(s, viewerSeat, ns.owner)
  ) {
    cost += TUNABLES.FORGE_TOLL_COST;
  }
  return cost;
}

/**
 * Per-node MARCH verdicts for the viewer, in the same check ORDER as `executeMarch`
 * (turn/actions → adjacency → cost vs banners → Approach zone-of-control).
 *
 * `isHumanTurn` is the session's own gate (phase ACTION + active seat + alive + not over) — passed
 * in rather than recomputed so the UI and the mirror can never disagree about whose turn it is.
 */
export function marchLegality(
  s: ObservableState,
  viewerSeat: number,
  isHumanTurn: boolean,
): ReadonlyMap<string, NodeVerdict> {
  const out = new Map<string, NodeVerdict>();
  const me = s.players[viewerSeat];
  const here = me?.warlordNodeId ?? null;
  const adj = here !== null ? (s.board.definition.nodes[here]?.connections ?? []) : [];

  for (const id of Object.keys(s.board.definition.nodes)) {
    const cost = here === null ? 0 : marchCost(s, viewerSeat, id);
    const verdict = (reason: MarchIllegalReason | null): NodeVerdict =>
      ({ legal: reason === null, reason, cost });

    if (!isHumanTurn || me === undefined || here === null) {
      out.set(id, verdict('not-your-turn'));
      continue;
    }
    if (me.actionsRemaining <= 0) { out.set(id, verdict('no-actions')); continue; }
    if (!adj.includes(id)) { out.set(id, verdict('not-adjacent')); continue; }
    if (me.banners < cost) { out.set(id, verdict('no-banners')); continue; }

    const def = s.board.definition.nodes[id];
    if (def?.tier === 'approach') {
      // `hasRivalAtNode` keys off WARLORD position (public in the projection), not piece stacks.
      const rival = s.players.some(p => p.index !== viewerSeat && p.warlordNodeId === id);
      if (rival) { out.set(id, verdict('zoc-rival')); continue; }
      if ((s.board.state.nodes[id]?.shadowkingForces.length ?? 0) > 0) {
        out.set(id, verdict('zoc-dark'));
        continue;
      }
    }
    out.set(id, verdict(null));
  }
  return out;
}

// ─── 2. Classes, presets, and the DOM driver ──────────────────────

/**
 * The affordance class contract. Glow and rejection are CLASS-driven (styled in `ui-v3.css`);
 * this module never writes an inline `style` to express them.
 */
export const AFFORDANCE_CLASS = {
  /** A legal target/control — glows (colour + scale) on hover/selection. */
  legal: 'is-legal',
  /** An illegal target/control — `not-allowed` cursor, and the static rejection mark while shaking. */
  illegal: 'is-illegal',
  /** Transient: present for the duration of a rejection beat (and statically in instant mode). */
  shaking: 'is-shaking',
} as const;

/** What is being refused: a board target, or a plaque control. */
export type ShakeKind = 'target' | 'control';

/** One rejection recipe. `seconds` is a PRESENTATION constant, never a game tunable. */
export interface ShakePreset {
  readonly kind: ShakeKind;
  /** Beat length in seconds (> 0). */
  readonly seconds: number;
  /** Attach the tweens. Must be a safe no-op when `targets` is empty or `tl` is null. */
  build(targets: readonly Element[], tl: gsap.core.Timeline | null): void;
}

/**
 * The rejection registry. The EXPLICIT `Record<ShakeKind, ShakePreset>` annotation is the
 * compile-time gate: a new kind without an entry here does not typecheck.
 */
export const SHAKE_PRESETS: Record<ShakeKind, ShakePreset> = {
  // A refused board target: a springy lateral rebuff that settles back on the node.
  target: {
    kind: 'target',
    seconds: 0.34,
    build(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.fromTo(
        targets as Element[],
        { x: -7 },
        { x: 0, duration: 0.34, ease: 'elastic.out(1.6, 0.35)' },
      );
    },
  },
  // A refused plaque control: a tight three-beat "no".
  control: {
    kind: 'control',
    seconds: 0.28,
    build(targets, tl) {
      if (tl === null || targets.length === 0) return;
      tl.to(targets as Element[], {
        keyframes: { x: [-5, 5, -3, 0] },
        duration: 0.28,
        ease: 'none',
      });
    },
  },
};

/** Type-level cover: a `ShakeKind` missing from `SHAKE_PRESETS` fails to compile. */
const _shakeCover: Record<ShakeKind, true> = { target: true, control: true };
void _shakeCover;

/** CSS attribute-selector value escaping (action strings carry `:` separators). */
function attrValue(v: string): string {
  return v.replace(/["\\]/g, '\\$&');
}

/** Selector for a board node's group. */
export function nodeSelector(nodeId: string): string {
  return `[data-node="${attrValue(nodeId)}"]`;
}

/** Selector for a control by its `data-action` string. */
export function actionSelector(action: string): string {
  return `[data-action="${attrValue(action)}"]`;
}

/**
 * The DOM-facing driver. Owns target resolution (fog-scoped) and preset dispatch; owns no state
 * and never touches GameState.
 */
export class AffordanceAnimator {
  readonly #rootFor: () => HTMLElement | null;
  readonly #viewerSeat: number;

  /**
   * @param rootFor    Getter for the app ROOT element (the animator scopes its own queries).
   * @param viewerSeat The fog viewer's seat — recorded so the driver can never be pointed at
   *                   another seat's private DOM (it only ever queries `[data-node]`/`[data-action]`).
   */
  constructor(rootFor: () => HTMLElement | null, viewerSeat: number) {
    this.#rootFor = rootFor;
    this.#viewerSeat = viewerSeat;
  }

  /** The seat this driver is fogged to. */
  get viewerSeat(): number {
    return this.#viewerSeat;
  }

  /**
   * Fire the rejection beat for `selector`.
   *
   * The element is resolved BY SELECTOR at fire time (never captured earlier) because `settle()`
   * replaces the whole root `innerHTML`, which would stale any held reference. Returns the kind
   * dispatched, or `null` when nothing resolved — never throws on missing DOM.
   *
   * INSTANT MODE (jsdom / `prefers-reduced-motion`): pass `tl = null`. The preset still DISPATCHES
   * (spy-observable) but builds no tween, the path stays fully synchronous, and the element keeps
   * the static `is-shaking` rejection mark so the refusal is never motion-only.
   */
  shake(selector: string, kind: ShakeKind, tl: gsap.core.Timeline | null = null): ShakeKind | null {
    const root = this.#rootFor();
    if (root === null) return null;
    const el = root.querySelector(selector);
    if (el === null) return null;

    const preset = SHAKE_PRESETS[kind];
    el.classList.add(AFFORDANCE_CLASS.shaking);
    // T-310: while GSAP owns the beat, suppress the control's CSS `transition: transform` so the
    // per-frame inline transform is not fought (added only with a live timeline — instant mode keeps
    // the static `is-shaking` mark and adds no `is-tweening`, so its DOM is byte-identical).
    if (tl !== null) el.classList.add(TWEENING_CLASS);
    preset.build([el], tl);
    if (tl !== null) {
      tl.eventCallback('onComplete', () => {
        el.classList.remove(AFFORDANCE_CLASS.shaking);
        el.classList.remove(TWEENING_CLASS);
      });
    }
    return preset.kind;
  }

  /** A fresh standalone timeline for a rejection beat (fire-and-forget, never gates queue idle). */
  static beatTimeline(): gsap.core.Timeline {
    return gsap.timeline();
  }
}
