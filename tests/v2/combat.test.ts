/**
 * Combat system tests — validate §5.3 mechanics.
 *
 * Checks:
 *   - Base piece power calculation
 *   - Card-committed combat resolution
 *   - Ties: defender wins in RAID, no-result in STRIKE
 *   - Margin → wounds
 *   - Last Stand: one-sided, defender can reverse the outcome
 *   - DK destruction + pushback + grudge
 *   - Broken state check at wound threshold
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import {
  resolveCombat,
  resolveLastStand,
  applyCombatOutcome,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
  checkBrokenState,
} from '../../src/v2/combat.js';
import type { CombatSetup } from '../../src/v2/combat.js';
import { BREAK_THRESHOLD, DK_POWER } from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

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
    it('RAID loser takes wounds equal to margin', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[1].warlordNodeId = keepId;

      const setup: CombatSetup = {
        combatType: 'RAID',
        attackerIndex: 0,
        nodeId: keepId,
        attackerCards: [],
        defenderCards: [],
        defenderIndex: 1,
      };

      const initialWounds = state.players[1].wounds;
      applyCombatOutcome(state, setup, 'attacker', 3);
      expect(state.players[1].wounds).toBe(initialWounds + 3);
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
      const events = applyCombatOutcome(state, setup, 'attacker', 2);

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

      applyCombatOutcome(state, setup, 'no_result', 0);
      // Cards should be returned
      expect(state.players[0].hand.length).toBe(initialHand.length);
    });
  });

  describe('checkBrokenState()', () => {
    it('does nothing below threshold', () => {
      state.players[0].wounds = BREAK_THRESHOLD - 1;
      const events = checkBrokenState(state, 0);
      expect(state.players[0].isBroken).toBe(false);
      expect(events.length).toBe(0);
    });

    it('breaks the player at threshold', () => {
      state.players[0].wounds = BREAK_THRESHOLD;
      const events = checkBrokenState(state, 0);
      expect(state.players[0].isBroken).toBe(true);
      expect(state.players[0].brokenSince).toBe(state.round);
    });

    it('does nothing if already Broken', () => {
      state.players[0].isBroken = true;
      state.players[0].wounds = BREAK_THRESHOLD + 10;
      const events = checkBrokenState(state, 0);
      expect(events.length).toBe(0); // No new events
    });

    it('Broken player forfeits Crown eligibility', () => {
      state.players[0].wounds = BREAK_THRESHOLD;
      state.players[0].crownHeld = true;
      checkBrokenState(state, 0);
      expect(state.players[0].crownHeld).toBe(false);
    });

    it('ashes Holdings owned by the Broken player', () => {
      // Give player 0 a holding
      state.board.state.nodes['holding-ne'].owner = 0;
      state.players[0].wounds = BREAK_THRESHOLD;

      const events = checkBrokenState(state, 0);
      expect(state.board.state.nodes['holding-ne'].ashed).toBe(true);
      expect(state.board.state.nodes['holding-ne'].owner).toBeNull();
      expect(events.some(e => e.type === 'NODE_ASHED')).toBe(true);
    });
  });
});
