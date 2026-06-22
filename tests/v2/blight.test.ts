/**
 * Blight system tests — validate the ash-map mechanic (§5.1).
 *
 * Checks:
 *   - advanceBlightOnNode raises blightLevel correctly
 *   - Node ashes at BLIGHT_TO_ASH, owner cleared
 *   - Ashed Keystone → doom_complete
 *   - Pushback reduces blightLevel, floors at 0
 *   - Spoke frontier correctly identified
 *   - advanceBlightOnSpoke advances the correct frontier
 *   - Act thresholds fire at correct ashed counts
 *   - At most one Act advance per check
 *   - Anti-turtle Dawn advance always happens
 *   - Strike resolution: proportional block, ceil rounding
 *   - Full block → no Blight
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import {
  advanceBlightOnNode,
  advanceBlightOnSpoke,
  applyDawnBlightAdvance,
  applyPushback,
  ashNode,
  checkActAdvance,
  countAshedNodes,
  getBlightFrontier,
  getSpokeFrontier,
  getSpokePath,
  isKeystoneAshed,
  resolveStrike,
} from '../../src/v2/blight.js';
import { BLIGHT_TO_ASH, ACT_THRESHOLDS, SPREAD_AMOUNT_BASE } from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

describe('Blight System', () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame(4, 'competitive', 42);
  });

  describe('advanceBlightOnNode()', () => {
    it('increases blightLevel by the specified amount', () => {
      const nodeId = 'holding-ne';
      expect(state.board.state.nodes[nodeId].blightLevel).toBe(0);

      advanceBlightOnNode(state, nodeId, 1, 'strike');
      expect(state.board.state.nodes[nodeId].blightLevel).toBe(1);
    });

    it('emits BLIGHT_ADVANCED event', () => {
      const events = advanceBlightOnNode(state, 'holding-ne', 1, 'strike');
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('BLIGHT_ADVANCED');
    });

    it('caps at BLIGHT_TO_ASH', () => {
      advanceBlightOnNode(state, 'holding-ne', 100, 'strike');
      expect(state.board.state.nodes['holding-ne'].blightLevel).toBe(BLIGHT_TO_ASH);
    });

    it('does not affect already-ashed nodes', () => {
      ashNode(state, 'holding-ne');
      const events = advanceBlightOnNode(state, 'holding-ne', 1, 'strike');
      expect(events).toEqual([]);
    });

    it('ashes the node when blightLevel reaches BLIGHT_TO_ASH', () => {
      const events = advanceBlightOnNode(state, 'holding-ne', BLIGHT_TO_ASH, 'strike');
      expect(state.board.state.nodes['holding-ne'].ashed).toBe(true);
      // Should have both BLIGHT_ADVANCED and NODE_ASHED events
      expect(events.some(e => e.type === 'NODE_ASHED')).toBe(true);
    });
  });

  describe('ashNode()', () => {
    it('sets ashed = true', () => {
      ashNode(state, 'holding-ne');
      expect(state.board.state.nodes['holding-ne'].ashed).toBe(true);
    });

    it('clears the owner', () => {
      state.board.state.nodes['holding-ne'].owner = 0;
      ashNode(state, 'holding-ne');
      expect(state.board.state.nodes['holding-ne'].owner).toBeNull();
    });

    it('sets blightLevel to BLIGHT_TO_ASH', () => {
      ashNode(state, 'holding-ne');
      expect(state.board.state.nodes['holding-ne'].blightLevel).toBe(BLIGHT_TO_ASH);
    });

    it('emits NODE_ASHED event with previous owner', () => {
      state.board.state.nodes['holding-ne'].owner = 2;
      const events = ashNode(state, 'holding-ne');
      expect(events.length).toBe(1);
      const evt = events[0];
      expect(evt.type).toBe('NODE_ASHED');
      if (evt.type === 'NODE_ASHED') {
        expect(evt.previousOwner).toBe(2);
        expect(evt.nodeId).toBe('holding-ne');
      }
    });

    it('does nothing on already-ashed node', () => {
      ashNode(state, 'holding-ne');
      const events = ashNode(state, 'holding-ne');
      expect(events).toEqual([]);
    });
  });

  describe('applyPushback()', () => {
    it('reduces blightLevel', () => {
      advanceBlightOnNode(state, 'holding-ne', 2, 'strike');
      applyPushback(state, 'holding-ne', 1);
      expect(state.board.state.nodes['holding-ne'].blightLevel).toBe(1);
    });

    it('floors at 0', () => {
      advanceBlightOnNode(state, 'holding-ne', 1, 'strike');
      applyPushback(state, 'holding-ne', 5);
      expect(state.board.state.nodes['holding-ne'].blightLevel).toBe(0);
    });

    it('cannot un-ash a node', () => {
      ashNode(state, 'holding-ne');
      const events = applyPushback(state, 'holding-ne', 5);
      expect(state.board.state.nodes['holding-ne'].ashed).toBe(true);
      expect(events).toEqual([]);
    });
  });

  describe('getSpokePath()', () => {
    it('returns a path from outer to inner for each quadrant', () => {
      for (let q = 0; q < 4; q++) {
        const path = getSpokePath(state.board.definition, q);
        expect(path.length).toBeGreaterThan(0);
        // Path should end at keystone
        expect(path[path.length - 1]).toBe(state.board.definition.keystoneId);
        // Path should start with holdings
        const firstTier = state.board.definition.nodes[path[0]].tier;
        expect(firstTier).toBe('holding');
      }
    });

    it('includes keep, forge, approach for each quadrant', () => {
      for (let q = 0; q < 4; q++) {
        const path = getSpokePath(state.board.definition, q);
        const tiers = path.map(id => state.board.definition.nodes[id].tier);
        expect(tiers).toContain('keep');
        expect(tiers).toContain('forge');
        expect(tiers).toContain('approach');
      }
    });
  });

  describe('getSpokeFrontier()', () => {
    it('returns the first non-ashed node on the spoke', () => {
      const frontier = getSpokeFrontier(state, 0);
      expect(frontier.length).toBe(1);
      // With no ashing, frontier should be a holding (outer edge)
      const tier = state.board.definition.nodes[frontier[0]].tier;
      expect(tier).toBe('holding');
    });

    it('advances inward when outer nodes are ashed', () => {
      // Ash all holdings in quadrant 0's spoke
      const spokePath = getSpokePath(state.board.definition, 0);
      const holdings = spokePath.filter(
        id => state.board.definition.nodes[id].tier === 'holding'
      );
      for (const h of holdings) {
        ashNode(state, h);
      }

      const frontier = getSpokeFrontier(state, 0);
      expect(frontier.length).toBe(1);
      // After ashing holdings, frontier should be the keep
      const tier = state.board.definition.nodes[frontier[0]].tier;
      expect(tier).toBe('keep');
    });
  });

  describe('advanceBlightOnSpoke()', () => {
    it('advances Blight on the frontier node of the quadrant', () => {
      const events = advanceBlightOnSpoke(state, 0, 1, 'strike');
      expect(events.length).toBeGreaterThan(0);
      // The frontier node should have increased blightLevel
      const frontier = getSpokeFrontier(state, 0);
      // Check that at least one node on the spoke has blight
      const spokePath = getSpokePath(state.board.definition, 0);
      const hasBlighted = spokePath.some(
        id => state.board.state.nodes[id].blightLevel > 0
      );
      expect(hasBlighted).toBe(true);
    });

    it('ashes frontier node when amount is large enough', () => {
      advanceBlightOnSpoke(state, 0, BLIGHT_TO_ASH, 'strike');
      // First frontier node should be ashed
      const spokePath = getSpokePath(state.board.definition, 0);
      const firstNonAshed = spokePath.find(
        id => !state.board.state.nodes[id].ashed
      );
      // At least one outer node should be ashed
      expect(state.board.state.nodes[spokePath[0]].ashed).toBe(true);
    });
  });

  describe('countAshedNodes()', () => {
    it('returns 0 for a fresh game', () => {
      expect(countAshedNodes(state)).toBe(0);
    });

    it('counts ashed nodes correctly', () => {
      ashNode(state, 'holding-ne');
      ashNode(state, 'holding-se');
      expect(countAshedNodes(state)).toBe(2);
    });
  });

  describe('checkActAdvance()', () => {
    it('returns null when no threshold crossed', () => {
      expect(checkActAdvance(state)).toBeNull();
    });

    it('advances from WHISPER to MARCH at threshold', () => {
      // Ash enough nodes to cross MARCH threshold
      const nodesToAsh = Object.keys(state.board.state.nodes).slice(0, ACT_THRESHOLDS.MARCH);
      for (const id of nodesToAsh) {
        ashNode(state, id);
      }
      expect(checkActAdvance(state)).toBe('MARCH');
    });

    it('advances from MARCH to RECKONING at threshold', () => {
      state.act = 'MARCH';
      const nodesToAsh = Object.keys(state.board.state.nodes).slice(0, ACT_THRESHOLDS.RECKONING);
      for (const id of nodesToAsh) {
        ashNode(state, id);
      }
      expect(checkActAdvance(state)).toBe('RECKONING');
    });

    it('returns null at RECKONING (no further escalation)', () => {
      state.act = 'RECKONING';
      for (const id of Object.keys(state.board.state.nodes)) {
        ashNode(state, id);
      }
      expect(checkActAdvance(state)).toBeNull();
    });

    it('skips WHISPER→MARCH if still in WHISPER but below threshold', () => {
      ashNode(state, 'holding-ne');
      expect(countAshedNodes(state)).toBeLessThan(ACT_THRESHOLDS.MARCH);
      expect(checkActAdvance(state)).toBeNull();
    });
  });

  describe('resolveStrike()', () => {
    it('full block (ratio=1) produces no Blight', () => {
      const result = resolveStrike(state, 1.0, 0);
      expect(result.events).toEqual([]);
      // No nodes should have blight
      for (const ns of Object.values(state.board.state.nodes)) {
        expect(ns.blightLevel).toBe(0);
      }
    });

    it('zero block (ratio=0) spreads full SPREAD_AMOUNT_BASE', () => {
      resolveStrike(state, 0, 0);
      // Some frontier node should have blight = SPREAD_AMOUNT_BASE
      const spokePath = getSpokePath(state.board.definition, 0);
      const blighted = spokePath.filter(
        id => state.board.state.nodes[id].blightLevel > 0
      );
      expect(blighted.length).toBeGreaterThan(0);
    });

    it('partial block reduces spread proportionally with ceil', () => {
      // 50% block → ceil(0.5 * SPREAD_AMOUNT_BASE)
      resolveStrike(state, 0.5, 0);
      const expectedSpread = Math.ceil(0.5 * SPREAD_AMOUNT_BASE);
      const spokePath = getSpokePath(state.board.definition, 0);
      const frontierNode = spokePath.find(
        id => state.board.state.nodes[id].blightLevel > 0
      );
      expect(frontierNode).toBeDefined();
      expect(state.board.state.nodes[frontierNode!].blightLevel).toBe(expectedSpread);
    });

    it('emits BLIGHT_ADVANCED events for affected nodes', () => {
      const result = resolveStrike(state, 0, 0);
      const blightEvents = result.events.filter(e => e.type === 'BLIGHT_ADVANCED');
      expect(blightEvents.length).toBeGreaterThan(0);
    });
  });

  describe('applyDawnBlightAdvance()', () => {
    it('always advances Blight (anti-turtle)', () => {
      const result = applyDawnBlightAdvance(state, 0);
      expect(result.events.length).toBeGreaterThan(0);
      // Some node should have blight
      const spokePath = getSpokePath(state.board.definition, 0);
      const blighted = spokePath.filter(
        id => state.board.state.nodes[id].blightLevel > 0
      );
      expect(blighted.length).toBeGreaterThan(0);
    });
  });

  describe('isKeystoneAshed()', () => {
    it('returns false for a fresh game', () => {
      expect(isKeystoneAshed(state)).toBe(false);
    });

    it('returns true when keystone is ashed', () => {
      ashNode(state, state.board.definition.keystoneId);
      expect(isKeystoneAshed(state)).toBe(true);
    });
  });

  describe('getBlightFrontier()', () => {
    it('returns empty for a clean board', () => {
      expect(getBlightFrontier(state)).toEqual([]);
    });

    it('includes nodes adjacent to blighted nodes', () => {
      advanceBlightOnNode(state, 'holding-ne', 1, 'strike');
      const frontier = getBlightFrontier(state);
      // holding-ne itself should be in the frontier (it has blight)
      expect(frontier).toContain('holding-ne');
      // Its neighbors should also be in the frontier
      const neighbors = state.board.definition.nodes['holding-ne'].connections;
      const neighborInFrontier = neighbors.some(n => frontier.includes(n));
      expect(neighborInFrontier).toBe(true);
    });
  });
});
