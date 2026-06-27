/**
 * Phase sequencer tests — validate the THREAT → PLEDGE → ACTION → DAWN cycle.
 *
 * Checks from ALGORITHM §4 / §7:
 *   - Phase order: THREAT → PLEDGE → ACTION → DAWN → next THREAT
 *   - Round increments at DAWN → THREAT transition
 *   - activePlayerIndex cycles through turnOrder during ACTION
 *   - Phase can't be advanced out of order
 *   - Dawn bookkeeping runs in the correct order
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { generateBannersForPlayer, runThreatPhase, resolvePledgePhase } from '../../src/v3/sequencer.js';
import { BROKEN_INCOME_BONUS, PATIENCE_ON_BLOCK, PATIENCE_CAP } from '../../src/v3/tunables.js';
import { applyCommand, InvalidCommandError } from '../../src/v3/reducer.js';
import type { Command } from '../../src/v3/commands.js';
import type { GameState } from '../../src/v3/types.js';

/** Helper to apply a command and return the new state. */
function apply(state: GameState, cmd: Command): GameState {
  return applyCommand(state, cmd).state;
}

/** Helper to submit pledges for all players (amount 0 = free-ride). */
function submitAllPledges(state: GameState, amount = 0): GameState {
  for (const p of state.players) {
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount });
  }
  return state;
}

describe('Broken income subsidy decay (§5.4 anti-exploit)', () => {
  it('the Broken income bonus decays by 1 each consecutive Broken round and floors at 0', () => {
    const state = createGame(4, 'competitive', 7);
    const p = state.players[0];
    p.isBroken = true;
    // Territory income is identical across these calls (board ownership unchanged), so the delta
    // between calls isolates the subsidy — the only term keyed on brokenRoundsConsecutive:
    //   bonus = max(BROKEN_INCOME_BONUS - brokenRoundsConsecutive + 1, 0).
    p.brokenRoundsConsecutive = 0;
    const r0 = generateBannersForPlayer(state, 0);
    p.brokenRoundsConsecutive = 1;
    const r1 = generateBannersForPlayer(state, 0);
    p.brokenRoundsConsecutive = 2;
    const r2 = generateBannersForPlayer(state, 0);
    expect(r0 - r1).toBe(1); // decays by exactly 1 per consecutive Broken round
    expect(r1 - r2).toBe(1);

    // Floors at 0: a long-Broken player gets NO subsidy — income equals the non-Broken base.
    p.brokenRoundsConsecutive = BROKEN_INCOME_BONUS + 5;
    const rFloor = generateBannersForPlayer(state, 0);
    p.isBroken = false;
    const baseNoSubsidy = generateBannersForPlayer(state, 0);
    expect(rFloor).toBe(baseNoSubsidy); // subsidy floored to 0 — comeback ramp, not a home
  });
});

describe('Patience ratchet — cooperation angers the dark (§4.2 step 6)', () => {
  it('a FULL block increments patience by PATIENCE_ON_BLOCK', () => {
    const state = createGame(2, 'competitive', 7);
    runThreatPhase(state); // set a real telegraph
    state.shadowking.patience = 0;
    // Guarantee a full block: a cheap threat met by an overwhelming pledge.
    state.shadowking.telegraph!.doomCost = 1;
    state.players[0].hand = [9, 9, 9, 9, 9];
    state.pledgeBuffer = [{ playerIndex: 0, amount: 5, tier: 'high' }];

    const { state: after } = resolvePledgePhase(state);

    expect(after.shadowking.patience).toBe(Math.min(PATIENCE_ON_BLOCK, PATIENCE_CAP));
  });

  it('a thin (un-averted) pledge does NOT increment patience', () => {
    const state = createGame(2, 'competitive', 7);
    runThreatPhase(state);
    state.shadowking.patience = 0;
    state.shadowking.telegraph!.doomCost = 99; // unreachable → the strike lands
    state.players[0].hand = [1];
    state.pledgeBuffer = [{ playerIndex: 0, amount: 1, tier: 'low' }];

    const { state: after } = resolvePledgePhase(state);

    expect(after.shadowking.patience).toBe(0); // only a FULL block ratchets the dark
  });
});

describe('Broken players keep full Pledge rights (§4.2 / §5.4)', () => {
  it("a Broken player's pledge is accepted (no isBroken guard)", () => {
    let state = createGame(2, 'competitive', 7);
    state = apply(state, { type: 'ADVANCE_PHASE' }); // THREAT → PLEDGE
    expect(state.phase).toBe('PLEDGE');
    state.players[1].isBroken = true; // a downed lord still has a voice in the Pledge
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 1, amount: 1 });
    expect(state.pledgeBuffer.some(p => p.playerIndex === 1)).toBe(true);
  });
});

/** Helper to pass all player actions (one PASS ends a player's turn). */
function passAllActions(state: GameState): GameState {
  // A single PASS ends a player's turn and advances the active pointer. After the LAST
  // player passes, the pointer stays put and the phase remains ACTION until an explicit
  // ADVANCE_PHASE — so we must pass each player exactly once, never loop on the active
  // player (that would spin forever on the final player).
  for (const playerIndex of state.turnOrder) {
    if (state.phase === 'ACTION' && state.activePlayerIndex === playerIndex) {
      state = apply(state, {
        type: 'PLAYER_ACTION',
        playerIndex,
        action: { type: 'PASS' },
      });
    }
  }
  return state;
}

describe('Phase Sequencer', () => {
  describe('phase transitions', () => {
    it('starts in THREAT phase', () => {
      const state = createGame(4, 'competitive', 42);
      expect(state.phase).toBe('THREAT');
    });

    it('THREAT → PLEDGE on ADVANCE_PHASE', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' });
      expect(state.phase).toBe('PLEDGE');
    });

    it('PLEDGE → ACTION on ADVANCE_PHASE (after all pledges)', () => {
      let state = createGame(4, 'competitive', 42);
      // THREAT → PLEDGE
      state = apply(state, { type: 'ADVANCE_PHASE' });
      expect(state.phase).toBe('PLEDGE');

      // Submit all pledges
      state = submitAllPledges(state);

      // PLEDGE → ACTION
      state = apply(state, { type: 'ADVANCE_PHASE' });
      expect(state.phase).toBe('ACTION');
    });

    it('ACTION → DAWN on ADVANCE_PHASE (after all pass)', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      state = submitAllPledges(state);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION
      state = passAllActions(state);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → DAWN (runs + → THREAT)
      // Dawn auto-transitions to THREAT of next round
      expect(state.phase).toBe('THREAT');
      expect(state.round).toBe(2);
    });
  });

  describe('round progression', () => {
    it('round increments from 1 to 2 after a full cycle', () => {
      let state = createGame(4, 'competitive', 42);
      expect(state.round).toBe(1);

      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      state = submitAllPledges(state);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION
      state = passAllActions(state);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → DAWN → THREAT

      expect(state.round).toBe(2);
    });
  });

  describe('THREAT phase', () => {
    it('sets the Shadowking telegraph on ADVANCE_PHASE', () => {
      let state = createGame(4, 'competitive', 42);
      expect(state.shadowking.telegraph).toBeNull();

      state = apply(state, { type: 'ADVANCE_PHASE' });
      // Telegraph is set during the THREAT → PLEDGE transition
      // (runThreatPhase runs when ADVANCE_PHASE is called during THREAT)
      expect(state.shadowking.telegraph).not.toBeNull();
      expect(state.shadowking.telegraph!.doomCost).toBeGreaterThan(0);
    });

    it('telegraph includes a first-person line', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' });
      expect(state.shadowking.telegraph!.firstPersonLine).toBeDefined();
      expect(state.shadowking.telegraph!.firstPersonLine.length).toBeGreaterThan(0);
    });
  });

  describe('PLEDGE phase validation', () => {
    it('cannot advance from PLEDGE without all pledges', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE

      // Try to advance without pledges
      expect(() => apply(state, { type: 'ADVANCE_PHASE' })).toThrow(InvalidCommandError);
    });

    it('cannot submit pledge outside PLEDGE phase', () => {
      const state = createGame(4, 'competitive', 42);
      // Still in THREAT
      expect(() =>
        apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 0 }),
      ).toThrow(InvalidCommandError);
    });

    it('cannot submit pledge twice', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 0 });
      expect(() =>
        apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 0 }),
      ).toThrow(InvalidCommandError);
    });

    it('cannot pledge more cards than in hand', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      const handSize = state.players[0].hand.length;
      expect(() =>
        apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: handSize + 1 }),
      ).toThrow(InvalidCommandError);
    });

    it('cannot pledge negative amount', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      expect(() =>
        apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: -1 }),
      ).toThrow(InvalidCommandError);
    });
  });

  describe('ACTION phase', () => {
    function getToActionPhase(): GameState {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      state = submitAllPledges(state);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION
      return state;
    }

    it('sets activePlayerIndex to first in turnOrder', () => {
      const state = getToActionPhase();
      expect(state.activePlayerIndex).toBe(state.turnOrder[0]);
    });

    it('players have actions available', () => {
      const state = getToActionPhase();
      for (const p of state.players) {
        expect(p.actionsRemaining).toBeGreaterThan(0);
      }
    });

    it('cannot perform actions outside ACTION phase', () => {
      const state = createGame(4, 'competitive', 42);
      expect(() =>
        apply(state, {
          type: 'PLAYER_ACTION',
          playerIndex: 0,
          action: { type: 'PASS' },
        }),
      ).toThrow(InvalidCommandError);
    });

    it('cannot act when it is not your turn', () => {
      const state = getToActionPhase();
      const notActive = state.players.find(p => p.index !== state.activePlayerIndex)!;
      expect(() =>
        apply(state, {
          type: 'PLAYER_ACTION',
          playerIndex: notActive.index,
          action: { type: 'PASS' },
        }),
      ).toThrow(InvalidCommandError);
    });

    it('PASS ends a player\'s turn', () => {
      let state = getToActionPhase();
      const firstPlayer = state.activePlayerIndex;
      state = apply(state, {
        type: 'PLAYER_ACTION',
        playerIndex: firstPlayer,
        action: { type: 'PASS' },
      });
      // Should have advanced to next player
      expect(state.activePlayerIndex).not.toBe(firstPlayer);
    });

    it('actions decrement actionsRemaining', () => {
      let state = getToActionPhase();
      const player = state.activePlayerIndex;
      const beforeActions = state.players[player].actionsRemaining;

      // Find a real adjacent node to MARCH to (player's Warlord is at their Keep)
      const warlordNode = state.players[player].warlordNodeId;
      const adjacentNode = state.board.definition.nodes[warlordNode].connections[0];

      // Perform a MARCH to a real adjacent node
      state = apply(state, {
        type: 'PLAYER_ACTION',
        playerIndex: player,
        action: { type: 'MARCH', targetNodeId: adjacentNode },
      });

      expect(state.players[player].actionsRemaining).toBe(beforeActions - 1);
    });

    it('cannot advance from ACTION until all players done', () => {
      const state = getToActionPhase();
      expect(() => apply(state, { type: 'ADVANCE_PHASE' })).toThrow(InvalidCommandError);
    });
  });

  describe('events', () => {
    it('ADVANCE_PHASE emits PHASE_CHANGED event', () => {
      const state = createGame(4, 'competitive', 42);
      const result = applyCommand(state, { type: 'ADVANCE_PHASE' });
      const phaseEvents = result.events.filter(e => e.type === 'PHASE_CHANGED');
      expect(phaseEvents.length).toBeGreaterThan(0);
    });

    it('SUBMIT_PLEDGE emits PLEDGE_SUBMITTED event', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
      const result = applyCommand(state, {
        type: 'SUBMIT_PLEDGE',
        playerIndex: 0,
        amount: 1,
      });
      const pledgeEvents = result.events.filter(e => e.type === 'PLEDGE_SUBMITTED');
      expect(pledgeEvents.length).toBe(1);
    });

    it('events are appended to actionLog', () => {
      let state = createGame(4, 'competitive', 42);
      state = apply(state, { type: 'ADVANCE_PHASE' });
      expect(state.actionLog.length).toBeGreaterThan(0);
    });
  });

  describe('game over prevents further commands', () => {
    it('throws on any command after game over', () => {
      const state = createGame(4, 'competitive', 42);
      // Force game over
      state.gameEndReason = 'territory_victory';
      state.winner = 0;

      expect(() => apply(state, { type: 'ADVANCE_PHASE' })).toThrow(InvalidCommandError);
    });
  });
});
