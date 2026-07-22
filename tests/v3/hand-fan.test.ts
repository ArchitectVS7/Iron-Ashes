// @vitest-environment jsdom
/**
 * T-301 — the fanned hand component. Proves the accept criteria:
 *   1. The hand DOM IS the fan component (arc geometry emitted as CSS vars; every card face comes
 *      from the T-204 generator, so the corner index is always present for an at-a-glance read).
 *   2. Hover/selected states are CLASS-DRIVEN and therefore unit-testable (`is-selected` /
 *      `aria-pressed`; hover is a pure CSS rule keyed off the same `.card-slot` hooks).
 *   3. It degrades to a FLAT row where there is no layout engine (jsdom).
 * The layout-vs-motion split is deliberate: layout picks fan/flat, while the hover/lift TRANSITIONS
 * live in `@media (prefers-reduced-motion: no-preference)` so a reduced-motion viewer (and the
 * screenshot gate, which runs Chromium with `reducedMotion: 'reduce'`) still sees the real fan.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  fanGeometry,
  handFan,
  resolveHandLayout,
  MAX_SPREAD_DEG,
  type HandLayout,
} from '../../src/ui-v3/hand-fan.js';

const ROOT = process.cwd();

function frag(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function slots(html: string): HTMLElement[] {
  return Array.from(frag(html).querySelectorAll<HTMLElement>('.card-slot'));
}

describe('T-301 — fan geometry math', () => {
  it('is empty for an empty hand and dead-centre for a single card', () => {
    expect(fanGeometry(0)).toEqual([]);
    const one = fanGeometry(1);
    expect(one).toHaveLength(1);
    expect(one[0].rotDeg).toBe(0);
    expect(one[0].xPx).toBe(0);
    expect(one[0].yPx).toBe(0);
  });

  it('is a symmetric, bounded, monotonic arc for a full 6-card hand', () => {
    const g = fanGeometry(6);
    expect(g).toHaveLength(6);
    for (let i = 1; i < g.length; i++) {
      expect(g[i].rotDeg, `rotation increases at ${i}`).toBeGreaterThan(g[i - 1].rotDeg);
      expect(g[i].z, `z increases at ${i}`).toBeGreaterThan(g[i - 1].z);
    }
    for (let i = 0; i < g.length; i++) {
      // Mirror symmetry about the centre of the hand.
      expect(g[i].rotDeg).toBeCloseTo(-g[g.length - 1 - i].rotDeg, 6);
      expect(g[i].xPx).toBeCloseTo(-g[g.length - 1 - i].xPx, 6);
      expect(g[i].yPx).toBeCloseTo(g[g.length - 1 - i].yPx, 6);
      expect(Math.abs(g[i].rotDeg)).toBeLessThanOrEqual(MAX_SPREAD_DEG);
    }
    // Parabolic arc: the outer cards ride LOWER (larger y) than the middle ones.
    const mid = Math.min(g[2].yPx, g[3].yPx);
    expect(g[0].yPx).toBeGreaterThan(mid);
    expect(g[5].yPx).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThanOrEqual(0);
  });

  it('degrades to a transform-free row under the flat layout', () => {
    const g = fanGeometry(6, 'flat');
    expect(g).toHaveLength(6);
    for (const s of g) {
      expect([s.rotDeg, s.xPx, s.yPx]).toEqual([0, 0, 0]);
    }
    expect(g.map(s => s.z)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('T-301 — layout resolution (instant/jsdom degradation)', () => {
  const original = (window as unknown as { matchMedia?: unknown }).matchMedia;
  afterEach(() => {
    if (original === undefined) delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    else (window as unknown as { matchMedia?: unknown }).matchMedia = original;
  });

  it("is 'flat' under bare jsdom (no layout engine / no matchMedia)", () => {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    expect(resolveHandLayout()).toBe('flat');
  });

  it("is 'fan' wherever a real CSSOM exists", () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false });
    expect(resolveHandLayout()).toBe('fan');
  });

  it('handFan defaults to the resolver — jsdom therefore renders a flat row', () => {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    const root = frag(handFan({ values: [1, 2, 3] })).firstElementChild as HTMLElement;
    expect(root.classList.contains('hand-fan--flat')).toBe(true);
    expect(root.dataset.layout).toBe('flat');
    for (const s of Array.from(root.querySelectorAll<HTMLElement>('.card-slot'))) {
      expect(s.getAttribute('style')).toContain('--fan-rot:0.00deg');
      expect(s.getAttribute('style')).not.toMatch(/--fan-(rot|x|y):(?!0\.00)/);
    }
  });
});

describe('T-301 — markup contract', () => {
  const html = handFan({ values: [4, 2, 3, 1, 2, 1], layout: 'fan', ariaLabel: 'Your hand' });

  it('keeps the literal .hand-fan hook the dock audit + HUD tests depend on', () => {
    const root = frag(html).firstElementChild as HTMLElement;
    expect(root.classList.contains('hand-fan')).toBe(true);
    expect(root.classList.contains('hand-fan--fan')).toBe(true);
    expect(root.dataset.component).toBe('hand-fan');
    expect(root.getAttribute('role')).toBe('list');
    expect(root.getAttribute('aria-label')).toBe('Your hand');
  });

  it('renders one slot per value, each holding exactly one generated card face', () => {
    const s = slots(html);
    expect(s).toHaveLength(6);
    s.forEach((el, i) => {
      expect(el.dataset.slot).toBe(String(i));
      expect(el.querySelectorAll('svg.card-face')).toHaveLength(1);
    });
  });

  it('every slot carries a readable corner index matching its hand value (Gate 0.5 at-a-glance read)', () => {
    const values = [4, 2, 3, 1, 2, 1];
    slots(html).forEach((el, i) => {
      const corners = Array.from(el.querySelectorAll('.cf-corner'));
      expect(corners, `slot ${i} has both corner indices`).toHaveLength(2);
      for (const c of corners) {
        expect(c.querySelector('.cf-corner-val')!.textContent).toBe(String(values[i]));
      }
    });
  });

  it('writes the geometry as per-slot CSS custom properties', () => {
    const geo = fanGeometry(6);
    slots(html).forEach((el, i) => {
      const style = el.getAttribute('style')!;
      expect(style).toContain(`--fan-rot:${geo[i].rotDeg.toFixed(2)}deg`);
      expect(style).toContain(`--fan-y:${geo[i].yPx.toFixed(2)}px`);
      expect(style).toContain(`--fan-z:${geo[i].z}`);
    });
  });
});

describe('T-301 — class-driven hover / selected states', () => {
  it('marks exactly the selected indices with is-selected', () => {
    const s = slots(handFan({ values: [3, 1, 4], layout: 'fan', selected: [0, 2] }));
    expect(s.map(el => el.classList.contains('is-selected'))).toEqual([true, false, true]);
  });

  it('exposes the toggle affordance as a button with aria-pressed and a stable data-action', () => {
    const root = frag(
      handFan({ values: [5, 4, 1], layout: 'fan', selected: [1], action: 'laststand-toggle' }),
    );
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button.card-slot'));
    expect(btns).toHaveLength(3);
    btns.forEach((b, i) => {
      expect(b.tagName).toBe('BUTTON');
      expect(b.classList.contains('card-face-btn')).toBe(true);
      expect(b.dataset.action).toBe(`laststand-toggle:${i}`);
      expect(b.getAttribute('aria-pressed')).toBe(i === 1 ? 'true' : 'false');
    });
    // The legacy `.card-face-btn.selected` styling hook survives alongside the new one.
    expect(btns[1].classList.contains('selected')).toBe(true);
  });

  it('ships the CSS hooks for both states — hover is a pure stylesheet rule (no JS)', () => {
    const css = readFileSync(resolve(ROOT, 'src/ui-v3/ui-v3.css'), 'utf8');
    expect(css).toMatch(/\.hand-fan--fan \.card-slot:hover/);
    expect(css).toMatch(/\.card-slot:focus-visible/); // keyboard-reachable, not hover-only
    expect(css).toMatch(/\.card-slot\.is-selected/);
    expect(css).toMatch(/\.hand-fan--flat \.card-slot \{[^}]*transform: none/);
    // Hover-raise must zoom enough to READ the rules text (62px × ≥2 ⇒ .cf-rules ≥ 5.7 CSS px).
    const scale = /--fan-hover-scale,\s*([0-9.]+)/.exec(css);
    expect(scale, 'the hover scale is declared').not.toBeNull();
    expect(Number(scale![1])).toBeGreaterThanOrEqual(2.5);
    // MOTION (not layout) is what reduced motion disables — the fan itself must survive.
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.card-slot \{[^}]*transition/);
    // The nth-child fan hack is gone — geometry is data now.
    expect(css).not.toMatch(/\.card-slot:nth-child/);
  });
});

describe('T-301 — purity / determinism', () => {
  it('is byte-identical across identical calls', () => {
    const opts = { values: [1, 2, 3, 4], layout: 'fan' as HandLayout, selected: [2] };
    expect(handFan(opts)).toBe(handFan(opts));
  });

  it('uses no randomness or wall-clock in its source', () => {
    const code = readFileSync(resolve(ROOT, 'src/ui-v3/hand-fan.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/Math\.random/);
    expect(code).not.toMatch(/Date\.now/);
  });

  it('escapes caller-supplied strings', () => {
    const html = handFan({ values: [1], layout: 'flat', action: 'x"y', cls: 'a"b', ariaLabel: '<z>' });
    expect(html).toContain('data-action="x&quot;y:0"');
    expect(html).toContain('hand-fan--flat a&quot;b');
    expect(html).toContain('aria-label="&lt;z&gt;"');
  });
});
