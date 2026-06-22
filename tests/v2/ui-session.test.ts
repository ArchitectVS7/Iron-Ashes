/**
 * UI session-driver smoke tests (Stage 3e).
 *
 * The `GameSession` is the UI's engine driver — pure logic (no DOM): it sequences
 * phases, auto-runs AI seats, and routes every input through applyCommand. These
 * tests confirm it drives full games to a terminal state without hanging or
 * desyncing. The rendering layer (board-view/view) is verified by running the app.
 */

import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/ui-v2/session.js';

/** Drive a full game through the SESSION (the UI driver), as a human would. */
function playViaSession(mode: 'competitive' | 'blood_pact'): GameSession {
  const s = new GameSession(4, mode, 42);
  let guard = 0;
  while (!s.isOver && guard < 2000) {
    guard++;
    if (s.phase === 'THREAT') {
      s.advanceFromThreat();
    } else if (s.phase === 'PLEDGE') {
      s.submitHumanPledge(s.suggestedHumanPledge());
    } else if (s.phase === 'ACTION') {
      // It's the human's turn (session stops here); just end it.
      if (s.isHumanTurn) s.humanAction({ type: 'PLAYER_ACTION', playerIndex: 0, action: { type: 'PASS' } });
      else break; // shouldn't happen — session auto-runs AI
    } else {
      break;
    }
  }
  return s;
}

describe('UI session smoke', () => {
  it('drives a full competitive game to a terminal state', () => {
    const s = playViaSession('competitive');
    expect(s.isOver).toBe(true);
    expect(s.state.gameEndReason).not.toBeNull();
  });

  it('drives a full blood_pact game to a terminal state', () => {
    const s = playViaSession('blood_pact');
    expect(s.isOver).toBe(true);
  });

  it('never desyncs: after a human pledge it reaches the human turn or game end', () => {
    const s = new GameSession(4, 'competitive', 7);
    s.advanceFromThreat();
    s.submitHumanPledge(1);
    expect(s.isHumanTurn || s.isOver || s.phase === 'THREAT').toBe(true);
  });
});
