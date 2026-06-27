# Design v2 — Oaths + the Ledger (the passion spine)

> Status: Stage-5 mechanic patch — the convergent headline from the reconvened panel
> (`DESIGN-V2-FOCUS-GROUP-R3.md` §2). Authority: ALGORITHM §5.4/§5.6. This file specifies the delta.
> Date: 2026-06-22

---

## 1. Why (one line)

Every inter-player interaction is a one-shot transaction that evaporates — nothing *accrues* between two
players, so the table plays "parallel solitaire" and the only running *story* is with the AI. The fix:
a **public, breakable bond** between two players (the **Oath**), enforced by a villain that **remembers
betrayal** (the **Ledger**). This makes rescue's signature "witnessed bilateral debt" feeling a
**renewable, every-round verb** — which also dissolves the Stage-5d structural rescue cap (you no longer
need 2–4 Breaks to feel the social game).

## 2. The Oath (minimal, soulful v1)

A symmetric pact between two Warlords. **Each player may hold at most ONE active Oath** (alliance is a
real choice, not a web). Kept deliberately **off the card economy** (the panel's hard guard) — it trades
in banners + grudge, never cards.

- **State:** `state.oaths: Oath[]`, `Oath = { a, b, swornRound, strain }` (a < b).
- **SWEAR_OATH** (a `PLAYER_ACTION`, FREE — does NOT consume an action point; the cost is the *risk*, not
  tempo). Legal iff both players exist, are non-Broken, `a ≠ b`, and **both are oath-free**. Creates the
  pact. (Mutual by construction — the AI driver only proposes when it would also accept; a human
  offer/accept handshake is deferred.)
- **While sworn:**
  - The two **cannot RAID each other** (like the rescue-debt withheld attack).
  - **Fealty dividend:** at Dawn each sworn player gains **`OATH_DIVIDEND`** banners (a real, off-card
    carrot — the kingdom rewards alliance).
- **Strain & maturity:** `strain` ticks each Dawn. At `strain ≥ OATH_DURATION` the Oath **matures** —
  dissolves cleanly, both gain **`OATH_LOYALTY_BONUS`** banners. *Honoring to the end pays.*
- **BREAK_OATH** (a `PLAYER_ACTION`, CONSUMES an action — betrayal is a deliberate stab). The breaker:
  - dissolves the Oath and gains a **burst** of **`OATH_BREAK_BANNERS`** banners (seize the moment);
  - is now free to RAID the ex-ally;
  - **climbs the Ledger:** `+GRUDGE_OATHBREAK` grudge — so **the dark hunts the traitor** (the villain is
    the enforcer of broken promises). The betrayed is freed (their Vendetta is the dark turning on the
    breaker). Emits `OATH_BROKEN`.
- **Rescue auto-swears an Oath** between rescuer and rescued (if both oath-free) — Rescue becomes the
  *dramatic, earned* Oath. One social spine, two intensities; absorbs the 5d rescue-debt's spirit.

## 3. The Ledger (the villain's memory)

**No new structure** — the Ledger IS the existing public `shadowking.grudge[]` array, which already
(a) is per-player, (b) decays each round, and (c) drives `chooseTarget` (the dark hunts the highest
grudge). Oaths plug into it: **breaking an Oath adds grudge**, so the dark preferentially hunts
oathbreakers. (DK-kills already climb it; leader is the tiebreaker.) This turns the grudge from a
one-turn steer into a persistent, political hit-list the table bargains over ("don't put me top of the
Ledger — I'll pledge for your Keep").

## 4. New tunables (wired into the seam)

| Lever | Default | Meaning |
|---|---|---|
| `OATH_DIVIDEND` | 1 | banners each sworn player gains at Dawn |
| `OATH_DURATION` | 3 | rounds until an Oath matures (dissolves with a loyalty bonus) |
| `OATH_LOYALTY_BONUS` | 2 | banners each gains when an Oath matures honored |
| `OATH_BREAK_BANNERS` | 2 | burst the breaker seizes on betrayal |
| `GRUDGE_OATHBREAK` | 3 | grudge added to the breaker (the dark hunts the traitor) |

Defaults are starting points; the search tunes them (same method as 5c/5-dark/5d). The balance-sensitive
ones (`OATH_DIVIDEND`, `GRUDGE_OATHBREAK`) go in the injectable `Tunables` seam.

## 5. AI policy (archetype knobs)

- **`oathWillingness` (0..1):** propensity to SWEAR with a non-hostile, oath-free rival.
- **`oathLoyalty` (0..1):** high ⇒ honor to maturity; low ⇒ BREAK when advantageous (late game / the ally
  leads / opportunistic). Neutral (undefined) ⇒ never swears (baseline stays the neutral anchor).
- Archetype flavor: cooperator (willing, loyal), turtle (loyal), opportunist & saboteur (willing but
  **treacherous** — swear then betray), aggressor & gambler (low willingness — they'd rather fight/race).

## 6. Determinism & invariants

All new logic pure `f(state, seed)`: oath legality + effects read live state; swear/break decisions use
the existing `decisionRng` sub-stream. Mutation flows through `applyCommand` → executors. The Oath token
and the Ledger are public (no hidden info in core). `oaths` is JSON-serializable.

## 7. Targets & guardrails — and the RESULT (LOCKED)

- **Oaths sworn / broken per game:** target "alive with real betrayal" → landed **5.82 / 3.27** (63.9%
  break) — the social density goal MET (exceeds v1's ~5 vassal events/game). From 0.
- **Rescue** now auto-forges Oaths; 0.81/game (Oath non-aggression cut PvP Breaks).
- **SK-win 18–22%** ✅ **18.7%** (2-seed stable 19.3%); **all_broken** ✅ **2.3%**; **guards** ✅ (even
  seat 26.3%, free-riding not rewarded; DK-kills 2.05 — 5-dark intact).
- The spine over-weakened the dark on first sim (15.4%); the retune (`SPREAD_AMOUNT_BASE` 4→5,
  `LANDED_STRIKE_WOUNDS` 2→3 + an archetype loyalty nudge) restored the band. Evidence:
  `stage5-tuning-log.md §oaths`.

## 8. Deferred (not built here)

- Human offer/accept handshake for swearing (v1 is engine-mutual).
- Oath *types* beyond non-aggression (cover-my-strike, pledge-for-my-node) — start with one, add if the
  sim shows it's flat.
- The political↔martial **stance / Herald** identity axis and the **sealed Pledge** / **gate-toll**
  levers (FOCUS-GROUP-R3 §3–4) — sequenced AFTER this spine proves out.
