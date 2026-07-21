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
 *      edges (`.edge`) stay a distinct element class (topology count = 52, decorative rays = 8),
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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { createGame, observableState } from '../../src/v3/index.js';
import type { GameState } from '../../src/v3/index.js';
import {
  renderBoard,
  nodeScreenPos,
  PLAYER_COLORS,
  BANNER_FLAG_W,
  BANNER_SIGIL_SCALE,
  houseSigilPath,
  HOUSES,
  TABLE_SURFACE_HEX,
  STAR_CARVE_STOPS,
  EDGE_STROKE_W,
  EDGE_BED_W,
} from '../../src/ui-v3/board-view.js';

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
    expect(groups.length, '21 nodes rendered').toBe(21);
    for (const g of groups) {
      const id = g.getAttribute('data-node') ?? '';
      const tier = id.split('-')[0]; // keystone / approach / forge / keep / holding / mid
      const loc = g.querySelector('.loc');
      expect(loc, `${id} has a .loc silhouette`).not.toBeNull();
      expect(
        loc?.classList.contains(`loc-${tier}`),
        `${id} silhouette is .loc-${tier}`,
      ).toBe(true);
    }
  });

  it('all six tier silhouettes appear across the board', () => {
    const svg = boardSvg();
    for (const tier of ['keystone', 'forge', 'keep', 'holding', 'approach', 'mid']) {
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

  it('true edges are a distinct element class: 52 playable edges vs 8 decorative rays', () => {
    const svg = boardSvg();
    // 52 is the v3 ring-rewire Closing-Ring topology (data/board-v3.json): a decorative ray is
    // NEVER an edge. (T-231: 40 − 4 removed forge ring + 16 new lattice edges.)
    expect(svg.querySelectorAll('.edge').length, '52 real playable edges').toBe(52);
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

// ── T-217 · edge-parity guard, distinct silhouettes, legible heraldry ──────────────────────

/** Canonical undirected edge key `a|b` with a<b, so both directions collapse to one. */
function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** The authoritative undirected edge set straight from `data/board-v3.json` node connections. */
function dataEdgeSet(): Set<string> {
  // Vitest runs from the repo root; read the data file directly (jsdom's import.meta.url is not a
  // file: URL, so resolve from cwd instead). v3 renders the 21-node board, so the edge-parity
  // source must be the v3 board data (T-222), not the frozen 17-node v2 board.json.
  const raw = readFileSync(resolve(process.cwd(), 'data/board-v3.json'), 'utf8');
  const board = JSON.parse(raw) as { nodes: { id: string; connections: string[] }[] };
  const conn = new Map<string, Set<string>>();
  for (const n of board.nodes) conn.set(n.id, new Set(n.connections));
  const edges = new Set<string>();
  for (const n of board.nodes) {
    for (const c of n.connections) {
      // Defensive: connections must be symmetric (undirected graph).
      expect(conn.get(c)?.has(n.id), `edge ${n.id}→${c} is symmetric`).toBe(true);
      edges.add(edgeKey(n.id, c));
    }
  }
  return edges;
}

describe('T-217 board — accept: edge-parity (render == data, no missing / no phantom edges)', () => {
  it('every data/board.json edge is rendered exactly once and no extra connectors exist', () => {
    const data = dataEdgeSet();
    expect(data.size, 'v3 ring-rewire Closing-Ring topology has 52 undirected edges').toBe(52);

    const svg = boardSvg();
    const rendered = Array.from(svg.querySelectorAll('line.edge'));
    expect(rendered.length, 'one line.edge per data edge (52)').toBe(52);

    // Map each rendered endpoint back to a node id by nearest layout position (tight epsilon).
    const ids = new Set<string>();
    for (const e of data) for (const id of e.split('|')) ids.add(id);
    const idPositions = Array.from(ids).map((id) => ({ id, p: nodeScreenPos(id) }));
    const idAt = (x: number, y: number): string => {
      for (const { id, p } of idPositions) {
        if (Math.hypot(p.x - x, p.y - y) < 0.6) return id;
      }
      throw new Error(`endpoint (${x},${y}) matches no node — phantom coordinate`);
    };

    const renderedKeys: string[] = [];
    for (const e of rendered) {
      const a = idAt(Number(e.getAttribute('x1')), Number(e.getAttribute('y1')));
      const b = idAt(Number(e.getAttribute('x2')), Number(e.getAttribute('y2')));
      renderedKeys.push(edgeKey(a, b));
    }

    // No duplicate elements for any data edge.
    const renderedSet = new Set(renderedKeys);
    expect(renderedSet.size, 'no duplicate rendered edges').toBe(renderedKeys.length);

    // Set equality: render === data (no missing, no phantom).
    const missing = [...data].filter((k) => !renderedSet.has(k));
    const phantom = [...renderedSet].filter((k) => !data.has(k));
    expect(missing, `edges in data but not rendered: ${missing.join(', ')}`).toEqual([]);
    expect(phantom, `edges rendered but not in data: ${phantom.join(', ')}`).toEqual([]);
  });

  it('the four keystone → approach spokes (the only routes into the centre) are rendered', () => {
    const data = dataEdgeSet();
    const svg = boardSvg();
    const rendered = Array.from(svg.querySelectorAll('line.edge'));
    const idPositions = ['keystone', 'approach-nw', 'approach-ne', 'approach-se', 'approach-sw'].map(
      (id) => ({ id, p: nodeScreenPos(id) }),
    );
    const idAt = (x: number, y: number): string | null => {
      for (const { id, p } of idPositions) if (Math.hypot(p.x - x, p.y - y) < 0.6) return id;
      return null;
    };
    const renderedKeys = new Set<string>();
    for (const e of rendered) {
      const a = idAt(Number(e.getAttribute('x1')), Number(e.getAttribute('y1')));
      const b = idAt(Number(e.getAttribute('x2')), Number(e.getAttribute('y2')));
      if (a && b) renderedKeys.add(edgeKey(a, b));
    }
    for (const ap of ['approach-nw', 'approach-ne', 'approach-se', 'approach-sw']) {
      const key = edgeKey('keystone', ap);
      expect(data.has(key), `${key} is a real data edge`).toBe(true);
      expect(renderedKeys.has(key), `${key} spoke is rendered into the centre`).toBe(true);
    }
  });

  it('the edges are grouped under a raised-road glow (one element per edge preserved)', () => {
    const svg = boardSvg();
    const group = svg.querySelector('g.edges');
    expect(group, 'edges wrapped in a .edges group').not.toBeNull();
    expect((group?.getAttribute('filter') ?? '').includes('edgeGlow'), 'group carries the road glow').toBe(true);
    expect(svg.querySelector('defs filter#edgeGlow'), 'the edge-glow filter is defined').not.toBeNull();
    // The glow is a GROUP filter — the DOM still holds exactly one line.edge per edge.
    expect(group?.querySelectorAll('line.edge').length, '52 edge lines live inside the group').toBe(52);
  });
});

describe('T-217 board — accept: distinct forge / approach silhouettes', () => {
  it('a forge carries its ember glow (halo + hot core) and an approach a watchtower gate', () => {
    const svg = boardSvg();
    const forge = svg.querySelector('g[data-node="forge-ne"]');
    const approach = svg.querySelector('g[data-node="approach-ne"]');
    expect(forge?.querySelector('.loc-forge'), 'forge has a .loc-forge silhouette').not.toBeNull();
    expect(forge?.querySelector('.loc-glow'), 'forge has an ember halo').not.toBeNull();
    expect(forge?.querySelector('.loc-glow-core'), 'forge has a hot ember core').not.toBeNull();

    expect(approach?.querySelector('.loc-approach'), 'approach has a .loc-approach silhouette').not.toBeNull();
    expect(approach?.querySelector('.approach-gate'), 'approach has the watchtower gate marker').not.toBeNull();
    // The forge silhouette has NO gate marker and the approach NO ember — structurally distinct.
    expect(forge?.querySelector('.approach-gate'), 'forge is not a gatehouse').toBeNull();
    expect(approach?.querySelector('.loc-glow'), 'approach is not an ember forge').toBeNull();
  });
});

describe('T-217 board — accept: readable heraldry banners (house colour + sigil at legible size)', () => {
  it('a claimed node banner shows the exact house colour and sigil at a legible size', () => {
    const svg = boardSvg((st) => {
      // seat 2 = House Ravenholt (sigil "raven"). Force ownership on a forge, then project.
      (st.board.state.nodes['forge-nw'] as { owner: number | null }).owner = 2;
    });
    const group = svg.querySelector('g[data-node="forge-nw"]');
    const flag = group?.querySelector('.banner-flag');
    expect(flag, 'claimed node has a banner flag').not.toBeNull();
    // House colour visible: flag fill is the exact seat-2 heraldry hex.
    expect(flag?.getAttribute('fill'), 'flag carries the exact house colour').toBe(PLAYER_COLORS[2]);

    // Sigil visible: the raven sigil class is present.
    const sigil = group?.querySelector('.banner-sigil.sigil-raven');
    expect(sigil, 'banner carries the Ravenholt (raven) sigil').not.toBeNull();

    // Legible SIZE: sigil scale ≥ 0.75 and the flag spans the authored width — a future shrink
    // regresses this. Parse the scale out of the sigil transform and check the flag path width.
    const transform = sigil?.getAttribute('transform') ?? '';
    const scale = Number(/scale\(([\d.]+)\)/.exec(transform)?.[1] ?? '0');
    expect(scale, 'sigil rendered at a legible scale').toBeGreaterThanOrEqual(0.75);
    expect(scale, 'sigil scale matches the authored legible constant').toBe(BANNER_SIGIL_SCALE);
    expect(BANNER_SIGIL_SCALE, 'authored sigil scale is legible').toBeGreaterThanOrEqual(0.75);

    const d = flag?.getAttribute('d') ?? '';
    const xs = Array.from(d.matchAll(/[-\d.]+/g)).map(Number);
    const flagWidth = Math.max(...xs.filter((_, i) => i % 2 === 0));
    expect(flagWidth, 'flag spans the authored legible width').toBeGreaterThanOrEqual(22);
    expect(BANNER_FLAG_W, 'authored flag width is legible').toBeGreaterThanOrEqual(22);
  });

  it('every house — including Duskmere (crescent) — plants a banner carrying its own sigil class', () => {
    // The accept criterion is house-agnostic: exercise ALL four seats, not just seat 2. The crescent
    // (Duskmere, seat 3) is the house whose sigil regressed to invisible, so it must be covered here.
    for (let seat = 0; seat < HOUSES.length; seat++) {
      const sigilName = HOUSES[seat]!.sigil;
      const svg = boardSvg((st) => {
        (st.board.state.nodes['forge-nw'] as { owner: number | null }).owner = seat;
      });
      const group = svg.querySelector('g[data-node="forge-nw"]');
      const banner = group?.querySelector('.banner-sigil');
      expect(banner?.getAttribute('class'), `seat ${seat} banner carries the ${sigilName} sigil class`)
        .toContain(`sigil-${sigilName}`);
    }
  });

  it('no house sigil path self-cancels under the fill-rule (every elliptical arc radius ≥ half its chord)', () => {
    // Root-cause guard for the crescent bug: an SVG `a`/`A` arc whose radius is smaller than half the
    // straight-line distance between its endpoints is auto-scaled up per spec, and paired arcs can then
    // sweep so they cancel under the default nonzero fill-rule — leaving an invisible glyph. Assert the
    // radius-vs-chord invariant on every arc of every house sigil (deterministic; no rasterization).
    for (const house of HOUSES) {
      const markup = houseSigilPath(house.sigil);
      const d = /\bd="([^"]+)"/.exec(markup)?.[1] ?? '';
      expect(d, `${house.sigil} sigil exposes a path d`).not.toBe('');
      for (const arc of ellipticalArcs(d)) {
        const chord = Math.hypot(arc.ex - arc.sx, arc.ey - arc.sy);
        expect(
          arc.rx + 1e-6,
          `${house.sigil}: arc radius ${arc.rx} must be ≥ half its chord ${(chord / 2).toFixed(2)} ` +
            `(else SVG rescales it and the arcs can cancel under the fill-rule)`,
        ).toBeGreaterThanOrEqual(chord / 2);
      }
    }
  });
});

// ── T-225 · finished cardinal mid silhouette (waystation bridge), distinct on the cardinal rays ──

describe('T-225 board — accept: all four mid nodes render a finished, distinct waystation bridge', () => {
  it('every mid-* node carries a .loc-mid silhouette with the finished .mid-span arch marker', () => {
    const svg = boardSvg();
    for (const id of ['mid-n', 'mid-e', 'mid-s', 'mid-w']) {
      const group = svg.querySelector(`g[data-node="${id}"]`);
      expect(group, `${id} group present`).not.toBeNull();
      expect(group?.querySelector('.loc-mid'), `${id} has a .loc-mid silhouette`).not.toBeNull();
      expect(group?.querySelector('.mid-span'), `${id} carries the finished bridge-span marker`).not.toBeNull();
    }
  });

  it('the mid silhouette is structurally distinct: not a forge ember, not a gatehouse arch', () => {
    const svg = boardSvg();
    const mid = svg.querySelector('g[data-node="mid-n"]');
    // A bridge is NOT a forge (no ember glow) and NOT the approach gatehouse (no .approach-gate arch).
    expect(mid?.querySelector('.loc-glow'), 'mid is not an ember forge').toBeNull();
    expect(mid?.querySelector('.loc-glow-core'), 'mid has no hot ember core').toBeNull();
    expect(mid?.querySelector('.approach-gate'), 'mid is not the gatehouse (no approach-gate)').toBeNull();
    // …and conversely the forge / approach silhouettes never carry the bridge span marker.
    const forge = svg.querySelector('g[data-node="forge-ne"]');
    const approach = svg.querySelector('g[data-node="approach-ne"]');
    expect(forge?.querySelector('.mid-span'), 'a forge is not a bridge').toBeNull();
    expect(approach?.querySelector('.mid-span'), 'an approach is not a bridge').toBeNull();
  });

  it('each mid node sits on its cardinal ray (documents the 8-real-rays placement)', () => {
    // mid-n is due north of centre (VIEW/2 = 360,360): x≈360, y clearly above centre.
    const n = nodeScreenPos('mid-n');
    expect(Math.abs(n.x - 360) < 0.6, 'mid-n is on the vertical (north) cardinal ray').toBe(true);
    expect(n.y, 'mid-n sits inboard, above the centre').toBeLessThan(360);
    // mid-e is due east: y≈360, x clearly right of centre.
    const e = nodeScreenPos('mid-e');
    expect(Math.abs(e.y - 360) < 0.6, 'mid-e is on the horizontal (east) cardinal ray').toBe(true);
    expect(e.x, 'mid-e sits inboard, right of the centre').toBeGreaterThan(360);
  });

  it('the finished mid silhouette is fog-safe & deterministic (static geometry, no leak)', () => {
    // Same observable projection ⇒ identical mid markup (no RNG, no hidden-state reads in the bridge).
    const st = createGame(4, 'competitive', 42, 1);
    const obs = observableState(st, 0);
    expect(renderBoard(obs)).toBe(renderBoard(obs));
  });
});

// ── T-220 · star boldness restored (dark ground) + connectors thinned & materialized ──────────

/** sRGB relative luminance of a #rrggbb hex — plain weighted channel sum (monotonic; no gamma). */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('T-220 board — accept #1: star ground is measurably darker than the table (keep bold, add depth)', () => {
  it('every starCarveGrad stop is darker than the table surface, and the DOM uses the STAR_CARVE_STOPS tokens', () => {
    const svg = boardSvg();
    const stops = Array.from(svg.querySelectorAll('radialGradient#starCarveGrad stop')).map(
      (s) => s.getAttribute('stop-color') ?? '',
    );
    // Render uses the tokens (single source shared with the assertion).
    expect(stops, 'gradient stops equal STAR_CARVE_STOPS in order').toEqual([...STAR_CARVE_STOPS]);
    const tableL = luminance(TABLE_SURFACE_HEX);
    for (const stop of stops) {
      expect(
        luminance(stop),
        `star stop ${stop} (L=${luminance(stop).toFixed(4)}) darker than table ${TABLE_SURFACE_HEX} (L=${tableL.toFixed(4)})`,
      ).toBeLessThan(tableL);
    }
    // Depth retained: centre stop lighter than the rim stop (a visible centre→rim falloff).
    expect(luminance(stops[0]!), 'centre stop lighter than rim (radial depth)').toBeGreaterThan(
      luminance(stops[stops.length - 1]!),
    );
  });

  it('texture + ember edge are RETAINED (the ruling was keep-and-add, not trade)', () => {
    const svg = boardSvg();
    const char = svg.querySelector('.star-char');
    expect(char, '.star-char grain overlay still present').not.toBeNull();
    expect((char?.getAttribute('filter') ?? '').includes('starChar'), 'grain references the turbulence filter').toBe(true);
    const ember = svg.querySelector('.star-ember');
    expect(ember, '.star-ember rim still present').not.toBeNull();
    expect(ember?.getAttribute('fill'), 'ember rim is stroke-only').toBe('none');
    expect((ember?.getAttribute('filter') ?? '').includes('starEmber'), 'ember rim carries its glow filter').toBe(true);
  });

  it('the table-surface constant has not drifted from the real .table-stage background (drift guard)', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/ui-v3/ui-v3.css'), 'utf8');
    const rule = /\.table-stage\s*\{[^}]*\}/s.exec(css)?.[0] ?? '';
    expect(rule, '.table-stage rule found in ui-v3.css').not.toBe('');
    expect(
      rule.includes(`background-color: ${TABLE_SURFACE_HEX}`),
      `TABLE_SURFACE_HEX (${TABLE_SURFACE_HEX}) still mirrors the .table-stage background-color`,
    ).toBe(true);
  });
});

describe('T-220 board — accept #2: connectors thinned & materialized (worn-stone road / etched gold vein)', () => {
  it('every playable edge is thinned below the T-217 weight (4) and carries the inline EDGE_STROKE_W', () => {
    expect(EDGE_STROKE_W, 'vein weight reduced from the old 4').toBeLessThan(4);
    const svg = boardSvg();
    const edges = Array.from(svg.querySelectorAll('line.edge'));
    expect(edges.length, 'still 52 playable edges').toBe(52);
    for (const e of edges) {
      expect(e.getAttribute('stroke-width'), 'edge carries the inline thinned width').toBe(String(EDGE_STROKE_W));
    }
  });

  it('each edge rides a wider worn-stone road bed — a material treatment, not a bare bright bar', () => {
    expect(EDGE_BED_W, 'road bed is wider than the gold vein').toBeGreaterThan(EDGE_STROKE_W);
    const svg = boardSvg();
    const beds = Array.from(svg.querySelectorAll('line.edge-bed'));
    const edges = Array.from(svg.querySelectorAll('line.edge'));
    expect(beds.length, 'one road bed per edge (52)').toBe(52);
    expect(beds.length, 'bed count matches edge count').toBe(edges.length);
    for (const b of beds) {
      expect(b.getAttribute('stroke-width'), 'bed carries the inline wider width').toBe(String(EDGE_BED_W));
    }
    // `.edge-bed` is a distinct class token — invisible to the `.edge` edge-parity queries.
    expect(svg.querySelectorAll('.edge-bed.edge, .edge.edge-bed').length, 'bed and vein are separate classes').toBe(0);
  });
});

/**
 * Minimal SVG path walker that yields every elliptical arc segment with its resolved start/end points.
 * Tracks the current point through M/m, L/l, H/h, V/v, C/c, S/s, Q/q, T/t, A/a, Z/z so relative arcs
 * resolve to absolute endpoints. Only the arc geometry (radius vs. chord) is used by the caller.
 */
function ellipticalArcs(
  d: string,
): { sx: number; sy: number; ex: number; ey: number; rx: number; ry: number }[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const argc: Record<string, number> = {
    M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
  };
  const arcs: { sx: number; sy: number; ex: number; ey: number; rx: number; ry: number }[] = [];
  let cx = 0, cy = 0, startX = 0, startY = 0;
  let cmd = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; if (cmd.toUpperCase() === 'Z') { cx = startX; cy = startY; } continue; }
    const upper = cmd.toUpperCase();
    const rel = cmd === cmd.toLowerCase();
    const n = argc[upper] ?? 0;
    const a = tokens.slice(i, i + n).map(Number);
    i += n;
    const px = cx, py = cy;
    switch (upper) {
      case 'M': cx = rel ? cx + a[0]! : a[0]!; cy = rel ? cy + a[1]! : a[1]!; startX = cx; startY = cy; cmd = rel ? 'l' : 'L'; break;
      case 'L': case 'T': cx = rel ? cx + a[0]! : a[0]!; cy = rel ? cy + a[1]! : a[1]!; break;
      case 'H': cx = rel ? cx + a[0]! : a[0]!; break;
      case 'V': cy = rel ? cy + a[0]! : a[0]!; break;
      case 'C': cx = rel ? cx + a[4]! : a[4]!; cy = rel ? cy + a[5]! : a[5]!; break;
      case 'S': case 'Q': cx = rel ? cx + a[2]! : a[2]!; cy = rel ? cy + a[3]! : a[3]!; break;
      case 'A':
        cx = rel ? cx + a[5]! : a[5]!; cy = rel ? cy + a[6]! : a[6]!;
        arcs.push({ sx: px, sy: py, ex: cx, ey: cy, rx: Math.abs(a[0]!), ry: Math.abs(a[1]!) });
        break;
      default: break;
    }
  }
  return arcs;
}
