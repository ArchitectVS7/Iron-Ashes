import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  DOOM_TOLL_MAX,
  DOOM_TOLL_MIN,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  ACTIONS_PER_TURN_NORMAL,
  ACTIONS_PER_TURN_BROKEN,
  VOTE_COST_STANDARD,
  VOTE_COST_FINAL_PHASE,
  LIEUTENANT_POWER,
  MINION_POWER,
  LIEUTENANT_START_COUNT,
  LIEUTENANT_MAX_COUNT,
  MINION_MAX_COUNT,
} from '../../src/models/game-state.js';

describe('Game State Constants', () => {
  describe('Behavior Deck Composition (post-balance-fix)', () => {
    it('should have 20 total cards', () => {
      const total = Object.values(DEFAULT_BEHAVIOR_DECK_COMPOSITION).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(total).toBe(20);
    });

    it('should have ESCALATE reduced to 1 (balance fix from 2)', () => {
      expect(DEFAULT_BEHAVIOR_DECK_COMPOSITION.escalate).toBe(1);
    });

    it('should have MOVE increased to 6 (balance fix from 5)', () => {
      expect(DEFAULT_BEHAVIOR_DECK_COMPOSITION.move).toBe(6);
    });

    it('should have correct counts for other card types', () => {
      expect(DEFAULT_BEHAVIOR_DECK_COMPOSITION.spawn).toBe(6);
      expect(DEFAULT_BEHAVIOR_DECK_COMPOSITION.claim).toBe(4);
      expect(DEFAULT_BEHAVIOR_DECK_COMPOSITION.assault).toBe(3);
    });
  });

  describe('Doom Toll constants', () => {
    it('should define correct bounds', () => {
      expect(DOOM_TOLL_MIN).toBe(0);
      expect(DOOM_TOLL_MAX).toBe(13);
    });

    it('should define Final Phase threshold at 10', () => {
      expect(DOOM_TOLL_FINAL_PHASE_THRESHOLD).toBe(10);
    });
  });

  describe('Action constants', () => {
    it('should give 2 actions normally and 1 when broken', () => {
      expect(ACTIONS_PER_TURN_NORMAL).toBe(2);
      expect(ACTIONS_PER_TURN_BROKEN).toBe(1);
    });
  });

  describe('Vote cost constants', () => {
    it('should cost 1 Fate Card normally and 2 in Final Phase', () => {
      expect(VOTE_COST_STANDARD).toBe(1);
      expect(VOTE_COST_FINAL_PHASE).toBe(2);
    });
  });

  describe('Antagonist force constants', () => {
    it('should define correct power levels', () => {
      expect(LIEUTENANT_POWER).toBe(10);
      expect(MINION_POWER).toBe(6);
    });

    it('should define correct force limits', () => {
      expect(LIEUTENANT_START_COUNT).toBe(2);
      expect(LIEUTENANT_MAX_COUNT).toBe(4);
      expect(MINION_MAX_COUNT).toBe(9);
    });
  });
});
