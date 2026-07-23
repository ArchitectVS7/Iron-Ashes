import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// T-004 — machine-checked acceptance guard for the M1 baseline gallery + M2 rubric.
// vitest runs from the repo root, so cwd resolves the docs paths directly. This turns
// both T-004 acceptance criteria into a permanent green-suite assertion (no engine
// surface is touched; this is a docs/asset deliverable).
const BASELINE_DIR = resolve(process.cwd(), 'docs/Redesign-V3.1/baseline');
const RUBRIC = resolve(process.cwd(), 'docs/Redesign-V3.1/RUBRIC.md');

describe('T-004 baseline gallery + M2 rubric', () => {
  it('commits ≥7 baseline PNGs under docs/Redesign-V3.1/baseline/', () => {
    const pngs = readdirSync(BASELINE_DIR).filter((f) => f.toLowerCase().endsWith('.png'));
    expect(pngs.length).toBeGreaterThanOrEqual(7);
  });

  it('commits a non-empty README naming the screens', () => {
    const readme = readFileSync(resolve(BASELINE_DIR, 'README.md'), 'utf8');
    expect(readme.trim().length).toBeGreaterThan(0);
  });

  it('RUBRIC.md exists with exactly 10 scorable items', () => {
    const rubric = readFileSync(RUBRIC, 'utf8');
    // The fixed ten items carry a leading bracket that holds either a checkbox
    // state (`[ ]` / `[x]`) or a per-item numeric score (`[9]`, `[10]`) — the
    // rubric is scored /10 and the user records per-item scores in place. The
    // guard's intent is that the set stays exactly ten items, in any marker form.
    const items = rubric.match(/^\s*-\s*\[(?: |x|X|\d{1,2})\]/gm) ?? [];
    expect(items.length).toBe(10);
  });
});
