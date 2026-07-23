/**
 * Turn / round / Act visual track (T-205; round readout made unmistakable in T-308) — replaces the
 * textual `Round N/14 · Act X · Phase Y` status line with a diegetic escalation rail: a marker
 * advances along Whisper→March→Reckoning, each act visually distinct, with a labelled
 * `Round N of CAP` readout, round pips, and the current phase. Marker movement rides the
 * EXISTING M1 queue (the `act_advance` / `round_advance` / `phase_advance` Moves `diffObservable`
 * already emits, each with its own preset hold) — this component is pure, deterministic markup
 * re-rendered wholesale on `settle`, so a state change re-positions the marker for free.
 *
 * Pure presentation: it reads only the (already-public) `round` / `act` / `phase` fields of the
 * viewer's `observableState` projection (§7 D2) — no new data, no fog surface, no randomness. The
 * track carries `data-round` / `data-act` / `data-phase` as the machine-readable contract for the
 * jsdom E2E tests and the `shots:v3` script. Track text (pips, act labels, phase dots) is exempt
 * from the token-chip audit (see `tests/v3/token-chip-audit.test.ts` scope note) — it is NOT a
 * resource stat, so it deliberately carries no `data-stat` and no `.token-chip`.
 */

import { TUNABLES, type ObservableState, type Act, type GamePhase } from '../v3/index.js';

/** Local HTML-attribute escape (view.ts's `esc` is not exported; keep this module self-contained). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The three escalation acts, in order. The marker rides this rail left→right. */
const ACTS: readonly Act[] = ['WHISPER', 'MARCH', 'RECKONING'];

/** Per-act presentation: a distinct label + a distinct non-banned glyph (avoid ⚑ 🏰 🂠 ☠). */
const ACT_META: Record<Act, { label: string; glyph: string; cls: string; blurb: string }> = {
  WHISPER: { label: 'Whisper', glyph: '🕯', cls: 'act-whisper', blurb: 'The dark stirs unseen' },
  MARCH: { label: 'March', glyph: '⚔', cls: 'act-march', blurb: 'The host is on the move' },
  RECKONING: { label: 'Reckoning', glyph: '🔥', cls: 'act-reckoning', blurb: 'The heart lies bare' },
};

/** The four phases, in order — rendered as small dots with the current one lit. */
const PHASES: readonly GamePhase[] = ['THREAT', 'PLEDGE', 'ACTION', 'DAWN'];

/**
 * Render the turn track for the viewer's current state. The marker nests inside the `is-current`
 * act station, so a full re-render (the only render path) always re-positions it correctly.
 */
export function turnTrack(s: ObservableState): string {
  const curIdx = ACTS.indexOf(s.act);
  const cap = TUNABLES.ROUND_CAP;

  const stations = ACTS.map((act, i) => {
    const meta = ACT_META[act];
    const state = i < curIdx ? 'is-past' : i === curIdx ? 'is-current' : 'is-future';
    const marker = i === curIdx ? `<span class="track-marker" data-act="${act}" aria-hidden="true"></span>` : '';
    return `<div class="act-station ${meta.cls} ${state}" data-act="${act}" title="${esc(meta.blurb)}">
      <span class="act-glyph" aria-hidden="true">${meta.glyph}</span>
      <span class="act-label">${esc(meta.label)}</span>
      ${marker}
    </div>`;
  }).join('<span class="track-rail" aria-hidden="true"></span>');

  let pips = '';
  for (let r = 1; r <= cap; r++) {
    pips += `<span class="trk-pip ${r <= s.round ? 'on' : 'off'}" aria-hidden="true"></span>`;
  }

  const phaseDots = PHASES.map(ph =>
    `<span class="trk-phase-dot ${ph === s.phase ? 'on' : 'off'}" title="${esc(ph)}" aria-hidden="true"></span>`,
  ).join('');

  return `<div class="turn-track" data-round="${s.round}" data-act="${s.act}" data-phase="${s.phase}"
      title="Round ${s.round} of ${cap} · Act ${esc(s.act)} · Phase ${esc(s.phase)}">
    <div class="trk-rail-row">${stations}</div>
    <div class="trk-meta-row">
      <span class="trk-rounds">
        <span class="trk-round-label trk-round-readout">
          <span class="trk-caption">Round</span>
          <span class="trk-round-num">${s.round}</span>
          <span class="trk-round-sep">of</span>
          <span class="trk-round-cap">${cap}</span>
        </span>
        <span class="trk-pips">${pips}</span>
      </span>
      <span class="trk-phase"><span class="trk-phase-dots">${phaseDots}</span><b class="trk-phase-label">${esc(s.phase)}</b></span>
    </div>
  </div>`;
}
