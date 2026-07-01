/**
 * UI parity tests (Stage 3i-b) — every v3 player action has a CONTROL SURFACE, the full game state
 * is DISPLAYED, and every control's command is ACCEPTED by the reducer.
 *
 * Two layers, both pure (no DOM):
 *   1. renderApp(session) is a pure string builder — assert the data-action control appears when its
 *      action is legal, and the state panels render (incl. the §13 P0-11 legibility surfaces).
 *   2. session.humanAction routes through applyCommand — assert each verb is accepted (no lastError)
 *      and mutates state as expected.
 */

import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/ui-v3/session.js';
import { renderApp } from '../../src/ui-v3/view.js';
import type { GameState } from '../../src/v3/index.js';

/** Drive a fresh game to the human's live ACTION turn (where the control panel renders). */
function humanTurn(mode: 'competitive' | 'blood_pact', seed = 42): GameSession {
  const s = new GameSession(4, mode, seed);
  let guard = 0;
  while (!s.isOver && !s.isHumanTurn && guard < 60) {
    guard++;
    if (s.phase === 'THREAT') s.advanceFromThreat();
    else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
    else break;
  }
  return s;
}

/** Put a rival's Warlord on the human's node so a RAID election renders. */
function colocateRival(s: GameState, human: number, rival: number): void {
  const here = s.players[human].warlordNodeId;
  const from = s.players[rival].warlordNodeId;
  s.board.state.nodes[from].pieces = s.board.state.nodes[from].pieces.filter(
    p => !(p.owner === rival && p.type === 'warlord'),
  );
  s.players[rival].warlordNodeId = here;
  s.board.state.nodes[here].pieces.push({ id: `warlord-${rival}`, type: 'warlord', owner: rival, power: 5, nodeId: here });
}

describe('UI parity (v3) — control surface for every action', () => {
  it('CLAIM: shown on an unclaimed Holding/Forge', () => {
    const s = humanTurn('competitive');
    const here = s.state.players[0].warlordNodeId;
    // Force the Warlord onto a claimable, unowned node.
    const holding = Object.entries(s.state.board.definition.nodes).find(([, d]) => d.tier === 'holding')![0];
    s.state.players[0].warlordNodeId = holding;
    s.state.board.state.nodes[holding].owner = null;
    s.state.board.state.nodes[holding].ashed = false;
    s.state.players[0].banners = 9;
    void here;
    expect(renderApp(s)).toContain('data-action="claim"');
  });

  it('RAID capture ELECTION: renders take-land / rout / capture-gate for a co-located rival', () => {
    const s = humanTurn('competitive');
    colocateRival(s.state, 0, 1);
    s.state.players[0].banners = 9;
    const html = renderApp(s);
    expect(html).toContain('data-action="raid:TAKE_LAND:1"');
    // Capture is margin-gated: either an enabled capture control OR the disabled "need margin" note.
    expect(html.includes('data-action="raid:CAPTURE_PIECE:1"') || html.includes('need margin')).toBe(true);
  });

  it('RECRUIT a Herald: shown when martial + affordable', () => {
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
    s.state.board.state.nodes[here].blightLevel = 1;
    s.state.board.state.nodes[here].ashed = false;
    const html = renderApp(s);
    expect(html).toContain('data-action="herald-march:');
    expect(html).toContain('data-action="parley"');
  });

  it('SWEAR / BREAK oath: swear shown fresh; break shown once sworn across a Dawn', () => {
    const s = humanTurn('competitive');
    expect(renderApp(s)).toContain('data-action="swear:1"');
    s.state.oaths.push({ a: 0, b: 1, swornRound: s.state.round - 1, strain: 0 });
    expect(renderApp(s)).toContain('data-action="break-oath"');
  });

  it('AUDIT: shown in Blood Pact when affordable', () => {
    const s = humanTurn('blood_pact');
    s.state.players[0].banners = 9;
    expect(renderApp(s)).toContain('data-action="audit:');
  });

  it('RANSOM: shown for a captive the human owns', () => {
    const s = humanTurn('competitive');
    const h = s.state.players[0];
    // Fabricate a captive of the human's held by P1 (the human is always the owner ⇒ in reach).
    const piece = h.court[0];
    s.state.captives.push({ pieceId: piece.id, ownerSeat: 0, captorSeat: 1, capturedRound: 1, recaptureImmuneUntil: 0 });
    h.banners = 9;
    h.hand = [3, 3, 3, 3];
    expect(renderApp(s)).toContain(`data-action="ransom:${piece.id}"`);
  });

  it('ASSAULT_HEART: shown when the Warlord stands on an exposed heart', () => {
    const s = humanTurn('competitive');
    const keystone = s.state.board.definition.keystoneId;
    s.state.players[0].warlordNodeId = keystone;
    s.state.board.state.nodes[keystone].pieces.push({ id: 'warlord-0', type: 'warlord', owner: 0, power: 5, nodeId: keystone });
    s.state.shadowking.heart = { nodeId: keystone, hp: 12, exposed: true, committedBySeat: [0, 0, 0, 0], raidLeader: null };
    expect(renderApp(s)).toContain('data-action="assault-heart"');
  });
});

describe('UI parity (v3) — P0-11 legibility + full state display', () => {
  it('shows the persistent EXPOSURE meter (SAFE in Whisper)', () => {
    const html = renderApp(humanTurn('competitive'));
    expect(html).toContain('Exposure');
    expect(html).toContain('SAFE');
  });

  it("publishes every seat's hand size + the clock + standings", () => {
    const html = renderApp(humanTurn('competitive'));
    expect(html).toContain('Your hand');
    expect(html).toContain('class="standings"');
    expect(html).toMatch(/Round \d+\/\d+/);
    expect(html).toContain('<th>Hand</th>');
  });

  it('shows the Hold Rail (every hostage) when a capture exists', () => {
    const s = humanTurn('competitive');
    s.state.captives.push({ pieceId: 'x', ownerSeat: 1, captorSeat: 2, capturedRound: 1, recaptureImmuneUntil: 0 });
    expect(renderApp(s)).toContain('Hold Rail');
  });

  it('shows Oaths + Ledger + Wraiths when they exist', () => {
    const s = humanTurn('competitive');
    s.state.oaths.push({ a: 0, b: 1, swornRound: s.state.round, strain: 0 });
    s.state.shadowking.grudge[2] = 3;
    s.state.shadowking.wraiths.push({ seat: 3, eliminatedRound: 2 });
    const html = renderApp(s);
    expect(html).toContain('Oaths');
    expect(html).toContain('Ledger');
    expect(html).toContain('Wraiths');
  });

  it('shows the Suspicion Log in Blood Pact', () => {
    expect(renderApp(humanTurn('blood_pact'))).toContain('Suspicion Log');
  });

  it('the WRAITH input surfaces at THREAT for an eliminated human', () => {
    const s = new GameSession(4, 'competitive', 42); // starts paused at THREAT
    s.state.players[0].isEliminated = true;
    s.state.players[0].eliminatedRound = 1;
    s.state.shadowking.wraiths.push({ seat: 0, eliminatedRound: 1 });
    expect(s.isWraithWindow).toBe(true);
    expect(renderApp(s)).toContain('data-action="set-wraith:nudge"');
  });

  it('the DEATH BEQUEST panel surfaces when the human is in the dark\'s reach', () => {
    const s = humanTurn('competitive');
    s.state.players[0].deposed = true; // exposure ⇒ 'deposed'
    const html = renderApp(s);
    expect(html).toContain('data-action="bequest-curse:');
  });
});

describe('UI parity (v3) — every control routes through applyCommand', () => {
  it('RECRUIT commits the political stance + spawns the Herald', () => {
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

  it('a RAID capture ELECTION routes a CAPTURE_PIECE command (accepted or cleanly rejected)', () => {
    const s = humanTurn('competitive');
    colocateRival(s.state, 0, 1);
    s.state.players[0].hand = [9, 9, 9, 9];
    s.state.players[1].hand = [1];
    s.state.players[0].banners = 9;
    s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'RAID', targetPlayerIndex: 1, raidEffect: 'CAPTURE_PIECE' } });
    // Either it captured (a Hold-Rail entry) or the margin gate rejected it — never a silent break.
    expect(s.lastError === null || /CAPTURE|margin/.test(s.lastError)).toBe(true);
  });

  it('an illegal action surfaces an error instead of mutating (no silent break)', () => {
    const s = humanTurn('competitive');
    s.state.players[0].stance = 'martial';
    s.state.players[0].banners = 0;
    s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'RECRUIT' } });
    expect(s.lastError).not.toBeNull();
    expect(s.state.players[0].stance).toBe('martial');
  });

  it('SET_WRAITH_INPUT + SET_BEQUEST route through the reducer (P0-11 human overrides)', () => {
    const s = new GameSession(4, 'competitive', 42);
    // Wraith input: legal once eliminated.
    s.state.players[0].isEliminated = true;
    s.state.shadowking.wraiths.push({ seat: 0, eliminatedRound: 1 });
    s.setWraithInput('nudge');
    expect(s.lastError).toBeNull();
    expect(s.state.wraithInputs?.[0]).toBe('nudge');

    // Bequest: legal while alive-but-in-danger.
    const s2 = humanTurn('competitive');
    s2.state.players[0].deposed = true;
    s2.setBequest({ kind: 'death_curse', target: 1 });
    expect(s2.lastError).toBeNull();
    expect(s2.state.pendingBequests?.[0]).toEqual({ kind: 'death_curse', target: 1 });
  });
});
