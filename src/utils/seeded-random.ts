/**
 * Deterministic Seeded Random Number Generator
 *
 * Uses a Mulberry32 PRNG for fast, deterministic random number generation.
 * Required by the Alliance Engine for:
 *   - Simulation reproducibility (balance testing)
 *   - Behavior Card execution determinism from a given seed
 *   - Fate Card deck composition and shuffling
 *
 * All game randomness MUST go through this system — never use Math.random().
 */

/**
 * Mulberry32 — a simple, fast 32-bit PRNG with good statistical properties.
 * Returns a function that produces the next random float in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRandom {
  private next: () => number;
  private readonly _seed: number;

  constructor(seed: number) {
    this._seed = seed;
    this.next = mulberry32(seed);
  }

  /** The seed this generator was initialized with. */
  get seed(): number {
    return this._seed;
  }

  /** Returns a random float in [0, 1). */
  float(): number {
    return this.next();
  }

  /** Returns a random integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle an array in place using the Fisher-Yates algorithm.
   * Returns the same array reference (mutated).
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Pick a random element from an array without modifying it.
   * Throws if the array is empty.
   */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from an empty array.');
    }
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Pick a random element using weighted probabilities.
   * Each item has a weight; higher weight = more likely to be chosen.
   * Throws if items array is empty or all weights are 0.
   */
  weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array.');
    }
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length.');
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) {
      throw new Error('Total weight must be greater than 0.');
    }

    let roll = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll < 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Returns true with the given probability (0–1).
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Create a new Seeded Random derived from this one.
   * Useful for creating isolated sub-streams (e.g., one per system).
   */
  fork(): SeededRandom {
    return new SeededRandom(this.int(0, 0x7fffffff));
  }
}
