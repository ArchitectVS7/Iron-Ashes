/**
 * Player-orientation affordance (T-311) — the board-EDGE cue that answers the three questions a
 * first-time viewer cannot otherwise read off the board: (a) what is the TURN ORDER / whose turn,
 * (b) HOW to take a move, and (c) WHICH house is mine.
 *
 * Rendered as a single board-EDGE ribbon in the top header (rubric #8 — HUD-diegetic, never a
 * persistent web panel; it is neither bottom-anchored nor named `*panel*`, so `auditNoBottomBar`
 * cannot match it). Two rows:
 *   • `.orient-seats` — the seat order from `s.turnOrder`, one chip per seat, the acting seat lit
 *     (during ACTION) and the viewer's own seat badged "you".
 *   • `.orient-prompt` — an always-visible plain-language "what to do now" line keyed off `s.phase`.
 *
 * Pure presentation: it reads only the (already-public) `turnOrder` / `activePlayerIndex` / `phase`
 * / `players[i].isEliminated` fields of the viewer's `observableState` projection. Turn order is
 * public information (a fixed permutation set at setup, §7 D2 leaks nothing), so surfacing it does
 * NOT violate the fog. No new data, no randomness, no `Date.now`. It carries NO `data-stat` and is
 * OUT of every token-chip audit scope region — the whose-turn / seat-order / move cues are OWNED
 * here, so M4 T-404 (the mechanic-visibility map) references them rather than re-inventing them.
 */

import { PLAYER_COLORS, HOUSES, houseSigilSvg } from './board-view.js';
import type { ObservableState } from '../v3/index.js';

/** Local HTML-attribute escape (view.ts's `esc` is not exported; keep this module self-contained). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The always-visible "what to do now" line — honest and fog-safe, one string per situation. */
function promptText(s: ObservableState, humanIndex: number, isHumanTurn: boolean): string {
  switch (s.phase) {
    case 'ACTION':
      if (isHumanTurn) {
        return 'Your turn — click a glowing node to March your Warlord, or pick a command below.';
      }
      if (s.activePlayerIndex === humanIndex) {
        // The human's ACTION slot but no live actions left (rare) — still their seat, not a rival's.
        return 'Your turn is ending — no actions remain.';
      }
      return `House ${HOUSES[s.activePlayerIndex]?.name ?? `P${s.activePlayerIndex + 1}`} is acting…`;
    case 'PLEDGE':
      return 'Pledge phase — every house commits cards below to hold back the strike.';
    case 'THREAT':
      return 'The dark gathers — advance when you are ready to face the threat.';
    case 'DAWN':
      return 'Dawn — the realm settles before the next round.';
    default:
      return '';
  }
}

/**
 * Render the orientation ribbon for the viewer's current state. Deterministic markup — a full
 * re-render (the only render path) always reflects the live seat order + active seat.
 */
export function orientationBar(s: ObservableState, humanIndex: number, isHumanTurn: boolean): string {
  const inAction = s.phase === 'ACTION';

  const chips = s.turnOrder.map((seat, i) => {
    const color = PLAYER_COLORS[seat] ?? '#888';
    const name = HOUSES[seat]?.name ?? `P${seat + 1}`;
    const isYou = seat === humanIndex;
    const isActing = inAction && seat === s.activePlayerIndex;
    const isOut = s.players[seat]?.isEliminated ?? false;
    const cls =
      `orient-seat${isYou ? ' is-you' : ''}${isActing ? ' is-acting' : ''}${isOut ? ' is-out' : ''}`;
    // "you" is plain text — never one of the banned resource glyphs (⚑ 🏰 🂠 ☠).
    const youBadge = isYou ? '<span class="orient-you">you</span>' : '';
    return `<span class="${cls}" data-seat="${seat}" title="${esc(name)}${isYou ? ' (you)' : ''} — turn ${i + 1} of ${s.turnOrder.length}">
      <span class="orient-ord" aria-hidden="true">${i + 1}</span>
      ${houseSigilSvg(seat, 16, color)}
      <span class="orient-house">${esc(name)}</span>
      ${youBadge}
    </span>`;
  }).join('<span class="orient-arrow" aria-hidden="true">›</span>');

  const prompt = promptText(s, humanIndex, isHumanTurn);

  return `<div class="orientation" data-active-seat="${s.activePlayerIndex}">
    <div class="orient-seats" aria-label="turn order">${chips}</div>
    <div class="orient-prompt" data-phase="${s.phase}">${esc(prompt)}</div>
  </div>`;
}
