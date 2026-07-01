/**
 * Board view (v3) — renders the 17-node Closing Ring as an SVG, purely from the
 * OBSERVABLE projection (§7 D2). Never reads full GameState: unflipped Discovery
 * tokens arrive already fogged (sigil only), so this layer cannot leak content.
 *
 * Concentric layout (ALGORITHM §2): Keystone at center, the 4 Approaches on an
 * inner ring (cardinals), the 4 Forges on a mid ring (diagonals), the 4 Keeps on
 * the outer cardinals, and the 4 Holdings on the outer diagonals. Each node shows
 * ownership, ash state, a per-node blightLevel pip ladder, any Court pieces /
 * Crown / dark forces present, a Discovery back-sigil while face-down, and the
 * dark's heart HP once it spawns at the Keystone. Pure: same state ⇒ same SVG.
 */

import type { ObservableState } from '../v3/index.js';
import { BLIGHT_TO_ASH } from '../v3/tunables.js';

export const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308'];
const NEUTRAL = '#4b5563';
const ASH = '#1f1014';

const VIEW = 640;
const CX = VIEW / 2;
const CY = VIEW / 2;

/** angle in degrees (0 = East, clockwise in screen space), radius in px. */
interface Polar { angle: number; radius: number; }

/** Fixed layout table — concentric rings keyed by the v3 node ids (§2). */
const LAYOUT: Record<string, Polar> = {
  keystone: { angle: 0, radius: 0 },

  'approach-n': { angle: 270, radius: 90 },
  'approach-e': { angle: 0, radius: 90 },
  'approach-s': { angle: 90, radius: 90 },
  'approach-w': { angle: 180, radius: 90 },

  'forge-ne': { angle: 315, radius: 165 },
  'forge-se': { angle: 45, radius: 165 },
  'forge-sw': { angle: 135, radius: 165 },
  'forge-nw': { angle: 225, radius: 165 },

  'keep-n': { angle: 270, radius: 265 },
  'keep-e': { angle: 0, radius: 265 },
  'keep-s': { angle: 90, radius: 265 },
  'keep-w': { angle: 180, radius: 265 },

  'holding-ne': { angle: 315, radius: 265 },
  'holding-se': { angle: 45, radius: 265 },
  'holding-sw': { angle: 135, radius: 265 },
  'holding-nw': { angle: 225, radius: 265 },
};

interface Point { x: number; y: number; }

function pos(nodeId: string): Point {
  const p = LAYOUT[nodeId] ?? { angle: 0, radius: 0 };
  const rad = (p.angle * Math.PI) / 180;
  return { x: CX + p.radius * Math.cos(rad), y: CY + p.radius * Math.sin(rad) };
}

const NODE_R: Record<string, number> = {
  keystone: 38, approach: 24, forge: 28, keep: 30, holding: 24,
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Short archetype glyphs for on-node court markers. */
const ARCH_GLYPH: Record<string, string> = {
  warlord: '♟', marshal: '⚔', steward: '⚖', herald: '✉',
};

/** Build the full board SVG markup from the observable projection. */
export function renderBoard(state: ObservableState): string {
  const def = state.board.definition;
  const nodes = state.board.state.nodes;
  const heart = state.shadowking.heart;

  // ── Edges (dedup undirected pairs) ──
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
    const isHeart = heart !== null && heart.nodeId === id;
    const fill = ns.ashed ? ASH : owner === null ? NEUTRAL : PLAYER_COLORS[owner] ?? NEUTRAL;
    const cls = `node node-${ndef.tier}${ns.ashed ? ' ashed' : ''}${isHeart ? ' heart' : ''}`;

    circles += `<g class="node-group" data-node="${id}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">`;
    circles += `<circle r="${r}" class="${cls}" fill="${fill}" />`;

    // Tier glyph / short label
    circles += `<text class="node-label" y="4">${esc(tierGlyph(ndef.tier))}</text>`;

    // The dark's heart HP track (once it spawns at Reckoning).
    if (isHeart && heart) {
      circles += `<text x="0" y="${r + 16}" class="heart-hp">♥ ${heart.hp}${heart.exposed ? '' : ' (broken)'}</text>`;
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

    // Dark forces present?
    if (ns.shadowkingForces.length > 0) {
      circles += `<text x="${r - 4}" y="${-r + 6}" class="dk-glyph">☠</text>`;
    }

    circles += `</g>`;
  }

  return `<svg viewBox="0 0 ${VIEW} ${VIEW}" class="board-svg" xmlns="http://www.w3.org/2000/svg">${edges}${circles}</svg>`;
}

function tierGlyph(tier: string): string {
  switch (tier) {
    case 'keystone': return '◆';
    case 'forge': return '⚒';
    case 'keep': return '⌂';
    case 'approach': return '⛬';
    case 'holding': return '▢';
    default: return '';
  }
}
