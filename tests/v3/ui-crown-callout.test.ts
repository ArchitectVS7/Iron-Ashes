// @vitest-environment jsdom
/**
 * W2/T1-3 — the round-1 Crown landmine callout (backlog T1-3, learnability #4).
 *
 * `setup()` tie-breaks the seat-0 player into the Crown at game start, so a first-time human is
 * surcharged + hunted before understanding any of the three concepts involved. The fix is a
 * UI-only one-shot beat ("You hold the most land — the dark hunts YOU, and your pledged cards
 * count for less") — ZERO engine change, so the locked balance is untouched.
 *
 * Both polarities are covered: the human IS crowned at setup (the beat renders in the real DOM)
 * and the human is NOT crowned / not round 1 (the pure helper returns null and nothing renders).
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession, crownCalloutText } from '../../src/ui-v3/session.js';
import { createGame } from '../../src/v3/setup.js';

const CALLOUT_MARK = 'the dark hunts YOU';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

describe('W2/T1-3 — round-1 Crown callout (UI-only)', () => {
  it('POSITIVE polarity: the human is crowned at setup → the one-shot beat renders in the DOM', () => {
    const session = new GameSession(4, 'competitive', 42);
    // The precondition the landmine rests on: setup() tie-breaks seat 0 (the human) into the Crown.
    expect(session.state.players[session.humanIndex].crownHeld).toBe(true);
    expect(session.state.round).toBe(1);
    mountView(root, session);
    expect(root.querySelector('.narration')!.textContent).toContain(CALLOUT_MARK);
  });

  it('NEGATIVE polarity: human NOT crowned → null, and nothing renders', () => {
    const session = new GameSession(4, 'competitive', 42);
    // Move the Crown off the human (round still 1) and clear the constructor's beat.
    session.state.players[0].crownHeld = false;
    session.state.players[1].crownHeld = true;
    session.state.crownHolder = 1;
    expect(crownCalloutText(session.state, session.humanIndex)).toBeNull();
    session.narration = session.narration.filter(n => !n.text.includes(CALLOUT_MARK));
    mountView(root, session);
    expect(root.querySelector('.narration')!.textContent).not.toContain(CALLOUT_MARK);
  });

  it('NEGATIVE polarity: past round 1 the callout is never produced (one-shot)', () => {
    const state = createGame(4, 'competitive', 42);
    expect(state.players[0].crownHeld).toBe(true);
    state.round = 2;
    expect(crownCalloutText(state, 0)).toBeNull();
  });

  it('the callout text names all three concepts (Crown/most land, hunted, pledge discount)', () => {
    const state = createGame(4, 'competitive', 42);
    const text = crownCalloutText(state, 0);
    expect(text).toContain('most land');
    expect(text).toContain('the dark hunts YOU');
    expect(text).toContain('count for less');
  });
});
