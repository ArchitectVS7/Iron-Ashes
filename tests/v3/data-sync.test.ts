/**
 * v3 data ⇄ generated-TS sync guard (T-222).
 *
 * `data/board-v3.json` is the hand-editable source of truth for the v3 board; the committed
 * `src/v3/board.gen.ts` is produced from it by `npm run gen:data`. `gen:data:check` guards this
 * pair in `sim`/pre-commit, but not in `npm run verify` — so this test re-reads the JSON and asserts
 * it deep-equals the generated module, turning the suite RED if the JSON is edited without
 * regenerating (or the .gen.ts is hand-edited). Mirrors tests/v2/data-sync.test.ts.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BOARD_DATA } from '../../src/v3/board.gen.js';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data');
function readJson(name: string): unknown {
  return JSON.parse(readFileSync(resolve(DATA_DIR, name), 'utf8'));
}

describe('v3 data ⇄ generated TS sync (run `npm run gen:data` after editing data/*.json)', () => {
  it('board-v3.json matches src/v3 BOARD_DATA', () => {
    expect(readJson('board-v3.json')).toEqual(BOARD_DATA);
  });
});
