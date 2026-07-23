/**
 * Fanned hand component (T-301) — the ONE place the human's hand DOM is built.
 *
 * Given a list of power-card values it returns a `.hand-fan` row of `.card-slot`s, each holding a
 * T-204 generated face (`powerCardFace`). The arc is pure math emitted as CSS custom properties
 * (`--fan-rot` / `--fan-x` / `--fan-y` / `--fan-z`) so the geometry is unit-testable without a layout
 * engine and the visual treatment stays entirely in `ui-v3.css`.
 *
 * LAYOUT vs MOTION (deliberate split — see the T-301 Delivered note in TASKS.md):
 *   - LAYOUT (the static arc) is chosen by `resolveHandLayout()`: `'flat'` when there is no layout
 *     engine at all (jsdom / SSR — no `window.matchMedia`), `'fan'` otherwise. A static arc is not
 *     motion, so a reduced-motion user still gets the fan.
 *   - MOTION (hover-raise / selected-lift transitions) is CSS-only and lives inside
 *     `@media (prefers-reduced-motion: no-preference)`, so reduced motion means zero animation.
 * This keeps the reduced-motion screenshot gate (`npm run shots:v3` runs Chromium with
 * `reducedMotion: 'reduce'`) reviewing the real fan while jsdom E2E keeps a flat, transform-free row.
 *
 * FOG (§7 D2): callers may pass ONLY the viewer's own hand — `observableState(s, viewerSeat)
 * .players[viewerSeat].hand`. No other seat's card values may ever reach this module.
 *
 * DETERMINISM: pure and string-returning; no randomness (no `Math.random`, no `Date.now`, no
 * `SeededRandom` — none is needed), so identical input yields byte-identical output.
 */

import { powerCardFace } from './card-face.js';

/** Local HTML-attribute escape (keep this module self-contained, mirroring card-face.ts). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `'fan'` = the CSS-3D arc; `'flat'` = a transform-free row (jsdom / no layout engine). */
export type HandLayout = 'fan' | 'flat';

/** The per-slot arc geometry — PRESENTATION values only (never game tunables, §3 guardrail). */
export interface FanSlotGeometry {
  readonly index: number;
  /** Rotation in degrees; negative = counter-clockwise (left of centre). */
  readonly rotDeg: number;
  /** Extra horizontal offset in px (the base overlap is the CSS negative margin). */
  readonly xPx: number;
  /** Vertical offset in px; positive = DOWN, so the outer cards ride lower than the centre. */
  readonly yPx: number;
  /** Stacking order (`z-index`) — later cards sit on top of earlier ones. */
  readonly z: number;
}

// ── Presentation constants (tune the FEEL here; none of these are game tunables) ──
/** Half-spread: the outermost card tilts this many degrees. Kept modest so rotated rects stay in the dock. */
export const MAX_SPREAD_DEG = 14;
/** Parabolic arc depth in px: the outermost card sits this far BELOW the centre card. */
/* Scaled with the T-307 card enlargement (62→84px) to keep the arc proportional to the larger cards. */
export const ARC_LIFT_PX = 14;
/** Extra horizontal spread in px applied to the outermost card (on top of the CSS overlap). */
export const SPREAD_X_PX = 5;

/**
 * The arc math. `t` runs -1 (leftmost) .. 0 (exact centre) .. +1 (rightmost), so the fan is always
 * symmetric and a single card is dead centre with zero rotation.
 */
export function fanGeometry(count: number, layout: HandLayout = 'fan'): readonly FanSlotGeometry[] {
  const out: FanSlotGeometry[] = [];
  for (let i = 0; i < count; i++) {
    if (layout === 'flat') {
      out.push({ index: i, rotDeg: 0, xPx: 0, yPx: 0, z: i });
      continue;
    }
    const half = (count - 1) / 2;
    const t = half === 0 ? 0 : (i - half) / half;
    out.push({
      index: i,
      rotDeg: round2(t * MAX_SPREAD_DEG),
      xPx: round2(t * SPREAD_X_PX),
      yPx: round2(t * t * ARC_LIFT_PX),
      z: i,
    });
  }
  return out;
}

/** Round to 2 dp as a NUMBER so emitted markup is byte-stable across platforms. */
function round2(n: number): number {
  return Number(n.toFixed(2));
}

/**
 * Pick the layout. No `window` / no `matchMedia` means no layout engine (jsdom, SSR) → `'flat'`,
 * which is what the jsdom E2E suite asserts against. Anything with a real CSSOM gets the fan.
 */
export function resolveHandLayout(): HandLayout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'flat';
  return 'fan';
}

export interface HandFanOptions {
  /** The viewer's OWN card values (fog: never another seat's hand). */
  readonly values: readonly number[];
  /** Override the resolved layout (tests / forced flat rows). */
  readonly layout?: HandLayout;
  /** Indices (into `values`) that are selected — drives the class-based selected-lift. */
  readonly selected?: readonly number[];
  /** When set, each slot is a `<button data-action="${action}:${i}">` instead of a `<span>`. */
  readonly action?: string;
  /** Accessible label for the fan container. */
  readonly ariaLabel?: string;
  /** Extra class(es) on the fan root. */
  readonly cls?: string;
}

/** Build the fan markup. Every card face comes from the T-204 generator — no bespoke card markup. */
export function handFan(opts: HandFanOptions): string {
  const layout = opts.layout ?? resolveHandLayout();
  const geo = fanGeometry(opts.values.length, layout);
  const selected = new Set(opts.selected ?? []);

  const slots = opts.values
    .map((value, i) => {
      const g = geo[i];
      const style =
        `--fan-rot:${g.rotDeg.toFixed(2)}deg;--fan-x:${g.xPx.toFixed(2)}px;` +
        `--fan-y:${g.yPx.toFixed(2)}px;--fan-z:${g.z}`;
      const isSel = selected.has(i);
      const face = powerCardFace(value);
      if (opts.action !== undefined) {
        // `selected` is kept alongside `is-selected` so the existing `.card-face-btn.selected` CSS
        // still applies; `is-selected` is the layout-agnostic hook the fan styles key off.
        const cls = `card-slot card-face-btn${isSel ? ' is-selected selected' : ''}`;
        return (
          `<button class="${cls}" role="listitem" data-slot="${i}" ` +
          `data-action="${esc(opts.action)}:${i}" aria-pressed="${isSel ? 'true' : 'false'}" ` +
          `style="${style}">${face}</button>`
        );
      }
      return (
        `<span class="card-slot${isSel ? ' is-selected' : ''}" role="listitem" data-slot="${i}" ` +
        `style="${style}">${face}</span>`
      );
    })
    .join('');

  const extra = opts.cls ? ` ${esc(opts.cls)}` : '';
  const label = opts.ariaLabel ? ` aria-label="${esc(opts.ariaLabel)}"` : '';
  return (
    `<span class="hand-fan hand-fan--${layout}${extra}" data-component="hand-fan" ` +
    `data-layout="${layout}" role="list"${label}>${slots}</span>`
  );
}
