/**
 * Tunable Parameters — Stage 5 (ML) sets the final values.
 *
 * Every balance-sensitive constant from ALGORITHM §9 lives here.
 * All values are placeholder starting points; the ML harness sweeps them.
 *
 * Import `TUNABLES` for the full object or individual named exports.
 */

import type { Act } from './types.js';
import { TUNABLES_DATA } from './tunables.gen.js';

// Values flow from data/tunables.json → tunables.gen.ts (run `npm run gen:data` after
// editing the JSON). The named consts below are thin re-exports of TUNABLES_DATA so the
// engine/UI keep their existing imports, while the single source of truth is the JSON.
// tests/v2/data-sync.test.ts deep-equal-guards JSON ⇄ gen against silent drift.

// ─── Player Economy ───────────────────────────────────────────────

/** Cards dealt to each player at game start. */
export const STARTING_HAND = TUNABLES_DATA.STARTING_HAND;

/** Maximum cards a player can hold (refilled toward this at Dawn). */
export const HAND_LIMIT = TUNABLES_DATA.HAND_LIMIT;

/** Actions per turn for a living player. */
export const ACTIONS_NORMAL = TUNABLES_DATA.ACTIONS_NORMAL;

// ACTIONS_BROKEN removed (§8): the Broken Court is retired — there is no reduced-action state.

// ─── Shadowking Forces ────────────────────────────────────────────

/** Number of Death Knights placed at game start (flat, before per-player scaling). */
export const DK_START_COUNT = TUNABLES_DATA.DK_START_COUNT;

/**
 * Per-player scaling of the Death Knight count (via `deathKnightCount()`):
 * `+ DK_PER_PLAYER * (playerCount - 3)`. Stage 5-dark probed 0 → 1 to pressure 4p,
 * but the retune REFUTED it: now that killing a DK pays (claims the node + pushback),
 * a BIGGER army at high counts FEEDS the players rather than the dark (4p SK-win
 * went *up*, not down, with fewer DKs). Kept FLAT at 0 — engagement comes from the
 * other four 5-dark levers, not army size. (See DESIGN-V2-DARK-ENGAGEMENT + tuning-log §5-dark.)
 */
export const DK_PER_PLAYER = TUNABLES_DATA.DK_PER_PLAYER;

/** Combat power of a Death Knight. */
export const DK_POWER = TUNABLES_DATA.DK_POWER;

/** Combat power of a Blight token (static, blocking). */
export const BLIGHT_POWER = TUNABLES_DATA.BLIGHT_POWER;

/** Blight level at which a node becomes permanently ashed. */
export const BLIGHT_TO_ASH = TUNABLES_DATA.BLIGHT_TO_ASH;

/** Blight-level reduction when a Death Knight is killed or a Forge reclaimed. */
export const PUSHBACK = TUNABLES_DATA.PUSHBACK;

// ─── The Pledge ───────────────────────────────────────────────────

/**
 * Crown holder's pledged cards are multiplied by this discount.
 * < 1 means the leader's cards count for less.
 */
export const CROWN_PLEDGE_DISCOUNT = TUNABLES_DATA.CROWN_PLEDGE_DISCOUNT;

/** Ratio at or above which the Pledge fully blocks the strike. */
export const FULL_BLOCK_THRESHOLD = TUNABLES_DATA.FULL_BLOCK_THRESHOLD;

/** Patience gained by the Shadowking when the table fully blocks a strike. */
export const PATIENCE_ON_BLOCK = TUNABLES_DATA.PATIENCE_ON_BLOCK;

/** Maximum patience before escalation triggers. */
export const PATIENCE_CAP = TUNABLES_DATA.PATIENCE_CAP;

// ─── Territory & Crown ────────────────────────────────────────────

/** Weight multiplier for Forges when computing territory lead (Crown). */
export const FORGE_WEIGHT = TUNABLES_DATA.FORGE_WEIGHT;

// ─── Broken Court — RETIRED (§8) ──────────────────────────────────
// BREAK_THRESHOLD, BROKEN_INCOME_BONUS, BROKEN_MAX_ROUNDS, RESCUE_COST,
// RESCUE_TRIBUTE_BANNERS, LANDED_STRIKE_WOUNDS, ACTIONS_BROKEN are removed: the
// no-elimination comeback system is replaced by real elimination + Dawn deposal (§6).
// Their rebuild levers (RANSOM_COST, CAPTURE_MARGIN, …) arrive with capture in 3d (§9).

// ─── Herald / political-martial stance (§ Herald, FOCUS-GROUP-R3 §3) ──
// Recruiting a Herald commits a player to the POLITICAL build: a bigger hand (more
// pledge/combat fuel) for a weaker fighter (the "body off the board" tradeoff).
/** Banner cost to RECRUIT a Herald (commit to the political stance). Stage-HL locked 2→4:
 *  the literal piece is re-recruitable after a capture, so a higher cost tames the churn and
 *  compensates the dark (more political deep-hands ⇒ weaker dark) — see tuning-log §HL. [TUNABLE] */
export const HERALD_RECRUIT_COST = TUNABLES_DATA.HERALD_RECRUIT_COST;
/** Hand-cap bonus a Herald grants (deep-hand political build). Stage-H locked 2→1
 * (deep pledging weakened the dark too much; +1 keeps the build viable). [TUNABLE] */
export const HERALD_HAND_BONUS = TUNABLES_DATA.HERALD_HAND_BONUS;
/** Combat-power penalty a Herald imposes (fewer fighters — the tradeoff). [TUNABLE] */
export const HERALD_COMBAT_PENALTY = TUNABLES_DATA.HERALD_COMBAT_PENALTY;
/** Blight pushback a Herald's PARLEY applies to a nearby front (non-card anti-dark verb). [TUNABLE] */
export const HERALD_PUSHBACK = TUNABLES_DATA.HERALD_PUSHBACK;

// ─── Game Clock ───────────────────────────────────────────────────

/** Fixed round cap — territory victory checked at this round's Dawn. */
export const ROUND_CAP = TUNABLES_DATA.ROUND_CAP;

/** Blight-progress thresholds for Act transitions (ashed-node counts: Whisper→March, March→Reckoning). */
export const ACT_THRESHOLDS = TUNABLES_DATA.ACT_THRESHOLDS;

// ─── Crown's Gambit ───────────────────────────────────────────────

/**
 * A named Gambit claimant's pledged cards are multiplied by this surcharge.
 * It does NOT stack with the Crown discount — `getEffectivePledgeWeight` returns
 * this outright (the worst weight wins): Gambit 0.25 > Crown 0.5 > normal 1.0.
 */
export const GAMBIT_SURCHARGE = TUNABLES_DATA.GAMBIT_SURCHARGE;

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
export const SEALED_CORE_PLEDGE: 'off' | 'gambit_claimant' | 'all' = TUNABLES_DATA.SEALED_CORE_PLEDGE;

/**
 * Risk-aware Gambit gate (§ Sealed Pledge): when a would-be claimant's pledge will be
 * SEALED (so it can't count on rivals bailing it out), the AI only seizes the Keystone
 * if it holds at least this many cards to self-defend the named strike. 0 = off (no
 * gate). Higher ⇒ fewer speculative Gambits ⇒ lower fire rate. Stage-S locked 0 → 4
 * (with SEALED_CORE_PLEDGE='gambit_claimant'): gambler-free gambit fire 26.7%→~14%
 * (in 10-20 band), gambit-win 28.9%→~19%, 2-seed stable. [TUNABLE]
 */
export const GAMBIT_SELF_COVER_CARDS = TUNABLES_DATA.GAMBIT_SELF_COVER_CARDS;

/** Stage B — base probability a rival independently volunteers to bail out a SEALED
 *  Gambit claimant (scaled by archetype bailoutTrust). The sealed-pledge "volunteer's
 *  dilemma" lever; inert unless a non-default policy opts in (DEFAULT byte-identical). */
export const BAILOUT_BASE_PCT = TUNABLES_DATA.BAILOUT_BASE_PCT;

// ─── Banner Generation ────────────────────────────────────────────

/** Base banners generated per player each Dawn (before territory income). */
export const BASE_BANNER_INCOME = TUNABLES_DATA.BASE_BANNER_INCOME;

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
export const DAWN_BLIGHT_ADVANCE = TUNABLES_DATA.DAWN_BLIGHT_ADVANCE;

/**
 * Base Blight spread from an un-averted strike (scaled by 1-ratio).
 * History: 5c 2→5; 5-dark retune 5→4; Oaths retune 4→5; Stage-H retune 5→7. The uniform
 * doom-win lever. Each social/positional layer (Oaths' fealty banners, then the Herald's
 * Parley pushback + deep-hand political pledging) weakened the dark, so SPREAD was raised
 * to compensate — Stage H needed 7 to recover SK-win to ~20% with Heralds active (2-seed
 * stable). See stage5-tuning-log.md §oaths/§herald.
 */
export const SPREAD_AMOUNT_BASE = TUNABLES_DATA.SPREAD_AMOUNT_BASE;

/** Extra banner cost to march through an ashed node (P0-3: traversable, not impassable). */
export const ASHED_TRAVERSE_EXTRA_COST = TUNABLES_DATA.ASHED_TRAVERSE_EXTRA_COST;

/**
 * Banner toll paid to a rival when marching INTO a Forge they own (§ tolls — the
 * Forge-as-Gate chokepoint tax). Forges are the mid-belt chokepoints (every Keep→Keystone
 * path crosses exactly one), so this makes holding a Forge real leverage and taxes the
 * front-runner heading for the center. Sworn allies pass free. Stage-T locked 0 → 1
 * (2-seed stable: SK-win 18.6/19.4%, tolls ~0.74/game, monotonic per-count ladder
 * preserved, guards PASS). See stage5-tuning-log.md §tolls. [TUNABLE]
 */
export const FORGE_TOLL_COST = TUNABLES_DATA.FORGE_TOLL_COST;

// LANDED_STRIKE_WOUNDS removed (§8): a landed strike now bites the MAP (Blight spread
// toward depose pressure), not the warlord — the v2 wounds break-vector is retired.

// ─── Grudge System ────────────────────────────────────────────────

/** Grudge decays by this amount per round (one flat rate for all sources). */
export const GRUDGE_DECAY_RATE = TUNABLES_DATA.GRUDGE_DECAY_RATE;

/** Maximum grudge a single player can accumulate. */
export const GRUDGE_CAP = TUNABLES_DATA.GRUDGE_CAP;

/** Grudge added when a player kills a Death Knight. */
export const GRUDGE_PER_DK_KILL = TUNABLES_DATA.GRUDGE_PER_DK_KILL;

/** Grudge added when a player reclaims a Forge from the Shadowking. */
export const GRUDGE_PER_FORGE_RECLAIM = TUNABLES_DATA.GRUDGE_PER_FORGE_RECLAIM;

/** Grudge added per point of combat damage dealt to Shadowking forces (§5.6). */
export const GRUDGE_PER_SK_WOUND = TUNABLES_DATA.GRUDGE_PER_SK_WOUND;

// ─── Oaths (the passion spine — design-history/DESIGN-V2-OATHS.md) ───────────────
// Public, breakable two-player pacts. Kept OFF the card economy (banners + grudge).

/** Banners each sworn player gains at Dawn while an Oath is active (fealty dividend). */
export const OATH_DIVIDEND = TUNABLES_DATA.OATH_DIVIDEND;
/** Rounds of strain until an Oath matures (dissolves with a loyalty bonus). */
export const OATH_DURATION = TUNABLES_DATA.OATH_DURATION;
/** Banners each sworn player gains when an Oath matures honored to the end. */
export const OATH_LOYALTY_BONUS = TUNABLES_DATA.OATH_LOYALTY_BONUS;
/** Banner burst the breaker seizes on betrayal (BREAK_OATH). */
export const OATH_BREAK_BANNERS = TUNABLES_DATA.OATH_BREAK_BANNERS;
/** Grudge added to an oathbreaker — the dark hunts the traitor (the Ledger). */
export const GRUDGE_OATHBREAK = TUNABLES_DATA.GRUDGE_OATHBREAK;

// ─── Dark Engagement (Stage 5-dark — design-history/DESIGN-V2-DARK-ENGAGEMENT.md) ──
// The fix for the dead grudge: make engaging the dark reachable, rewarded, and
// necessary — flipping heroism from a pure cost (0.00 DK-kills) into a real play.

/** A Death Knight on a node BLOCKS claiming it (the forcing function). */
export const DK_BLOCKS_CLAIM = TUNABLES_DATA.DK_BLOCKS_CLAIM;

/**
 * Killing a Death Knight on an unclaimed, living Holding/Forge CLAIMS it for the
 * attacker for free ("spoils of the breach") — heroism paid in the win currency.
 */
export const DK_KILL_CLAIMS_NODE = TUNABLES_DATA.DK_KILL_CLAIMS_NODE;

/**
 * DK-kill / Forge-reclaim grudge (becoming the villain's next target) applies ONLY
 * when the attacker's territory rank is strictly below this (0 = leader). So the
 * LEADING seats pay the "now it hunts you" tax while TRAILING seats hunt for free —
 * a catch-up lever that keeps "leading is dangerous" honest (the MTG judge's lever).
 * Set very high (≥ player count) to restore the old "always mark" behaviour.
 */
export const GRUDGE_MARK_TOP_N = TUNABLES_DATA.GRUDGE_MARK_TOP_N;

// ─── Pieces / Combat power ────────────────────────────────────────

/** Base combat power of a Warlord piece (consistent at setup and after moving). */
export const WARLORD_POWER = TUNABLES_DATA.WARLORD_POWER;

// ─── The Court — archetype powers + Steward income (§2, Stage 3b) ──
// v3-native placeholders (the sim tunes them in Stage V3-5). Defined as plain literals
// here rather than via TUNABLES_DATA because data/tunables.json is v2's gen-workflow
// source; these fold into the JSON when v3 promotes. They ARE injectable (in the
// Tunables registry below) so the balance search can reach them.
/** High combat power of a Marshal piece — the muscle (§2). */
export const MARSHAL_POWER = 3;
/** Low combat power of a Steward piece — defends weakly on its node (§2). */
export const STEWARD_POWER = 1;
/** Combat power of a Herald piece — a courier, never fights (§2). */
export const HERALD_PIECE_POWER = 0;
/** Banners a FREE Steward adds at its node each Dawn (§2, §4.4). [TUNABLE] */
export const STEWARD_INCOME = 2;

// ─── Capture & Ransom (§5.2/§5.3, §13 P0-1/P0-2/P0-3/P0-10; Stage 3d) ──
// v3-native placeholders (the sim tunes them in Stage V3-5). Injectable below.
/** Combat margin a winning RAID needs to ELECT CAPTURE_PIECE (§5.2). Rises with the
 *  attacker's standing (the military catch-up lever, §13 P0-2) — see `effectiveCaptureMargin`. */
export const CAPTURE_MARGIN = 2;
/** Per-rank rise of the effective CAPTURE_MARGIN for each living seat the attacker outranks —
 *  the production leader must win by more to capture (§13 P0-2, the military catch-up lever). */
export const CAPTURE_MARGIN_STANDING_STEP = 1;
/** Defensive combat bonus a TRAILING seat gets when raided BY the production leader (§13 P0-2). */
export const TRAILING_DEFENSE_BONUS = 1;
/** Rounds a freed / returned piece is capture-and-rout immune (§5.3 — kills the recapture pump). */
export const RECAPTURE_IMMUNE = 1;
/** Captives a captor may hold per living Marshal/stronghold (§5.3 guard cap; over-cap → §12 #25). */
export const CAPTIVE_GUARD_CAP = 1;
/** Steward denial is PARTIAL (§13 P0-3): a captured/routed Steward still trickles this many
 *  Banners to its OWNER (never the captor) — denial can't freeze the board to the cap. < STEWARD_INCOME. */
export const STEWARD_DENIED_TRICKLE = 1;
/** Elevated defense grade a Steward gets defending on its home node (§13 P0-3). */
export const STEWARD_HOME_DEFENSE_BONUS = 1;
/** Cards the ransomer spends to free a captive (destroyed — resource-negative, §5.3). */
export const RANSOM_COST = 1;
/** Banners the ransomer pays to free a captive (§5.3). */
export const RANSOM_BANNERS = 2;
/** Of the RANSOM_BANNERS, this many are DESTROYED (the sink) — the rest go to the captor.
 *  Resource-negative to the pair → no value-neutral laundering loop (stress-test E2). < RANSOM_BANNERS. */
export const RANSOM_SINK_CUT = 1;

// ─── Elimination: strike pool, auto-pressure, death-curse (§5.5/§6, §13 P0-4/5/9; Stage 3e) ──
// v3-native placeholders (the sim tunes them in Stage V3-5). Injectable below.
/** Max cards the dark's strike pool holds (§13 P0-4): eliminated hands feed it, capped here;
 *  the oldest decay each Dawn. Caps strike power so it does NOT scale with cumulative deaths. */
export const STRIKEPOOL_CAP = 6;
/** Cards removed-from-game from the strike pool each Dawn — the OLDEST (lowest id) first
 *  (§13 P0-4 decay). Keeps the pool from being a permanent death-fuelled ratchet. */
export const STRIKEPOOL_DECAY = 1;
/** Living strongholds the Reckoning auto-pressure strips from the most-production/least-engaged
 *  seat per Dawn (§6/§13 P0-5). The credible-executioner magnitude; the sim tunes it. */
export const RECKONING_AUTOPRESSURE_NODES = 1;
/** Extra grudge the Death-Curse fixes on its target for the rest of the game (§5.5). The Bequest
 *  (3f) APPLIES it; 3e exposes the targeting rule (`deathCurseTarget`). */
export const CURSE_GRUDGE = 3;
/** Max Wraith inputs resolved per round, TOTAL across all wraiths (§5.5/§13 P0-8, §12 #24). Caps
 *  the afterlife so a stack of dead Warlords can't co-pilot the dark into an instant win. */
export const WRAITH_INPUT_CAP = 2;
/** Grudge a single Wraith "nudge" intensifies on the dark's existing target — the BOARD LEADER,
 *  not a chosen face (§13 P0-8). One step of intensity. The sim tunes it. */
export const WRAITH_GRUDGE_NUDGE = 1;

// ─── Kill the Dark — the heart + two-act ending (§5.6, §13 P0-6/P0-7; Stage 3g) ──
// v3-native placeholders (the sim tunes them in Stage V3-5). Injectable below.
/** The heart's public HP at spawn (§5.6) — high enough that killing it takes a multi-round
 *  committed assault (telegraphed, costly), so it is rare and shapes negotiation. */
export const HEART_HP = 12;
/** Minimum cards an ASSAULT_HEART must commit to count toward liveness (§13 P0-6) — a stalled /
 *  token assault does NOT suppress the auto-pressure. The "real commit" floor. */
export const HEART_ASSAULT_MIN_COMMIT = 1;
/** Grudge the dark fixes on the raid-leader BY NAME each assault round (§5.6/§12 #21) — the
 *  retaliation that makes leading the raid dangerous. */
export const HEART_RETALIATE_GRUDGE = 2;
/** Dawns of the post-dark two-act scramble before the single named resolution Dawn (§5.6/§12 #18). */
export const POST_DARK_ROUNDS = 2;

// ─── Discovery (§5.1, Stage 3c) ───────────────────────────────────
// The flip-outcome split (sum = 1.0) + the Blight-seed magnitudes. v3-native placeholders
// (the sim tunes them in Stage V3-5). Injectable in the Tunables registry below.
/** P(flip reveals a recruit) — the safe upside (§5.1, ≈60%). */
export const DISCOVERY_RECRUIT_PCT = 0.6;
/** P(flip reveals a Blight-seed) — the fightable-risk middle (§5.1, ≈25%). */
export const DISCOVERY_BLIGHT_PCT = 0.25;
/** P(flip spawns a Death-Knight) — the harsh tail (§5.1, ≈15%). DERIVED: 1 − the other two. */
export const DISCOVERY_DK_PCT = 0.15;
/** Front-delta a Blight-seed inflicts on the CLAIMED node (§5.1, §12 #19) — you own blighted land. */
export const DISCOVERY_BLIGHT_DELTA = 1;

/** Max cards the engine auto-commits to a single combat (value-aware, §5.3). */
export const COMBAT_COMMIT_MAX = TUNABLES_DATA.COMBAT_COMMIT_MAX;

/** Power an attacker assumes the defender will add when sizing a RAID commit. */
export const RAID_DEFENSE_MARGIN = TUNABLES_DATA.RAID_DEFENSE_MARGIN;

// ─── Card values (the core pledge/combat scaling lever) ───────────

/** Lowest possible drawn card value. */
export const CARD_VALUE_MIN = TUNABLES_DATA.CARD_VALUE_MIN;
/** Highest possible drawn card value. Card values scale BOTH pledging and combat. */
export const CARD_VALUE_MAX = TUNABLES_DATA.CARD_VALUE_MAX;

// ─── Anti-free-rider reward (§4.2 step 5 — the #1 balance risk) ────

/**
 * Grudge reduction a player earns for making a non-zero Pledge (the persistent
 * FAVOR). Contributing buys goodwill; free-riding does not. [TUNABLE / ML]
 */
export const PLEDGE_FAVOR_GRUDGE_REDUCTION = TUNABLES_DATA.PLEDGE_FAVOR_GRUDGE_REDUCTION;

/**
 * Blight levels a contributor's own frontier land is shielded by when an
 * un-averted strike spreads (§4.2 step 5a — the averted fraction protects
 * pledgers' lands first, so free-riders eat the strike). [TUNABLE / ML]
 */
export const PLEDGE_SHIELD_AMOUNT = TUNABLES_DATA.PLEDGE_SHIELD_AMOUNT;

// ─── Shadowking effect table (§5.6) ───────────────────────────────

/** Nodes a Death Knight maneuvers toward the target on a MARCH_DK effect. */
export const DK_MARCH_DISTANCE = TUNABLES_DATA.DK_MARCH_DISTANCE;

/** SURGE (Reckoning) multiplies the SPREAD amount by this. */
export const SURGE_SPREAD_MULT = TUNABLES_DATA.SURGE_SPREAD_MULT;

/**
 * Gambit STRIKE-ADJACENT rate while the Keystone is garrisoned. Per stress-test
 * P0-3 the amplifying multiplier is DROPPED — the adjacent strike is normal rate.
 */
export const GAMBIT_ADJACENT_STRIKE_MULT = TUNABLES_DATA.GAMBIT_ADJACENT_STRIKE_MULT;

// ─── Extracted magic numbers (Assessment #3 — were bare literals at the call site) ──

/** Base banner cost of a MARCH or CLAIM (was a literal `1` in actions.ts). */
export const ACTION_BASE_COST = TUNABLES_DATA.ACTION_BASE_COST;
/** Suspicion added by a 'none' pledge — the traitor's tell (was `+2` in blood-pact.ts).
 *  Pairs with ACCUSE_MIN_SCORE (max over the log window is 2·SUSPICION_LOG_ROUNDS). */
export const SUSPICION_NONE_SCORE = TUNABLES_DATA.SUSPICION_NONE_SCORE;
/** Pledge ratio (amount/hand) at/above which a pledge is 'high' / 'medium' tier
 *  (were literals 0.6 / 0.3 in classifyPledgeTier). */
export const PLEDGE_TIER_HIGH_RATIO = TUNABLES_DATA.PLEDGE_TIER_HIGH_RATIO;
export const PLEDGE_TIER_MEDIUM_RATIO = TUNABLES_DATA.PLEDGE_TIER_MEDIUM_RATIO;
/** AI-heuristic (sim-exercised, untuned): fraction of a sealed Gambit's doomCost a rival
 *  will over-pledge to bail it out (was `0.25` in ai-player.ts). */
export const GAMBIT_COVER_FRACTION = TUNABLES_DATA.GAMBIT_COVER_FRACTION;
/** AI-heuristic (sim-exercised, untuned): min fraction of hand a blending saboteur pledges
 *  on a COVER round to hit the 'medium' tier (was `0.35` in ai-player.ts). */
export const SABOTEUR_COVER_PLEDGE_FRACTION = TUNABLES_DATA.SABOTEUR_COVER_PLEDGE_FRACTION;

// (Rescue binding debt RETIRED in Stage M — a rescue now forges a single Oath; the
//  Oath's non-aggression replaces the debt's withheld-attack + forced-pledge teeth.)

// ─── Layer B — Blood Pact (§10) ──────────────────────────────────

/** How many recent rounds of pledge tiers the Suspicion Log retains. */
export const SUSPICION_LOG_ROUNDS = TUNABLES_DATA.SUSPICION_LOG_ROUNDS;

/** Blood Pact traitor cover (§5e): fraction of rounds the traitor pledges COVER (medium tier,
 *  invisible to the Suspicion Log) vs SABOTAGE (suppress → the detectable 'none' tell). Higher =
 *  blends more = survives + wins more, dark advances less. The PRIMARY 5e lever. Saboteur-only
 *  (gated on hasBloodPact) so competitive is unaffected. [TUNABLE] */
export const SABOTEUR_COVER = TUNABLES_DATA.SABOTEUR_COVER;

/** Blood Pact ONLY (§5e): extra base blight spread on the dark's strike — the pact feeds the
 *  dark, so it burns hotter when a traitor is at the table. Gives the (hidden) traitor a real path
 *  to the doom_complete win + makes the dark scarier for the loyalists. Competitive = 0 (untouched). [TUNABLE] */
export const BLOOD_PACT_SPREAD_BONUS = TUNABLES_DATA.BLOOD_PACT_SPREAD_BONUS;

/** Suspicion the loyalists demand before ACCUSING (§5e — the evidence bar). Higher = accuse
 *  only on strong evidence → fewer, more accurate accusations (and a blending traitor survives
 *  longer). The PRIMARY 5e lever paired with saboteurCover. (Max possible over SUSPICION_LOG_ROUNDS
 *  rounds is 2*rounds, all 'none'.) [TUNABLE] */
export const ACCUSE_MIN_SCORE = TUNABLES_DATA.ACCUSE_MIN_SCORE;

/** Banner cost to Audit one opponent's last pledge. */
export const AUDIT_COST = TUNABLES_DATA.AUDIT_COST;

/** Rounds new accusations are locked out after a wrong/fizzled one (anti-spam). */
export const ACCUSATION_COOLDOWN_ROUNDS = TUNABLES_DATA.ACCUSATION_COOLDOWN_ROUNDS;

/** Cards each agreeing accuser discards when the accusation is wrong. Stage-5e raised 1→2 to
 *  make a bad call a real GAMBLE for the human accuser (the sim AI doesn't weigh it when deciding
 *  to accuse — a human-facing risk; see docs/human-playtest-checklist.md). */
export const ACCUSATION_WRONG_PENALTY = TUNABLES_DATA.ACCUSATION_WRONG_PENALTY;

/** Banners the vindicated (wrongly-accused) player gains. */
export const ACCUSATION_VINDICATION_BONUS = TUNABLES_DATA.ACCUSATION_VINDICATION_BONUS;

/** Blight pushback applied to the worst frontier node when the traitor is exposed. */
export const ACCUSATION_PUSHBACK = TUNABLES_DATA.ACCUSATION_PUSHBACK;

// TRAITOR_EXPOSED_WOUNDS removed (§8): it dealt wounds toward Broken, a state that no
// longer exists. Exposure's bite is now the forfeited doom/attrition win + the front
// pushback; the exposure economy re-tunes in a v3 5e-equivalent (spec §10).

// ─── Doom Cost curve (per-Act base + player-count scaling) ────────
// Extracted into named tunables so the Stage-5 search can fix the player-count
// disparity (5a found SK-win 2p 29% / 4p 1.9% — a SCALING problem).

// Stage 5c LOCKED values (was 3/5/8). Raised together with DOOM_COST_PER_PLAYER
// to make strikes occasionally LAND at high player counts (where 3-4 hands of
// pledge otherwise block everything). Combined with SPREAD_AMOUNT_BASE=5 this
// lifts pooled SK-win 14%→~20% and 4p 1.9%→~8%. Evidence + the structural 4p
// caveat are in docs/handoff/stage5-tuning-log.md.
export const DOOM_COST_WHISPER = TUNABLES_DATA.DOOM_COST_WHISPER;
export const DOOM_COST_MARCH = TUNABLES_DATA.DOOM_COST_MARCH;
export const DOOM_COST_RECKONING = TUNABLES_DATA.DOOM_COST_RECKONING;
/** doomCost scales as base * playerCount / this divisor (4 = baseline 4p). */
export const DOOM_COST_PLAYER_DIVISOR = TUNABLES_DATA.DOOM_COST_PLAYER_DIVISOR;
/**
 * Per-player TILT added to doomCost: `+ DOOM_COST_PER_PLAYER * (playerCount - DOOM_COST_PIVOT)`.
 * This is the lever that flattens the 5a per-count SK-win disparity (the linear
 * `base*pc/divisor` term can't — it locks the 2p:4p threshold ratio). Defaults to
 * 0 (no tilt) so behaviour is byte-identical until the search turns it on:
 * positive values LOWER the threshold below the pivot (dark weaker at low pc) and
 * RAISE it above (dark stronger at high pc).
 *
 * Stage 5c LOCKED at 6 (was 0); Stage-S retuned 6 → 5 (gambit-gate compensator); Stage A
 * retuned 5 → 6 again, paired with SPREAD_AMOUNT_BASE 7 → 6, to recenter SK-win to ~20%
 * after all_broken became a dark win (§A). It is the lever that raises the dark's 4p win
 * rate — at 4p the threshold is high enough that 4 hands sometimes fail to block; at 2p it
 * floors to 1 — so it props the 4p floor while SPREAD trims pooled. See tuning log §A.
 */
export const DOOM_COST_PER_PLAYER = TUNABLES_DATA.DOOM_COST_PER_PLAYER;
/** Player count at which the per-player tilt is zero (the curve's pivot). */
export const DOOM_COST_PIVOT = TUNABLES_DATA.DOOM_COST_PIVOT;

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
  // Rescue / break economy (5d cluster) — RETIRED (§8): BREAK_THRESHOLD, RESCUE_COST,
  // RESCUE_TRIBUTE_BANNERS, LANDED_STRIKE_WOUNDS, BROKEN_MAX_ROUNDS removed.
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
  // ── Blood Pact accusation + traitor bluff (Stage 5e) ──
  readonly ACCUSE_MIN_SCORE: number;
  readonly SABOTEUR_COVER: number;
  readonly BLOOD_PACT_SPREAD_BONUS: number;
  // ── Sealed-pledge bail-out / volunteer's dilemma (Stage B) ──
  /** Base probability a rival INDEPENDENTLY volunteers to bail out a SEALED Gambit
   *  claimant, scaled by the archetype's bailoutTrust (§B). Only bites when sealing
   *  is on AND a non-default policy sets bailoutTrust>0 — so DEFAULT is byte-identical. */
  readonly BAILOUT_BASE_PCT: number;
  // ── Herald / stance (Stage H) ──
  readonly HERALD_RECRUIT_COST: number;
  readonly HERALD_HAND_BONUS: number;
  readonly HERALD_COMBAT_PENALTY: number;
  readonly HERALD_PUSHBACK: number;
  // ── The Court — archetype powers + Steward income (Stage 3b) ──
  readonly MARSHAL_POWER: number;
  readonly STEWARD_POWER: number;
  readonly HERALD_PIECE_POWER: number;
  readonly STEWARD_INCOME: number;
  // ── Capture & Ransom (Stage 3d) ──
  readonly CAPTURE_MARGIN: number;
  readonly CAPTURE_MARGIN_STANDING_STEP: number;
  readonly TRAILING_DEFENSE_BONUS: number;
  readonly RECAPTURE_IMMUNE: number;
  readonly CAPTIVE_GUARD_CAP: number;
  readonly STEWARD_DENIED_TRICKLE: number;
  readonly STEWARD_HOME_DEFENSE_BONUS: number;
  readonly RANSOM_COST: number;
  readonly RANSOM_BANNERS: number;
  readonly RANSOM_SINK_CUT: number;
  // ── Elimination: strike pool / auto-pressure / death-curse (Stage 3e) ──
  readonly STRIKEPOOL_CAP: number;
  readonly STRIKEPOOL_DECAY: number;
  readonly RECKONING_AUTOPRESSURE_NODES: number;
  readonly CURSE_GRUDGE: number;
  readonly WRAITH_INPUT_CAP: number;
  readonly WRAITH_GRUDGE_NUDGE: number;
  // ── Kill the Dark — heart + two-act ending (Stage 3g) ──
  readonly HEART_HP: number;
  readonly HEART_ASSAULT_MIN_COMMIT: number;
  readonly HEART_RETALIATE_GRUDGE: number;
  readonly POST_DARK_ROUNDS: number;
  // ── Discovery (Stage 3c) ──
  readonly DISCOVERY_RECRUIT_PCT: number;
  readonly DISCOVERY_BLIGHT_PCT: number;
  readonly DISCOVERY_DK_PCT: number;
  readonly DISCOVERY_BLIGHT_DELTA: number;
  // ── Anti-free-rider + dark-effect magnitudes (made injectable in C2 — see
  //    stage5-tuning-log §C2; defaults are byte-identical, the consumers just now
  //    read getTunables().X instead of the frozen module const, so a sweep can reach them) ──
  readonly PLEDGE_SHIELD_AMOUNT: number;
  readonly PLEDGE_FAVOR_GRUDGE_REDUCTION: number;
  readonly DK_MARCH_DISTANCE: number;
  readonly SURGE_SPREAD_MULT: number;
  readonly GAMBIT_ADJACENT_STRIKE_MULT: number;
  // ── Previously-frozen levers wired in this pass (Assessment #3 — "~half the
  //    declared tunables aren't injectable"). Defaults byte-identical; the call
  //    sites now read getTunables().X so the balance search can reach them. ──
  readonly CARD_VALUE_MIN: number;
  readonly CARD_VALUE_MAX: number;
  readonly BASE_BANNER_INCOME: number;
  readonly GRUDGE_PER_DK_KILL: number;
  readonly GRUDGE_PER_FORGE_RECLAIM: number;
  readonly GRUDGE_CAP: number;
  readonly GRUDGE_DECAY_RATE: number;
  // Blood-Pact accusation economy (§10).
  readonly SUSPICION_LOG_ROUNDS: number;
  readonly AUDIT_COST: number;
  readonly ACCUSATION_COOLDOWN_ROUNDS: number;
  readonly ACCUSATION_PUSHBACK: number;
  // TRAITOR_EXPOSED_WOUNDS removed (§8) — wounds no longer exist.
  readonly ACCUSATION_WRONG_PENALTY: number;
  readonly ACCUSATION_VINDICATION_BONUS: number;
  // ── Extracted magic numbers (Assessment #3) — defaults byte-identical. ──
  readonly ACTION_BASE_COST: number;
  readonly SUSPICION_NONE_SCORE: number;
  readonly PLEDGE_TIER_HIGH_RATIO: number;
  readonly PLEDGE_TIER_MEDIUM_RATIO: number;
  readonly GAMBIT_COVER_FRACTION: number;
  readonly SABOTEUR_COVER_PLEDGE_FRACTION: number;
}

export const DEFAULT_TUNABLES: Tunables = Object.freeze({
  DOOM_COST_WHISPER, DOOM_COST_MARCH, DOOM_COST_RECKONING, DOOM_COST_PLAYER_DIVISOR,
  DOOM_COST_PER_PLAYER, DOOM_COST_PIVOT,
  DK_START_COUNT, DK_PER_PLAYER, DK_POWER,
  SPREAD_AMOUNT_BASE, DAWN_BLIGHT_ADVANCE, BLIGHT_TO_ASH, PUSHBACK,
  DK_BLOCKS_CLAIM, DK_KILL_CLAIMS_NODE, GRUDGE_MARK_TOP_N,
  OATH_DIVIDEND, OATH_DURATION, OATH_LOYALTY_BONUS, OATH_BREAK_BANNERS, GRUDGE_OATHBREAK,
  FORGE_TOLL_COST, SEALED_CORE_PLEDGE, GAMBIT_SELF_COVER_CARDS, BAILOUT_BASE_PCT,
  ACCUSE_MIN_SCORE, SABOTEUR_COVER, BLOOD_PACT_SPREAD_BONUS,
  HERALD_RECRUIT_COST, HERALD_HAND_BONUS, HERALD_COMBAT_PENALTY, HERALD_PUSHBACK,
  MARSHAL_POWER, STEWARD_POWER, HERALD_PIECE_POWER, STEWARD_INCOME,
  CAPTURE_MARGIN, CAPTURE_MARGIN_STANDING_STEP, TRAILING_DEFENSE_BONUS, RECAPTURE_IMMUNE,
  CAPTIVE_GUARD_CAP, STEWARD_DENIED_TRICKLE, STEWARD_HOME_DEFENSE_BONUS,
  RANSOM_COST, RANSOM_BANNERS, RANSOM_SINK_CUT,
  STRIKEPOOL_CAP, STRIKEPOOL_DECAY, RECKONING_AUTOPRESSURE_NODES, CURSE_GRUDGE,
  WRAITH_INPUT_CAP, WRAITH_GRUDGE_NUDGE,
  HEART_HP, HEART_ASSAULT_MIN_COMMIT, HEART_RETALIATE_GRUDGE, POST_DARK_ROUNDS,
  DISCOVERY_RECRUIT_PCT, DISCOVERY_BLIGHT_PCT, DISCOVERY_DK_PCT, DISCOVERY_BLIGHT_DELTA,
  PLEDGE_SHIELD_AMOUNT, PLEDGE_FAVOR_GRUDGE_REDUCTION,
  DK_MARCH_DISTANCE, SURGE_SPREAD_MULT, GAMBIT_ADJACENT_STRIKE_MULT,
  CARD_VALUE_MIN, CARD_VALUE_MAX, BASE_BANNER_INCOME,
  GRUDGE_PER_DK_KILL, GRUDGE_PER_FORGE_RECLAIM, GRUDGE_CAP, GRUDGE_DECAY_RATE,
  SUSPICION_LOG_ROUNDS, AUDIT_COST, ACCUSATION_COOLDOWN_ROUNDS, ACCUSATION_PUSHBACK,
  ACCUSATION_WRONG_PENALTY, ACCUSATION_VINDICATION_BONUS,
  ACTION_BASE_COST, SUSPICION_NONE_SCORE, PLEDGE_TIER_HIGH_RATIO, PLEDGE_TIER_MEDIUM_RATIO,
  GAMBIT_COVER_FRACTION, SABOTEUR_COVER_PLEDGE_FRACTION,
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
  ROUND_CAP,
  ACT_THRESHOLDS,
  GAMBIT_SURCHARGE,
  GAMBIT_SELF_COVER_CARDS,
  BAILOUT_BASE_PCT,
  BASE_BANNER_INCOME,
  DAWN_BLIGHT_ADVANCE,
  SPREAD_AMOUNT_BASE,
  ASHED_TRAVERSE_EXTRA_COST,
  FORGE_TOLL_COST,
  GRUDGE_DECAY_RATE,
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
  MARSHAL_POWER,
  STEWARD_POWER,
  HERALD_PIECE_POWER,
  STEWARD_INCOME,
  CAPTURE_MARGIN,
  CAPTURE_MARGIN_STANDING_STEP,
  TRAILING_DEFENSE_BONUS,
  RECAPTURE_IMMUNE,
  CAPTIVE_GUARD_CAP,
  STEWARD_DENIED_TRICKLE,
  STEWARD_HOME_DEFENSE_BONUS,
  RANSOM_COST,
  RANSOM_BANNERS,
  RANSOM_SINK_CUT,
  STRIKEPOOL_CAP,
  STRIKEPOOL_DECAY,
  RECKONING_AUTOPRESSURE_NODES,
  CURSE_GRUDGE,
  WRAITH_INPUT_CAP,
  WRAITH_GRUDGE_NUDGE,
  HEART_HP,
  HEART_ASSAULT_MIN_COMMIT,
  HEART_RETALIATE_GRUDGE,
  POST_DARK_ROUNDS,
  DISCOVERY_RECRUIT_PCT,
  DISCOVERY_BLIGHT_PCT,
  DISCOVERY_DK_PCT,
  DISCOVERY_BLIGHT_DELTA,
  COMBAT_COMMIT_MAX,
  RAID_DEFENSE_MARGIN,
  CARD_VALUE_MIN,
  CARD_VALUE_MAX,
  PLEDGE_FAVOR_GRUDGE_REDUCTION,
  PLEDGE_SHIELD_AMOUNT,
  DK_MARCH_DISTANCE,
  SURGE_SPREAD_MULT,
  GAMBIT_ADJACENT_STRIKE_MULT,
  SUSPICION_LOG_ROUNDS,
  ACCUSE_MIN_SCORE,
  SABOTEUR_COVER,
  BLOOD_PACT_SPREAD_BONUS,
  AUDIT_COST,
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_WRONG_PENALTY,
  ACCUSATION_VINDICATION_BONUS,
  ACCUSATION_PUSHBACK,
  ACTION_BASE_COST,
  SUSPICION_NONE_SCORE,
  PLEDGE_TIER_HIGH_RATIO,
  PLEDGE_TIER_MEDIUM_RATIO,
  GAMBIT_COVER_FRACTION,
  SABOTEUR_COVER_PLEDGE_FRACTION,
  doomCost,
});
