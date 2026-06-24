/**
 * UI parity tests (Phase 6a) — every player action has a CONTROL SURFACE and the
 * full game state is DISPLAYED, and every control's command is ACCEPTED by the reducer.
 *
 * Two layers, both pure (no DOM):
 *   1. renderApp(session) is a pure string builder — assert the data-action control
 *      appears whenever its action is legal, and the state panels render.
 *   2. session.humanAction routes through applyCommand — assert each new verb is
 *      accepted (no lastError) and mutates state as expected (the wiring works).
 * (v1's frontend was entirely broken; this is the "it actually works" gate.)
 */

import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/ui-v2/session.js';
import { renderApp } from '../../src/ui-v2/view.js';
import { getTunables } from '../../src/v2/tunables.js';
import type { Oath } from '../../src/v2/types.js';

/** Drive a fresh game to the human's ACTION turn (where the control panel renders). */
function humanTurn(mode: 'competitive' | 'blood_pact', seed = 42): GameSession {
  const s = new GameSession(4, mode, seed);
  let guard = 0;
  while (!s.isOver && !s.isHumanTurn && guard < 50) {
    guard++;
    if (s.phase === 'THREAT') s.advanceFromThreat();
    else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
    else break;
  }
  return s;
}

describe('UI parity — control surface for every action', () => {
  it('Recruit a Herald: shown when martial + affordable', () => {
    const s = humanTurn('competitive');
    s.state.players[0].stance = 'martial';
    s.state.players[0].banners = 9;
    expect(renderApp(s)).toContain('data-action="recruit"');
  });

  it('March Herald + Parley: shown when the human holds a Herald at a blighted front', () => {
    const s = humanTurn('competitive');
    const h = s.state.players[0];
    const here = h.warlordNodeId;
    h.stance = 'political';
    h.heraldNodeId = here;
    s.state.board.state.nodes[here].blightLevel = 2; // a front on the Herald's node
    s.state.board.state.nodes[here].ashed = false;
    const html = renderApp(s);
    expect(html).toContain('data-action="herald-march:');
    expect(html).toContain('data-action="parley"');
  });

  it('Swear Oath: shown for an oath-free, unbroken rival', () => {
    const s = humanTurn('competitive');
    expect(renderApp(s)).toContain('data-action="swear:1"');
  });

  it('Break Oath: shown when sworn across a Dawn', () => {
    const s = humanTurn('competitive');
    const oath: Oath = { a: 0, b: 1, swornRound: s.state.round - 1, strain: 0 };
    s.state.oaths.push(oath);
    expect(renderApp(s)).toContain('data-action="break-oath"');
  });

  it('Audit: shown in Blood Pact when affordable', () => {
    const s = humanTurn('blood_pact');
    s.state.players[0].banners = 9;
    // pledgeHistory is populated after the first Pledge resolves (we passed THREAT→PLEDGE→ACTION).
    expect(renderApp(s)).toContain('data-action="audit:');
  });
});

describe('UI parity — full state display', () => {
  it('always shows the human hand, standings, and the clock', () => {
    const html = renderApp(humanTurn('competitive'));
    expect(html).toContain('Your hand');
    expect(html).toContain('class="standings"');
    expect(html).toMatch(/Round \d+\/\d+/);
  });

  it('shows the Oaths panel and the Ledger when they exist', () => {
    const s = humanTurn('competitive');
    s.state.oaths.push({ a: 0, b: 1, swornRound: s.state.round, strain: 0 });
    s.state.shadowking.grudge[2] = 3;
    const html = renderApp(s);
    expect(html).toContain('Oaths');
    expect(html).toContain('Ledger');
  });

  it('shows the Suspicion Log in Blood Pact', () => {
    expect(renderApp(humanTurn('blood_pact'))).toContain('Suspicion Log');
  });
});

describe('UI parity — every control routes through applyCommand (the wiring works)', () => {
  it('RECRUIT commits the political stance', () => {
    const s = humanTurn('competitive');
    s.state.players[0].stance = 'martial';
    s.state.players[0].banners = 9;
    s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'RECRUIT' } });
    expect(s.lastError).toBeNull();
    expect(s.state.players[0].stance).toBe('political');
    expect(s.state.players[0].heraldNodeId).not.toBeNull();
  });

  it('SWEAR_OATH forges an Oath (free — keeps the human turn)', () => {
    const s = humanTurn('competitive');
    s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'SWEAR_OATH', targetPlayerIndex: 1 } });
    expect(s.lastError).toBeNull();
    expect(s.state.oaths.some(o => (o.a === 0 && o.b === 1) || (o.a === 1 && o.b === 0))).toBe(true);
  });

  it('a Herald MARCH moves the Herald piece, not the Warlord', () => {
    const s = humanTurn('competitive');
    const h = s.state.players[0];
    const here = h.warlordNodeId;
    h.stance = 'political';
    h.heraldNodeId = here;
    s.state.board.state.nodes[here].pieces.push({ id: 'herald-0', type: 'herald', owner: 0, power: 0, nodeId: here });
    h.banners = 9;
    const dest = s.state.board.definition.nodes[here].connections.find(n => !s.state.board.state.nodes[n].ashed)!;
    s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'MARCH', targetNodeId: dest, pieceId: 'herald' } });
    expect(s.lastError).toBeNull();
    expect(s.state.players[0].heraldNodeId).toBe(dest);
    expect(s.state.players[0].warlordNodeId).toBe(here); // Warlord didn't move
  });

  it('an illegal action surfaces an error instead of mutating (no silent break)', () => {
    const s = humanTurn('competitive');
    // RECRUIT with no banners must be rejected and reported, not crash.
    s.state.players[0].stance = 'martial';
    s.state.players[0].banners = 0;
    s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'RECRUIT' } });
    expect(s.lastError).not.toBeNull();
    expect(s.state.players[0].stance).toBe('martial');
  });
});
