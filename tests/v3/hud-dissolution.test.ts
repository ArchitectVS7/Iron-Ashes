/**
 * HUD dissolution (T-210) — the full-width bottom tray is gone; the phase controls ride the board as
 * a compact COMMAND PLAQUE and events surface in a slim CHRONICLE strip, with ZERO loss of the
 * control surface. jsdom has no layout engine, so full-width geometry stays a `shots:v3` assertion
 * (auditNoBottomBar / auditElectionUnclipped) — here we assert the DOM structure the fix depends on.
 */

import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/ui-v3/session.js';
import { renderApp } from '../../src/ui-v3/view.js';
import { renderBoard, renderMapKey } from '../../src/ui-v3/board-view.js';

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

describe('fifth-review FULL dissolution — both side rails become board-edge overlays', () => {
  it('retires the persistent left/right status COLUMNS (hud-realm / hud-houses)', () => {
    const html = renderApp(humanTurn());
    expect(html).not.toContain('hud-realm');
    expect(html).not.toContain('hud-houses');
    expect(html).not.toContain('class="hud ');
  });

  it('floats the realm + house plaques and the hand as board-region edge overlays', () => {
    const html = renderApp(humanTurn());
    expect(html).toContain('class="edge-cluster edge-realm"');
    expect(html).toContain('class="edge-cluster edge-houses"');
    expect(html).toContain('class="hand-dock"');
  });

  it('keeps zero information loss — every dissolved block still renders exactly once', () => {
    // A 4p Blood-Pact game exercises the reference blocks (suspicion/audits) too.
    const s = new GameSession(4, 'blood_pact', 7, 'warlord', false);
    let guard = 0;
    while (!s.isOver && !s.isHumanTurn && guard < 80) {
      guard++;
      if (s.phase === 'THREAT') s.advanceFromThreat();
      else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
      else break;
    }
    const html = renderApp(s);
    // The load-bearing block stays open; the reference blocks stay present (collapsed via CSS only).
    for (const marker of ['Your Court', 'The Warlords']) {
      expect(html.split(marker).length - 1, `${marker} rendered once`).toBe(1);
    }
    // The four house plaques + the human's hand fan are all in the DOM.
    expect(html.split('house-plaque').length - 1).toBeGreaterThanOrEqual(4);
    expect(html).toContain('hand-fan');
  });
});

describe('sixth review — the MAP KEY lives OFF the board and collapses', () => {
  it('is not drawn inside the board SVG (the board export is pure board)', () => {
    const s = humanTurn();
    const board = renderBoard(s.observable());
    expect(board).not.toContain('map-key');
    expect(board).not.toContain('legend-label');
  });

  it('renders once as a collapsible <details> inside the left edge cluster', () => {
    const html = renderApp(humanTurn());
    expect(html.split('<details class="map-key">').length - 1).toBe(1);
    // Closed by default — no `open` attribute — with a clickable summary as the only visible part.
    expect(html).not.toMatch(/<details class="map-key"[^>]*open/);
    expect(html).toContain('<summary>Map Key</summary>');
    // It sits in the realm edge cluster (the left gutter), before that cluster closes.
    const cluster = html.slice(html.indexOf('class="edge-cluster edge-realm"'));
    expect(cluster.indexOf('<details class="map-key">')).toBeLessThan(cluster.indexOf('edge-houses'));
  });

  it('still explains every place tier with the real board silhouettes', () => {
    const key = renderMapKey();
    for (const tier of ['keystone', 'keep', 'mid', 'forge', 'holding', 'approach']) {
      expect(key, `${tier} keyed`).toContain(`loc loc-${tier}`);
    }
  });
});
