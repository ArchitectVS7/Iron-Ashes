import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// T-306 — machine-checked acceptance guard for the committed M3 cards-&-hand gallery.
// vitest runs from the repo root, so cwd resolves the docs paths directly. This keeps the
// committed T-306 deliverable enforced by `npm test` (mirrors the T-207 m2-gallery guard); the
// 10-item rubric assertion is NOT duplicated here — it already lives in baseline-gallery.test.ts.
const M3_DIR = resolve(process.cwd(), 'docs/Redesign-V3.1/m3');

describe('T-306 M3 cards-&-hand gallery', () => {
  it('commits ≥7 M3 PNGs under docs/Redesign-V3.1/m3/', () => {
    const pngs = readdirSync(M3_DIR).filter((f) => f.toLowerCase().endsWith('.png'));
    expect(pngs.length).toBeGreaterThanOrEqual(7);
  });

  it('commits a non-empty README naming the screens', () => {
    const readme = readFileSync(resolve(M3_DIR, 'README.md'), 'utf8');
    expect(readme.trim().length).toBeGreaterThan(0);
  });
});
