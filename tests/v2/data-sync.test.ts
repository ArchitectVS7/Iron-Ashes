/**
 * Data ⇄ generated-TS sync guard.
 *
 * The hand-editable data/*.json is the source of truth; the committed *.gen.ts is
 * produced from it by `npm run gen:data`. This test re-reads each JSON and asserts it
 * deep-equals the matching generated module, so editing the JSON without regenerating
 * (or hand-editing a .gen.ts) turns the suite RED. It is the "deep-equal snapshot so a
 * locked value can't silently move" guard called for in the assessment, and runs in
 * `npm test` → the pre-push hook → CI.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TUNABLES_DATA } from '../../src/v2/tunables.gen.js';
import { ARCHETYPE_DATA } from '../../src/v2/sim/archetypes.gen.js';
import { BOARD_DATA } from '../../src/v2/board.gen.js';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data');
function readJson(name: string): unknown {
  return JSON.parse(readFileSync(resolve(DATA_DIR, name), 'utf8'));
}

describe('data ⇄ generated TS sync (run `npm run gen:data` after editing data/*.json)', () => {
  it('tunables.json matches TUNABLES_DATA', () => {
    expect(readJson('tunables.json')).toEqual(TUNABLES_DATA);
  });

  it('archetypes.json matches ARCHETYPE_DATA', () => {
    expect(readJson('archetypes.json')).toEqual(ARCHETYPE_DATA);
  });

  it('board.json matches BOARD_DATA', () => {
    expect(readJson('board.json')).toEqual(BOARD_DATA);
  });
});
