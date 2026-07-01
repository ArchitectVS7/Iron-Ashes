// @vitest-environment jsdom
/**
 * UI end-to-end tests (Stage 3i-b) — drive the REAL v3 frontend through the REAL DOM.
 *
 * These mount the actual `mountView` into a jsdom document and play full games by dispatching real
 * <click> events on rendered controls — exercising the exact delegated click handler → session →
 * applyCommand → re-render chain a human triggers. Goal: surface the errors a player would hit (a
 * control that does nothing or throws, a render crash, a soft-lock) BEFORE the human playtest.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

/** Dispatch a real bubbling click on an element (the handler is delegated on root). */
function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** All currently-clickable controls in the live DOM (excluding new-game → location.reload). */
function controls(): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-action]:not([disabled]),[data-node]'))
    .filter(el => el.getAttribute('data-action') !== 'new-game');
}

/**
 * Play a full game purely by clicking rendered controls. Throws if any click throws (a render/handler
 * bug) or if no progress can be made (a soft-lock). Returns the session.
 */
function playThroughDom(mode: 'competitive' | 'blood_pact', seed: number): GameSession {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);

  let steps = 0;
  let lastRound = 0;
  let nonPassThisTurn = 0;

  while (!session.isOver && steps < 8000) {
    steps++;
    const s = session.state;
    if (s.round !== lastRound) { lastRound = s.round; nonPassThisTurn = 0; }

    const all = controls();
    expect(all.length, `no clickable control at round ${s.round} phase ${s.phase}`).toBeGreaterThan(0);

    const byAction = (a: string): HTMLElement | undefined =>
      all.find(el => (el.getAttribute('data-action') ?? '').startsWith(a));

    let pick: HTMLElement | undefined;
    if (byAction('advance-threat')) {
      pick = byAction('advance-threat');
    } else if (byAction('pledge:')) {
      pick = all.find(el => el.classList.contains('suggested')) ?? byAction('pledge:');
    } else if (session.awaitingBequest && byAction('bequest-')) {
      // A BLOCKING Death Bequest (the human is about to fall) — resolve it to unstick the flow.
      pick = byAction('bequest-');
    } else {
      // ACTION phase, human turn. Exercise up to 2 non-pass verbs, then end the turn. The optional
      // "record your will" bequest + wraith controls are flavour, not turn-advancing — skip them.
      const nonPass = all.filter(el => {
        const a = el.getAttribute('data-action') ?? '';
        if (a.startsWith('bequest-') || a.startsWith('set-wraith')) return false;
        return el.hasAttribute('data-node') || (a !== 'pass' && a !== 'accuse' && !a.startsWith('audit') && !a.startsWith('accuse'));
      });
      if (nonPassThisTurn < 2 && nonPass.length > 0) {
        pick = nonPass[steps % nonPass.length];
        nonPassThisTurn++;
      } else {
        pick = byAction('pass') ?? all[0];
      }
    }

    const desc = pick!.getAttribute('data-action') ?? `node:${pick!.getAttribute('data-node')}`;
    expect(() => click(pick!), `clicking "${desc}" threw (round ${s.round} phase ${s.phase})`).not.toThrow();
  }

  return session;
}

describe('UI E2E (v3) — full games through real DOM clicks', () => {
  it('plays a full COMPETITIVE game with no click ever throwing, reaching a terminal state', () => {
    const s = playThroughDom('competitive', 42);
    expect(s.isOver).toBe(true);
    expect(s.state.gameEndReason).not.toBeNull();
    expect(s.state.round).toBeGreaterThan(1);
  });

  it('plays a full BLOOD_PACT game through the DOM', () => {
    const s = playThroughDom('blood_pact', 7);
    expect(s.isOver).toBe(true);
  });

  it('never soft-locks: a second seed also completes via clicks', () => {
    const s = playThroughDom('competitive', 99);
    expect(s.isOver).toBe(true);
  });

  it('renders a game-over panel with a working New-game control at the end', () => {
    const s = playThroughDom('competitive', 42);
    expect(s.isOver).toBe(true);
    expect(root.querySelector('[data-action="new-game"]')).not.toBeNull();
  });
});

// ─── Targeted: each new control fires through the real DOM chain ───

/** Mount + drive (via clicks) to the human's live ACTION turn, then re-render. */
function toHumanTurnDom(mode: 'competitive' | 'blood_pact', seed = 42): GameSession {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);
  let guard = 0;
  while (!session.isOver && !session.isHumanTurn && guard < 60) {
    guard++;
    const adv = root.querySelector<HTMLElement>('[data-action="advance-threat"]');
    const pledge = root.querySelector<HTMLElement>('[data-action^="pledge:"]');
    if (adv) click(adv);
    else if (pledge) click(pledge);
    else break;
  }
  return session;
}

function rerender(session: GameSession): void { session.onChange(); }

describe('UI E2E (v3) — each control drives the engine through the DOM', () => {
  it('clicking a board node Marches the Warlord there', () => {
    const session = toHumanTurnDom('competitive');
    expect(session.isHumanTurn).toBe(true);
    const here = session.state.players[0].warlordNodeId;
    const dest = session.state.board.definition.nodes[here].connections
      .find(n => !session.state.board.state.nodes[n].ashed)!;
    session.state.players[0].banners = 9;
    rerender(session);
    const nodeEl = root.querySelector<HTMLElement>(`[data-node="${dest}"]`);
    expect(nodeEl, `board node ${dest} should be clickable`).not.toBeNull();
    click(nodeEl!);
    expect(session.lastError).toBeNull();
    expect(session.state.players[0].warlordNodeId).toBe(dest);
  });

  it('clicking "Recruit a Herald" commits the political stance', () => {
    const session = toHumanTurnDom('competitive');
    session.state.players[0].stance = 'martial';
    session.state.players[0].banners = 9;
    rerender(session);
    const btn = root.querySelector<HTMLElement>('[data-action="recruit"]');
    expect(btn, 'Recruit control should be present').not.toBeNull();
    click(btn!);
    expect(session.lastError).toBeNull();
    expect(session.state.players[0].stance).toBe('political');
  });

  it('clicking a RAID capture ELECTION fires a RAID through the DOM', () => {
    const session = toHumanTurnDom('competitive');
    const here = session.state.players[0].warlordNodeId;
    // Co-locate P1's Warlord and stack the human's hand so a raid is projected to win.
    const from = session.state.players[1].warlordNodeId;
    session.state.board.state.nodes[from].pieces = session.state.board.state.nodes[from].pieces
      .filter(p => !(p.owner === 1 && p.type === 'warlord'));
    session.state.players[1].warlordNodeId = here;
    session.state.board.state.nodes[here].pieces.push({ id: 'warlord-1', type: 'warlord', owner: 1, power: 3, nodeId: here });
    session.state.players[0].hand = [9, 9, 9, 9];
    session.state.players[1].hand = [1];
    rerender(session);
    const btn = root.querySelector<HTMLElement>('[data-action^="raid:"]');
    expect(btn, 'a raid election control should be present').not.toBeNull();
    click(btn!);
    // The raid resolved through applyCommand — no thrown handler, no silent lastError from a crash.
    expect(session.lastError === null || /RAID|CAPTURE|margin|force/.test(session.lastError!)).toBe(true);
  });

  it('the WRAITH input routes SET_WRAITH_INPUT through the DOM', () => {
    const session = toHumanTurnDom('competitive');
    // Kill the human and drop it into the THREAT wraith window.
    session.state.players[0].isEliminated = true;
    session.state.shadowking.wraiths.push({ seat: 0, eliminatedRound: session.state.round });
    // Force phase back to THREAT so the wraith window renders (mutate + rerender).
    session.state.phase = 'THREAT';
    rerender(session);
    const btn = root.querySelector<HTMLElement>('[data-action="set-wraith:nudge"]');
    expect(btn, 'wraith nudge control should be present').not.toBeNull();
    click(btn!);
    expect(session.lastError).toBeNull();
    expect(session.state.wraithInputs?.[0]).toBe('nudge');
  });

  it('the DEATH BEQUEST routes SET_BEQUEST through the DOM', () => {
    const session = toHumanTurnDom('competitive');
    session.state.players[0].deposed = true;
    rerender(session);
    const btn = root.querySelector<HTMLElement>('[data-action^="bequest-curse:"]');
    expect(btn, 'a death-bequest control should be present').not.toBeNull();
    click(btn!);
    expect(session.lastError).toBeNull();
    expect(session.state.pendingBequests?.[0]).toBeDefined();
  });
});
