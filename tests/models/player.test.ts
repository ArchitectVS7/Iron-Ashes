import { describe, it, expect } from 'vitest';
import { createInitialStats, createPlayer } from '../../src/models/player.js';
import { createStartingFellowship } from '../../src/models/characters.js';

describe('Player Model (F-player)', () => {
  describe('createInitialStats()', () => {
    it('initialises all stat fields to zero', () => {
      const stats = createInitialStats();
      expect(stats.strongholdsClaimed).toBe(0);
      expect(stats.fellowsRecruited).toBe(0);
      expect(stats.warBannersSpent).toBe(0);
      expect(stats.combatsWon).toBe(0);
      expect(stats.combatsLost).toBe(0);
      expect(stats.timesBroken).toBe(0);
      expect(stats.rescuesGiven).toBe(0);
      expect(stats.rescuesReceived).toBe(0);
      expect(stats.votesCast).toBe(0);
      expect(stats.votesAbstained).toBe(0);
    });

    it('returns independent objects on repeated calls', () => {
      const a = createInitialStats();
      const b = createInitialStats();
      a.combatsWon = 5;
      expect(b.combatsWon).toBe(0);
    });
  });

  describe('createPlayer() — human', () => {
    const fellowship = createStartingFellowship('p0', 'n01');

    it('sets index and type', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.index).toBe(0);
      expect(p.type).toBe('human');
    });

    it('sets aiDifficulty to null for a human player', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.aiDifficulty).toBeNull();
    });

    it('starts with 2 actions remaining', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.actionsRemaining).toBe(2);
    });

    it('starts with no War Banners', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.warBanners).toBe(0);
    });

    it('starts with an empty Fate Card hand', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.fateCards).toEqual([]);
    });

    it('starts with zero penalty cards', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.penaltyCards).toBe(0);
    });

    it('is not Broken at start', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.isBroken).toBe(false);
    });

    it('does not hold Blood Pact at start', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.hasBloodPact).toBe(false);
      expect(p.bloodPactRevealed).toBe(false);
    });

    it('has zero accusation lockout at start', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.accusationLockoutRounds).toBe(0);
    });

    it('assigns the provided fellowship', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.fellowship).toBe(fellowship);
    });

    it('creates zeroed stats', () => {
      const p = createPlayer(0, 'human', fellowship);
      expect(p.stats.combatsWon).toBe(0);
      expect(p.stats.rescuesGiven).toBe(0);
    });
  });

  describe('createPlayer() — AI', () => {
    const fellowship = createStartingFellowship('p1', 'n02');

    it('sets type to ai and stores difficulty', () => {
      const p = createPlayer(1, 'ai', fellowship, 'knight_commander');
      expect(p.type).toBe('ai');
      expect(p.aiDifficulty).toBe('knight_commander');
    });

    it('supports all three AI difficulty levels', () => {
      const difficulties = ['apprentice', 'knight_commander', 'arch_regent'] as const;
      for (const diff of difficulties) {
        const p = createPlayer(1, 'ai', fellowship, diff);
        expect(p.aiDifficulty).toBe(diff);
      }
    });

    it('starts with the same resource state as a human player', () => {
      const p = createPlayer(1, 'ai', fellowship, 'apprentice');
      expect(p.warBanners).toBe(0);
      expect(p.actionsRemaining).toBe(2);
      expect(p.isBroken).toBe(false);
    });
  });

  describe('createPlayer() — multiple players', () => {
    it('creates players with distinct indices and fellowships', () => {
      const f0 = createStartingFellowship('p0', 'n01');
      const f1 = createStartingFellowship('p1', 'n05');
      const p0 = createPlayer(0, 'human', f0);
      const p1 = createPlayer(1, 'human', f1);

      expect(p0.index).toBe(0);
      expect(p1.index).toBe(1);
      expect(p0.fellowship).not.toBe(p1.fellowship);
    });

    it('player stats objects are independent', () => {
      const f0 = createStartingFellowship('p0', 'n01');
      const f1 = createStartingFellowship('p1', 'n05');
      const p0 = createPlayer(0, 'human', f0);
      const p1 = createPlayer(1, 'human', f1);

      p0.stats.combatsWon = 3;
      expect(p1.stats.combatsWon).toBe(0);
    });
  });
});
