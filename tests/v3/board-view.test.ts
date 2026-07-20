// @vitest-environment jsdom
/**
 * T-208 — board to spec: illustrated locations, carved chaos-star inlay, planted banners.
 *
 * Proves the three Gate-1 fixes as DOM/SVG assertions on `renderBoard(observableState(...))`:
 *   1. Nodes are CIRCLE-FREE illustrated locations — no enclosing `circle.node` disc, no
 *      `.owner-tint` / `.owner-ring`; each `g[data-node]` carries a `.loc-<tier>` silhouette,
 *      and all five tier silhouettes appear across the board.
 *   2. The chaos-star inlay is present in the DOM — the decorative `.star-inlay` rays/octagram
 *      AND a burned carved-wood `.star-carve` fill beneath the graph — while the TRUE playable
 *      edges (`.edge`) stay a distinct element class (topology count = 28, decorative rays = 8),
 *      so a decorative ray is never mistaken for a playable edge.
 *   3. A claimed node's SOLE ownership signal is a planted `.claim-banner` carrying the owner's
 *      heraldry sigil class (`sigil-<name>`) — never a coloured ring.
 *
 * Plus a fog (§7 D2) regression guard: an unflipped Discovery token renders only its back-sigil
 * glyph, never any hidden content — the render layer reads the fogged projection.
 *
 * The layout is authored purely from the observable projection, so this mirrors the card-face
 * test: build a real deterministic state, project it, parse the SVG, assert on the DOM.
 */
import { describe, it, expect } from 'vitest';
import { createGame, observableState } from '../../src/v3/index.js';
import type { GameState } from '../../src/v3/index.js';
import { renderBoard } from '../../src/ui-v3/board-view.js';

function parse(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const err = doc.querySelector('parsererror');
  expect(err, `SVG did not parse: ${err?.textContent ?? ''}`).toBeNull();
  return doc.documentElement as unknown as SVGSVGElement;
}

/** Build a fresh 4-player competitive game, project it for seat 0. */
function boardSvg(mutate?: (st: GameState) => void): SVGSVGElement {
  const st = createGame(4, 'competitive', 42, 1);
  mutate?.(st);
  return parse(renderBoard(observableState(st, 0)));
}

describe('T-208 board — accept #1: circle-free illustrated locations (no enclosing disc)', () => {
  it('renders no enclosing stone disc and no ownership ring/tint circles', () => {
    const svg = boardSvg();
    expect(svg.querySelectorAll('circle.node').length, 'no base stone disc').toBe(0);
    expect(
      svg.querySelectorAll('.owner-ring, .owner-tint').length,
      'no coloured ownership ring/tint',
    ).toBe(0);
  });

  it('every node-group carries a tier-matched illustrated location', () => {
    const svg = boardSvg();
    const groups = Array.from(svg.querySelectorAll('g[data-node]'));
    expect(groups.length, '17 nodes rendered').toBe(17);
    for (const g of groups) {
      const id = g.getAttribute('data-node') ?? '';
      const tier = id.split('-')[0]; // keystone / approach / forge / keep / holding
      const loc = g.querySelector('.loc');
      expect(loc, `${id} has a .loc silhouette`).not.toBeNull();
      expect(
        loc?.classList.contains(`loc-${tier}`),
        `${id} silhouette is .loc-${tier}`,
      ).toBe(true);
    }
  });

  it('all five tier silhouettes appear across the board', () => {
    const svg = boardSvg();
    for (const tier of ['keystone', 'forge', 'keep', 'holding', 'approach']) {
      expect(
        svg.querySelectorAll(`.loc-${tier}`).length,
        `at least one .loc-${tier} silhouette`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('T-208 board — accept #2: carved chaos-star inlay present, edges distinct on top', () => {
  it('the decorative star inlay and a burned carved-wood fill are both present', () => {
    const svg = boardSvg();
    expect(svg.querySelectorAll('.star-inlay').length, 'decorative star-inlay present').toBeGreaterThan(0);
    const carve = svg.querySelector('.star-carve');
    expect(carve, 'burned carved-wood inlay element present').not.toBeNull();
    const fill = carve?.getAttribute('fill') ?? '';
    expect(fill.length > 0 && fill !== 'none', 'carve has a real (non-none) burn fill').toBe(true);
  });

  it('true edges are a distinct element class: 28 playable edges vs 8 decorative rays', () => {
    const svg = boardSvg();
    // 28 is the Closing-Ring topology (data/board.json): a decorative ray is NEVER an edge.
    expect(svg.querySelectorAll('.edge').length, '28 real playable edges').toBe(28);
    expect(svg.querySelectorAll('.star-inlay.ray').length, '8 decorative rays').toBe(8);
  });

  it('the keystone has exactly 4 playable edges (never a playable-looking ray where no edge exists)', () => {
    const svg = boardSvg();
    // The keystone renders at the board centre (VIEW/2 = 360,360). Count edges originating there.
    const CX = 360;
    const CY = 360;
    const near = (v: string, target: number) => Math.abs(Number(v) - target) < 0.6;
    const atKeystone = Array.from(svg.querySelectorAll('line.edge')).filter((e) => {
      const x1 = e.getAttribute('x1') ?? '';
      const y1 = e.getAttribute('y1') ?? '';
      const x2 = e.getAttribute('x2') ?? '';
      const y2 = e.getAttribute('y2') ?? '';
      return (near(x1, CX) && near(y1, CY)) || (near(x2, CX) && near(y2, CY));
    });
    expect(atKeystone.length, 'exactly 4 edges touch the keystone centre').toBe(4);
  });
});

describe('T-208 board — accept #3: claims render as a planted banner, never a ring', () => {
  it('a claimed node shows a banner carrying the owner house sigil class, and no ring', () => {
    // seat 1 = House Greyspear (sigil "spear"). Force ownership on a forge, then project.
    const svg = boardSvg((st) => {
      (st.board.state.nodes['forge-ne'] as { owner: number | null }).owner = 1;
    });
    const group = svg.querySelector('g[data-node="forge-ne"]');
    expect(group, 'forge-ne group present').not.toBeNull();
    const banner = group?.querySelector('.claim-banner');
    expect(banner, 'claimed node has a planted banner').not.toBeNull();
    expect(
      banner?.querySelector('.sigil-spear'),
      'banner carries the Greyspear (spear) sigil class',
    ).not.toBeNull();
    expect(group?.querySelector('.owner-ring'), 'no coloured ring on a claimed node').toBeNull();
  });
});

describe('T-216 chaos star — material depth (non-flat, silhouette unchanged)', () => {
  it('the star base uses a distinct fill treatment (gradient url), not a flat hex', () => {
    const svg = boardSvg();
    const fill = svg.querySelector('.star-carve')?.getAttribute('fill') ?? '';
    expect(fill.startsWith('url(#'), 'star base fill references a gradient/pattern').toBe(true);
  });

  it('a clipped procedural charred-grain texture is present (deterministic feTurbulence)', () => {
    const svg = boardSvg();
    expect(svg.querySelector('defs feTurbulence'), 'a feTurbulence grain filter exists').not.toBeNull();
    const char = svg.querySelector('.star-char');
    expect(char, '.star-char grain overlay present').not.toBeNull();
    expect((char?.getAttribute('filter') ?? '').includes('starChar'), 'grain references the turbulence filter').toBe(true);
    expect(svg.querySelector('clipPath#starCarveClip'), 'grain is clipped to the star silhouette').not.toBeNull();
  });

  it('a blurred ember/bevel rim traces the silhouette', () => {
    const svg = boardSvg();
    const ember = svg.querySelector('.star-ember');
    expect(ember, '.star-ember rim present').not.toBeNull();
    expect(ember?.getAttribute('fill'), 'ember rim is stroke-only').toBe('none');
    expect((ember?.getAttribute('filter') ?? '').includes('starEmber'), 'ember rim carries a glow filter').toBe(true);
  });

  it('the star silhouette is unchanged: 16 points, 8 outer at RIM≈338, 8 inner at ≈135.2', () => {
    const svg = boardSvg();
    const pts = (svg.querySelector('.star-carve')?.getAttribute('points') ?? '')
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(',').map(Number) as [number, number]);
    expect(pts.length, 'exactly 16 star points').toBe(16);
    const CX = 360;
    const CY = 360;
    const radius = (p: [number, number]) => Math.hypot(p[0] - CX, p[1] - CY);
    pts.forEach((p, i) => {
      // Even indices are the 8 outer rim points; odd indices the 8 inner cinch points.
      const expected = i % 2 === 0 ? 338 : 338 * 0.4;
      expect(Math.abs(radius(p) - expected), `point ${i} at radius ≈ ${expected}`).toBeLessThan(0.5);
    });
  });

  it('the base carve fill is still a real (non-none) fill — legacy accept #2 holds', () => {
    const svg = boardSvg();
    const fill = svg.querySelector('.star-carve')?.getAttribute('fill') ?? '';
    expect(fill.length > 0 && fill !== 'none', 'carve has a real (non-none) fill').toBe(true);
  });

  it('render is deterministic (§7 D1): same observable state ⇒ identical SVG', () => {
    const st = createGame(4, 'competitive', 42, 1);
    const obs = observableState(st, 0);
    expect(renderBoard(obs)).toBe(renderBoard(obs));
  });
});

describe('T-208 board — fog (§7 D2) regression guard', () => {
  it('an unflipped Discovery token renders only its back-sigil glyph, never hidden content', () => {
    const svg = boardSvg((st) => {
      // Test-local mutation of FULL state: plant an unflipped Marshal-recruit token on a holding.
      (st.board.state.nodes['holding-ne'] as { hiddenToken: unknown }).hiddenToken = {
        kind: 'recruit',
        sigil: 'bright',
        archetype: 'marshal',
        retainerName: 'The Sworn',
        bonusArchetype: null,
        bonusName: null,
        flipped: false,
        bonusClaimed: false,
      };
    });
    const group = svg.querySelector('g[data-node="holding-ne"]');
    expect(group, 'holding-ne group present').not.toBeNull();
    const sigil = group?.querySelector('.sigil-bright');
    expect(sigil, 'the fogged token shows its bright back-sigil').not.toBeNull();
    // None of the hidden payload may leak into this node's rendered markup (scope to the group
    // so unrelated board content — e.g. a marshal court piece elsewhere — never trips the guard).
    const markup = new XMLSerializer().serializeToString(group as Node).toLowerCase();
    for (const banned of ['recruit', 'marshal', 'the sworn']) {
      expect(markup.includes(banned), `no hidden content "${banned}" leaks to the board`).toBe(false);
    }
  });
});
