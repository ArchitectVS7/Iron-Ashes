/**
 * Data-driven card-face generator (T-204) — piece / token / power-card data → a rich TCG-style SVG
 * card face (frame + name banner + art area + rules text + corner-indexed value & suit). Every card
 * rendered anywhere in the v3 UI is built through THIS module only, so swapping art or the frame pack
 * never touches layout code (view.ts / board-view.ts). The frame is a committed CC0 asset imported
 * `?raw` (see docs/CREDITS.md); the suit glyphs reuse the committed game-icons.net set (token-chip.ts).
 *
 * FOG DISCIPLINE (§7 D2 / §13 P0-12): the token-face path takes a PRE-FOGGED input whose type makes a
 * hidden payload unrepresentable on a face-DOWN token — a back face may carry ONLY its `sigil`
 * (`bright` | `dark`), never kind / name / archetype. The engine never hands raw `HiddenToken`s here;
 * unflipped content cannot reach the DOM at any frame. Power cards are the human's OWN hand, fully
 * observable to the viewer, so there is no fog concern on that path.
 *
 * DETERMINISM: pure, string-returning, no animation, and — critically — NO randomness. The ornamental
 * art motif is a pure function of the face's identity string (an FNV-1a hash), so identical input
 * yields byte-identical output. No `Math.random`, no `Date.now`, no `SeededRandom` (none is needed).
 */

import cardFrameSvg from './assets/frames/card-frame.svg?raw';
import { ICONS, type IconId } from './token-chip.js';
import type { Archetype } from '../v3/index.js';

/** Local HTML/SVG-attribute escape (keep this module self-contained, mirroring token-chip.ts). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A face kind: the built-in power card, a court archetype, or any registry-extensible string key. */
export type FaceKind = 'power' | Archetype | string;

/** Presentation metadata for a face kind — the only thing a NEW piece type must register. */
export interface FaceMeta {
  /** Human-readable default name (a piece's own `name` overrides this per-card). */
  readonly displayName: string;
  /** The corner + art suit glyph (reuses the committed token-chip icon set). */
  readonly suit: IconId;
  /** Rules-text line rendered in the bottom plate (archetype passive / power-card flavor). */
  readonly rules: string;
  /** Optional accent colour (any CSS colour, e.g. `var(--house-emberfall)`) tinting the frame ring. */
  readonly accent?: string;
}

/** A valid fallback so an UNKNOWN / not-yet-registered kind still yields a complete, valid face. */
const DEFAULT_META: FaceMeta = {
  displayName: 'Card',
  suit: 'cards',
  rules: 'A piece of the realm.',
};

// The kind registry. Seeded below with the real v3 kinds; `registerFaceKind` extends it so a brand
// new piece type needs ZERO layout-file edits — only a registration call (see the T-204 unit test).
const REGISTRY = new Map<string, FaceMeta>();

/** Register (or override) the presentation metadata for a face kind. */
export function registerFaceKind(key: string, meta: FaceMeta): void {
  REGISTRY.set(key, meta);
}

/** Look up a kind's metadata, falling back to a valid default for any unregistered key. */
export function getFaceMeta(key: string): FaceMeta {
  return REGISTRY.get(key) ?? DEFAULT_META;
}

// ── Seed the registry with the shipped v3 kinds ─────────────────────────────
registerFaceKind('power', {
  displayName: 'Muster Card',
  suit: 'embers',
  rules: 'Pledge it to hold back the dark, or spend its strength in the fray.',
  accent: 'var(--accent, #a8874f)',
});
registerFaceKind('warlord', {
  displayName: 'Warlord',
  suit: 'banner',
  rules: 'Your leader. It falls only when its last stronghold breaks — and its fall is yours.',
  accent: 'var(--house-emberfall, #c15f2c)',
});
registerFaceKind('marshal', {
  displayName: 'Marshal',
  suit: 'retinue',
  rules: 'The muscle. High combat; may declare a Last Stand to hold a falling keep.',
  accent: 'var(--house-greyspear, #8a93a3)',
});
registerFaceKind('steward', {
  displayName: 'Steward',
  suit: 'holdings',
  rules: 'The economy. Low combat; adds Banners at its node each Dawn.',
  accent: 'var(--house-ravenholt, #2f7d5b)',
});
registerFaceKind('herald', {
  displayName: 'Herald',
  suit: 'cards',
  rules: 'The political reach. Grants hand; may Parley to push back the dark; never fights.',
  accent: 'var(--house-duskmere, #7a6aa0)',
});

// ── Geometry (a 100×140 TCG-proportioned viewBox — a single source of truth for every region) ──
const VB_W = 100;
const VB_H = 140;
const CX = VB_W / 2;
const CY = VB_H / 2;

/** FNV-1a hash → the ornament is a pure function of the face identity (no RNG, fully deterministic). */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Place a committed icon SVG (its own 512-viewBox) into a positioned, sized nested `<svg>` window. */
function iconAt(suit: IconId, x: number, y: number, size: number, cls: string): string {
  return `<svg class="${cls}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 512 512" overflow="visible">${ICONS[suit]}</svg>`;
}

/**
 * The generated-ornamental art motif (placeholder until bespoke art exists) — a deterministic
 * guilloché rosette keyed off the identity hash, with the enlarged suit glyph on top. Pure vector,
 * no randomness: `hash` alone picks petal count and rotation.
 */
function artMotif(suit: IconId, hash: number): string {
  const petals = 6 + (hash % 5); // 6..10 petals — a stable choice per identity
  const rot = hash % 30; // 0..29° base rotation
  const artCx = CX;
  const artCy = 55; // centre of the art window (y 26.5..84.5)
  const rings: string[] = [];
  for (let ring = 0; ring < 2; ring++) {
    const rad = 15 - ring * 5;
    const pts: string[] = [];
    for (let i = 0; i < petals; i++) {
      const a = ((i / petals) * 360 + rot + ring * 12) * (Math.PI / 180);
      pts.push(
        `${(artCx + Math.cos(a) * rad).toFixed(2)},${(artCy + Math.sin(a) * rad).toFixed(2)}`,
      );
    }
    rings.push(
      `<polygon class="cf-rosette" points="${pts.join(' ')}" fill="none" stroke="#a8874f" stroke-width="${(0.5 - ring * 0.15).toFixed(2)}" opacity="${(0.35 - ring * 0.1).toFixed(2)}"/>`,
    );
  }
  return (
    `<g class="cf-art" aria-hidden="true">` +
    `<circle cx="${artCx}" cy="${artCy}" r="17" fill="#0f0b14" opacity="0.55"/>` +
    rings.join('') +
    iconAt(suit, artCx - 14, artCy - 14, 28, 'cf-art-icon') +
    `</g>`
  );
}

/** Word-wrap the rules line into lines inside the bottom plate (SVG text does not auto-wrap). */
function rulesText(rules: string, maxChars: number, maxLines: number): string {
  const words = rules.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let wi = 0;
  for (; wi < words.length; wi++) {
    const w = words[wi];
    if (cur.length === 0) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w;
    else {
      if (lines.length === maxLines - 1) break; // this line would be the last — stop, ellipsize below
      lines.push(cur);
      cur = w;
    }
  }
  const consumedAll = wi >= words.length;
  if (cur.length > 0 && lines.length < maxLines) lines.push(cur);
  if (!consumedAll && lines.length > 0) {
    // Content overflowed the line budget — mark the final line with an ellipsis.
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last) + '…';
  }
  const startY = 96;
  const lh = 6.2;
  return lines
    .map(
      (ln, i) =>
        `<text class="cf-rules" x="${CX}" y="${(startY + i * lh).toFixed(1)}" text-anchor="middle">${esc(ln)}</text>`,
    )
    .join('');
}

/** A corner index group (value over a small suit glyph). `rotate` renders the bottom-right mirror. */
function cornerIndex(value: string, suit: IconId, corner: 'tl' | 'br'): string {
  const inner =
    `<text class="cf-corner-val" x="11" y="16.5" text-anchor="middle">${esc(value)}</text>` +
    iconAt(suit, 7.5, 17.5, 7, 'cf-corner-suit');
  const transform = corner === 'br' ? ` transform="rotate(180 ${CX} ${CY})"` : '';
  return `<g class="cf-corner cf-corner-${corner}" data-corner="${corner}"${transform}>${inner}</g>`;
}

/** Full spec for the generator. */
export interface CardFaceSpec {
  /** The face kind (`'power'`, an archetype, or a registered custom key). */
  readonly kind: FaceKind;
  /** The corner-indexed value: a power number, a piece's power, or any short string. */
  readonly value: number | string;
  /** Overrides the kind's `displayName` (piece names are state, §2). */
  readonly name?: string;
  /** A small line under the name (identity flavor, `@node`, etc.). */
  readonly subtitle?: string;
  /** Extra class(es) on the root `<svg>` (house tint, `selected`, …). */
  readonly cls?: string;
  /** Override the rules line (else the kind's registered rules). */
  readonly rules?: string;
}

/**
 * The generator. Returns a self-contained `<svg class="card-face">` string: frame + name banner +
 * ornamental art + rules text + TWO corner indices (top-left upright, bottom-right rotated) so a
 * fanned/overlapped card stays readable from its top-left corner without being raised (Gate 0.5).
 */
export function cardFace(spec: CardFaceSpec): string {
  const meta = getFaceMeta(spec.kind);
  const name = spec.name ?? meta.displayName;
  const value = String(spec.value);
  const rules = spec.rules ?? meta.rules;
  const hash = hashStr(`${spec.kind}|${name}|${value}`);
  const cls = spec.cls ? ` ${esc(spec.cls)}` : '';
  const accentRing = meta.accent
    ? `<rect class="cf-accent" x="5.4" y="5.4" width="89.2" height="129.2" rx="5.5" fill="none" style="stroke:${esc(meta.accent)}" stroke-width="0.9" opacity="0.55"/>`
    : '';
  const subtitle = spec.subtitle
    ? `<text class="cf-subtitle" x="${CX}" y="81" text-anchor="middle">${esc(spec.subtitle)}</text>`
    : '';

  return (
    `<svg class="card-face${cls}" data-face-kind="${esc(String(spec.kind))}" viewBox="0 0 ${VB_W} ${VB_H}" ` +
    `role="img" aria-label="${esc(name)} — value ${esc(value)}" xmlns="http://www.w3.org/2000/svg">` +
    `<g class="cf-frame">${cardFrameSvg}</g>` +
    accentRing +
    `<text class="cf-name" x="${CX}" y="19.5" text-anchor="middle">${esc(name)}</text>` +
    artMotif(meta.suit, hash) +
    subtitle +
    rulesText(rules, 34, 5) +
    cornerIndex(value, meta.suit, 'tl') +
    cornerIndex(value, meta.suit, 'br') +
    `</svg>`
  );
}

// ── Convenience wrappers (the callers use these) ────────────────────────────

/** A power (hand/pledge) card — a numeric muster value 1..4. */
export function powerCardFace(value: number, opts?: { readonly cls?: string }): string {
  return cardFace({ kind: 'power', value, cls: opts?.cls });
}

/** A court piece face — archetype frame, the piece's own name, its power as the corner value. */
export function pieceFace(piece: {
  readonly archetype: Archetype;
  readonly name: string;
  readonly power?: number;
  readonly identity?: string;
  readonly cls?: string;
}): string {
  return cardFace({
    kind: piece.archetype,
    value: piece.power ?? getFaceMeta(piece.archetype).displayName.charAt(0),
    name: piece.name,
    subtitle: piece.identity,
    cls: piece.cls,
  });
}

/**
 * FOG-SAFE Discovery-token face. The union makes it a COMPILE-TIME error to pass hidden content on a
 * face-DOWN token: `flipped: false` admits ONLY the observable `sigil`. A flipped token may show its
 * resolved kind/name/archetype (it is public once revealed).
 */
export type TokenFaceInput =
  | { readonly flipped: false; readonly sigil: 'bright' | 'dark' }
  | {
      readonly flipped: true;
      readonly kind: string;
      readonly name?: string;
      readonly archetype?: Archetype | null;
    };

/** Render a Discovery token as a card face — a sigil back while face-down, a full face once flipped. */
export function tokenFace(input: TokenFaceInput): string {
  if (!input.flipped) {
    // BACK: sigil ONLY — no kind, no name, no archetype reaches the DOM (§7 D2 / §13 P0-12).
    const rune = input.sigil === 'bright' ? '✦' : '❉';
    return (
      `<svg class="card-face cf-token-back cf-sigil-${input.sigil}" data-face-kind="token-back" ` +
      `data-sigil="${input.sigil}" viewBox="0 0 ${VB_W} ${VB_H}" role="img" ` +
      `aria-label="face-down token" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="1.25" y="1.25" width="97.5" height="137.5" rx="8.5" fill="#241d22"/>` +
      `<rect x="5" y="5" width="90" height="130" rx="6" fill="#17121b"/>` +
      `<rect x="7.5" y="7.5" width="85" height="125" rx="5" fill="none" stroke="#a8874f" stroke-width="0.6" opacity="0.6"/>` +
      `<circle class="cf-sigil-ring" cx="${CX}" cy="${CY}" r="26" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>` +
      `<text class="cf-sigil-mark" x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="30" fill="currentColor">${rune}</text>` +
      `</svg>`
    );
  }
  const meta = getFaceMeta(input.kind);
  return cardFace({
    kind: input.kind,
    value: meta.displayName.charAt(0),
    name: input.name ?? meta.displayName,
    subtitle: input.archetype ? `discovered ${input.archetype}` : undefined,
    cls: 'cf-token-front',
  });
}
