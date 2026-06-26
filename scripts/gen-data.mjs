#!/usr/bin/env node
/**
 * gen-data.mjs — validate the hand-editable data/*.json with Zod and (re)generate
 * the committed *.gen.ts files (under src/) that the engine/UI/sim consume.
 *
 * This is the ONLY place `zod` is imported. It is a plain Node ESM script (dev-time
 * tooling), so zod is a devDependency that NEVER enters the browser bundle — the
 * engine reads the GENERATED TypeScript, not the JSON, so Vite's graph never reaches
 * zod. (An eslint no-restricted-imports rule bans `zod` under src/ as a backstop.)
 *
 * Codegen (not a static JSON import) is deliberate: with this tsconfig (rootDir=src,
 * tsc→dist, no bundler for the Node sim) a `import x from 'data/x.json'` is fragile —
 * tsc won't copy JSON outside rootDir into dist and Node ESM needs an import attribute
 * tsc doesn't emit. Generating plain .ts sidesteps all of that and is browser-safe.
 *
 * Usage:
 *   node scripts/gen-data.mjs           regenerate the .gen.ts files (the tuning command)
 *   node scripts/gen-data.mjs --check   validate + verify the committed .gen.ts is in
 *                                        sync (no write); exit 1 on drift. For CI/hooks.
 *
 * Determinism: keys are emitted in a canonical (recursively sorted) order and scalars
 * via JSON.stringify, so a non-programmer reordering keys in the editor never changes
 * output; `gen-data` on unchanged input ⇒ clean `git diff`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

// ─── shared field validators ──────────────────────────────────────
const int = z.number().int();
const frac = z.number().min(0).max(1);
const bool = z.boolean();

// ─── tunables schema ──────────────────────────────────────────────
// Plain non-negative-ish integer levers (the bulk). Listing them explicitly (not
// deriving from the data) means a MISSING key in the JSON is a hard error, and
// `.strict()` rejects an unknown/typo'd key.
const TUNABLE_INT_KEYS = [
  'ACCUSATION_COOLDOWN_ROUNDS', 'ACCUSATION_PUSHBACK', 'ACCUSATION_VINDICATION_BONUS',
  'ACCUSATION_WRONG_PENALTY', 'ACCUSE_MIN_SCORE', 'ACTION_BASE_COST', 'ACTIONS_BROKEN',
  'ACTIONS_NORMAL', 'ASHED_TRAVERSE_EXTRA_COST', 'AUDIT_COST', 'BASE_BANNER_INCOME', 'BLIGHT_POWER',
  'BLIGHT_TO_ASH', 'BLOOD_PACT_SPREAD_BONUS', 'BREAK_THRESHOLD', 'BROKEN_INCOME_BONUS',
  'BROKEN_MAX_ROUNDS', 'CARD_VALUE_MAX', 'CARD_VALUE_MIN', 'COMBAT_COMMIT_MAX',
  'DAWN_BLIGHT_ADVANCE', 'DK_MARCH_DISTANCE', 'DK_PER_PLAYER', 'DK_POWER', 'DK_START_COUNT',
  'DOOM_COST_MARCH', 'DOOM_COST_PER_PLAYER', 'DOOM_COST_PIVOT', 'DOOM_COST_PLAYER_DIVISOR',
  'DOOM_COST_RECKONING', 'DOOM_COST_WHISPER', 'FORGE_TOLL_COST', 'FORGE_WEIGHT',
  'GAMBIT_ADJACENT_STRIKE_MULT', 'GAMBIT_SELF_COVER_CARDS', 'GRUDGE_CAP', 'GRUDGE_DECAY_RATE',
  'GRUDGE_MARK_TOP_N', 'GRUDGE_OATHBREAK', 'GRUDGE_PER_DK_KILL', 'GRUDGE_PER_FORGE_RECLAIM',
  'GRUDGE_PER_SK_WOUND', 'HAND_LIMIT', 'HERALD_COMBAT_PENALTY', 'HERALD_HAND_BONUS',
  'HERALD_PUSHBACK', 'HERALD_RECRUIT_COST', 'LANDED_STRIKE_WOUNDS', 'OATH_BREAK_BANNERS',
  'OATH_DIVIDEND', 'OATH_DURATION', 'OATH_LOYALTY_BONUS', 'PATIENCE_CAP', 'PATIENCE_ON_BLOCK',
  'PLEDGE_FAVOR_GRUDGE_REDUCTION', 'PLEDGE_SHIELD_AMOUNT', 'PUSHBACK', 'RAID_DEFENSE_MARGIN',
  'RESCUE_COST', 'RESCUE_TRIBUTE_BANNERS', 'ROUND_CAP', 'SPREAD_AMOUNT_BASE', 'STARTING_HAND',
  'SUSPICION_NONE_SCORE', 'SURGE_SPREAD_MULT', 'SUSPICION_LOG_ROUNDS', 'TRAITOR_EXPOSED_WOUNDS',
  'WARLORD_POWER',
];

const tunablesSchema = z
  .object({
    ...Object.fromEntries(TUNABLE_INT_KEYS.map(k => [k, int])),
    // fractions (0..1) — a fat-fingered 7.45 vs 0.745 fails here, not silently
    BAILOUT_BASE_PCT: frac,
    GAMBIT_SURCHARGE: frac,
    SABOTEUR_COVER: frac,
    CROWN_PLEDGE_DISCOUNT: frac,
    GAMBIT_COVER_FRACTION: frac,
    SABOTEUR_COVER_PLEDGE_FRACTION: frac,
    PLEDGE_TIER_HIGH_RATIO: frac,
    PLEDGE_TIER_MEDIUM_RATIO: frac,
    // a ratio threshold that may legitimately sit at/above 1.0
    FULL_BLOCK_THRESHOLD: z.number().min(0),
    // booleans + enum + nested
    DK_BLOCKS_CLAIM: bool,
    DK_KILL_CLAIMS_NODE: bool,
    SEALED_CORE_PLEDGE: z.enum(['off', 'gambit_claimant', 'all']),
    ACT_THRESHOLDS: z.object({ MARCH: int, RECKONING: int }).strict(),
  })
  .strict();

// ─── archetypes schema ────────────────────────────────────────────
// AIPolicy: 3 required knobs + 16 optional behaviour weights (mirrors the interface
// in ai-player.ts). `.strict()` rejects a typo'd knob. Weights aren't all 0..1 (e.g.
// cooperator pledgeGenerosity 1.6), so optional knobs are plain numbers, not fractions.
const num = z.number();
const aiPolicySchema = z
  .object({
    selfishness: num,
    targetCover: num,
    handReserve: num.int(),
    pledgeGenerosity: num.optional(),
    aggression: num.optional(),
    raidLeaderBias: num.optional(),
    defensiveness: num.optional(),
    claimVsRaidPref: num.optional(),
    gambitAmbition: num.optional(),
    rescueWillingness: num.optional(),
    darkHuntBias: num.optional(),
    forgeValuation: num.optional(),
    heraldAffinity: num.optional(),
    parleyBias: num.optional(),
    oathWillingness: num.optional(),
    oathLoyalty: num.optional(),
    gambitContest: num.optional(),
    saboteurPledgeSuppression: num.optional(),
    bailoutTrust: num.optional(),
  })
  .strict();

const archetypeSchema = z.object({ label: z.string(), policy: aiPolicySchema }).strict();
// The 6 STRATEGY archetypes only — `baseline` stays a code reference to DEFAULT_AI_POLICY
// (the chooseAction identity guard), so it is intentionally NOT in the JSON.
const archetypesSchema = z
  .object({
    aggressor: archetypeSchema,
    turtle: archetypeSchema,
    opportunist: archetypeSchema,
    cooperator: archetypeSchema,
    gambler: archetypeSchema,
    saboteur: archetypeSchema,
  })
  .strict();

// ─── board schema ─────────────────────────────────────────────────
// The closing-ring topology. Adjacency is load-bearing (blight spoke-paths), so a
// typo'd node id surfaces in validateClosingRing()/the blight tests, but the schema
// at least guarantees the shape. id arrays are stored explicitly to pin order-sensitive
// arrays (keepIds is indexed by quadrant; blightEntrySeams order steers the dark).
const boardNodeSchema = z
  .object({
    id: z.string(),
    tier: z.enum(['keystone', 'approach', 'forge', 'keep', 'holding']),
    quadrant: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.null()]),
    connections: z.array(z.string()).min(1),
    income: z.number().int().nonnegative(),
  })
  .strict();
const boardSchema = z
  .object({
    keystoneId: z.string(),
    approachIds: z.array(z.string()),
    forgeIds: z.array(z.string()),
    keepIds: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    holdingIds: z.array(z.string()),
    blightEntrySeams: z.array(z.string()),
    nodes: z.array(boardNodeSchema),
  })
  .strict();

// ─── generation targets ───────────────────────────────────────────
const TARGETS = [
  {
    json: 'data/tunables.json',
    out: 'src/v2/tunables.gen.ts',
    constName: 'TUNABLES_DATA',
    schema: tunablesSchema,
  },
  {
    json: 'data/archetypes.json',
    out: 'src/v2/sim/archetypes.gen.ts',
    constName: 'ARCHETYPE_DATA',
    schema: archetypesSchema,
  },
  {
    json: 'data/board.json',
    out: 'src/v2/board.gen.ts',
    constName: 'BOARD_DATA',
    schema: boardSchema,
  },
];

// ─── emit helpers ─────────────────────────────────────────────────
/** Recursively sort object keys so editor key-order never changes generated output. */
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortDeep(value[key]);
    return sorted;
  }
  return value;
}

function render(target, data) {
  const body = JSON.stringify(sortDeep(data), null, 2);
  return (
    `// GENERATED — DO NOT EDIT. Source: ${target.json}. Run: npm run gen:data\n` +
    `export const ${target.constName} = ${body} as const;\n`
  );
}

// ─── run ──────────────────────────────────────────────────────────
let drift = false;
for (const target of TARGETS) {
  const raw = JSON.parse(readFileSync(resolve(ROOT, target.json), 'utf8'));
  const parsed = target.schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`✗ ${target.json} failed validation:`);
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }
  const content = render(target, parsed.data);
  const outPath = resolve(ROOT, target.out);
  const existing = (() => {
    try {
      return readFileSync(outPath, 'utf8');
    } catch {
      return null;
    }
  })();

  if (checkOnly) {
    if (existing !== content) {
      console.error(`✗ ${target.out} is out of sync with ${target.json} — run \`npm run gen:data\`.`);
      drift = true;
    } else {
      console.log(`✓ ${target.out} in sync`);
    }
  } else if (existing === content) {
    console.log(`= ${target.out} unchanged`);
  } else {
    writeFileSync(outPath, content);
    console.log(`✓ wrote ${target.out}`);
  }
}

process.exit(drift ? 1 : 0);
