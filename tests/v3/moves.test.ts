/**
 * Presentation Move stream (T-101) — `diffObservable` derives semantic UI events purely from
 * two `observableState` projections of the same viewerSeat. These tests cover the representative
 * transitions (move, capture, reveal, resource change, act advance, elimination, game end) plus
 * purity/determinism and the leak-safety spot-check (nothing under the fog reaches a Move).
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { observableState } from '../../src/v3/observable.js';
import type { ObservableState } from '../../src/v3/observable.js';
import {
  diffObservable,
  MOVE_EXPECTATIONS,
  PLAYER_ACTION_EXPECTATIONS,
  type Move,
} from '../../src/ui-v3/moves.js';

/** Deep-clone a projection so a test can mutate `next` without touching `prev`. */
function clone(obs: ObservableState): ObservableState {
  return JSON.parse(JSON.stringify(obs)) as ObservableState;
}

/** Recursively freeze an object so any accidental mutation by `diffObservable` throws. */
function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object') {
    for (const v of Object.values(o)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}

/** Find the id + node of the first on-board player piece in a projection. */
function firstBoardPiece(obs: ObservableState): { id: string; node: string } {
  for (const [node, ns] of Object.entries(obs.board.state.nodes)) {
    if (ns.pieces.length > 0) return { id: ns.pieces[0].id, node };
  }
  throw new Error('no board piece found');
}

/** Find a node id whose hidden token is present and face-down. */
function faceDownTokenNode(obs: ObservableState): string {
  for (const [node, ns] of Object.entries(obs.board.state.nodes)) {
    const t = ns.hiddenToken;
    if (t !== null && !t.flipped) return node;
  }
  throw new Error('no face-down token node found');
}

const baseObs = (): ObservableState => observableState(createGame(2, 'competitive', 42), 0);

describe('diffObservable — representative transitions', () => {
  it('emits a piece_move when a piece changes node (allowed under MARCH)', () => {
    const prev = baseObs();
    const next = clone(prev);
    const { id, node: from } = firstBoardPiece(next);
    const to = prev.board.definition.nodes[from].connections[0];
    // Move the piece from `from` to an adjacent node in the next projection.
    const fromNode = next.board.state.nodes[from];
    const moved = fromNode.pieces.find(p => p.id === id)!;
    fromNode.pieces = fromNode.pieces.filter(p => p.id !== id);
    next.board.state.nodes[to].pieces.push({ ...moved, nodeId: to });

    const moves = diffObservable(prev, next);
    const mv = moves.filter(m => m.type === 'piece_move');
    expect(mv).toHaveLength(1);
    expect(mv[0]).toMatchObject({ pieceId: id, from, to, owner: moved.owner });
    expect(PLAYER_ACTION_EXPECTATIONS.MARCH).toContain('piece_move');
  });

  it('emits a capture when a captive ledger entry appears', () => {
    const prev = baseObs();
    const { id, node } = firstBoardPiece(prev);
    const next = clone(prev);
    next.captives.push({
      pieceId: id,
      ownerSeat: 0,
      captorSeat: 1,
      capturedRound: prev.round,
      recaptureImmuneUntil: 0,
    });

    const moves = diffObservable(prev, next);
    const cap = moves.filter(m => m.type === 'capture');
    expect(cap).toHaveLength(1);
    expect(cap[0]).toMatchObject({ pieceId: id, ownerSeat: 0, captorSeat: 1, node });
  });

  it('emits a ransom when a captive ledger entry is removed', () => {
    const prev = baseObs();
    const { id } = firstBoardPiece(prev);
    (prev.captives as unknown[]).push({
      pieceId: id,
      ownerSeat: 0,
      captorSeat: 1,
      capturedRound: prev.round,
      recaptureImmuneUntil: 0,
    });
    const next = clone(prev);
    next.captives = [];

    const moves = diffObservable(prev, next);
    expect(moves.filter(m => m.type === 'ransom')).toEqual([
      { type: 'ransom', pieceId: id, ownerSeat: 0 },
    ]);
  });

  it('emits token_reveal only when a face-down token flips face-up', () => {
    const prev = baseObs();
    const node = faceDownTokenNode(prev);
    const next = clone(prev);
    next.board.state.nodes[node].hiddenToken = {
      kind: 'recruit',
      sigil: 'bright',
      archetype: 'marshal',
      retainerName: 'Test Retainer',
      bonusArchetype: null,
      bonusName: null,
      flipped: true,
      bonusClaimed: false,
    };

    const moves = diffObservable(prev, next);
    const rev = moves.filter(m => m.type === 'token_reveal');
    expect(rev).toHaveLength(1);
    expect(rev[0]).toMatchObject({ node, sigil: 'bright', kind: 'recruit', archetype: 'marshal' });
  });

  it('leak-safety: a face-down→face-down node emits nothing and no move carries hidden content', () => {
    const prev = baseObs();
    const next = clone(prev); // identical — token stays face-down
    const moves = diffObservable(prev, next);
    expect(moves).toEqual([]);
    // No Move may ever carry the redacted seed or a hidden kind sourced from a face-down token.
    for (const m of moves) {
      expect(JSON.stringify(m)).not.toContain('REDACTED');
    }
  });

  it('emits banners_delta and hand_delta on resource change', () => {
    const prev = baseObs();
    const next = clone(prev);
    next.players[0].banners = prev.players[0].banners + 3;
    next.players[1].hand = prev.players[1].hand.slice(1); // drop one card

    const moves = diffObservable(prev, next);
    expect(moves).toContainEqual({
      type: 'banners_delta',
      seat: 0,
      from: prev.players[0].banners,
      to: prev.players[0].banners + 3,
    });
    expect(moves).toContainEqual({
      type: 'hand_delta',
      seat: 1,
      from: prev.players[1].hand.length,
      to: prev.players[1].hand.length - 1,
    });
  });

  it('emits a single act_advance on WHISPER→MARCH', () => {
    const prev = baseObs();
    const next = clone(prev);
    next.act = 'MARCH';
    const moves = diffObservable(prev, next);
    expect(moves.filter(m => m.type === 'act_advance')).toEqual([
      { type: 'act_advance', from: 'WHISPER', to: 'MARCH' },
    ]);
  });

  it('emits elimination when isEliminated flips true', () => {
    const prev = baseObs();
    const next = clone(prev);
    next.players[1].isEliminated = true;
    const moves = diffObservable(prev, next);
    expect(moves.filter(m => m.type === 'elimination')).toEqual([{ type: 'elimination', seat: 1 }]);
  });

  it('emits game_end when the game terminates', () => {
    const prev = baseObs();
    const next = clone(prev);
    next.gameEndReason = 'last_standing';
    next.winner = 0;
    const moves = diffObservable(prev, next);
    expect(moves.filter(m => m.type === 'game_end')).toEqual([
      { type: 'game_end', reason: 'last_standing', winner: 0 },
    ]);
  });
});

describe('diffObservable — purity & determinism', () => {
  it('diff(a, a) is empty', () => {
    const a = baseObs();
    expect(diffObservable(a, a)).toEqual([]);
  });

  it('is deterministic and does not mutate its inputs', () => {
    const prev = baseObs();
    const next = clone(prev);
    next.round = prev.round + 1;
    next.phase = 'THREAT';
    deepFreeze(prev);
    deepFreeze(next);
    const first = diffObservable(prev, next);
    const second = diffObservable(prev, next);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('produces a real, non-empty stream over an actual reducer step', () => {
    const s0 = createGame(2, 'competitive', 42);
    const prev = observableState(s0, 0);
    const s1 = applyCommand(s0, { type: 'ADVANCE_PHASE' }).state;
    const next = observableState(s1, 0);
    const moves = diffObservable(prev, next);
    // The real THREAT→PLEDGE step at minimum telegraphs and/or advances the phase.
    expect(moves.length).toBeGreaterThan(0);
    // Every emitted move must be allowed for the command that produced it (ADVANCE_PHASE).
    const allowed = new Set(MOVE_EXPECTATIONS.ADVANCE_PHASE);
    for (const m of moves) expect(allowed.has(m.type)).toBe(true);
  });
});

describe('expectation tables', () => {
  it('MOVE_EXPECTATIONS covers exactly the 8 command types', () => {
    expect(Object.keys(MOVE_EXPECTATIONS).sort()).toEqual(
      [
        'ACCUSATION_VOTE',
        'ADVANCE_PHASE',
        'INITIATE_ACCUSATION',
        'LAST_STAND_COMMIT',
        'PLAYER_ACTION',
        'SET_BEQUEST',
        'SET_WRAITH_INPUT',
        'SUBMIT_PLEDGE',
      ].sort(),
    );
  });

  it('PLAYER_ACTION_EXPECTATIONS covers exactly the 12 action types', () => {
    expect(Object.keys(PLAYER_ACTION_EXPECTATIONS)).toHaveLength(12);
  });

  it('every crafted-case move is contained in the PLAYER_ACTION expectation superset', () => {
    // A driven MARCH-style delta only emits moves allowed for PLAYER_ACTION.
    const prev = baseObs();
    const next = clone(prev);
    const { id, node: from } = firstBoardPiece(next);
    const to = prev.board.definition.nodes[from].connections[0];
    const fromNode = next.board.state.nodes[from];
    const moved = fromNode.pieces.find(p => p.id === id)!;
    fromNode.pieces = fromNode.pieces.filter(p => p.id !== id);
    next.board.state.nodes[to].pieces.push({ ...moved, nodeId: to });
    const allowed = new Set<Move['type']>(MOVE_EXPECTATIONS.PLAYER_ACTION);
    for (const m of diffObservable(prev, next)) expect(allowed.has(m.type)).toBe(true);
  });
});
