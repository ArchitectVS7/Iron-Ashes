import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../src/utils/seeded-random.js';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('should produce identical sequences from the same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const seq1 = Array.from({ length: 100 }, () => rng1.float());
      const seq2 = Array.from({ length: 100 }, () => rng2.float());

      expect(seq1).toEqual(seq2);
    });

    it('should produce different sequences from different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(99);

      const seq1 = Array.from({ length: 10 }, () => rng1.float());
      const seq2 = Array.from({ length: 10 }, () => rng2.float());

      expect(seq1).not.toEqual(seq2);
    });

    it('should expose the seed it was created with', () => {
      const rng = new SeededRandom(12345);
      expect(rng.seed).toBe(12345);
    });
  });

  describe('float()', () => {
    it('should return values in [0, 1)', () => {
      const rng = new SeededRandom(1);
      for (let i = 0; i < 1000; i++) {
        const val = rng.float();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('int()', () => {
    it('should return values in [min, max] inclusive', () => {
      const rng = new SeededRandom(7);
      const results = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        const val = rng.int(1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        results.add(val);
      }
      // Should have hit all values 1-6 in 1000 rolls
      expect(results.size).toBe(6);
    });
  });

  describe('shuffle()', () => {
    it('should produce deterministic shuffles', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng1.shuffle(arr1);
      rng2.shuffle(arr2);

      expect(arr1).toEqual(arr2);
    });

    it('should mutate and return the same array reference', () => {
      const rng = new SeededRandom(1);
      const arr = [1, 2, 3];
      const result = rng.shuffle(arr);
      expect(result).toBe(arr);
    });

    it('should contain the same elements after shuffle', () => {
      const rng = new SeededRandom(1);
      const arr = [1, 2, 3, 4, 5];
      rng.shuffle(arr);
      expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('pick()', () => {
    it('should pick elements from the array', () => {
      const rng = new SeededRandom(1);
      const arr = ['a', 'b', 'c'];
      for (let i = 0; i < 100; i++) {
        expect(arr).toContain(rng.pick(arr));
      }
    });

    it('should throw on empty array', () => {
      const rng = new SeededRandom(1);
      expect(() => rng.pick([])).toThrow('empty array');
    });
  });

  describe('weightedPick()', () => {
    it('should respect weights', () => {
      const rng = new SeededRandom(42);
      const items = ['common', 'rare'];
      const weights = [99, 1];

      const results = { common: 0, rare: 0 };
      for (let i = 0; i < 10000; i++) {
        const pick = rng.weightedPick(items, weights);
        results[pick as keyof typeof results]++;
      }

      // Common should be picked vastly more often
      expect(results.common).toBeGreaterThan(results.rare * 10);
    });

    it('should throw on mismatched array lengths', () => {
      const rng = new SeededRandom(1);
      expect(() => rng.weightedPick(['a', 'b'], [1])).toThrow('same length');
    });

    it('should throw on empty array', () => {
      const rng = new SeededRandom(1);
      expect(() => rng.weightedPick([], [])).toThrow('empty array');
    });
  });

  describe('chance()', () => {
    it('should return true roughly proportional to probability', () => {
      const rng = new SeededRandom(42);
      let trueCount = 0;
      const trials = 10000;
      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.3)) trueCount++;
      }
      // Should be roughly 30% ± 3%
      expect(trueCount / trials).toBeGreaterThan(0.27);
      expect(trueCount / trials).toBeLessThan(0.33);
    });
  });

  describe('fork()', () => {
    it('should create an independent sub-stream', () => {
      const rng = new SeededRandom(42);
      const forked = rng.fork();

      // The forked RNG should produce different values than continuing the parent
      const parentVal = rng.float();
      const forkedVal = forked.float();
      // They CAN be equal by chance, but the streams are independent
      expect(forked.seed).not.toBe(42); // Derived seed should differ
    });

    it('should produce deterministic forks', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const fork1 = rng1.fork();
      const fork2 = rng2.fork();

      expect(fork1.seed).toBe(fork2.seed);
      expect(fork1.float()).toBe(fork2.float());
    });
  });
});
