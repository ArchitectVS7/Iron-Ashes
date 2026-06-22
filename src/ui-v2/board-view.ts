/**
 * Board view — renders the 17-node Closing Ring as an SVG, purely from state.
 *
 * Concentric layout (ALGORITHM §2): Keystone at center, the 4 Approaches on an
 * inner ring, the 4 Forges on a mid ring, the 4 Keeps on the outer cardinals,
 * and the 4 Holdings on the outer diagonals. Each node shows ownership, ash
 * state, a per-node blightLevel pip ladder (P2), and any Warlord / Crown / dark
 * forces present. Pure: same state ⇒ same SVG.
 */

import type { GameState } from '../v2/index.js';
import { BLIGHT_TO_ASH } from '../v2/tunables.js';

export const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308'];
const NEUTRAL = '#4b5563';
const ASH = '#1f1014';

const VIEW = 640;
const CX = VIEW / 2;
const CY = VIEW / 2;

/** angle in degrees (0 = East, clockwise in screen space), radius in px. */
interface Polar { angle: number; radius: number; }

/** Fixed layout table — quadrant index drives the cardinal angle of each spoke. */
const LAYOUT: Record<string, Polar> = {
  keystone: { angle: 0, radius: 0 },

  'approach-nw': { angle: 270, radius: 90 },
  'approach-ne': { angle: 0, radius: 90 },
  'approach-se': { angle: 90, radius: 90 },
  'approach-sw': { angle: 180, radius: 90 },

  'forge-nw': { angle: 270, radius: 165 },
  'forge-ne': { angle: 0, radius: 165 },
  'forge-se': { angle: 90, radius: 165 },
  'forge-sw': { angle: 180, radius: 165 },

  'keep-n': { angle: 270, radius: 260 },
  'keep-e': { angle: 0, radius: 260 },
  'keep-s': { angle: 90, radius: 260 },
  'keep-w': { angle: 180, radius: 260 },

  'holding-ne': { angle: 315, radius: 260 },
  'holding-se': { angle: 45, radius: 260 },
  'holding-sw': { angle: 135, radius: 260 },
  'holding-nw': { angle: 225, radius: 260 },
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

/** Build the full board SVG markup from state. Node circles carry data-node ids. */
export function renderBoard(state: GameState): string {
  const def = state.board.definition;
  const nodes = state.board.state.nodes;

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
    const fill = ns.ashed ? ASH : owner === null ? NEUTRAL : PLAYER_COLORS[owner] ?? NEUTRAL;
    const cls = `node node-${ndef.tier}${ns.ashed ? ' ashed' : ''}`;

    circles += `<g class="node-group" data-node="${id}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">`;
    circles += `<circle r="${r}" class="${cls}" fill="${fill}" />`;

    // Tier glyph / short label
    circles += `<text class="node-label" y="4">${esc(tierGlyph(ndef.tier))}</text>`;

    // Blight pips (doom-as-map) — a ladder toward ash.
    if (!ns.ashed && ns.blightLevel > 0) {
      for (let i = 0; i < BLIGHT_TO_ASH; i++) {
        const filled = i < ns.blightLevel;
        const px = -((BLIGHT_TO_ASH - 1) * 6) / 2 + i * 6;
        circles += `<circle cx="${px}" cy="${r + 8}" r="2.5" class="pip ${filled ? 'pip-on' : 'pip-off'}" />`;
      }
    }

    // Warlord present?
    const warlords = ns.pieces.filter(pc => pc.type === 'warlord');
    for (const w of warlords) {
      const crown = state.crownHolder === w.owner;
      circles += `<circle cx="0" cy="${-r - 7}" r="6" class="warlord" fill="${PLAYER_COLORS[w.owner]}" stroke="#000" />`;
      if (crown) circles += `<text x="0" y="${-r - 14}" class="crown-glyph">♛</text>`;
    }

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
