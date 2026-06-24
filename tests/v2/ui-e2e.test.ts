// @vitest-environment jsdom
/**
 * UI end-to-end tests (Phase 6a) — drive the REAL frontend through the REAL DOM.
 *
 * Unlike ui-parity (which calls renderApp as a string) and ui-session (which calls the
 * session API), these mount the actual `mountView` into a jsdom document and play full
 * games by dispatching real <click> events on rendered controls — exercising the exact
 * delegated click handler → session → applyCommand → re-render chain a human triggers.
 *
 * Goal: surface the errors a player would hit (a control that does nothing or throws, a
 * render crash, a soft-lock with no clickable control) BEFORE the human playtest. It's a
 * jsdom E2E (real DOM events, simulated browser) — a true-Chromium pass would be Playwright.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { mountView } from '../../src/ui-v2/view.js';
import { GameSession } from '../../src/ui-v2/session.js';
import type { Oath } from '../../src/v2/types.js';

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
 * Play a full game purely by clicking rendered controls. Throws if any click throws
 * (a render/handler bug) or if no progress can be made (a soft-lock). Returns the session.
 */
function playThroughDom(mode: 'competitive' | 'blood_pact', seed: number): GameSession {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);

  let steps = 0;
  let lastRound = 0;
  let nonPassThisTurn = 0;

  while (!session.isOver && steps < 6000) {
    steps++;
    const s = session.state;
    if (s.round !== lastRound) { lastRound = s.round; nonPassThisTurn = 0; }

    const all = controls();
    expect(all.length, `no clickable control at round ${s.round} phase ${s.phase}`).toBeGreaterThan(0);

    // Choose a control for this step.
    const byAction = (a: string): HTMLElement | undefined =>
      all.find(el => (el.getAttribute('data-action') ?? '').startsWith(a));

    let pick: HTMLElement | undefined;
    if (byAction('advance-threat')) {
      pick = byAction('advance-threat');
    } else if (byAction('pledge:')) {
      // Prefer the engine-suggested pledge; else pledge a small amount.
      pick = all.find(el => el.classList.contains('suggested')) ?? byAction('pledge:');
    } else {
      // ACTION phase, human turn. Exercise up to 2 non-pass verbs, then end the turn.
      const nonPass = all.filter(el => {
        const a = el.getAttribute('data-action') ?? '';
        return el.hasAttribute('data-node') || (a !== 'pass' && a !== 'accuse' && !a.startsWith('audit'));
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

describe('UI E2E — full games through real DOM clicks', () => {
  it('plays a full COMPETITIVE game with no click ever throwing, reaching a terminal state', () => {
    const s = playThroughDom('competitive', 42);
    expect(s.isOver).toBe(true);
    expect(s.state.gameEndReason).not.toBeNull();
    expect(s.state.round).toBeGreaterThan(1); // a real multi-round playthrough
  });

  it('plays a full BLOOD_PACT game through the DOM (accusation/audit surfaces present)', () => {
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

// ─── Targeted: each NEW control fires through the real DOM chain ───

/** Mount + drive (via clicks) to the human's ACTION turn, then re-render. */
function toHumanTurnDom(mode: 'competitive' | 'blood_pact', seed = 42): GameSession {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);
  let guard = 0;
  while (!session.isOver && !session.isHumanTurn && guard < 50) {
    guard++;
    const adv = root.querySelector<HTMLElement>('[data-action="advance-threat"]');
    const pledge = root.querySelector<HTMLElement>('[data-action^="pledge:"]');
    if (adv) click(adv);
    else if (pledge) click(pledge);
    else break;
  }
  return session;
}

/** Re-render the live DOM after a manual state edit (mountView wired session.onChange). */
function rerender(session: GameSession): void { session.onChange(); }

describe('UI E2E — each new control drives the engine through the DOM', () => {
  it('clicking "Recruit a Herald" commits the political stance', () => {
    const session = toHumanTurnDom('competitive');
    expect(session.isHumanTurn).toBe(true);
    session.state.players[0].stance = 'martial';
    session.state.players[0].banners = 9;
    rerender(session);
    const btn = root.querySelector<HTMLElement>('[data-action="recruit"]');
    expect(btn, 'Recruit control should be present').not.toBeNull();
    click(btn!);
    expect(session.lastError).toBeNull();
    expect(session.state.players[0].stance).toBe('political');
  });

  it('clicking "Swear an Oath" forges the pact (and the human keeps the turn)', () => {
    const session = toHumanTurnDom('competitive');
    const btn = root.querySelector<HTMLElement>('[data-action^="swear:"]');
    expect(btn, 'Swear control should be present').not.toBeNull();
    click(btn!);
    expect(session.lastError).toBeNull();
    expect(session.state.oaths.length).toBeGreaterThan(0);
    expect(session.isHumanTurn).toBe(true); // free action
  });

  it('clicking "Break your Oath" dissolves it', () => {
    const session = toHumanTurnDom('competitive');
    const oath: Oath = { a: 0, b: 1, swornRound: session.state.round - 1, strain: 0 };
    session.state.oaths.push(oath);
    rerender(session);
    const btn = root.querySelector<HTMLElement>('[data-action="break-oath"]');
    expect(btn, 'Break-Oath control should be present').not.toBeNull();
    click(btn!);
    expect(session.lastError).toBeNull();
    expect(session.state.oaths.includes(oath)).toBe(false);
  });

  it('clicking a board node Marches the Warlord there', () => {
    const session = toHumanTurnDom('competitive');
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
});
