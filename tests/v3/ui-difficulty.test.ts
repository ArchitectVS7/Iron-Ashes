// @vitest-environment jsdom
/**
 * UI difficulty-selector tests (Stage D2) — drive the REAL new-game start screen through the REAL
 * DOM. These render `startScreen` into a jsdom document, pick a difficulty in the actual <select>,
 * click the actual Begin button, and assert the resulting live GameSession started at that tier —
 * exercising the exact form → session → createGame chain a human triggers (no engine shortcut).
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { startScreen } from '../../src/ui-v3/main.js';
import type { GameSession } from '../../src/ui-v3/session.js';
import type { Difficulty } from '../../src/v3/index.js';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

/** Dispatch a real bubbling click. */
function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/**
 * Render the start screen, select `difficulty` in the real <select>, click Begin, and return the
 * live session the DOM chain produced.
 */
function beginAt(difficulty: Difficulty, seed = 42): GameSession {
  let started: GameSession | null = null;
  startScreen(root, s => { started = s; });

  const sel = root.querySelector<HTMLSelectElement>('#difficulty');
  expect(sel, 'a difficulty <select> should be present on the start screen').not.toBeNull();
  sel!.value = difficulty;
  sel!.dispatchEvent(new window.Event('change', { bubbles: true }));

  (root.querySelector<HTMLInputElement>('#seed'))!.value = String(seed);

  const begin = root.querySelector<HTMLElement>('#start-btn');
  expect(begin, 'a Begin button should be present').not.toBeNull();
  click(begin!);

  expect(started, 'clicking Begin should start a live session').not.toBeNull();
  return started!;
}

describe('UI D2 — difficulty selector starts a game at the chosen tier', () => {
  it('offers all three tiers, defaulting to warlord (Hard)', () => {
    startScreen(root);
    const sel = root.querySelector<HTMLSelectElement>('#difficulty')!;
    const values = Array.from(sel.options).map(o => o.value);
    expect(values).toEqual(['warlord', 'knight', 'squire']);
    expect(sel.value).toBe('warlord');
  });

  it('shows a "how hard is the dark" hint that updates with the selection', () => {
    startScreen(root);
    const sel = root.querySelector<HTMLSelectElement>('#difficulty')!;
    const hint = root.querySelector<HTMLElement>('#difficulty-hint')!;
    expect(hint.textContent).toMatch(/dark strength/i);
    const before = hint.textContent;
    sel.value = 'squire';
    sel.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(hint.textContent).not.toBe(before);
    expect(hint.textContent).toMatch(/squire|easy|weakest/i);
  });

  it.each<Difficulty>(['warlord', 'knight', 'squire'])(
    'selecting %s starts a session AND createGame stores that tier on the state',
    difficulty => {
      const session = beginAt(difficulty);
      expect(session.difficulty).toBe(difficulty);
      expect(session.state.difficulty).toBe(difficulty);
      // The view mounted over the same root — the start form is gone.
      expect(root.querySelector('#start-btn')).toBeNull();
    },
  );

  it('the default (Begin without touching the selector) is warlord — byte-identical tier', () => {
    let started: GameSession | null = null;
    startScreen(root, s => { started = s; });
    click(root.querySelector<HTMLElement>('#start-btn')!);
    expect(started!.difficulty).toBe('warlord');
    expect(started!.state.difficulty).toBe('warlord');
  });
});
