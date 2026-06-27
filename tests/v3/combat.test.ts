/**
 * Combat system tests — validate §5.3 mechanics.
 *
 * Checks:
 *   - Base piece power calculation
 *   - Card-committed combat resolution
 *   - Ties: defender wins in RAID, no-result in STRIKE
 *   - Card discard on combat outcome (Broken/wounds retired §8)
 *   - Last Stand: one-sided, defender can reverse the outcome
 *   - DK destruction + pushback + grudge
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  resolveCombat,
  resolveLastStand,
  applyCombatOutcome,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
} from '../../src/v3/combat.js';
import type { CombatSetup } from '../../src/v3/combat.js';
import { DK_POWER } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

describe('Combat System', () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame(4, 'competitive', 42);
  });

  describe('getPlayerPowerAtNode()', () => {
    it('returns 0 when no pieces at the node', () => {
      expect(getPlayerPowerAtNode(state, 0, 'keystone')).toBe(0);
    });

    it('returns piece power when Warlord is at the node', () => {
      const keepId = state.board.definition.keepIds[0];
      const power = getPlayerPowerAtNode(state, 0, keepId);
      expect(power).toBeGreaterThan(0);
    });
  });

  describe('getShadowkingPowerAtNode()', () => {
    it('returns 0 when no SK forces at the node', () => {
      expect(getShadowkingPowerAtNode(state, 'keystone')).toBe(0);
    });

    it('returns DK power when Death Knight is at the node', () => {
      // Use a clean node — setup seeds the blight-entry seams (incl. holdings) with forces.
      const nodeId = 'holding-ne';
      state.board.state.nodes[nodeId].shadowkingForces = [];
      const dk = state.shadowking.forces.find(f => f.type === 'death_knight');
      expect(dk).toBeDefined();
      state.board.state.nodes[nodeId].shadowkingForces.push(dk!);
      expect(getShadowkingPowerAtNode(state, nodeId)).toBe(DK_POWER);
    });
  });

  describe('resolveCombat()', () => {
    it('attacker wins when atk power > def power', () => {
      const keepId = state.board.definition.keepIds[0];
      const setup: CombatSetup = {
        combatType: 'RAID',
        attackerIndex: 0,
        nodeId: keepId,
        attackerCards: [3, 3], // High card commitment
        defenderCards: [1],
        defenderIndex: 1,
      };

      // Move defender to same node for test
      state.players[1].warlordNodeId = keepId;
      state.board.state.nodes[keepId].pieces.push({
        id: 'warlord-1', type: 'warlord', owner: 1, power: 2, nodeId: keepId,
      });

      const result = resolveCombat(state, setup);
      expect(result.winner).toBe('attacker');
      expect(result.margin).toBeGreaterThan(0);
    });

    it('defender wins ties in RAID', () => {
      // Controlled empty node — equal base power both sides → a true tie (defender wins).
      const nodeId = 'holding-ne';
      state.board.state.nodes[nodeId].pieces = [];
      state.board.state.nodes[nodeId].shadowkingForces = [];
      state.board.state.nodes[nodeId].pieces.push(
        { id: 'a', type: 'warlord', owner: 0, power: 2, nodeId },
        { id: 'd', type: 'warlord', owner: 1, power: 2, nodeId },
      );
      const setup: CombatSetup = {
        combatType: 'RAID',
        attackerIndex: 0,
        nodeId,
        attackerCards: [],
        defenderCards: [],
        defenderIndex: 1,
      };

      const result = resolveCombat(state, setup);
      expect(result.winner).toBe('defender');
    });

    it('no-result on ties in STRIKE vs SK (P1/A5)', () => {
      const nodeId = 'holding-ne';
      // Clean node (setup seeds seams with forces); control both sides to an exact tie.
      state.board.state.nodes[nodeId].shadowkingForces = [];
      state.board.state.nodes[nodeId].pieces = [];
      state.board.state.nodes[nodeId].shadowkingForces.push({
        id: 'dk-test', type: 'death_knight', power: 4, nodeId,
      });
      state.board.state.nodes[nodeId].pieces.push({
        id: 'warlord-0', type: 'warlord', owner: 0, power: 2, nodeId,
      });

      const setup: CombatSetup = {
        combatType: 'STRIKE',
        attackerIndex: 0,
        nodeId,
        attackerCards: [2], // 2 + 2 warlord = 4 = DK power
        defenderCards: [],
        defenderIndex: null,
      };

      const result = resolveCombat(state, setup);
      expect(result.winner).toBe('no_result');
    });

    it('computes margin correctly', () => {
      // Controlled empty node so base power is exactly 2 each (setup gives keeps power-3 warlords).
      const nodeId = 'holding-ne';
      state.board.state.nodes[nodeId].pieces = [];
      state.board.state.nodes[nodeId].shadowkingForces = [];
      state.board.state.nodes[nodeId].pieces.push(
        { id: 'a', type: 'warlord', owner: 0, power: 2, nodeId },
        { id: 'd', type: 'warlord', owner: 1, power: 2, nodeId },
      );

      const setup: CombatSetup = {
        combatType: 'RAID',
        attackerIndex: 0,
        nodeId,
        attackerCards: [4],  // 2 base + 4 card = 6
        defenderCards: [],   // 2 base = 2
        defenderIndex: 1,
      };

      const result = resolveCombat(state, setup);
      expect(result.winner).toBe('attacker');
      expect(result.margin).toBe(4); // 6 - 2
    });
  });

  describe('resolveLastStand()', () => {
    it('defender can reverse outcome with Last Stand cards', () => {
      const initialResult = {
        winner: 'attacker' as const,
        attackPower: 5,
        defensePower: 3,
        margin: 2,
        lastStandAvailable: true,
        events: [],
      };

      // Defender commits 3 additional cards
      const result = resolveLastStand(initialResult, [3, 2]);
      expect(result.defensePower).toBe(8); // 3 + 3 + 2
      expect(result.winner).toBe('defender');
    });

    it('attacker still wins if Last Stand is insufficient', () => {
      const initialResult = {
        winner: 'attacker' as const,
        attackPower: 10,
        defensePower: 3,
        margin: 7,
        lastStandAvailable: true,
        events: [],
      };

      const result = resolveLastStand(initialResult, [1]);
      expect(result.defensePower).toBe(4);
      expect(result.winner).toBe('attacker');
    });

    it('ties go to defender in Last Stand', () => {
      const initialResult = {
        winner: 'attacker' as const,
        attackPower: 5,
        defensePower: 3,
        margin: 2,
        lastStandAvailable: true,
        events: [],
      };

      const result = resolveLastStand(initialResult, [2]);
      expect(result.defensePower).toBe(5); // Equal
      expect(result.winner).toBe('defender'); // Ties → defender
    });
  });

  describe('applyCombatOutcome()', () => {
    it('RAID discards committed cards from both sides (no wounds — Broken retired §8)', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[0].warlordNodeId = keepId;
      state.players[1].warlordNodeId = keepId;
      state.players[0].hand = [1, 2, 5];
      state.players[1].hand = [3, 4];

      const setup: CombatSetup = {
        combatType: 'RAID',
        attackerIndex: 0,
        nodeId: keepId,
        attackerCards: [5],
        defenderCards: [3],
        defenderIndex: 1,
      };

      applyCombatOutcome(state, setup, 'attacker');
      // Committed cards are spent; the rest of each hand is untouched, no wounds field.
      expect(state.players[0].hand).toEqual([1, 2]);
      expect(state.players[1].hand).toEqual([4]);
    });

    it('STRIKE win destroys SK force and adds grudge', () => {
      const nodeId = 'holding-ne';
      state.board.state.nodes[nodeId].shadowkingForces = []; // clear setup-seeded forces
      state.board.state.nodes[nodeId].shadowkingForces.push({
        id: 'dk-test', type: 'death_knight', power: DK_POWER, nodeId,
      });
      state.shadowking.forces.push({
        id: 'dk-test', type: 'death_knight', power: DK_POWER, nodeId,
      });

      const setup: CombatSetup = {
        combatType: 'STRIKE',
        attackerIndex: 0,
        nodeId,
        attackerCards: [3],
        defenderCards: [],
        defenderIndex: null,
      };

      const initialGrudge = state.shadowking.grudge[0];
      const events = applyCombatOutcome(state, setup, 'attacker');

      // DK should be removed
      expect(state.board.state.nodes[nodeId].shadowkingForces.length).toBe(0);
      // Grudge should increase
      expect(state.shadowking.grudge[0]).toBeGreaterThan(initialGrudge);
      // Should have voice line event
      expect(events.some(e => e.type === 'SK_VOICE_LINE')).toBe(true);
    });

    it('STRIKE tie returns cards (no-result)', () => {
      const nodeId = 'holding-ne';
      const initialHand = [...state.players[0].hand];
      const cardsToCommit = [initialHand[0]];

      const setup: CombatSetup = {
        combatType: 'STRIKE',
        attackerIndex: 0,
        nodeId,
        attackerCards: cardsToCommit,
        defenderCards: [],
        defenderIndex: null,
      };

      applyCombatOutcome(state, setup, 'no_result');
      // Cards should be returned
      expect(state.players[0].hand.length).toBe(initialHand.length);
    });
  });

  // checkBrokenState() tests removed (§8): the Broken Court is retired. Elimination is now
  // tested via resolveDeposals / end-conditions in all-broken-victory.test.ts.
});
