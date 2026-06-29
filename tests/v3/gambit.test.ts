/**
 * Gambit system tests — validate the Crown's Gambit (§6) and
 * territory victory tiebreakers.
 *
 * Checks:
 *   - Gambit seize: marching onto Keystone initiates Gambit
 *   - Gambit declare: holding Keystone at Dawn → public + named
 *   - Gambit victory: still holding at NEXT Dawn → win
 *   - Gambit collapse: losing Keystone → Gambit nullified
 *   - Gambit surcharge: claimant's Pledge weight = GAMBIT_SURCHARGE
 *   - Traitor cannot initiate Gambit (Blood Pact guardrail)
 *   - Keystone garrisoned check
 *   - Territory tiebreakers: 4-level deterministic sort
 *   - Patience-triggered escalation
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  checkGambitSeize,
  evaluateGambitAtDawn,
  getEffectivePledgeWeight,
  isKeystoneGarrisoned,
  computeTerritoryWinner,
} from '../../src/v3/gambit.js';
import {
  CROWN_PLEDGE_DISCOUNT,
  GAMBIT_SURCHARGE,
  PATIENCE_CAP,
} from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';
import { applyCommand } from '../../src/v3/reducer.js';

describe('Gambit System', () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame(4, 'competitive', 42);
  });

  describe('checkGambitSeize()', () => {
    it('initiates Gambit when player is on Keystone', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;

      const events = checkGambitSeize(state, 0);
      expect(state.gambit).not.toBeNull();
      expect(state.gambit!.claimant).toBe(0);
      expect(state.gambit!.named).toBe(false);
      expect(state.gambit!.declaredRound).toBe(0);
    });

    it('does nothing if player is NOT on Keystone', () => {
      const events = checkGambitSeize(state, 0);
      expect(state.gambit).toBeNull();
      expect(events.length).toBe(0);
    });

    it('does nothing if same player already has Gambit', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 0, named: false };

      const events = checkGambitSeize(state, 0);
      expect(events.length).toBe(0);
    });

    it('collapses existing Gambit when different player seizes', () => {
      const ks = state.board.definition.keystoneId;
      state.gambit = { claimant: 1, declaredRound: 1, named: true };
      state.players[2].warlordNodeId = ks;

      const events = checkGambitSeize(state, 2);
      expect(state.gambit!.claimant).toBe(2);
      // Should have collapse event
      expect(events.some(e =>
        e.type === 'PLAYER_ACTED' && 'gambitCollapsed' in (e as { details: Record<string, unknown> }).details
      )).toBe(true);
    });

    it('traitor cannot seize Gambit in blood_pact mode', () => {
      const bpState = createGame(4, 'blood_pact', 42);
      bpState.bloodPactHolder = 0;
      bpState.players[0].warlordNodeId = bpState.board.definition.keystoneId;

      const events = checkGambitSeize(bpState, 0);
      expect(bpState.gambit).toBeNull();
    });
  });

  describe('evaluateGambitAtDawn()', () => {
    it('returns null when no Gambit active', () => {
      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBeNull();
    });

    it('declares Gambit on first Dawn holding Keystone', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 0, named: false };

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBe('declared');
      expect(state.gambit!.named).toBe(true);
      expect(state.gambit!.declaredRound).toBe(state.round);
      // Should have voice line
      expect(result.events.some(e => e.type === 'SK_VOICE_LINE')).toBe(true);
    });

    it('awards Gambit victory on second Dawn still holding', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 1, named: true };

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBe('gambit_victory');
      expect(state.gameEndReason).toBe('gambit_victory');
      expect(state.winner).toBe(0);
    });

    it('collapses Gambit if claimant no longer on Keystone', () => {
      state.gambit = { claimant: 0, declaredRound: 1, named: true };
      // Player 0 is NOT on keystone (still at their keep)

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBe('collapsed');
      expect(state.gambit).toBeNull();
    });

    it('collapses Gambit if Keystone is ashed', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.board.state.nodes[ks].ashed = true;
      state.gambit = { claimant: 0, declaredRound: 1, named: true };

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBe('collapsed');
    });

    it('Gambit held into round cap resolves BEFORE territory', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 1, named: true };
      state.round = 12; // At round cap

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBe('gambit_victory');
      expect(state.winner).toBe(0);
    });

    // ── Win-gate (Stage 5h, §6): no conversion while the dark's heart is exposed at the Keystone ──
    it('does NOT declare a Gambit while the heart is exposed at the Keystone', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 0, named: false };
      state.shadowking.heart = {
        nodeId: ks, hp: 12, exposed: true, committedBySeat: [0, 0, 0, 0], raidLeader: null,
      };

      const result = evaluateGambitAtDawn(state);
      // Stalled, not declared — the throne can't be claimed over a beating heart.
      expect(state.gambit!.named).toBe(false);
      expect(state.gameEndReason).not.toBe('gambit_victory');
      expect(result.events.some(e =>
        e.type === 'PLAYER_ACTED' && 'gambitStalled' in (e as { details: Record<string, unknown> }).details
      )).toBe(true);
    });

    it('does NOT award Gambit victory while the heart is exposed at the Keystone', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 1, named: true };
      state.shadowking.heart = {
        nodeId: ks, hp: 6, exposed: true, committedBySeat: [0, 0, 0, 0], raidLeader: null,
      };

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).not.toBe('gambit_victory');
      expect(state.winner).toBeNull();
    });

    it('awards Gambit victory once the heart is broken (no longer exposed)', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 1, named: true };
      // Heart at 0 HP, no longer exposed — the gate lifts.
      state.shadowking.heart = {
        nodeId: ks, hp: 0, exposed: false, committedBySeat: [0, 0, 0, 0], raidLeader: 0,
      };

      const result = evaluateGambitAtDawn(state);
      expect(result.outcome).toBe('gambit_victory');
      expect(state.winner).toBe(0);
    });
  });

  describe('getEffectivePledgeWeight()', () => {
    it('returns 1.0 for non-Crown, non-Gambit player', () => {
      expect(getEffectivePledgeWeight(state, 2, CROWN_PLEDGE_DISCOUNT)).toBe(1.0);
    });

    it('returns CROWN_PLEDGE_DISCOUNT for Crown holder', () => {
      state.players[0].crownHeld = true;
      expect(getEffectivePledgeWeight(state, 0, CROWN_PLEDGE_DISCOUNT)).toBe(CROWN_PLEDGE_DISCOUNT);
    });

    it('returns GAMBIT_SURCHARGE for named Gambit claimant (worst discount)', () => {
      state.gambit = { claimant: 1, declaredRound: 1, named: true };
      const weight = getEffectivePledgeWeight(state, 1, CROWN_PLEDGE_DISCOUNT);
      expect(weight).toBe(GAMBIT_SURCHARGE);
      expect(weight).toBeLessThan(CROWN_PLEDGE_DISCOUNT); // Worse than Crown
    });

    it('returns 1.0 for Gambit claimant before declaration (not named)', () => {
      state.gambit = { claimant: 1, declaredRound: 0, named: false };
      // Not named yet — no surcharge
      expect(getEffectivePledgeWeight(state, 1, CROWN_PLEDGE_DISCOUNT)).toBe(1.0);
    });
  });

  describe('isKeystoneGarrisoned()', () => {
    it('returns false when no Gambit', () => {
      expect(isKeystoneGarrisoned(state)).toBe(false);
    });

    it('returns true when Gambit claimant is on Keystone', () => {
      const ks = state.board.definition.keystoneId;
      state.players[0].warlordNodeId = ks;
      state.gambit = { claimant: 0, declaredRound: 1, named: true };

      expect(isKeystoneGarrisoned(state)).toBe(true);
    });

    it('returns false when Gambit claimant is NOT on Keystone', () => {
      state.gambit = { claimant: 0, declaredRound: 1, named: true };
      // Player 0 still at keep
      expect(isKeystoneGarrisoned(state)).toBe(false);
    });
  });

  describe('computeTerritoryWinner()', () => {
    it('returns the player with the most territory', () => {
      // Give player 0 a forge (3 territory) and player 1 a holding (1 territory)
      state.board.state.nodes['forge-nw'].owner = 0;
      state.board.state.nodes['holding-ne'].owner = 1;

      expect(computeTerritoryWinner(state)).toBe(0); // Player 0 has more
    });

    it('breaks ties by fewest ashed neighbors', () => {
      // Give both players equal territory
      state.board.state.nodes['holding-ne'].owner = 0;
      state.board.state.nodes['holding-se'].owner = 1;

      // Ash a neighbor of player 0's holding
      state.board.state.nodes['keep-n'].ashed = true;
      state.board.state.nodes['keep-n'].blightLevel = 3;

      // Player 1 should win (fewer ashed neighbors)
      expect(computeTerritoryWinner(state)).toBe(1);
    });

    it('breaks further ties by most banners', () => {
      state.board.state.nodes['holding-ne'].owner = 0;
      state.board.state.nodes['holding-se'].owner = 1;

      state.players[0].banners = 5;
      state.players[1].banners = 10;

      expect(computeTerritoryWinner(state)).toBe(1); // More banners
    });

    it('final tiebreak is seat order', () => {
      // Perfect tie — same territory, same ashed neighbors, same banners
      state.board.state.nodes['holding-ne'].owner = 0;
      state.board.state.nodes['holding-se'].owner = 1;
      state.players[0].banners = 5;
      state.players[1].banners = 5;

      expect(computeTerritoryWinner(state)).toBe(0); // Earlier seat
    });

    it('eliminated players are ineligible', () => {
      state.board.state.nodes['forge-nw'].owner = 0;
      state.board.state.nodes['holding-ne'].owner = 1;
      state.players[0].isEliminated = true;

      // Player 0 has more territory but is eliminated (§6)
      expect(computeTerritoryWinner(state)).toBe(1);
    });

    it('returns null when all players are eliminated', () => {
      for (const p of state.players) p.isEliminated = true;
      expect(computeTerritoryWinner(state)).toBeNull();
    });

    it('counts Keeps (pre-claimed) as territory', () => {
      // Keeps are pre-claimed by setup — each player should have 1
      const winner = computeTerritoryWinner(state);
      expect(winner).not.toBeNull();
      // All players have 1 keep each — tiebreak by banners or seat
    });
  });
});

describe('Patience-Triggered Escalation', () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame(4, 'competitive', 42);
  });

  it('patience at cap triggers Act advance at Dawn', () => {
    state.shadowking.patience = PATIENCE_CAP;
    state.act = 'WHISPER';

    // Run a full round to reach Dawn (applyCommand imported at top — ESM, not require)

    // THREAT
    let result = applyCommand(state, { type: 'ADVANCE_PHASE' });
    state = result.state;

    // PLEDGE — all players pledge 0
    for (let i = 0; i < 4; i++) {
      result = applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: i, amount: 0 });
      state = result.state;
    }
    result = applyCommand(state, { type: 'ADVANCE_PHASE' });
    state = result.state;

    // ACTION — all pass
    for (let i = 0; i < state.turnOrder.length; i++) {
      const pi = state.turnOrder[i];
      result = applyCommand(state, {
        type: 'PLAYER_ACTION', playerIndex: pi,
        action: { type: 'PASS' },
      });
      state = result.state;
    }
    result = applyCommand(state, { type: 'ADVANCE_PHASE' });
    state = result.state;

    // After Dawn, patience should have triggered an Act advance
    // (patience was at cap → forced escalation → WHISPER → MARCH)
    expect(state.act).toBe('MARCH');
    expect(state.shadowking.patience).toBe(0); // Reset after trigger
  });
});
