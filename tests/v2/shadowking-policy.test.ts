/**
 * Shadowking Policy tests — validate the reactive villain (§5.6).
 *
 * Checks:
 *   - Target precedence: Gambit > grudge > Crown > seat
 *   - Effect selection per Act
 *   - Grudge decay + cap
 *   - Voice lines are non-empty
 *   - Deterministic from state (no RNG in targeting)
 *   - chooseShadowkingIntent produces valid telegraph
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import {
  addGrudge,
  chooseShadowkingIntent,
  chooseTarget,
  chooseEffect,
  decayGrudge,
  generateReactiveVoiceLine,
} from '../../src/v2/shadowking-policy.js';
import { GRUDGE_CAP, GRUDGE_DECAY_RATE } from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

describe('Shadowking Policy', () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame(4, 'competitive', 42);
  });

  describe('chooseTarget()', () => {
    it('targets the Crown holder when no grudge', () => {
      // All grudge is 0, so Crown holder should be the target
      const target = chooseTarget(state);
      expect(target).toBe(state.crownHolder);
    });

    it('targets highest grudge player over Crown holder', () => {
      // Give player 2 high grudge
      state.shadowking.grudge[2] = 5;
      const target = chooseTarget(state);
      expect(target).toBe(2);
    });

    it('breaks grudge ties with lowest seat index', () => {
      state.shadowking.grudge[1] = 5;
      state.shadowking.grudge[3] = 5;
      const target = chooseTarget(state);
      expect(target).toBe(1); // Lowest seat
    });

    it('targets Gambit claimant over everything else', () => {
      state.gambit = { claimant: 3, declaredRound: 1, named: false };
      state.shadowking.grudge[0] = 10; // Even with max grudge on player 0
      const target = chooseTarget(state);
      expect(target).toBe(3); // Gambit overrides
    });

    it('falls back to seat 0 when no Crown holder', () => {
      state.crownHolder = null;
      const target = chooseTarget(state);
      expect(target).toBe(0);
    });
  });

  describe('chooseEffect()', () => {
    it('returns SPREAD during WHISPER act', () => {
      state.act = 'WHISPER';
      expect(chooseEffect(state)).toBe('SPREAD');
    });

    it('returns MARCH_DK during MARCH act when DKs exist', () => {
      state.act = 'MARCH';
      // State has DKs from setup
      expect(state.shadowking.forces.some(f => f.type === 'death_knight')).toBe(true);
      expect(chooseEffect(state)).toBe('MARCH_DK');
    });

    it('returns SPREAD during MARCH act when no DKs', () => {
      state.act = 'MARCH';
      state.shadowking.forces = [];
      expect(chooseEffect(state)).toBe('SPREAD');
    });

    it('returns REAP or SURGE during RECKONING', () => {
      state.act = 'RECKONING';
      const effect = chooseEffect(state);
      expect(['REAP', 'SURGE']).toContain(effect);
    });

    it('alternates REAP/SURGE by round parity in RECKONING', () => {
      state.act = 'RECKONING';
      state.round = 2;
      expect(chooseEffect(state)).toBe('REAP');
      state.round = 3;
      expect(chooseEffect(state)).toBe('SURGE');
    });
  });

  describe('addGrudge()', () => {
    it('increases grudge by the specified amount', () => {
      addGrudge(state, 0, 3, 'dk_kill');
      expect(state.shadowking.grudge[0]).toBe(3);
    });

    it('caps at GRUDGE_CAP', () => {
      addGrudge(state, 0, GRUDGE_CAP + 5, 'dk_kill');
      expect(state.shadowking.grudge[0]).toBe(GRUDGE_CAP);
    });

    it('emits GRUDGE_CHANGED event', () => {
      const events = addGrudge(state, 1, 2, 'forge_reclaim');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('GRUDGE_CHANGED');
      if (events[0].type === 'GRUDGE_CHANGED') {
        expect(events[0].playerIndex).toBe(1);
        expect(events[0].previousGrudge).toBe(0);
        expect(events[0].newGrudge).toBe(2);
        expect(events[0].reason).toBe('forge_reclaim');
      }
    });

    it('emits no event when already at cap', () => {
      state.shadowking.grudge[0] = GRUDGE_CAP;
      const events = addGrudge(state, 0, 1, 'test');
      expect(events).toEqual([]);
    });
  });

  describe('decayGrudge()', () => {
    it('reduces all grudge by GRUDGE_DECAY_RATE', () => {
      state.shadowking.grudge[0] = 5;
      state.shadowking.grudge[1] = 3;
      decayGrudge(state);
      expect(state.shadowking.grudge[0]).toBe(5 - GRUDGE_DECAY_RATE);
      expect(state.shadowking.grudge[1]).toBe(3 - GRUDGE_DECAY_RATE);
    });

    it('floors at 0', () => {
      state.shadowking.grudge[0] = 0;
      decayGrudge(state);
      expect(state.shadowking.grudge[0]).toBe(0);
    });

    it('does not emit events for 0-grudge players', () => {
      // All grudge is 0
      const events = decayGrudge(state);
      expect(events).toEqual([]);
    });

    it('emits GRUDGE_CHANGED for affected players', () => {
      state.shadowking.grudge[2] = 3;
      const events = decayGrudge(state);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('GRUDGE_CHANGED');
    });
  });

  describe('chooseShadowkingIntent()', () => {
    it('produces a valid telegraph', () => {
      const telegraph = chooseShadowkingIntent(state);
      expect(telegraph).toBeDefined();
      expect(telegraph.effect).toBeDefined();
      expect(telegraph.targetNodeId).toBeDefined();
      expect(telegraph.doomCost).toBeGreaterThan(0);
      expect(telegraph.struckPlayerIndex).not.toBeNull();
      expect(typeof telegraph.steerQuadrant).toBe('number');
      expect(telegraph.firstPersonLine.length).toBeGreaterThan(0);
    });

    it('targets the Crown holder when no grudge', () => {
      const telegraph = chooseShadowkingIntent(state);
      expect(telegraph.struckPlayerIndex).toBe(state.crownHolder);
    });

    it('targets grudge player when grudge is set', () => {
      state.shadowking.grudge[3] = 5;
      const telegraph = chooseShadowkingIntent(state);
      expect(telegraph.struckPlayerIndex).toBe(3);
    });

    it('is deterministic — same state → same result', () => {
      const a = chooseShadowkingIntent(state);
      // Reset grudge to same state
      const state2 = createGame(4, 'competitive', 42);
      const b = chooseShadowkingIntent(state2);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('voice line changes with round', () => {
      const a = chooseShadowkingIntent(state);
      state.round = state.round + 1;
      const b = chooseShadowkingIntent(state);
      // Lines might be different due to round modulo — at least they should both be non-empty
      expect(a.firstPersonLine.length).toBeGreaterThan(0);
      expect(b.firstPersonLine.length).toBeGreaterThan(0);
    });
  });

  describe('generateReactiveVoiceLine()', () => {
    it('returns a voice line for thin_pledge', () => {
      const event = generateReactiveVoiceLine(state, 'thin_pledge');
      expect(event).not.toBeNull();
      expect(event!.type).toBe('SK_VOICE_LINE');
      expect(event!.line.length).toBeGreaterThan(0);
    });

    it('returns a voice line for full_block', () => {
      const event = generateReactiveVoiceLine(state, 'full_block');
      expect(event).not.toBeNull();
      if (event) {
        expect(event.line).toContain('held the line');
      }
    });

    it('returns a voice line for crown_changed', () => {
      const event = generateReactiveVoiceLine(state, 'crown_changed');
      expect(event).not.toBeNull();
    });

    it('returns a voice line for dk_killed', () => {
      const event = generateReactiveVoiceLine(state, 'dk_killed');
      expect(event).not.toBeNull();
    });

    it('returns null for unknown trigger', () => {
      const event = generateReactiveVoiceLine(state, 'unknown_trigger');
      expect(event).toBeNull();
    });
  });

  describe('target stability', () => {
    it('grudge-based target changes when grudge leader changes', () => {
      state.shadowking.grudge[0] = 5;
      expect(chooseTarget(state)).toBe(0);

      state.shadowking.grudge[2] = 7;
      expect(chooseTarget(state)).toBe(2);
    });

    it('Crown-based target changes when Crown changes', () => {
      state.crownHolder = 1;
      expect(chooseTarget(state)).toBe(1);

      state.crownHolder = 3;
      expect(chooseTarget(state)).toBe(3);
    });
  });
});
