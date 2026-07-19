/**
 * HUD dissolution (T-210) — the full-width bottom tray is gone; the phase controls ride the board as
 * a compact COMMAND PLAQUE and events surface in a slim CHRONICLE strip, with ZERO loss of the
 * control surface. jsdom has no layout engine, so full-width geometry stays a `shots:v3` assertion
 * (auditNoBottomBar / auditElectionUnclipped) — here we assert the DOM structure the fix depends on.
 */

import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/ui-v3/session.js';
import { renderApp } from '../../src/ui-v3/view.js';

/** Drive a fresh game to the human's live ACTION turn (where the command plaque renders its verbs). */
function humanTurn(seed = 42): GameSession {
  const s = new GameSession(4, 'competitive', seed, 'warlord', false);
  let guard = 0;
  while (!s.isOver && !s.isHumanTurn && guard < 60) {
    guard++;
    if (s.phase === 'THREAT') s.advanceFromThreat();
    else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
    else break;
  }
  return s;
}

describe('T-210 HUD dissolution — command plaque + chronicle, no bottom tray', () => {
  it('renders the board-anchored command plaque and chronicle, not the old hud-tray', () => {
    const s = humanTurn();
    const html = renderApp(s);
    expect(html).toContain('class="command-plaque"');
    expect(html).toContain('class="chronicle"');
    // The full-width bottom tray is retired.
    expect(html).not.toContain('hud-tray');
  });

  it('End turn is a diegetic wax seal but keeps its data-action="pass" wiring', () => {
    const s = humanTurn();
    expect(s.isHumanTurn).toBe(true);
    const html = renderApp(s);
    expect(html).toContain('data-action="pass"');
    expect(html).toContain('end-turn wax-seal');
  });

  it('the march-cost <li> nodes stay in the DOM (board-attached March legibility preserved)', () => {
    const s = humanTurn();
    const html = renderApp(s);
    expect(html).toContain('class="adj-costs"');
    expect(html).toMatch(/<ul class="adj-costs"><li>/);
  });
});
