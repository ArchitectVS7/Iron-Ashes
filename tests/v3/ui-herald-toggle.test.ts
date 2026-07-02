// @vitest-environment jsdom
/**
 * UI T2-3 — the Herald advanced toggle on the start screen, and the hidden verb surface.
 *
 * Drives the REAL start screen through the REAL DOM (the ui-difficulty pattern): the checkbox
 * defaults UNCHECKED (the 3-archetype default game), Begin threads the choice through
 * GameSession → createGame, and the in-game control panel shows the Herald verbs ONLY when the
 * toggle is on — a first game never sees RECRUIT / PARLEY / March-Herald at all.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { startScreen } from '../../src/ui-v3/main.js';
import { GameSession } from '../../src/ui-v3/session.js';
import { renderApp } from '../../src/ui-v3/view.js';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

/** Dispatch a real bubbling click. */
function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** Render the start screen, set the Herald checkbox, click Begin, return the live session. */
function beginWithHerald(checked: boolean): GameSession {
  let started: GameSession | null = null;
  startScreen(root, s => { started = s; });
  const box = root.querySelector<HTMLInputElement>('#herald-enabled');
  expect(box, 'a Herald (advanced) checkbox should be present on the start screen').not.toBeNull();
  box!.checked = checked;
  click(root.querySelector<HTMLElement>('#start-btn')!);
  expect(started, 'clicking Begin should start a live session').not.toBeNull();
  return started!;
}

/** Drive a session to the human's live ACTION turn (the ui-parity loop). */
function toHumanTurn(s: GameSession): GameSession {
  let guard = 0;
  while (!s.isOver && !s.isHumanTurn && guard < 60) {
    guard++;
    if (s.phase === 'THREAT') s.advanceFromThreat();
    else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
    else break;
  }
  return s;
}

describe('UI T2-3 — Herald advanced toggle (start screen → session → control surface)', () => {
  it('the checkbox defaults UNCHECKED — the default game is the 3-archetype court', () => {
    startScreen(root);
    const box = root.querySelector<HTMLInputElement>('#herald-enabled')!;
    expect(box).not.toBeNull();
    expect(box.checked).toBe(false);
  });

  it('Begin with the default (unchecked) starts a herald-OFF game', () => {
    const s = beginWithHerald(false);
    expect(s.state.heraldEnabled).toBe(false);
  });

  it('checking the box starts the ADVANCED herald-ON variant', () => {
    const s = beginWithHerald(true);
    expect(s.state.heraldEnabled).toBe(true);
  });

  it('herald OFF: no RECRUIT control even when martial + affordable (the verb surface is hidden)', () => {
    const s = toHumanTurn(new GameSession(4, 'competitive', 42, 'warlord', false));
    s.state.players[0].stance = 'martial';
    s.state.players[0].banners = 9;
    const html = renderApp(s);
    expect(html).not.toContain('data-action="recruit"');
    expect(html).not.toContain('data-action="parley"');
    expect(html).not.toContain('data-action="herald-march:');
  });

  it('herald ON: the RECRUIT control appears for the same position', () => {
    const s = toHumanTurn(new GameSession(4, 'competitive', 42, 'warlord', true));
    s.state.players[0].stance = 'martial';
    s.state.players[0].banners = 9;
    expect(renderApp(s)).toContain('data-action="recruit"');
  });
});
