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
import { createGame } from '../../src/v3/setup.js';
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
  getSpokeSeam,
  isKeystoneAshed,
  resolveStrike,
} from '../../src/v3/blight.js';
import {
  getApproachForQuadrant,
  getForgeForQuadrant,
  getKeepForQuadrant,
  getMidForQuadrant,
} from '../../src/v3/board.js';
import { BLIGHT_TO_ASH, ACT_THRESHOLDS, SPREAD_AMOUNT_BASE, withTunables } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

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
      // Inject BLIGHT_TO_ASH=3 so blight=2 stays below the ash threshold (Stage 5b ships ASH=2,
      // at which level 2 would ash the node and pin it — this test exercises pushback on a live node).
      withTunables({ BLIGHT_TO_ASH: 3 }, () => {
        advanceBlightOnNode(state, 'holding-ne', 2, 'strike');
        applyPushback(state, 'holding-ne', 1);
      });
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

  describe('getSpokePath() — edge-real serpentine spoke (§13 [T-236])', () => {
    it('is EXACTLY [seam, mid(q+3), forge, mid(q), approach, keystone] for each quadrant', () => {
      const def = state.board.definition;
      for (let q = 0; q < 4; q++) {
        const path = getSpokePath(def, q);
        // The serpentine: 6 nodes, outer → inner.
        expect(path).toEqual([
          getSpokeSeam(def, q),
          getMidForQuadrant(def, (q + 3) % 4),
          getForgeForQuadrant(def, q),
          getMidForQuadrant(def, q),
          getApproachForQuadrant(def, q),
          def.keystoneId,
        ]);
        expect(path.length).toBe(6);
        // First tier is a Holding (the seam), last id is the keystone.
        expect(def.nodes[path[0]].tier).toBe('holding');
        expect(path[path.length - 1]).toBe(def.keystoneId);
      }
    });

    it('every consecutive spoke hop is a REAL board edge (§13 [T-236])', () => {
      const def = state.board.definition;
      for (let q = 0; q < 4; q++) {
        const path = getSpokePath(def, q);
        for (let i = 0; i + 1 < path.length; i++) {
          expect(
            def.nodes[path[i]].connections,
            `spoke ${q} hop ${path[i]} → ${path[i + 1]} must be a drawn edge`,
          ).toContain(path[i + 1]);
        }
      }
    });

    it('contains the quadrant Forge + Approach + both flanking Mids but NEVER a Keep', () => {
      const def = state.board.definition;
      for (let q = 0; q < 4; q++) {
        const path = getSpokePath(def, q);
        expect(path).toContain(getForgeForQuadrant(def, q));
        expect(path).toContain(getApproachForQuadrant(def, q));
        // T-236: the Mids joined the spoke (the mandatory-cut passes the front burns through)…
        expect(path).toContain(getMidForQuadrant(def, q));
        expect(path).toContain(getMidForQuadrant(def, (q + 3) % 4));
        // …but the Keep (protected home) is still excluded from every blight spoke.
        const tiers = path.map(id => def.nodes[id].tier);
        expect(tiers).not.toContain('keep');
      }
    });

    it('each Mid sits on exactly two spokes (exit of q, entry of q+1)', () => {
      const def = state.board.definition;
      const midSpokeCount = new Map<string, number>();
      for (let q = 0; q < 4; q++) {
        for (const id of getSpokePath(def, q)) {
          if (def.nodes[id].tier === 'mid') {
            midSpokeCount.set(id, (midSpokeCount.get(id) ?? 0) + 1);
          }
        }
      }
      expect(midSpokeCount.size).toBe(4);
      for (const count of midSpokeCount.values()) expect(count).toBe(2);
    });
  });

  describe('8-ray seam coherence (§13 [T-224])', () => {
    it('the 4 seams are 4 DISTINCT holdings, each a declared blight-entry seam', () => {
      const def = state.board.definition;
      const seams = [0, 1, 2, 3].map(q => getSpokeSeam(def, q));
      // No overlap — one seam per diagonal ray.
      expect(new Set(seams).size).toBe(4);
      for (const seam of seams) {
        expect(seam).toBeDefined();
        expect(def.nodes[seam!].tier).toBe('holding');
        expect(def.blightEntrySeams).toContain(seam);
      }
    });

    it('seam(q) is the Holding adjacent to BOTH keep(q) and keep((q+3) mod 4)', () => {
      const def = state.board.definition;
      for (let q = 0; q < 4; q++) {
        const seam = getSpokeSeam(def, q);
        expect(seam).toBeDefined();
        const keepA = getKeepForQuadrant(def, q)!;
        const keepB = getKeepForQuadrant(def, (q + 3) % 4)!;
        const conns = def.nodes[seam!].connections;
        expect(conns).toContain(keepA);
        expect(conns).toContain(keepB);
      }
    });
  });

  describe('getSpokeFrontier()', () => {
    it('returns the first non-ashed node on the spoke (the seam holding)', () => {
      const frontier = getSpokeFrontier(state, 0);
      expect(frontier.length).toBe(1);
      // With no ashing, frontier is the seam holding (outer edge).
      expect(frontier[0]).toBe(getSpokeSeam(state.board.definition, 0));
      expect(state.board.definition.nodes[frontier[0]].tier).toBe('holding');
    });

    it('advances inward to the entry MID, then the FORGE, as the spoke ashes (§13 [T-236])', () => {
      const def = state.board.definition;
      // Ash the seam holding on quadrant 0's spoke.
      ashNode(state, getSpokeSeam(def, 0)!);

      let frontier = getSpokeFrontier(state, 0);
      expect(frontier.length).toBe(1);
      // After the seam ashes, the frontier is the entry Mid — the pass the front burns through
      // (the Keep is not on the spoke).
      expect(frontier[0]).toBe(getMidForQuadrant(def, 3));
      expect(def.nodes[frontier[0]].tier).toBe('mid');

      // Ash the entry Mid too — the front reaches the Forge next.
      ashNode(state, getMidForQuadrant(def, 3)!);
      frontier = getSpokeFrontier(state, 0);
      expect(frontier.length).toBe(1);
      expect(frontier[0]).toBe(getForgeForQuadrant(def, 0));
      expect(def.nodes[frontier[0]].tier).toBe('forge');
    });
  });

  describe('blight reaches the Keystone from every seam (§13 [T-224])', () => {
    it('advancing each diagonal spoke to full ash eventually ashes the Keystone', () => {
      for (let q = 0; q < 4; q++) {
        const fresh = createGame(4, 'competitive', 42);
        // Repeatedly advance the frontier until the whole spoke (incl. keystone) has ashed.
        let guard = 0;
        while (!isKeystoneAshed(fresh) && guard++ < 100) {
          advanceBlightOnSpoke(fresh, q, BLIGHT_TO_ASH, 'dawn');
        }
        expect(isKeystoneAshed(fresh)).toBe(true);
      }
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
      // 50% block → ceil(0.5 * SPREAD_AMOUNT_BASE), capped at BLIGHT_TO_ASH (a node
      // can't exceed the ash threshold; overflow advances down the spoke).
      resolveStrike(state, 0.5, 0);
      const expectedSpread = Math.min(Math.ceil(0.5 * SPREAD_AMOUNT_BASE), BLIGHT_TO_ASH);
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
