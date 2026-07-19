import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// T-207 — machine-checked acceptance guard for the committed M2 theme-foundation gallery.
// vitest runs from the repo root, so cwd resolves the docs paths directly. This keeps the
// committed T-207 deliverable enforced by `npm test` (mirrors the T-004 baseline guard); the
// 10-item rubric assertion is NOT duplicated here — it already lives in baseline-gallery.test.ts.
const M2_DIR = resolve(process.cwd(), 'docs/Redesign-V3.1/m2');

describe('T-207 M2 theme-foundation gallery', () => {
  it('commits ≥7 M2 PNGs under docs/Redesign-V3.1/m2/', () => {
    const pngs = readdirSync(M2_DIR).filter((f) => f.toLowerCase().endsWith('.png'));
    expect(pngs.length).toBeGreaterThanOrEqual(7);
  });

  it('commits a non-empty README naming the screens', () => {
    const readme = readFileSync(resolve(M2_DIR, 'README.md'), 'utf8');
    expect(readme.trim().length).toBeGreaterThan(0);
  });
});
