// @vitest-environment jsdom
/**
 * Start-screen title treatment (T-211) — a title screen ON the wood table: Cinzel/ember title, the
 * setup form as a parchment plaque, and NO default-styled (UA-chromed) controls. jsdom does not apply
 * the stylesheet or compute `appearance` (the real computed audit lives in `npm run shots:v3` via
 * auditControls), so this is a CSS-text + DOM-structure guard — the same pattern as
 * tests/v3/typography.test.ts and tests/v3/hud-dissolution.test.ts. It keeps the deliverable enforced
 * by the standard `npm run verify` suite even when the browser gate is not run, and locks the control
 * ids the ui-difficulty / ui-herald-toggle tests and scripts/shots-v3.mjs depend on.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startScreen } from '../../src/ui-v3/main.js';

const CSS = readFileSync(resolve(process.cwd(), 'src/ui-v3/ui-v3.css'), 'utf8');

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

describe('T-211 start-screen structure — title + plaque + real controls', () => {
  it('renders the .start container with an <h1> title and the parchment .start-form plaque', () => {
    startScreen(root);
    const start = root.querySelector('.start');
    expect(start, 'the .start container (shots + waitForSelector depend on it)').not.toBeNull();
    expect(root.querySelector('.start h1'), 'a Cinzel <h1> title').not.toBeNull();
    expect(root.querySelector('.start-form'), 'the setup form plaque').not.toBeNull();
  });

  it('keeps every real setup control with its load-bearing id', () => {
    startScreen(root);
    for (const [sel, kind] of [
      ['#player-count', 'select'],
      ['#mode', 'select'],
      ['#difficulty', 'select'],
      ['#seed', 'input'],
      ['#herald-enabled', 'input'],
      ['#start-btn', 'button'],
    ] as const) {
      const el = root.querySelector(sel);
      expect(el, `${sel} must exist`).not.toBeNull();
      expect(el!.tagName.toLowerCase(), `${sel} is a real <${kind}>`).toBe(kind);
    }
    // The Herald checkbox stays a real checkbox input (not replaced by a div).
    expect(root.querySelector<HTMLInputElement>('#herald-enabled')!.type).toBe('checkbox');
    // The difficulty hint node + notes survive the restructure.
    expect(root.querySelector('#difficulty-hint')).not.toBeNull();
  });
});

describe('T-211 start-screen styling contract (CSS text guard)', () => {
  it('the start screen sits on the wood table (reuses table-texture.svg)', () => {
    // The .start rule (or its table wrapper) carries the committed CC0 wood texture — not the void.
    const startBlock = CSS.match(/\.start\s*\{[^}]*\}/s);
    expect(startBlock, '.start rule block').not.toBeNull();
    expect(startBlock![0], '.start must reference the wood texture').toMatch(
      /table-texture\.svg/,
    );
  });

  it('the setup controls strip all default UA chrome (appearance: none on select + input)', () => {
    // The select/input rule must zero the appearance keyword (all-vendor) so no UA widget shows.
    const controlRule = CSS.match(/\.start-form select,\s*\.start-form input\s*\{[^}]*\}/s);
    expect(controlRule, '.start-form select/input rule block').not.toBeNull();
    expect(controlRule![0]).toMatch(/(^|[^-])appearance:\s*none/);
    expect(controlRule![0]).toMatch(/-webkit-appearance:\s*none/);
    expect(controlRule![0]).toMatch(/-moz-appearance:\s*none/);
    // The Herald checkbox is likewise stripped.
    expect(CSS).toMatch(/\.check input\[type='checkbox'\]\s*\{[^}]*appearance:\s*none/s);
    // The number spinners are removed.
    expect(CSS).toMatch(/-webkit-(?:inner|outer)-spin-button/);
  });

  it('draws custom caret + checkbox affordances in CSS (no reliance on UA glyphs)', () => {
    // Custom dropdown caret and a custom ember tick both exist in the stylesheet.
    expect(CSS, 'custom dropdown caret').toMatch(/\.select-wrap::after\s*\{/);
    expect(CSS, 'custom checkbox tick').toMatch(/#herald-enabled:checked \+ \.check-box::after\s*\{/);
  });
});
