/**
 * Difficulty tiers (Stage D1) — a player-facing DARK-STRENGTH setting.
 *
 * The competitive balance is LOCKED at the flawless-play point (errorRate 0 ⇒ dark win ~21%,
 * inside the §9 18–22 band). The noise pass found the dark gets HARDER as human error rises
 * (~+0.5pp dark-win per +1% error). This module turns that into a chosen SETTING: a `difficulty`
 * tier that scales the dark via the single cleanest lever — the DOOM_COST curve (the pledge
 * threshold the table must meet to avert a strike). Higher doomCost ⇒ the table must pledge more
 * to block ⇒ a STRONGER dark; lower ⇒ a WEAKER dark.
 *
 * The tiers are named by the martial rank the dark demands of you — a descending ladder:
 *   • warlord (HARD, DEFAULT) — the dark at full, LOCKED strength. Maps to the current doomCost
 *     values verbatim, so a default game is BYTE-IDENTICAL to the locked competitive build.
 *   • knight  (NORMAL)        — a gentler dark.
 *   • squire  (EASY)          — the dark goes easy on a squire.
 *
 * Calibrated by FLAWLESS-PLAY (errorRate 0) pooled dark-win over the standard competitive sweep
 * (2 base seeds × 40 seeds × [2,3,4]p × 35 matchups). See the tier table in docs / the D1 report:
 *
 *   tier            errorRate 0     errorRate ~0.07 ("under human error")
 *   warlord (HARD)  ~21%            ~25%
 *   knight  (NORMAL)~17%            ~21%
 *   squire  (EASY)  ~13%            ~17%
 *
 * NOTE (structural, honest): at 2 players the reference doomCost already FLOORS at 1 card
 * (the minimum threshold), so the easier tiers cannot weaken the dark further at 2p — the lever
 * only bites at 3p/4p, where the threshold has headroom. The pooled tier separation is real and
 * monotone; the 2p cell is fixed by the floor. Named DOOM_COST values are the ONLY levers a tier
 * touches — everything else is shared, so tiers differ ONLY in the dark's pledge threshold.
 *
 * Determinism (§7): a tier is a pure `Partial<Tunables>` applied through the existing
 * getTunables/withTunables seam, so `(playerCount, mode, seed, difficulty)` ⇒ an identical game.
 */

import {
  withTunables,
  HERALD_OFF_REBALANCE,
  type Tunables,
} from './tunables.js';
import type { Difficulty } from './types.js';

/** The default tier — the LOCKED reference. A default game is byte-identical to the locked build. */
export const DEFAULT_DIFFICULTY: Difficulty = 'warlord';

/**
 * Each tier's DOOM_COST-curve override (the dark's pledge threshold). Only the four calibrated
 * doomCost levers are touched — every other tunable is shared, so tiers differ ONLY in dark strength.
 *
 * `warlord` is an EMPTY override (T2-3): it used to pin the four locked doomCost constants
 * VERBATIM — semantically identical to no override at all, but a verbatim pin would also
 * clobber the T2-3 herald-off re-lock's doomCost shape (HERALD_OFF_REBALANCE layers UNDER the
 * tier — see `sessionTunables`). Empty keeps herald-ON byte-identical to the locked build AND
 * lets the herald-off overlay reach the default tier. `knight` / `squire` are the calibrated
 * flawless-play ~17% / ~13% points — calibrated against the HERALD-ON reference; their
 * magnitudes under the herald-off default are a recorded WATCH item (recalibrate at the next
 * difficulty-touching stage, per the T2-1 note).
 */
export const DIFFICULTY_TUNABLES: Readonly<Record<Difficulty, Partial<Tunables>>> = Object.freeze({
  // HARD (default) — the locked reference: no override (see the doc block above).
  warlord: {},
  // NORMAL — flawless-play pooled dark-win ~17%.
  knight: {
    DOOM_COST_WHISPER: 1,
    DOOM_COST_MARCH: 2,
    DOOM_COST_RECKONING: 3,
    DOOM_COST_PER_PLAYER: 2,
  },
  // EASY — flawless-play pooled dark-win ~13%.
  squire: {
    DOOM_COST_WHISPER: 1,
    DOOM_COST_MARCH: 1,
    DOOM_COST_RECKONING: 1,
    DOOM_COST_PER_PLAYER: 1,
  },
});

/** The tunable overrides for a difficulty tier (the doomCost curve). Pure. */
export function difficultyTunables(difficulty: Difficulty): Partial<Tunables> {
  return DIFFICULTY_TUNABLES[difficulty];
}

/**
 * Run `fn` with the tier's doomCost curve active (via the getTunables/withTunables seam), then
 * restore. Deterministic + leak-safe. `warlord` scopes the locked reference values (byte-identical).
 */
export function withDifficulty<T>(difficulty: Difficulty, fn: () => T): T {
  return withTunables(difficultyTunables(difficulty), fn);
}

/**
 * The full session overlay (T2-3): the herald-OFF re-lock (when the advanced Herald toggle is
 * off — the DEFAULT game) layered UNDER the difficulty tier's doomCost curve, so a tier still
 * shifts dark strength on top of the re-locked default. Herald-ON ⇒ no overlay (the locked
 * 4-archetype reference, byte-identical). Pure `f(difficulty, heraldEnabled)`.
 */
export function sessionTunables(difficulty: Difficulty, heraldEnabled: boolean): Partial<Tunables> {
  return {
    ...(heraldEnabled ? {} : HERALD_OFF_REBALANCE),
    ...difficultyTunables(difficulty),
  };
}

/**
 * Run `fn` with the session overlay active (difficulty + the herald toggle — the two setup
 * choices that scope tunables). Deterministic + leak-safe; the UI session wraps every engine
 * step in this, mirroring the sim driver's merge.
 */
export function withSessionTunables<T>(
  difficulty: Difficulty,
  heraldEnabled: boolean,
  fn: () => T,
): T {
  return withTunables(sessionTunables(difficulty, heraldEnabled), fn);
}
