// @vitest-environment jsdom
/**
 * T-311 — Player-orientation affordance. Proves the three usability gaps are closed from the screen
 * alone: (a) TURN ORDER / whose turn, (b) HOW to move, (c) WHICH house is mine — HUD-diegetic and
 * fog-respecting (only public seat/turn/phase fields are read; rival pieces get no self-marker).
 *
 * Mirrors turn-track.test.ts: build a real deterministic projection, render the pure component /
 * board, parse the DOM, assert. Plus a mounted-view check and a back-compat guard (renderBoard with
 * no viewerSeat stays self-marker-free).
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { observableState } from '../../src/v3/observable.js';
import type { ObservableState } from '../../src/v3/observable.js';
import { orientationBar } from '../../src/ui-v3/orientation.js';
import { renderBoard } from '../../src/ui-v3/board-view.js';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

/** Deep-clone a projection so a test can mutate `next` without touching the original. */
function clone(obs: ObservableState): ObservableState {
  return JSON.parse(JSON.stringify(obs)) as ObservableState;
}

const baseObs = (): ObservableState => observableState(createGame(4, 'competitive', 42), 0);

function parse(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('orientationBar — component render (a) turn order + (c) which house is mine', () => {
  it('renders every seat in turnOrder sequence with ordinals + exactly one "you" that is seat 0', () => {
    const s = baseObs();
    const host = parse(orientationBar(s, 0, false));

    const bar = host.querySelector('.orientation');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('data-active-seat')).toBe(String(s.activePlayerIndex));

    const seats = host.querySelectorAll('.orient-seats .orient-seat');
    expect(seats).toHaveLength(s.turnOrder.length);
    // Chips are in turnOrder sequence, each carrying its 1-based ordinal.
    seats.forEach((chip, i) => {
      expect(chip.getAttribute('data-seat')).toBe(String(s.turnOrder[i]));
      expect(chip.querySelector('.orient-ord')!.textContent!.trim()).toBe(String(i + 1));
    });

    const you = host.querySelectorAll('.orient-seat.is-you');
    expect(you).toHaveLength(1);
    expect(you[0].getAttribute('data-seat')).toBe('0');
    expect(you[0].querySelector('.orient-you')!.textContent!.trim()).toBe('you');
    expect(you[0].querySelector('.orient-house')!.textContent!.trim().length).toBeGreaterThan(0);
  });

  it('carries no [data-stat] (token-chip audit exemption, like the turn track)', () => {
    const s = baseObs();
    const host = parse(orientationBar(s, 0, false));
    expect(host.querySelectorAll('[data-stat]')).toHaveLength(0);
  });

  it('leaks nothing under the fog: no seed sentinel, only public seat labels', () => {
    const s = baseObs();
    const html = orientationBar(s, 0, false);
    expect(html).not.toContain('REDACTED');
    expect(html).not.toContain('seed');
  });
});

describe('orientationBar — (whose turn) is-acting tracks the active seat during ACTION only', () => {
  it('lights exactly the active seat in ACTION, and no seat in PLEDGE', () => {
    const s = baseObs();
    const actor = s.turnOrder[1];

    const action = clone(s);
    (action as { phase: string }).phase = 'ACTION';
    (action as { activePlayerIndex: number }).activePlayerIndex = actor;
    const aHost = parse(orientationBar(action, 0, false));
    const acting = aHost.querySelectorAll('.orient-seat.is-acting');
    expect(acting).toHaveLength(1);
    expect(acting[0].getAttribute('data-seat')).toBe(String(actor));
    expect(aHost.querySelector('.orientation')!.getAttribute('data-active-seat')).toBe(String(actor));

    const pledge = clone(action);
    (pledge as { phase: string }).phase = 'PLEDGE';
    const pHost = parse(orientationBar(pledge, 0, false));
    expect(pHost.querySelectorAll('.orient-seat.is-acting')).toHaveLength(0);
  });

  it('dims an eliminated seat with is-out', () => {
    const s = clone(baseObs());
    const dead = s.turnOrder[2];
    (s.players[dead] as { isEliminated: boolean }).isEliminated = true;
    const host = parse(orientationBar(s, 0, false));
    const chip = host.querySelector(`.orient-seat[data-seat="${dead}"]`);
    expect(chip!.classList.contains('is-out')).toBe(true);
  });
});

describe('orientationBar — (b) how-to-move prompt varies by situation, always present', () => {
  it('ACTION-human vs ACTION-rival vs PLEDGE produce distinct, non-empty prompts', () => {
    const s = baseObs();

    const actionHuman = clone(s);
    (actionHuman as { phase: string }).phase = 'ACTION';
    (actionHuman as { activePlayerIndex: number }).activePlayerIndex = 0;
    const humanPrompt = parse(orientationBar(actionHuman, 0, true))
      .querySelector('.orient-prompt')!.textContent!.trim();

    const actionRival = clone(s);
    (actionRival as { phase: string }).phase = 'ACTION';
    (actionRival as { activePlayerIndex: number }).activePlayerIndex = s.turnOrder.find(x => x !== 0)!;
    const rivalPrompt = parse(orientationBar(actionRival, 0, false))
      .querySelector('.orient-prompt')!.textContent!.trim();

    const pledge = clone(s);
    (pledge as { phase: string }).phase = 'PLEDGE';
    const pledgePrompt = parse(orientationBar(pledge, 0, false))
      .querySelector('.orient-prompt')!.textContent!.trim();

    for (const p of [humanPrompt, rivalPrompt, pledgePrompt]) expect(p.length).toBeGreaterThan(0);
    expect(new Set([humanPrompt, rivalPrompt, pledgePrompt]).size).toBe(3);
    // The human's move prompt actually tells them how to move.
    expect(humanPrompt.toLowerCase()).toContain('march');
  });
});

describe('renderBoard — (c) self-marker on the board, fog-safe + back-compat', () => {
  it('with viewerSeat=0: exactly one [data-you] and the human pieces carry is-you; rivals do not', () => {
    const obs = baseObs();
    const host = parse(renderBoard(obs, undefined, 0));

    const dataYou = host.querySelectorAll('[data-you="true"]');
    expect(dataYou).toHaveLength(1); // the human's Warlord self-locator

    // The human's own pieces are marked; at least one exists (the Warlord).
    const mine = host.querySelectorAll('.piece.is-you');
    expect(mine.length).toBeGreaterThan(0);

    // A rival seat's pieces carry neither is-you nor a data-you marker.
    const rivalSeat = obs.turnOrder.find(x => x !== 0)!;
    const rivalColor = ['#c15f2c', '#8a93a3', '#2f7d5b', '#7a6aa0'][rivalSeat];
    const rivalPieces = Array.from(host.querySelectorAll('circle.piece'))
      .filter(c => (c.getAttribute('fill') ?? '').toLowerCase() === rivalColor);
    expect(rivalPieces.length).toBeGreaterThan(0);
    for (const rp of rivalPieces) expect(rp.classList.contains('is-you')).toBe(false);
  });

  it('with NO viewerSeat: zero self-markers (byte-identical/back-compat guard)', () => {
    const obs = baseObs();
    const host = parse(renderBoard(obs));
    expect(host.querySelectorAll('[data-you]')).toHaveLength(0);
    expect(host.querySelectorAll('.piece.is-you')).toHaveLength(0);
    // Legality-only call (the pre-T-311 signature) also stays self-marker-free.
    const host2 = parse(renderBoard(obs, undefined));
    expect(host2.querySelectorAll('[data-you]')).toHaveLength(0);
  });
});

describe('orientation — mounted in the live view', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('renders the ribbon + a board self-marker, and names the human house on the hand dock', () => {
    const session = new GameSession(4, 'competitive', 12345);
    mountView(root, session);

    const bar = root.querySelector('.orientation[data-active-seat]');
    expect(bar).not.toBeNull();
    expect(root.querySelectorAll('.orient-seats .orient-seat')).toHaveLength(4);
    expect(root.querySelectorAll('.orient-seat.is-you')).toHaveLength(1);
    // Board self-marker present exactly once.
    expect(root.querySelectorAll('.board-svg [data-you]')).toHaveLength(1);
    // The hand dock names the human's house.
    const handSelf = root.querySelector('.hand-self');
    expect(handSelf).not.toBeNull();
    expect(handSelf!.textContent!.trim().length).toBeGreaterThan(0);
  });
});
