/**
 * Tunable Parameters — Stage 5 (ML) sets the final values.
 *
 * Every balance-sensitive constant from ALGORITHM §9 lives here.
 * All values are placeholder starting points; the ML harness sweeps them.
 *
 * Import `TUNABLES` for the full object or individual named exports.
 */

import type { Act } from './types.js';

// ─── Player Economy ───────────────────────────────────────────────

/** Cards dealt to each player at game start. */
export const STARTING_HAND = 4;

/** Maximum cards a player can hold (refilled toward this at Dawn). */
export const HAND_LIMIT = 6;

/** Actions per turn for an active (non-Broken) player. */
export const ACTIONS_NORMAL = 2;

/** Actions per turn for a Broken player. */
export const ACTIONS_BROKEN = 1;

// ─── Shadowking Forces ────────────────────────────────────────────

/** Number of Death Knights placed at game start (flat, before per-player scaling). */
export const DK_START_COUNT = 2;

/**
 * Per-player scaling of the Death Knight count (via `deathKnightCount()`):
 * `+ DK_PER_PLAYER * (playerCount - 3)`. Stage 5-dark probed 0 → 1 to pressure 4p,
 * but the retune REFUTED it: now that killing a DK pays (claims the node + pushback),
 * a BIGGER army at high counts FEEDS the players rather than the dark (4p SK-win
 * went *up*, not down, with fewer DKs). Kept FLAT at 0 — engagement comes from the
 * other four 5-dark levers, not army size. (See DESIGN-V2-DARK-ENGAGEMENT + tuning-log §5-dark.)
 */
export const DK_PER_PLAYER = 0;

/** Combat power of a Death Knight. */
export const DK_POWER = 4;

/** Combat power of a Blight token (static, blocking). */
export const BLIGHT_POWER = 2;

/** Blight level at which a node becomes permanently ashed. */
export const BLIGHT_TO_ASH = 3;

/** Blight-level reduction when a Death Knight is killed or a Forge reclaimed. */
export const PUSHBACK = 1;

// ─── The Pledge ───────────────────────────────────────────────────

/**
 * Crown holder's pledged cards are multiplied by this discount.
 * < 1 means the leader's cards count for less.
 */
export const CROWN_PLEDGE_DISCOUNT = 0.5;

/** Ratio at or above which the Pledge fully blocks the strike. */
export const FULL_BLOCK_THRESHOLD = 1.0;

/** Patience gained by the Shadowking when the table fully blocks a strike. */
export const PATIENCE_ON_BLOCK = 1;

/** Maximum patience before escalation triggers. */
export const PATIENCE_CAP = 3;

// ─── Territory & Crown ────────────────────────────────────────────

/** Weight multiplier for Forges when computing territory lead (Crown). */
export const FORGE_WEIGHT = 3;

// ─── Broken Court ─────────────────────────────────────────────────

/** Accumulated wounds required to enter Broken state. */
export const BREAK_THRESHOLD = 6;

/** Extra banners per round while Broken (comeback subsidy, decays). */
export const BROKEN_INCOME_BONUS = 2;

/**
 * Auto-recover to minimum strength after this many consecutive Broken rounds.
 * Stage 5d locked 3 → 2: with the dark now a break-vector, faster recovery keeps the
 * extra Breaks from piling into all_broken (mutual-loss) draws.
 */
export const BROKEN_MAX_ROUNDS = 2;

/** Card cost to Rescue an adjacent/co-located Broken ally. Stage 5d locked 2 → 1 (cheaper). */
export const RESCUE_COST = 1;

// ─── Herald / political-martial stance (§ Herald, FOCUS-GROUP-R3 §3) ──
// Recruiting a Herald commits a player to the POLITICAL build: a bigger hand (more
// pledge/combat fuel) for a weaker fighter (the "body off the board" tradeoff).
/** Banner cost to RECRUIT a Herald (commit to the political stance). [TUNABLE] */
export const HERALD_RECRUIT_COST = 2;
/** Hand-cap bonus a Herald grants (deep-hand political build). Stage-H locked 2→1
 * (deep pledging weakened the dark too much; +1 keeps the build viable). [TUNABLE] */
export const HERALD_HAND_BONUS = 1;
/** Combat-power penalty a Herald imposes (fewer fighters — the tradeoff). [TUNABLE] */
export const HERALD_COMBAT_PENALTY = 1;
/** Blight pushback a Herald's PARLEY applies to a nearby front (non-card anti-dark verb). [TUNABLE] */
export const HERALD_PUSHBACK = 1;

/**
 * Banners the rescued ally pays the rescuer on Rescue (Stage 5d win-currency payoff).
 * The "strings" with teeth: rescue moves the rescuer's claim/march math THIS round, so
 * it's a real political deal (bind a rival + take their banners), not charity. Stage 5d
 * locked 0 → 2. [TUNABLE]
 */
export const RESCUE_TRIBUTE_BANNERS = 2;

// ─── Game Clock ───────────────────────────────────────────────────

/** Fixed round cap — territory victory checked at this round's Dawn. */
export const ROUND_CAP = 14;

/** Blight-progress thresholds for Act transitions. */
export const ACT_THRESHOLDS = {
  /** Total ashed nodes to trigger Whisper → March. */
  MARCH: 3,
  /** Total ashed nodes to trigger March → Reckoning. */
  RECKONING: 7,
} as const;

// ─── Crown's Gambit ───────────────────────────────────────────────

/**
 * A named Gambit claimant's pledged cards are multiplied by this surcharge.
 * It does NOT stack with the Crown discount — `getEffectivePledgeWeight` returns
 * this outright (the worst weight wins): Gambit 0.25 > Crown 0.5 > normal 1.0.
 */
export const GAMBIT_SURCHARGE = 0.25;

/**
 * Which pledges are SEALED (concealed reveal) in competitive play (§ Sealed Pledge,
 * FOCUS-GROUP-R3). blood_pact mode is always sealed regardless. Options:
 *   'off'            — open live pledges (the Round-1 core pillar; default).
 *   'gambit_claimant'— only the named Gambit claimant's pledge is sealed (a
 *                      volunteer's-dilemma aimed at the Gambit, minimal reversal).
 *   'all'            — every competitive pledge is sealed (full table-wide dilemma).
 * NOTE: sealing is a HUMAN-facing information change — the deterministic AI never
 * reads rivals' pledges, so it is a sim no-op ON ITS OWN. It gates the risk-aware
 * Gambit self-cover rule below (the lever that actually moves the fire rate).
 */
export const SEALED_CORE_PLEDGE: 'off' | 'gambit_claimant' | 'all' = 'gambit_claimant';

/**
 * Risk-aware Gambit gate (§ Sealed Pledge): when a would-be claimant's pledge will be
 * SEALED (so it can't count on rivals bailing it out), the AI only seizes the Keystone
 * if it holds at least this many cards to self-defend the named strike. 0 = off (no
 * gate). Higher ⇒ fewer speculative Gambits ⇒ lower fire rate. Stage-S locked 0 → 4
 * (with SEALED_CORE_PLEDGE='gambit_claimant'): gambler-free gambit fire 26.7%→~14%
 * (in 10-20 band), gambit-win 28.9%→~19%, 2-seed stable. [TUNABLE]
 */
export const GAMBIT_SELF_COVER_CARDS = 4;

// ─── Banner Generation ────────────────────────────────────────────

/** Base banners generated per player each Dawn (before territory income). */
export const BASE_BANNER_INCOME = 2;

// ─── Blight / Ash-Map ────────────────────────────────────────────

/**
 * Baseline Blight levels added to the steered spoke each Dawn (anti-turtle, §5.1 / P1-C3).
 *
 * BALANCE CONSTRAINT (Stage 5): the spec requires the front can never *perfectly*
 * stall. A single DK-kill PUSHBACK (−`PUSHBACK`) on the steered frontier node
 * cancels this Dawn advance exactly when `PUSHBACK === DAWN_BLIGHT_ADVANCE`. To
 * keep the doom clock monotonic under sustained pushback, tune so the net Dawn
 * advance exceeds the sustainable pushback rate (e.g. DAWN_BLIGHT_ADVANCE > PUSHBACK,
 * or rely on the steered-quadrant rotation + multi-spoke advance to guarantee net
 * progress). Left at 1/1 for now — a Stage-5 measurement + tuning decision.
 */
export const DAWN_BLIGHT_ADVANCE = 1;

/**
 * Base Blight spread from an un-averted strike (scaled by 1-ratio).
 * History: 5c 2→5; 5-dark retune 5→4; Oaths retune 4→5; Stage-H retune 5→7. The uniform
 * doom-win lever. Each social/positional layer (Oaths' fealty banners, then the Herald's
 * Parley pushback + deep-hand political pledging) weakened the dark, so SPREAD was raised
 * to compensate — Stage H needed 7 to recover SK-win to ~20% with Heralds active (2-seed
 * stable). See stage5-tuning-log.md §oaths/§herald.
 */
export const SPREAD_AMOUNT_BASE = 7;

/** Extra banner cost to march through an ashed node (P0-3: traversable, not impassable). */
export const ASHED_TRAVERSE_EXTRA_COST = 1;

/**
 * Banner toll paid to a rival when marching INTO a Forge they own (§ tolls — the
 * Forge-as-Gate chokepoint tax). Forges are the mid-belt chokepoints (every Keep→Keystone
 * path crosses exactly one), so this makes holding a Forge real leverage and taxes the
 * front-runner heading for the center. Sworn allies pass free. Stage-T locked 0 → 1
 * (2-seed stable: SK-win 18.6/19.4%, tolls ~0.74/game, monotonic per-count ladder
 * preserved, guards PASS). See stage5-tuning-log.md §tolls. [TUNABLE]
 */
export const FORGE_TOLL_COST = 1;

/**
 * Wounds the dark deals its NAMED TARGET when a strike lands un-averted (Stage 5d
 * break-vector): `ceil((1-ratio) * LANDED_STRIKE_WOUNDS)`. The dark's strikes ash
 * nodes but never wounded a warlord, so breaks (and thus rescues) were starved and
 * "leading is dangerous" / "a beaten lord feeds the dark" (§5.4) was dormant. This
 * lets the dark break the leader it hunts. 5d locked 0 → 2 (the primary Break source
 * that revives the rescue economy); the Oaths retune raised it 2 → 3 — Oath
 * non-aggression cut PvP Breaks, so a harder dark-wound restores breaks/rescues. See
 * tuning-log §5d + §oaths. [TUNABLE]
 */
export const LANDED_STRIKE_WOUNDS = 3;

// ─── Grudge System ────────────────────────────────────────────────

/** Grudge decays by this amount per round (standard grudge). */
export const GRUDGE_DECAY_RATE = 1;

/** Heroic-grudge (DK kills, Forge reclaims) decays at this faster rate (P1). */
export const GRUDGE_HEROIC_DECAY_RATE = 2;

/** Maximum grudge a single player can accumulate. */
export const GRUDGE_CAP = 10;

/** Grudge added when a player kills a Death Knight. */
export const GRUDGE_PER_DK_KILL = 3;

/** Grudge added when a player reclaims a Forge from the Shadowking. */
export const GRUDGE_PER_FORGE_RECLAIM = 2;

/** Grudge added per point of combat damage dealt to Shadowking forces (§5.6). */
export const GRUDGE_PER_SK_WOUND = 1;

// ─── Oaths (the passion spine — DESIGN-V2-OATHS.md) ───────────────
// Public, breakable two-player pacts. Kept OFF the card economy (banners + grudge).

/** Banners each sworn player gains at Dawn while an Oath is active (fealty dividend). */
export const OATH_DIVIDEND = 1;
/** Rounds of strain until an Oath matures (dissolves with a loyalty bonus). */
export const OATH_DURATION = 3;
/** Banners each sworn player gains when an Oath matures honored to the end. */
export const OATH_LOYALTY_BONUS = 2;
/** Banner burst the breaker seizes on betrayal (BREAK_OATH). */
export const OATH_BREAK_BANNERS = 2;
/** Grudge added to an oathbreaker — the dark hunts the traitor (the Ledger). */
export const GRUDGE_OATHBREAK = 3;

// ─── Dark Engagement (Stage 5-dark — DESIGN-V2-DARK-ENGAGEMENT.md) ──
// The fix for the dead grudge: make engaging the dark reachable, rewarded, and
// necessary — flipping heroism from a pure cost (0.00 DK-kills) into a real play.

/** A Death Knight on a node BLOCKS claiming it (the forcing function). */
export const DK_BLOCKS_CLAIM = true;

/**
 * Killing a Death Knight on an unclaimed, living Holding/Forge CLAIMS it for the
 * attacker for free ("spoils of the breach") — heroism paid in the win currency.
 */
export const DK_KILL_CLAIMS_NODE = true;

/**
 * DK-kill / Forge-reclaim grudge (becoming the villain's next target) applies ONLY
 * when the attacker's territory rank is strictly below this (0 = leader). So the
 * LEADING seats pay the "now it hunts you" tax while TRAILING seats hunt for free —
 * a catch-up lever that keeps "leading is dangerous" honest (the MTG judge's lever).
 * Set very high (≥ player count) to restore the old "always mark" behaviour.
 */
export const GRUDGE_MARK_TOP_N = 2;

// ─── Pieces / Combat power ────────────────────────────────────────

/** Base combat power of a Warlord piece (consistent at setup and after moving). */
export const WARLORD_POWER = 3;

/** Max cards the engine auto-commits to a single combat (value-aware, §5.3). */
export const COMBAT_COMMIT_MAX = 3;

/** Power an attacker assumes the defender will add when sizing a RAID commit. */
export const RAID_DEFENSE_MARGIN = 1;

// ─── Card values (the core pledge/combat scaling lever) ───────────

/** Lowest possible drawn card value. */
export const CARD_VALUE_MIN = 1;
/** Highest possible drawn card value. Card values scale BOTH pledging and combat. */
export const CARD_VALUE_MAX = 4;

// ─── Anti-free-rider reward (§4.2 step 5 — the #1 balance risk) ────

/**
 * Grudge reduction a player earns for making a non-zero Pledge (the persistent
 * FAVOR). Contributing buys goodwill; free-riding does not. [TUNABLE / ML]
 */
export const PLEDGE_FAVOR_GRUDGE_REDUCTION = 1;

/**
 * Blight levels a contributor's own frontier land is shielded by when an
 * un-averted strike spreads (§4.2 step 5a — the averted fraction protects
 * pledgers' lands first, so free-riders eat the strike). [TUNABLE / ML]
 */
export const PLEDGE_SHIELD_AMOUNT = 1;

// ─── Shadowking effect table (§5.6) ───────────────────────────────

/** Nodes a Death Knight maneuvers toward the target on a MARCH_DK effect. */
export const DK_MARCH_DISTANCE = 2;

/** SURGE (Reckoning) multiplies the SPREAD amount by this. */
export const SURGE_SPREAD_MULT = 2;

/**
 * Gambit STRIKE-ADJACENT rate while the Keystone is garrisoned. Per stress-test
 * P0-3 the amplifying multiplier is DROPPED — the adjacent strike is normal rate.
 */
export const GAMBIT_ADJACENT_STRIKE_MULT = 1;

// ─── Rescue binding debt (§5.4) ───────────────────────────────────

/** Forced minimum Pledge a rescued debtor must make next round (open modes). */
export const RESCUE_DEBT_MIN_PLEDGE = 2;

// ─── Layer B — Blood Pact (§10) ──────────────────────────────────

/** How many recent rounds of pledge tiers the Suspicion Log retains. */
export const SUSPICION_LOG_ROUNDS = 4;

/** Banner cost to Audit one opponent's last pledge. */
export const AUDIT_COST = 2;

/** Rounds new accusations are locked out after a wrong/fizzled one (anti-spam). */
export const ACCUSATION_COOLDOWN_ROUNDS = 2;

/** Cards each agreeing accuser discards when the accusation is wrong. */
export const ACCUSATION_WRONG_PENALTY = 1;

/** Banners the vindicated (wrongly-accused) player gains. */
export const ACCUSATION_VINDICATION_BONUS = 2;

/** Blight pushback applied to the worst frontier node when the traitor is exposed. */
export const ACCUSATION_PUSHBACK = 2;

/** Wounds dealt to the traitor when correctly exposed. */
export const TRAITOR_EXPOSED_WOUNDS = 3;

// ─── Doom Cost curve (per-Act base + player-count scaling) ────────
// Extracted into named tunables so the Stage-5 search can fix the player-count
// disparity (5a found SK-win 2p 29% / 4p 1.9% — a SCALING problem).

// Stage 5c LOCKED values (was 3/5/8). Raised together with DOOM_COST_PER_PLAYER
// to make strikes occasionally LAND at high player counts (where 3-4 hands of
// pledge otherwise block everything). Combined with SPREAD_AMOUNT_BASE=5 this
// lifts pooled SK-win 14%→~20% and 4p 1.9%→~8%. Evidence + the structural 4p
// caveat are in docs/handoff/stage5-tuning-log.md.
export const DOOM_COST_WHISPER = 6;
export const DOOM_COST_MARCH = 9;
export const DOOM_COST_RECKONING = 12;
/** doomCost scales as base * playerCount / this divisor (4 = baseline 4p). */
export const DOOM_COST_PLAYER_DIVISOR = 4;
/**
 * Per-player TILT added to doomCost: `+ DOOM_COST_PER_PLAYER * (playerCount - DOOM_COST_PIVOT)`.
 * This is the lever that flattens the 5a per-count SK-win disparity (the linear
 * `base*pc/divisor` term can't — it locks the 2p:4p threshold ratio). Defaults to
 * 0 (no tilt) so behaviour is byte-identical until the search turns it on:
 * positive values LOWER the threshold below the pivot (dark weaker at low pc) and
 * RAISE it above (dark stronger at high pc).
 *
 * Stage 5c LOCKED at 6 (was 0); Stage-S retuned 6 → 5 as the fine compensator that
 * offset the gambit gate (suppressing gambits — a player win-path — raised SK-win, so
 * a slightly easier doom threshold pulled it back into band). The search showed this is
 * the lever that raises the dark's 4p win rate — at 4p the threshold is high enough that
 * 4 hands sometimes fail to block. At 2p it floors to 1. Residual per-count disparity is
 * STRUCTURAL — see the tuning log §5c note.
 */
export const DOOM_COST_PER_PLAYER = 5;
/** Player count at which the per-player tilt is zero (the curve's pivot). */
export const DOOM_COST_PIVOT = 3;

/**
 * The card threshold the table must collectively meet in the Pledge to fully
 * avert the Shadowking's strike. Reads the live (possibly overridden) tunables.
 */
export function doomCost(act: Act, playerCount: number): number {
  const t = getTunables();
  const base: Record<Act, number> = {
    WHISPER: t.DOOM_COST_WHISPER,
    MARCH: t.DOOM_COST_MARCH,
    RECKONING: t.DOOM_COST_RECKONING,
  };
  const linear = base[act] * playerCount / t.DOOM_COST_PLAYER_DIVISOR;
  const tilt = t.DOOM_COST_PER_PLAYER * (playerCount - t.DOOM_COST_PIVOT);
  return Math.max(1, Math.ceil(linear + tilt));
}

/**
 * Number of Death Knights to field at the given player count. Defaults to a flat
 * `DK_START_COUNT` (DK_PER_PLAYER=0 ⇒ no scaling ⇒ current behaviour), but the
 * search can scale the dark's army with the table size (5a: at 4p the dark fields
 * 2 DKs against 4 warlords — structurally out-numbered).
 */
export function deathKnightCount(playerCount: number): number {
  const t = getTunables();
  return Math.max(1, Math.round(t.DK_START_COUNT + t.DK_PER_PLAYER * (playerCount - DOOM_COST_PIVOT)));
}

// ─── Injectable tunables (Stage 5 — the search overrides these per run) ──
// The set of levers the balance search may vary. Keeping it explicit means
// overriding an un-wired constant is a TYPE ERROR, not a silent no-op. The
// engine reads these via `getTunables()`; `withTunables()` scopes an override
// (the sim sets it per game). The default path returns DEFAULT_TUNABLES, whose
// values equal the module constants — so behaviour is byte-identical by default.

// `Tunables` lists ONLY the levers whose engine call-sites read `getTunables()`,
// so an override always takes effect (no silent no-op). It GROWS as later tuning
// sub-stages wire more levers: each adds the field here + converts that lever's
// call sites + extends DEFAULT_TUNABLES. 5b wires the doomCost curve (the #1
// target — the player-count scaling that makes the dark unwinnable at 4p).
export interface Tunables {
  // ── Doom cost curve (the dark's pledge threshold) ──
  readonly DOOM_COST_WHISPER: number;
  readonly DOOM_COST_MARCH: number;
  readonly DOOM_COST_RECKONING: number;
  readonly DOOM_COST_PLAYER_DIVISOR: number;
  readonly DOOM_COST_PER_PLAYER: number;
  readonly DOOM_COST_PIVOT: number;
  // ── Dark forces (5c cluster) ──
  readonly DK_START_COUNT: number;
  readonly DK_PER_PLAYER: number;
  readonly DK_POWER: number;
  // ── Blight pacing (5c cluster) ──
  readonly SPREAD_AMOUNT_BASE: number;
  readonly DAWN_BLIGHT_ADVANCE: number;
  readonly BLIGHT_TO_ASH: number;
  readonly PUSHBACK: number;
  // ── Dark engagement (5-dark cluster) ──
  readonly DK_BLOCKS_CLAIM: boolean;
  readonly DK_KILL_CLAIMS_NODE: boolean;
  readonly GRUDGE_MARK_TOP_N: number;
  // ── Rescue / break economy (5d cluster) ──
  readonly BREAK_THRESHOLD: number;
  readonly RESCUE_COST: number;
  readonly RESCUE_TRIBUTE_BANNERS: number;
  readonly LANDED_STRIKE_WOUNDS: number;
  readonly BROKEN_MAX_ROUNDS: number;
  // ── Oaths (passion spine) ──
  readonly OATH_DIVIDEND: number;
  readonly OATH_DURATION: number;
  readonly OATH_LOYALTY_BONUS: number;
  readonly OATH_BREAK_BANNERS: number;
  readonly GRUDGE_OATHBREAK: number;
  // ── Forge tolls (Stage T) ──
  readonly FORGE_TOLL_COST: number;
  // ── Sealed Pledge + gambit fix (Stage S) ──
  readonly SEALED_CORE_PLEDGE: 'off' | 'gambit_claimant' | 'all';
  readonly GAMBIT_SELF_COVER_CARDS: number;
  // ── Herald / stance (Stage H) ──
  readonly HERALD_RECRUIT_COST: number;
  readonly HERALD_HAND_BONUS: number;
  readonly HERALD_COMBAT_PENALTY: number;
  readonly HERALD_PUSHBACK: number;
  // ── Anti-free-rider + dark-effect magnitudes (made injectable in C2 — see
  //    stage5-tuning-log §C2; defaults are byte-identical, the consumers just now
  //    read getTunables().X instead of the frozen module const, so a sweep can reach them) ──
  readonly PLEDGE_SHIELD_AMOUNT: number;
  readonly PLEDGE_FAVOR_GRUDGE_REDUCTION: number;
  readonly DK_MARCH_DISTANCE: number;
  readonly SURGE_SPREAD_MULT: number;
  readonly GAMBIT_ADJACENT_STRIKE_MULT: number;
  readonly RESCUE_DEBT_MIN_PLEDGE: number;
}

export const DEFAULT_TUNABLES: Tunables = Object.freeze({
  DOOM_COST_WHISPER, DOOM_COST_MARCH, DOOM_COST_RECKONING, DOOM_COST_PLAYER_DIVISOR,
  DOOM_COST_PER_PLAYER, DOOM_COST_PIVOT,
  DK_START_COUNT, DK_PER_PLAYER, DK_POWER,
  SPREAD_AMOUNT_BASE, DAWN_BLIGHT_ADVANCE, BLIGHT_TO_ASH, PUSHBACK,
  DK_BLOCKS_CLAIM, DK_KILL_CLAIMS_NODE, GRUDGE_MARK_TOP_N,
  BREAK_THRESHOLD, RESCUE_COST, RESCUE_TRIBUTE_BANNERS, LANDED_STRIKE_WOUNDS, BROKEN_MAX_ROUNDS,
  OATH_DIVIDEND, OATH_DURATION, OATH_LOYALTY_BONUS, OATH_BREAK_BANNERS, GRUDGE_OATHBREAK,
  FORGE_TOLL_COST, SEALED_CORE_PLEDGE, GAMBIT_SELF_COVER_CARDS,
  HERALD_RECRUIT_COST, HERALD_HAND_BONUS, HERALD_COMBAT_PENALTY, HERALD_PUSHBACK,
  PLEDGE_SHIELD_AMOUNT, PLEDGE_FAVOR_GRUDGE_REDUCTION,
  DK_MARCH_DISTANCE, SURGE_SPREAD_MULT, GAMBIT_ADJACENT_STRIKE_MULT, RESCUE_DEBT_MIN_PLEDGE,
});

let activeTunables: Tunables = DEFAULT_TUNABLES;

/** The tunables in effect right now (overridden inside `withTunables`, else default). */
export function getTunables(): Tunables {
  return activeTunables;
}

/** Run `fn` with `overrides` merged over the defaults, then restore. Deterministic + leak-safe. */
export function withTunables<T>(overrides: Partial<Tunables>, fn: () => T): T {
  const prev = activeTunables;
  activeTunables = Object.freeze({ ...DEFAULT_TUNABLES, ...overrides });
  try {
    return fn();
  } finally {
    activeTunables = prev;
  }
}

// ─── Frozen aggregate ─────────────────────────────────────────────

export const TUNABLES = Object.freeze({
  STARTING_HAND,
  HAND_LIMIT,
  ACTIONS_NORMAL,
  ACTIONS_BROKEN,
  DK_START_COUNT,
  DK_POWER,
  BLIGHT_POWER,
  BLIGHT_TO_ASH,
  PUSHBACK,
  CROWN_PLEDGE_DISCOUNT,
  FULL_BLOCK_THRESHOLD,
  PATIENCE_ON_BLOCK,
  PATIENCE_CAP,
  FORGE_WEIGHT,
  BREAK_THRESHOLD,
  BROKEN_INCOME_BONUS,
  BROKEN_MAX_ROUNDS,
  RESCUE_COST,
  ROUND_CAP,
  ACT_THRESHOLDS,
  GAMBIT_SURCHARGE,
  BASE_BANNER_INCOME,
  DAWN_BLIGHT_ADVANCE,
  SPREAD_AMOUNT_BASE,
  ASHED_TRAVERSE_EXTRA_COST,
  FORGE_TOLL_COST,
  GRUDGE_DECAY_RATE,
  GRUDGE_HEROIC_DECAY_RATE,
  GRUDGE_CAP,
  GRUDGE_PER_DK_KILL,
  GRUDGE_PER_FORGE_RECLAIM,
  GRUDGE_PER_SK_WOUND,
  DK_BLOCKS_CLAIM,
  DK_KILL_CLAIMS_NODE,
  GRUDGE_MARK_TOP_N,
  OATH_DIVIDEND,
  OATH_DURATION,
  OATH_LOYALTY_BONUS,
  OATH_BREAK_BANNERS,
  GRUDGE_OATHBREAK,
  WARLORD_POWER,
  COMBAT_COMMIT_MAX,
  RAID_DEFENSE_MARGIN,
  CARD_VALUE_MIN,
  CARD_VALUE_MAX,
  PLEDGE_FAVOR_GRUDGE_REDUCTION,
  PLEDGE_SHIELD_AMOUNT,
  DK_MARCH_DISTANCE,
  SURGE_SPREAD_MULT,
  GAMBIT_ADJACENT_STRIKE_MULT,
  RESCUE_DEBT_MIN_PLEDGE,
  RESCUE_TRIBUTE_BANNERS,
  LANDED_STRIKE_WOUNDS,
  SUSPICION_LOG_ROUNDS,
  AUDIT_COST,
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_WRONG_PENALTY,
  ACCUSATION_VINDICATION_BONUS,
  ACCUSATION_PUSHBACK,
  TRAITOR_EXPOSED_WOUNDS,
  doomCost,
});
