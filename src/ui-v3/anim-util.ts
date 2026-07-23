/**
 * Shared animation helpers (T-310 — smooth choppy motion).
 *
 * THE TRANSITION-FIGHT FIX. Several elements the GSAP presets tween (`.card-slot`, control buttons)
 * ALSO carry a CSS `transition: transform …` rule in `ui-v3.css`. When GSAP writes a fresh inline
 * `transform` every frame (~60fps), the browser re-applies that CSS transition to each write, so the
 * value perpetually chases a target it never reaches before the next frame overwrites it — the classic
 * GSAP↔CSS-transition conflict that reads as laggy / rubber-banding motion. `suppressTransition`
 * tags the tweened targets with `is-tweening` (a `transition: none` rule, scoped inside the CSS
 * `@media (prefers-reduced-motion: no-preference)` block) for the life of the timeline, so GSAP owns
 * the motion cleanly, then removes the class when the timeline completes.
 *
 * INSTANT / REDUCED-MOTION (§7 D2 presentation invariant): a NULL timeline means no tween is built,
 * so this is a strict no-op — NO class is ever added on the instant path. jsdom, the snap-count
 * replay test, and `shots:v3` (reduced-motion) therefore see byte-identical DOM to the pre-T-310
 * build. The class only ever appears mid-tween in animated mode.
 *
 * DETERMINISM: no `Math.random`, no `Date.now`, no RNG — presentation-only, never feeds back into a
 * command or `GameState`.
 */

import type { gsap } from 'gsap';

/** The class that suppresses an element's CSS `transition` while GSAP owns its transform. */
export const TWEENING_CLASS = 'is-tweening';

/**
 * Suppress the CSS transition on `targets` for the duration of `tl`, so GSAP's per-frame inline
 * transform is not fought by a CSS `transition: transform`. Adds `is-tweening` now and removes it on
 * timeline completion. A strict NO-OP when `tl` is null (instant / reduced-motion) or `targets` is
 * empty — nothing is added, so the instant-path DOM stays byte-identical.
 *
 * The caller must pass a timeline it OWNS exclusively for these targets (a dedicated per-preset child
 * / entrance / beat timeline): this sets the timeline's `onComplete`, so sharing it with other work
 * that also sets `onComplete` would clobber the class removal.
 */
export function suppressTransition(
  targets: readonly Element[],
  tl: gsap.core.Timeline | null,
): void {
  if (tl === null || targets.length === 0) return;
  const els = targets as Element[];
  for (const el of els) el.classList.add(TWEENING_CLASS);
  tl.eventCallback('onComplete', () => {
    for (const el of els) el.classList.remove(TWEENING_CLASS);
  });
}
