/**
 * Token chip + gauge components (T-203) — every resource/stat renders as an icon-SVG + count chip
 * (or a gauge), never a bare number in a table (ROADMAP-V3.1-UI §M2). The icons are committed
 * game-icons.net SVGs (CC-BY 3.0, recolored to `currentColor`; see docs/CREDITS.md), imported raw
 * so their markup is inlined as a real `<svg>` in the DOM — which the T-203 DOM-audit enforces.
 *
 * Pure presentation: these render values already present in the viewer's `observableState`
 * projection (§7 D2) — they re-skin existing numbers and introduce no new data, so there is no fog
 * leak. No animation, no randomness — plain deterministic markup on the existing single render path.
 */

import bannerSvg from './assets/icons/banner.svg?raw';
import holdingsSvg from './assets/icons/holdings.svg?raw';
import cardsSvg from './assets/icons/cards.svg?raw';
import retinueSvg from './assets/icons/retinue.svg?raw';
import skullSvg from './assets/icons/skull.svg?raw';
import hourglassSvg from './assets/icons/hourglass.svg?raw';
import embersSvg from './assets/icons/embers.svg?raw';
import heartSvg from './assets/icons/heart.svg?raw';
import actionSvg from './assets/icons/action.svg?raw';

export type IconId =
  | 'banner'
  | 'holdings'
  | 'cards'
  | 'retinue'
  | 'skull'
  | 'hourglass'
  | 'embers'
  | 'heart'
  | 'action';

/** The committed icon set — one inline SVG per resource/stat glyph. */
export const ICONS: Record<IconId, string> = {
  banner: bannerSvg,
  holdings: holdingsSvg,
  cards: cardsSvg,
  retinue: retinueSvg,
  skull: skullSvg,
  hourglass: hourglassSvg,
  embers: embersSvg,
  heart: heartSvg,
  action: actionSvg,
};

/** Local HTML-attribute escape (view.ts's `esc` is not exported; keep this module self-contained). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface ChipOpts {
  /** Machine-readable stat name — the audit keys on `data-stat`; also the DOM contract for tests. */
  readonly stat: string;
  /** Optional hover title (human-readable description of the resource). */
  readonly title?: string;
  /** Extra class(es) appended to the chip (e.g. a house/danger modifier). */
  readonly cls?: string;
}

/**
 * A resource/stat chip: an inline icon SVG + a numeric count. Every resource readout in the HUD
 * routes through this (or `gauge`), so the audit can prove no bare number escapes the component.
 */
export function tokenChip(icon: IconId, count: number | string, opts: ChipOpts): string {
  const title = opts.title ? ` title="${esc(opts.title)}"` : '';
  const cls = opts.cls ? ` ${opts.cls}` : '';
  return (
    `<span class="token-chip${cls}" data-stat="${esc(opts.stat)}"${title}>` +
    `<span class="tc-icon">${ICONS[icon]}</span>` +
    `<span class="tc-count">${esc(String(count))}</span>` +
    `</span>`
  );
}

/**
 * A bounded gauge: an inline icon SVG + a filled track + a `value/max` count. Used for the dark's
 * patience clock and the dark-heart HP — a resource with a known ceiling reads better as a bar.
 */
export function gauge(icon: IconId, value: number, max: number, opts: ChipOpts): string {
  const title = opts.title ? ` title="${esc(opts.title)}"` : '';
  const cls = opts.cls ? ` ${opts.cls}` : '';
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    `<span class="gauge${cls}" data-stat="${esc(opts.stat)}"${title}>` +
    `<span class="tc-icon">${ICONS[icon]}</span>` +
    `<span class="gauge-track"><span class="gauge-fill" style="width:${pct.toFixed(1)}%"></span></span>` +
    `<span class="tc-count">${esc(String(value))}/${esc(String(max))}</span>` +
    `</span>`
  );
}
