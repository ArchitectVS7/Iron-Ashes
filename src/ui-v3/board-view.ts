/**
 * Board view (v3) — renders the 17-node Closing Ring as an SVG, purely from the
 * OBSERVABLE projection (§7 D2). Never reads full GameState: unflipped Discovery
 * tokens arrive already fogged (sigil only), so this layer cannot leak content.
 *
 * Layout (T-201): the 17 nodes are laid out as an 8-ray CHAOS-MAGIC STAR. Spokes run
 * keystone → approach → forge on the DIAGONAL rays; the keeps sit on the CARDINAL rays
 * (the forge → keep quarter-twist), and the holdings on the outer diagonals — so all 17
 * nodes land on 8 rays {0,45,90,135,180,225,270,315}. The 8 full-length star rays +
 * octagram are DECORATIVE table inlay only (`.star-inlay`, non-interactive); the true
 * playable edges are drawn distinctly on top (`.edge`) straight from each node's real
 * `connections`, so a decorative ray is never mistaken for an edge and no edge is omitted.
 *
 * Each node IS an illustrated map LOCATION (dark throne / anvil-forge / castle-keep /
 * hamlet-holding / road-approach) — the silhouette itself is the node body; there is NO
 * enclosing stone disc. An owned node's sole ownership signal is the owner's HOUSE banner
 * planted on it (heraldry colour + sigil) — never a coloured ring. Ash state (ashed
 * illustration), the keystone accent, the dark's heart (danger-lit throne), a per-node
 * blightLevel pip ladder, Court pieces / Crown / dark forces, a Discovery back-sigil while
 * face-down, and the dark's heart HP are all preserved. Beneath the graph a burned {8-point}
 * chaos-star is carved into the wood (`.star-carve`, first child), with the decorative rays /
 * octagram (`.star-inlay`) over it and the true edges (`.edge`) distinct on top of both.
 * Pure: same observable state ⇒ same SVG.
 */

import type { ObservableState } from '../v3/index.js';
import { BLIGHT_TO_ASH } from '../v3/tunables.js';

/**
 * The four muted HOUSE heraldry colours (Gate 0.5, 2026-07-18) — tuned to the candlelit
 * palette, never saturated web primaries. Seat order 0..3. Identity is shape+colour
 * (each house also carries a sigil, below) so it survives colour-blindness.
 *
 * NOTE: seat 0 (Emberfall `#c15f2c`) is the human; `scripts/shots-v3.mjs` `HUMAN_COLOR`
 * must match this exact lowercase hex — it detects rivals by comparing piece fills to it.
 */
export const PLAYER_COLORS = ['#c15f2c', '#8a93a3', '#2f7d5b', '#7a6aa0'];

/** House identity table (name + sigil id) — parallel to PLAYER_COLORS by seat. */
export interface House {
  readonly name: string;
  readonly sigil: 'flame' | 'spear' | 'raven' | 'crescent';
}
export const HOUSES: readonly House[] = [
  { name: 'Emberfall', sigil: 'flame' },
  { name: 'Greyspear', sigil: 'spear' },
  { name: 'Ravenholt', sigil: 'raven' },
  { name: 'Duskmere', sigil: 'crescent' },
];

const NEUTRAL = '#4b5563';
/** Burned-wood fill for the carved chaos-star inlay — darker than the table texture. */
const STAR_CARVE_FILL = '#1c130b';

const VIEW = 720;
const CX = VIEW / 2;
const CY = VIEW / 2;
const RIM = 338; // decorative star reaches to the rim, just inside the viewBox

/** angle in degrees (0 = East, clockwise in screen space), radius in px. */
interface Polar { angle: number; radius: number; }

/** The 8 ray angles carrying the chaos-magic star (N=270, E=0, S=90, W=180 + diagonals). */
const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Fixed 8-ray-star layout keyed by the real v3 node ids (`data/board.json`). Diagonal rays
 * carry approach → forge → holding; cardinal rays carry the keeps. Every id lands on a ray.
 */
const LAYOUT: Record<string, Polar> = {
  keystone: { angle: 0, radius: 0 },

  'approach-nw': { angle: 225, radius: 95 },
  'approach-ne': { angle: 315, radius: 95 },
  'approach-se': { angle: 45, radius: 95 },
  'approach-sw': { angle: 135, radius: 95 },

  'forge-nw': { angle: 225, radius: 190 },
  'forge-ne': { angle: 315, radius: 190 },
  'forge-se': { angle: 45, radius: 190 },
  'forge-sw': { angle: 135, radius: 190 },

  'holding-nw': { angle: 225, radius: 288 },
  'holding-ne': { angle: 315, radius: 288 },
  'holding-se': { angle: 45, radius: 288 },
  'holding-sw': { angle: 135, radius: 288 },

  'keep-n': { angle: 270, radius: 268 },
  'keep-e': { angle: 0, radius: 268 },
  'keep-s': { angle: 90, radius: 268 },
  'keep-w': { angle: 180, radius: 268 },
};

interface Point { x: number; y: number; }

function polarPoint(angle: number, radius: number): Point {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function pos(nodeId: string): Point {
  const p = LAYOUT[nodeId] ?? { angle: 0, radius: 0 };
  return polarPoint(p.angle, p.radius);
}

const NODE_R: Record<string, number> = {
  keystone: 40, approach: 24, forge: 30, keep: 32, holding: 26,
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Short archetype glyphs for on-node court markers. */
const ARCH_GLYPH: Record<string, string> = {
  warlord: '♟', marshal: '⚔', steward: '⚖', herald: '✉',
};

/**
 * House sigil as SVG path markup drawn in a 0..24 box (recolour via CSS `currentColor`).
 * Exported so the HUD house plaques and the on-board planted banners share one source.
 */
export function houseSigilPath(sigil: House['sigil']): string {
  switch (sigil) {
    case 'flame': // Emberfall — a teardrop flame
      return '<path d="M12 2c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" />';
    case 'spear': // Greyspear — a vertical spear
      return '<path d="M12 2l3 5h-2v13h-2V7H9z" />';
    case 'raven': // Ravenholt — a bird in flight (chevron wings + body)
      return '<path d="M12 8c2-3 5-4 9-4-3 2-3 3-5 4 2 0 3 1 4 2-3 0-5 0-8 3-3-3-5-3-8-3 1-1 2-2 4-2-2-1-2-2-5-4 4 0 7 1 9 4z" />';
    case 'crescent': // Duskmere — a crescent moon
      return '<path d="M16 3a9 9 0 1 0 0 18 7 7 0 0 1 0-18z" />';
  }
}

/** A full standalone sigil SVG for the HUD plaques (coloured by `color`). */
export function houseSigilSvg(seat: number, size: number, color: string): string {
  const house = HOUSES[seat];
  if (!house) return '';
  return `<svg class="sigil-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" aria-hidden="true">${houseSigilPath(house.sigil)}</svg>`;
}

/**
 * Illustrated map location per tier, centred at the node origin, scaled to radius `r`. The
 * silhouette IS the node body (no enclosing disc). `extra` carries state classes (`ashed`,
 * `heart`) that re-home the disc's former visual states onto the illustration itself.
 */
function locationSvg(tier: string, r: number, extra = ''): string {
  const s = r / 24; // the primitives below are authored in a ~24px box
  const cls = `loc loc-${tier}${extra ? ` ${extra}` : ''}`;
  const g = (inner: string): string => `<g class="${cls}" transform="scale(${s.toFixed(3)})">${inner}</g>`;
  switch (tier) {
    case 'keystone': // the dark throne
      return g(`<path class="loc-fill" d="M-14 14h28l-3-8h-4l2-16h-6l-1 6h-4l-1-6h-6l2 16h-4z" />
        <path class="loc-line" d="M-11 14h22" />`);
    case 'forge': // an anvil with an ember glow
      return g(`<circle class="loc-glow" cx="0" cy="2" r="11" />
        <path class="loc-fill" d="M-11 -3h16c0 3-2 4-4 4h-3l6 8h-8l-5-8h-2z" />
        <rect class="loc-fill" x="-4" y="9" width="8" height="4" />`);
    case 'keep': // a crenellated castle
      return g(`<path class="loc-fill" d="M-13 -4h3v-4h3v4h2v-4h3v4h3v-4h3v4h3v18h-23z" />
        <rect class="loc-line" x="-3" y="4" width="6" height="10" />`);
    case 'holding': // a hamlet cottage
      return g(`<path class="loc-fill" d="M0 -12l13 10h-3v12h-20v-12h-3z" />
        <rect class="loc-line" x="-4" y="2" width="8" height="8" />`);
    case 'approach': // a road waypoint / signpost
      return g(`<path class="loc-line" d="M-1 -13h2v26h-2z" />
        <path class="loc-fill" d="M1 -12h12l-3 4 3 4h-12z" />`);
    default:
      return '';
  }
}

/**
 * A planted house banner (pole + pennant + sigil) — the SOLE ownership signal for an owned,
 * non-ashed node (there is no coloured ring). The sigil `<g>` carries a `sigil-<name>` class so
 * the owner's heraldry reads at a glance (and is DOM-assertable).
 */
function claimBanner(seat: number, r: number): string {
  const color = PLAYER_COLORS[seat] ?? NEUTRAL;
  const sigil = HOUSES[seat]?.sigil ?? 'flame';
  // Perch the banner on the node's upper-left shoulder so it clears pieces/crown at the top.
  return `<g class="claim-banner" transform="translate(${(-r - 2).toFixed(1)},${(-r - 6).toFixed(1)})">
    <line class="banner-pole" x1="0" y1="4" x2="0" y2="24" />
    <path class="banner-flag" d="M0 4h15l-4 4 4 4H0z" fill="${color}" />
    <g class="banner-sigil sigil-${sigil}" transform="translate(1.5,4) scale(0.42)" fill="#1a1206">${houseSigilPath(sigil)}</g>
  </g>`;
}

/** Build the full board SVG markup from the observable projection. */
export function renderBoard(state: ObservableState): string {
  const def = state.board.definition;
  const nodes = state.board.state.nodes;
  const heart = state.shadowking.heart;

  // ── Decorative chaos-magic star inlay (table marquetry — NOT playable edges) ──
  const rim = RAY_ANGLES.map(a => polarPoint(a, RIM));
  let inlay = '';
  // Carved burned-wood 8-point star beneath the graph: a filled polygon whose 8 outer points
  // sit under the decorative rays and 8 inner points cinch between them. Rendered FIRST (under
  // rays / edges / nodes) with an explicit dark burn fill so it reads as a scorched inlay in a
  // screenshot, not faint scratches. This is decorative wood — never a playable ray.
  const carvePts: string[] = [];
  const CARVE_INNER = RIM * 0.4;
  for (let i = 0; i < 8; i++) {
    const outer = polarPoint(RAY_ANGLES[i], RIM);
    const inner = polarPoint(RAY_ANGLES[i] + 22.5, CARVE_INNER);
    carvePts.push(`${outer.x.toFixed(1)},${outer.y.toFixed(1)}`);
    carvePts.push(`${inner.x.toFixed(1)},${inner.y.toFixed(1)}`);
  }
  inlay += `<polygon points="${carvePts.join(' ')}" class="star-carve" fill="${STAR_CARVE_FILL}" />`;
  // 8 full-length rays from the centre to the rim.
  for (const p of rim) {
    inlay += `<line x1="${CX}" y1="${CY}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="star-inlay ray" />`;
  }
  // Outer octagon linking the rim points.
  const octagon = rim.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  inlay += `<polygon points="${octagon}" class="star-inlay octagon" />`;
  // The {8/3} interlaced octagram — the classic chaos-star silhouette: walk the 8 rim
  // points advancing by 3 each step so the single closed path crosses itself as a star.
  let star = '';
  let idx = 0;
  for (let step = 0; step < 8; step++) {
    const p = rim[idx];
    star += `${step === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    idx = (idx + 3) % 8;
  }
  star += 'Z';
  inlay += `<path d="${star}" class="star-inlay octagram" />`;

  // ── Real playable edges (dedup undirected pairs), drawn distinctly ON TOP ──
  const seen = new Set<string>();
  let edges = '';
  for (const [id, ndef] of Object.entries(def.nodes)) {
    const a = pos(id);
    for (const conn of ndef.connections) {
      const key = id < conn ? `${id}|${conn}` : `${conn}|${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const b = pos(conn);
      edges += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="edge" />`;
    }
  }

  // ── Nodes ──
  let circles = '';
  for (const [id, ndef] of Object.entries(def.nodes)) {
    const p = pos(id);
    const ns = nodes[id];
    const r = NODE_R[ndef.tier] ?? 24;
    const owner = ns.owner;
    const owned = owner !== null && !ns.ashed;
    const isHeart = heart !== null && heart.nodeId === id;

    circles += `<g class="node-group" data-node="${id}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">`;
    circles += `<title>${esc(id)} — ${esc(ndef.tier)}${owner !== null ? ` · ${esc(HOUSES[owner]?.name ?? `P${owner + 1}`)}` : ' · unclaimed'}${ns.ashed ? ' · ASHED' : ''}</title>`;

    // The illustrated location IS the node body — no enclosing stone disc. The former disc's
    // visual states are re-homed onto the illustration via classes: `ashed` (scorched fill),
    // `heart` (danger-lit throne once the dark's heart spawns); the keystone accent lives on
    // `.loc-keystone` in CSS. Zero info loss (Gate 0.5).
    const extra = `${ns.ashed ? ' ashed' : ''}${isHeart ? ' heart' : ''}`.trim();
    circles += locationSvg(ndef.tier, r, extra);

    // The dark's heart HP track (once it spawns at Reckoning).
    if (isHeart && heart) {
      circles += `<text x="0" y="${r + 18}" class="heart-hp">♥ ${heart.hp}${heart.exposed ? '' : ' (broken)'}</text>`;
    }

    // Discovery back-sigil while face-down (fog-respecting: sigil only, §7 D2).
    const tok = ns.hiddenToken;
    if (tok !== null && !tok.flipped) {
      circles += `<text x="0" y="${-2}" class="sigil sigil-${tok.sigil}">${tok.sigil === 'bright' ? '✦' : '✧'}</text>`;
    }

    // Blight pips (doom-as-map) — a ladder toward ash.
    if (!ns.ashed && ns.blightLevel > 0) {
      for (let i = 0; i < BLIGHT_TO_ASH; i++) {
        const filled = i < ns.blightLevel;
        const px = -((BLIGHT_TO_ASH - 1) * 6) / 2 + i * 6;
        circles += `<circle cx="${px}" cy="${r + 8}" r="2.5" class="pip ${filled ? 'pip-on' : 'pip-off'}" />`;
      }
    }

    // Court pieces present (warlord / marshal / steward / herald), laid in a row above.
    // NOTE: these `circle.piece` fills are how the shots driver detects rivals — keep them.
    const pieces = ns.pieces;
    const n = pieces.length;
    pieces.forEach((pc, i) => {
      const spread = 13;
      const px = (i - (n - 1) / 2) * spread;
      const crown = state.crownHolder === pc.owner && pc.type === 'warlord';
      circles += `<circle cx="${px.toFixed(1)}" cy="${-r - 8}" r="6" class="piece piece-${pc.type}" fill="${PLAYER_COLORS[pc.owner]}" stroke="#000" />`;
      circles += `<text x="${px.toFixed(1)}" y="${-r - 5}" class="piece-glyph">${ARCH_GLYPH[pc.type] ?? '?'}</text>`;
      if (crown) circles += `<text x="${px.toFixed(1)}" y="${-r - 17}" class="crown-glyph">♛</text>`;
    });

    // Planted house banner for an owned node.
    if (owned && owner !== null) {
      circles += claimBanner(owner, r);
    }

    // Dark forces present?
    if (ns.shadowkingForces.length > 0) {
      circles += `<text x="${r - 4}" y="${-r + 6}" class="dk-glyph">☠</text>`;
    }

    circles += `</g>`;
  }

  return `<svg viewBox="0 0 ${VIEW} ${VIEW}" class="board-svg" xmlns="http://www.w3.org/2000/svg">${inlay}${edges}${circles}</svg>`;
}
