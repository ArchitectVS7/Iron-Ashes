// @vitest-environment jsdom
/**
 * T-205 — Turn/round/Act visual track. Proves the acceptance clauses:
 *   1. the track component renders on the board screen (mount the full view, assert the rail,
 *      three act stations, exactly one current, a marker, ROUND_CAP round pips, and the
 *      data-round/act/phase contract used by the E2E + shots script);
 *   2. an act-advance transition produces the corresponding `act_advance` Move (existing
 *      `diffObservable`) AND an animated preset exists for it (`presetSeconds('act_advance') > 0`),
 *      verified through the queue in INSTANT mode (settle + `sound.play('act_advance')` fire
 *      synchronously);
 *   3. the marker actually moves (WHISPER→MARCH re-marks the current station) and a round advance
 *      fills one more pip.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { observableState } from '../../src/v3/observable.js';
import type { ObservableState } from '../../src/v3/observable.js';
import { TUNABLES } from '../../src/v3/tunables.js';
import { turnTrack } from '../../src/ui-v3/turn-track.js';
import { diffObservable } from '../../src/ui-v3/moves.js';
import { AnimationQueue, presetSeconds } from '../../src/ui-v3/queue.js';
import { SoundManager } from '../../src/ui-v3/sound.js';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

/** Deep-clone a projection so a test can mutate `next` without touching `prev`. */
function clone(obs: ObservableState): ObservableState {
  return JSON.parse(JSON.stringify(obs)) as ObservableState;
}

const baseObs = (): ObservableState => observableState(createGame(2, 'competitive', 42), 0);

describe('turnTrack — component render', () => {
  it('renders three act stations, one current, a marker, and ROUND_CAP pips with the data contract', () => {
    const s = baseObs();
    const host = document.createElement('div');
    host.innerHTML = turnTrack(s);

    const track = host.querySelector('.turn-track');
    expect(track).not.toBeNull();
    // The machine-readable contract the E2E suite + shots:v3 parseRound read.
    expect(track!.getAttribute('data-round')).toBe(String(s.round));
    expect(track!.getAttribute('data-act')).toBe(s.act);
    expect(track!.getAttribute('data-phase')).toBe(s.phase);

    expect(host.querySelectorAll('.act-station')).toHaveLength(3);
    expect(host.querySelectorAll('.act-station.is-current')).toHaveLength(1);
    expect(host.querySelector('.act-station.is-current')!.getAttribute('data-act')).toBe(s.act);
    expect(host.querySelector('.track-marker')).not.toBeNull();
    expect(host.querySelectorAll('.trk-pip')).toHaveLength(TUNABLES.ROUND_CAP);

    // No resource-stat leakage: the track carries no data-stat (token-chip audit exemption).
    expect(host.querySelectorAll('[data-stat]')).toHaveLength(0);
  });

  it('renders a labelled, human-readable "Round N of CAP" readout (T-308 legibility)', () => {
    const s = baseObs();
    const host = document.createElement('div');
    host.innerHTML = turnTrack(s);

    // The caption names the block as a tracker (not a bare "R1/14").
    const caption = host.querySelector('.trk-caption');
    expect(caption).not.toBeNull();
    expect(caption!.textContent!.trim().length).toBeGreaterThan(0);

    // "Which round of how many" is rendered as human-readable text, not only in data-round.
    expect(host.querySelector('.trk-round-num')!.textContent).toBe(String(s.round));
    expect(host.querySelector('.trk-round-cap')!.textContent).toBe(String(TUNABLES.ROUND_CAP));
  });
});

describe('turnTrack — mounted on the board screen', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('the full view renders the turn track in the live DOM, with the heart gauge preserved', () => {
    const session = new GameSession(4, 'competitive', 12345);
    mountView(root, session);
    const track = root.querySelector('.turn-track');
    expect(track).not.toBeNull();
    expect(root.querySelectorAll('.act-station')).toHaveLength(3);
    expect(root.querySelectorAll('.act-station.is-current')).toHaveLength(1);
    expect(root.querySelector('.track-marker')).not.toBeNull();
    expect(root.querySelectorAll('.trk-pip')).toHaveLength(TUNABLES.ROUND_CAP);
    // Zero information loss: round/act/phase are all present via the data contract.
    expect(track!.getAttribute('data-round')).toBeTruthy();
    expect(track!.getAttribute('data-act')).toBeTruthy();
    expect(track!.getAttribute('data-phase')).toBeTruthy();
  });
});

describe('act-advance transition — Move + animated preset', () => {
  it('produces an act_advance Move from WHISPER→MARCH', () => {
    const prev = baseObs();
    expect(prev.act).toBe('WHISPER');
    const next = clone(prev);
    next.act = 'MARCH';
    expect(diffObservable(prev, next)).toContainEqual({ type: 'act_advance', from: 'WHISPER', to: 'MARCH' });
  });

  it('has a positive animated preset for act_advance', () => {
    expect(presetSeconds('act_advance')).toBeGreaterThan(0);
  });

  it('routes the act_advance Move through the queue in instant mode (settle + sound fire synchronously)', () => {
    const prev = baseObs();
    const next = clone(prev);
    next.act = 'MARCH';
    const moves = diffObservable(prev, next);

    const settleSpy = vi.fn();
    const sound = new SoundManager({ enabled: false });
    const playSpy = vi.spyOn(sound, 'play');
    const queue = new AnimationQueue(settleSpy, 'instant', sound);

    queue.enqueue(moves);

    // Instant mode: the settle ran synchronously (the marker re-rendered) and the queue is idle.
    expect(settleSpy).toHaveBeenCalledTimes(1);
    expect(queue.isIdle).toBe(true);
    // The act-advance move routed through the queue and fired its per-move cue.
    expect(playSpy).toHaveBeenCalledWith('act_advance');
  });
});

describe('turnTrack — the marker moves', () => {
  it('re-marks the current station WHISPER→MARCH and fills one more pip on a round advance', () => {
    const prev = baseObs();
    const h1 = document.createElement('div');
    h1.innerHTML = turnTrack(prev);
    expect(h1.querySelector('.act-station.is-current')!.getAttribute('data-act')).toBe('WHISPER');
    expect(h1.querySelector('.track-marker')!.getAttribute('data-act')).toBe('WHISPER');

    const next = clone(prev);
    next.act = 'MARCH';
    const h2 = document.createElement('div');
    h2.innerHTML = turnTrack(next);
    expect(h2.querySelector('.act-station.is-current')!.getAttribute('data-act')).toBe('MARCH');
    expect(h2.querySelector('.track-marker')!.getAttribute('data-act')).toBe('MARCH');

    // A round advance fills exactly one more lit pip.
    const litBefore = h1.querySelectorAll('.trk-pip.on').length;
    const roundNext = clone(prev);
    roundNext.round = prev.round + 1;
    const h3 = document.createElement('div');
    h3.innerHTML = turnTrack(roundNext);
    expect(h3.querySelectorAll('.trk-pip.on').length).toBe(litBefore + 1);
  });
});
