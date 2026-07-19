// @vitest-environment jsdom
/**
 * T-203 — Token/chip DOM audit. Drives a full fixed-seed v3 game through the REAL DOM (the same
 * click-harness the E2E suite uses) and, at every settled frame, asserts the token-chip contract:
 *
 *   Every resource/stat node in the game root (`[data-stat]`) is a `.token-chip` or `.gauge`, it
 *   contains an inline `<svg>`, and it carries a numeric `.tc-count`. Equivalently: no resource
 *   number escapes the component (ROADMAP-V3.1-UI §M2 "zero resource values outside chips").
 *
 * SCOPE / BOUNDARY (intentional, recorded here so the audit is defensible):
 *   - IN scope: the HTML HUD resource readouts — the four house-plaque chips (land / banners / hand /
 *     court), the dark Ledger grudge, and the header dark-meters (patience gauge, strike-pool chip,
 *     heart-HP gauge), plus the action-panel actions/banners.
 *   - OUT of scope (NOT resource stats, so deliberately not chip-ified — see view.ts boundary note):
 *     player labels (P1 / Player n), Round n / Act / Phase track text (T-205's visual track),
 *     node ids, card FACE values in the hand / pledge / last-stand (cards are their own component,
 *     T-204), oath maturity countdowns, suspicion-tier glyphs, R<round> history dates, and combat
 *     margin projections inside button prose.
 *   - The BOARD `<svg>` internals (heart-HP `<text>`, blight pips) are diegetic gauges/illustrations
 *     drawn inside the board SVG, not HTML stat nodes — explicitly outside this HTML-chip audit.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function controls(): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-action]:not([disabled]),[data-node]'))
    .filter(el => el.getAttribute('data-action') !== 'new-game');
}

/** Resource glyphs the old bare-number renders used — none may survive as loose text in a stat region. */
const BANNED_GLYPHS = ['⚑', '🏰', '🂠', '☠'];

interface Audit {
  readonly seenStats: Set<string>;
  chipsSeen: number;
  violations: string[];
  /** Loose-glyph violations, scoped to the resource regions only (avoids identifier false-positives). */
  glyphViolations: string[];
}

/** Audit the current settled DOM: every chip/gauge is well-formed; no bare resource glyph leaks. */
function auditFrame(a: Audit): void {
  const chips = Array.from(root.querySelectorAll<HTMLElement>('.token-chip, .gauge'));
  for (const node of chips) {
    a.chipsSeen++;
    const stat = node.getAttribute('data-stat');
    if (stat) a.seenStats.add(stat);
    if (!node.classList.contains('token-chip') && !node.classList.contains('gauge')) {
      a.violations.push(`node missing token-chip/gauge class: ${node.outerHTML.slice(0, 80)}`);
    }
    if (node.querySelector('svg') === null) {
      a.violations.push(`chip/gauge without inline <svg> (stat=${stat}): ${node.outerHTML.slice(0, 80)}`);
    }
    const count = node.querySelector('.tc-count');
    if (count === null || !/\d/.test(count.textContent ?? '')) {
      a.violations.push(`chip/gauge without a numeric .tc-count (stat=${stat}): ${node.outerHTML.slice(0, 80)}`);
    }
  }
  // Every [data-stat] node must BE a chip/gauge (a stat rendered as a bare number would fail here).
  for (const node of Array.from(root.querySelectorAll<HTMLElement>('[data-stat]'))) {
    if (!node.classList.contains('token-chip') && !node.classList.contains('gauge')) {
      a.violations.push(`[data-stat] node is not a chip/gauge: ${node.outerHTML.slice(0, 80)}`);
    }
  }
  // Teeth: the resource regions must contain no loose resource glyph (they are all chips now).
  // Scoped tightly to the plaque chip rows, the header dark-meter/clock, and the action-panel title —
  // NOT a blanket scan (⚔/♥/🕊 legitimately mark stance/board/heart, and ☠ still marks a curse verb).
  const regions = [
    ...Array.from(root.querySelectorAll('.chips')),
    ...Array.from(root.querySelectorAll('.plaque-tags')),
    ...Array.from(root.querySelectorAll('.sk-meter')),
    ...Array.from(root.querySelectorAll('.clock')),
    ...Array.from(root.querySelectorAll('.ledger-list')),
    ...Array.from(root.querySelectorAll('.panel.action > .panel-title')),
  ];
  for (const region of regions) {
    // Strip the token-chip subtrees first — a chip's title attribute / icon must never trip the scan,
    // and the scan targets loose text nodes that a bare-number render would leave behind.
    const clone = region.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.token-chip, .gauge').forEach(n => n.remove());
    const text = clone.textContent ?? '';
    for (const glyph of BANNED_GLYPHS) {
      if (text.includes(glyph)) {
        a.glyphViolations.push(`loose "${glyph}" in ${region.className}: "${text.trim().slice(0, 60)}"`);
      }
    }
  }
}

/** Play a full game by clicking controls (copy of the E2E driver), auditing every settled frame. */
function playAndAudit(mode: 'competitive' | 'blood_pact', seed: number): { session: GameSession; audit: Audit } {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);
  const audit: Audit = { seenStats: new Set(), chipsSeen: 0, violations: [], glyphViolations: [] };

  let steps = 0;
  let lastRound = 0;
  let nonPassThisTurn = 0;

  auditFrame(audit); // initial paint

  while (!session.isOver && steps < 8000) {
    steps++;
    const s = session.state;
    if (s.round !== lastRound) { lastRound = s.round; nonPassThisTurn = 0; }

    const all = controls();
    expect(all.length, `no clickable control at round ${s.round} phase ${s.phase}`).toBeGreaterThan(0);

    const byAction = (act: string): HTMLElement | undefined =>
      all.find(el => (el.getAttribute('data-action') ?? '').startsWith(act));

    let pick: HTMLElement | undefined;
    if (session.pendingLastStand && byAction('laststand-commit')) {
      const toggle = byAction('laststand-toggle');
      pick = (steps % 2 === 0 && toggle) ? toggle : byAction('laststand-commit');
    } else if (byAction('advance-threat')) {
      pick = byAction('advance-threat');
    } else if (byAction('pledge:')) {
      pick = all.find(el => el.classList.contains('suggested')) ?? byAction('pledge:');
    } else if (session.awaitingBequest && byAction('bequest-')) {
      pick = byAction('bequest-');
    } else {
      const nonPass = all.filter(el => {
        const act = el.getAttribute('data-action') ?? '';
        if (act.startsWith('bequest-') || act.startsWith('set-wraith')) return false;
        return el.hasAttribute('data-node') || (act !== 'pass' && act !== 'accuse' && !act.startsWith('audit') && !act.startsWith('accuse'));
      });
      if (nonPassThisTurn < 2 && nonPass.length > 0) {
        pick = nonPass[steps % nonPass.length];
        nonPassThisTurn++;
      } else {
        pick = byAction('pass') ?? all[0];
      }
    }

    click(pick!);
    auditFrame(audit); // audit the DOM the click settled
  }

  return { session, audit };
}

describe('T-203 token/chip DOM audit — full fixed-seed game', () => {
  it('every resource/stat node is a chip/gauge with an inline <svg> and a numeric count', () => {
    const { session, audit } = playAndAudit('competitive', 42);

    // Non-vacuity: the run actually exercised the core plaque chips every frame (not an empty DOM).
    for (const core of ['land', 'banners', 'hand', 'court']) {
      expect(audit.seenStats.has(core), `stat "${core}" should render`).toBe(true);
    }
    expect(audit.chipsSeen, 'chips/gauges should have been rendered across the game').toBeGreaterThan(50);

    // The positive contract: no malformed chip/gauge, no bare [data-stat] number, at any frame.
    expect(audit.violations, audit.violations.slice(0, 5).join('\n')).toEqual([]);

    // Teeth: no loose resource glyph survived in the scanned stat regions across the whole game.
    expect(audit.glyphViolations, audit.glyphViolations.slice(0, 5).join('\n')).toEqual([]);

    // The game actually completed (a soft-lock would fail loudly rather than pass vacuously).
    expect(session.isOver).toBe(true);
    expect(session.state.gameEndReason).not.toBeNull();
  });

  // One full-game sim per case, each in its own `it()` so it gets its own timeout budget
  // (two back-to-back sims blew the default 5000ms under `verify`-load — see T-203 fix round 1).
  for (const [mode, seed] of [['competitive', 99], ['blood_pact', 7]] as const) {
    it(`holds over ${mode}/${seed} (the dark-meter chips + Ledger render there too)`, () => {
      const { session, audit } = playAndAudit(mode, seed);
      expect(audit.violations, audit.violations.slice(0, 5).join('\n')).toEqual([]);
      expect(audit.glyphViolations, audit.glyphViolations.slice(0, 5).join('\n')).toEqual([]);
      // The dark-meter gauges (patience) + strike-pool chip render every frame — prove they were seen.
      expect(audit.seenStats.has('patience'), `patience gauge in ${mode}/${seed}`).toBe(true);
      expect(audit.seenStats.has('strikepool'), `strike-pool chip in ${mode}/${seed}`).toBe(true);
      expect(session.isOver).toBe(true);
    }, 30000);
  }
});

// ─── Static asset guard (mirrors typography.test.ts): each IconId maps to a committed, recolorable SVG.
describe('T-203 committed icon assets', () => {
  const ROOT = process.cwd();
  const SRC = readFileSync(resolve(ROOT, 'src/ui-v3/token-chip.ts'), 'utf8');
  // Extract every `import … from './assets/icons/<name>.svg?raw'` the component declares.
  const iconNames = Array.from(SRC.matchAll(/\.\/assets\/icons\/([a-z]+)\.svg\?raw/g)).map(m => m[1]);

  it('token-chip.ts imports at least the nine resource icons', () => {
    expect(new Set(iconNames)).toEqual(
      new Set(['banner', 'holdings', 'cards', 'retinue', 'skull', 'hourglass', 'embers', 'heart', 'action']),
    );
  });

  it('each imported icon is a committed, non-empty, recolorable inline SVG', () => {
    for (const name of iconNames) {
      const path = resolve(ROOT, 'src/ui-v3/assets/icons', `${name}.svg`);
      expect(statSync(path).size, `${name}.svg size`).toBeGreaterThan(0);
      const svg = readFileSync(path, 'utf8');
      expect(svg.trimStart().startsWith('<svg'), `${name}.svg starts with <svg`).toBe(true);
      expect(svg, `${name}.svg is recolorable (currentColor)`).toContain('currentColor');
      // The opaque black background rect must have been stripped (else the chip renders as a block).
      expect(svg, `${name}.svg has no leftover background rect`).not.toContain('M0 0h512v512H0z');
    }
  });
});
