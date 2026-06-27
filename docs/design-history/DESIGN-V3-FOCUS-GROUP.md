# Design v3 — Focus Group Synthesis (the roster turn)

> Status: **Stage V3-2 deliverable** — the panel review of the V3-1 concept; its conclusions feed the
> V3-3 algorithm spec. Design-only.
> Date: 2026-06-26
> Method: Four isolated-context panelists, no cross-talk — board-game designer, video-game/UX designer,
> MTG judge (rules/determinism), D&D DM (narrative). Each read `DESIGN-V3-CONCEPT.md` (and most read
> `Shadowlord.md` / the v2 determinism contract) independently and returned a structured verdict. Their
> independent findings are summarized, then synthesized into the revised decisions and the open forks the
> spec must close.
> Reviews the concept in: `DESIGN-V3-CONCEPT.md`.

---

## 1. The panel converged — unprompted — on five things

Four different lenses, no shared context, and they landed on the same load-bearing conclusions:

| Consensus | Who said it | Why it matters |
|---|---|---|
| **Capture & Ransom (B) is the heart of v3** — keep it even if you cut everything else. The Warlord-last / *strip-the-court-first* model is the key: it turns knockout from one swingy roll into a **visible multi-turn siege** the victim sees coming and can fight. | All 4 | It's the adversarial-but-non-lethal knob v2 lacked; it makes captives a self-balancing tradeable asset; and it's the *only* thing that makes retiring Broken Court safe (elimination is earned, not rolled). The DM: it converts combat "from a math event into a serialized story." |
| **"No elimination in Whisper" does NOT solve spectator dead-time** — it just moves the death into the back half, where 20+ idle minutes is *worse*. Eliminated players need **residual agency**, not a hallway. | Video, DM, Board | A 4p game collapsing to a 2p duel by minute 22 with two humans benched for the most tense third is the realistic failure. The opening-protection rule guards the wrong end of the game. |
| **Capture must be BY CHOICE, margin-gated, ONE effect per combat** — never automatic. | Board, Judge | Always-capture arms a snowball flywheel and forces double/triple-penalty collisions (lose node + piece + cards in one roll). Choice creates the table-talk ("he took my Holding, not my Marshal — why?"). |
| **Removing `all_broken` leaves a live end-condition HOLE** — simultaneous / last-two eliminations have *no defined winner*, and "no draws" forbids a fallback. The dark also loses a guaranteed terminal threat, defanging it at low player counts. | Judge, Board | This is the single most load-bearing gap. The spec cannot be pointed at the sim until it's closed. |
| **The court won't create attachment on archetype + verb alone — pieces need NAMES.** Discovery should be where you *meet* a character, not roll for loot. Voice the Warlord and the villain; *name* (silently) the retainers. | DM (lead), Video, Board | "They took my +3 banner generator" is a stat loss in a costume. "They took **Vael**" is a grudge with an address — the entire stated design goal. Cost is a seeded flavor table; payoff is the soul. |

And on **production**, both the UX and DM lenses independently said: **capture and Kill-the-Dark must be
staged as watchable "scenes"** (reusing the v2 act-beat tech), never resolved as a silent roll — a permanent
on-screen "Hold" rail for hostages; an on-map "heart" node with a public HP bar drained over 2–3 telegraphed
rounds for the climax.

---

## 2. Where they diverged (the real forks)

- **Archetype count — 3 vs 4.** The **board designer wants 4** (Warlord / Marshal / Steward / Herald),
  because each maps to a *distinct capture consequence*: Warlord→elimination, Marshal→lose your teeth,
  Steward→lose your economy, Herald→lose your hand/political reach — four different "what hurts when this is
  taken" vectors, which is the whole point of a roster game. The **UX designer wants 3** (Warlord / Marshal /
  Steward) for a 30–45 min time budget, holding the Herald as the first expansion archetype — every added
  type inflates turn-time (each CLAIM and RAID becomes a target-selection), which *lengthens* the spectator
  window. → **Reconcilable, and recommended below (§3): ship 4 in the model but flag Herald "advanced /
  learn-last," and let the sim's session-length band be the judge.**

- **The form of residual agency for the eliminated.** The **UX lens** proposes a **Wraith** (the dead
  Warlord joins the Shadowking; one bounded directed input per round — nudge its grudge/target, or add a
  visible card to its next strike). The **DM lens** proposes a **Last Bequest / Death-Curse** (one final
  table-altering act *at the moment of death*: bequeath a captive/cards forging a posthumous Oath, or curse
  your killer so the dark's grudge points harder at them). → **These are complementary, not competing: a
  death *beat* + an ongoing *afterlife*. Adopt both, bounded (§3).**

- **Whether the hand-transfer-on-elimination should exist at all.** The concept took the Shadowlord-faithful
  "eliminated hand → eliminator." **Three lenses independently flagged this as a snowball accelerant and
  kingmaking lever.** → **Overruled: route eliminated cards to the dark's strike pool / a sink, not to the
  eliminator (§3, §4).**

---

## 3. The revised decisions (folded into the concept; the spec implements these)

The concept stands, with these panel-driven amendments:

1. **Capture is the spine.** Confirmed. Combat → capture → (strip court) → knockout is the v3 loop. The
   Warlord can only be reached after its court is reduced.
2. **Capture is by choice, margin-gated, one-effect-per-combat.** A winning RAID *enables* capture only if
   `margin ≥ CAPTURE_MARGIN`; the attacker then *elects* one of {take land / route the piece / capture a
   piece}. A single combat never yields more than one of {node loss, capture}. Last-Stand loss is
   node-only.
3. **Residual agency for the eliminated = Death Bequest + Wraith.**
   - **Death Bequest (the exit beat):** at the instant of elimination, the player makes ONE final choice —
     bequeath a held captive or remaining cards to a living player (forging a posthumous Oath), **or** lay a
     Death-Curse naming their killer (the dark's grudge-steer points one notch harder at that player for the
     rest of the game). A small rules surface; a large table reaction.
   - **Wraith (the afterlife):** the eliminated Warlord joins the Shadowking as a named wraith with ONE
     bounded directed input per round (nudge the dark's target/grudge by one step, or add a single visible
     card to its telegraphed strike). **Capped** so multiple wraiths can't co-pilot the dark into an instant
     win. This keeps the dead player reading the board, courted by the living, and thematically *serving the
     dark that beat them.*
4. **Eliminated cards do NOT go to the eliminator.** They feed the **dark's strike pool** (which doubles as
   the wraith's ammunition) or are removed from game (determinism: removed-from-game, never reshuffled — see
   the Judge's H4 in §5). Kills the hand-farming snowball and the who-delivers-the-killing-blow kingmaking.
5. **Retainers are NAMED; the Warlord and villain are VOICED.** Discovery (C) draws a name + one-line
   identity from a **seeded** flavor pool (determinism preserved) — you *meet* a character, you don't flip
   loot. Each faction's Warlord has a fixed name/title. Retainers are silent; the Warlord and Shadowking
   carry spoken lines. **Wire the villain's voice into every new system** (capturing its Death Knight, a
   ransom, a rival-caused elimination, the Kill-the-Dark march — see the DM's bark list, folded into the
   spec's voice layer).
6. **Capture and Kill-the-Dark are staged scenes.** Capture = a full-screen beat + a permanent on-screen
   "Hold" rail showing every hostage all game. Kill-the-Dark = an on-map **heart node** with a **public HP
   track** drained over 2–3 telegraphed commit rounds, the dark retaliating *by name*, then an explicit
   "the dark is dead — now the throne" transition beat. (Reuse the v2 act-beat tech; invent no new UI.)
7. **Archetypes: 4 in the model, Herald flagged advanced.** Warlord / Marshal / Steward / Herald, each with
   a distinct capture-consequence (§2). The session-length band in the sim is the gate; if 4 blows the
   30–45 min ceiling, Herald drops to a launch *variant*. Do not exceed 4 at launch (the v2 "start minimal"
   rule holds).

---

## 4. The snowball problem (the board designer's central finding)

**The capture economy is super-linear; the Crown surcharge is linear. A linear brake will not hold a
quadratic engine.** The flywheel: Steward funds RAIDs → winning RAIDs capture pieces → capturing a rival's
Steward both cuts their economy *and* boosts yours → cascade. Left unchecked, v3 produces a runaway leader in
4p and a *pre-determined loser by The March* in 2p (functionally dead — court gone, watching — at the very
Whisper/March boundary the opening rule was meant to protect). The panel's agreed brakes, all attacking the
*capture* economy directly (not a generic comeback subsidy — "or you've reinvented the Broken Court you
deleted"):

- **Captive guard cap** — a captor holds at most 1 captive per living Marshal/stronghold; over-capacity must
  be ransomed, traded, or released. Holding hostages *costs* attention.
- **No free spoils** — eliminated cards to the dark/sink, not the eliminator (§3.4).
- **Steward double-swing softened** — a captured Steward produces for *nobody*; "putting it to work" for the
  captor (if allowed at all) costs Banners, so one capture isn't an instant 2× economy swing.
- **Continuous severity ramp, not a cliff** — replace the hard "0% then 100%" Whisper/March elimination
  boundary with capture *severity gated on Blight level*: Whisper RAID caps at 1 non-Warlord and can't take
  the last stronghold; March captures freely; only Reckoning can reach the Warlord. Tying it to Blight (not
  the act label) makes the dark's tide lower everyone's protection *together* and removes the gameable
  race-to-pre-determine.
- **Ransom is resource-negative to the pair** — a fixed cut is destroyed, so capture↔ransom can't be a
  value-neutral laundering loop (Judge E2).
- **Recapture immunity** — a freed piece gets a ≥1-Dawn immunity / "rallied" bonus, killing the
  capture→ransom→recapture grief pump (Judge E1).

The §6-fallback underdog mechanic is now **expected, not optional** — but it must be a *capture-side* brake
(ransom subsidy / guard cost), never a return of the comeback subsidy.

---

## 5. The end-condition hole (the judge's load-bearing finding)

Deleting `all_broken` removed v2's whole-table-collapse catch-all and left a **table-wipe Dawn with no
defined winner**, while "no draws" forbids the easy out. This must be closed *before* the sim can be pointed
at anything. The resolution the spec will encode:

- **Simultaneous / last-two eliminations → the Shadowking wins by attrition** (the explicit `all_broken`
  successor; in Blood Pact, the traitor wins unless exposed). **Loss-preempts-win extends to
  last-Warlord-standing.**
- **The dark needs guaranteed terminal teeth** to replace `all_broken` and stay credible at 2p: a
  **Reckoning auto-pressure** — if no player has launched Kill-the-Dark by a Blight threshold, the dark
  begins eliminating strongholds *table-wide each Dawn* (not just the leader's). This keeps the dark a real
  executioner for the *trailing* seats too, and makes the Kill-the-Dark path necessary, not optional.
- **Determinism clauses the spec must add** (Judge H1–H4): discovery token contents are **pre-bound at
  setup** as `content = f(seed, nodeId)` (a reveal of frozen hidden state, never a lazy draw → not
  save-scummable); deciders (AI *and* human) read an **`observableState(state, viewerSeat)`** projection
  that redacts unflipped tokens (the AI must not see under the fog); flip side-effects get a fixed slot in
  the §5.1 net-front ordered sum and flip-spawned Death Knights act only *next* THREAT; eliminated/dark
  cards are **removed from game**, never reshuffled.

---

## 6. Cut / changed list (v3 vs the V3-1 concept)

- **CUT:** hand-transfer-to-eliminator (→ dark/sink, §3.4).
- **CHANGED:** capture from "can capture a piece" → **by choice, margin-gated, one-effect-per-combat** (§3.2).
- **CHANGED:** the hard Whisper/March elimination cliff → **continuous Blight-gated severity ramp** (§4).
- **ADDED:** Death Bequest + Wraith residual agency (§3.3); named retainers + villain barks (§3.5);
  captive guard cap, recapture immunity, resource-negative ransom (§4); the attrition-win successor +
  Reckoning auto-pressure (§5); the determinism clauses (§5).
- **CONFIRMED:** capture-as-spine, Warlord-last knockout, opening protection (now as a ramp), Kill-the-Dark
  two-act ending (with the seam fixes below).

**The Kill-the-Dark seam (DM + board):** the second act must be **short and sharp** (one named round /
hard 2–3-Dawn clock, Gambit-style — not an open territory grind); the raid-leader is **deliberately
disadvantaged** going in (they spent their force); and the betrayal is **telegraphed by the villain's dying
bark** ("you saved the world — now hold it with empty hands") so the turn is *foretold*, not an anticlimax.

---

## 7. Open decisions for the algorithm spec (gate to V3-3)

The forks above are settled at the design level; these are the **mechanical specifications V3-3 must pin**,
most surfaced by the judge's edge-case audit. Grouped:

**End-conditions & ordering (do these FIRST — they're the load-bearing hole):**
1. Simultaneous-elimination and last-two-standing resolution (→ Shadowking attrition win); loss-preempts-win
   extended to last-Warlord-standing.
2. Elimination *timing*: route Warlord-capture through a `deposed` flag resolved only in the **Dawn**
   loss-check, in seat order (the judge's recommendation — collapses both triggers to one timing, kills
   mid-action hand-cascades).
3. Redefine **"stronghold"** and **Keep-ashing without Broken** (v2's "Keeps can't be ashed until owner is
   Broken" is now dangling) — the zero-stronghold trigger is undefined until this is restated.
4. The Crown's Gambit × elimination collisions; Kill-the-Dark × in-flight dark-elimination ordering.
5. Blood Pact: can an *eliminated* traitor still win on a later `doom_complete`? (Must define.)

**Capture / ransom mechanics:**
6. `CAPTURE_MARGIN`, the captor's elect-one-effect rule, captive-on-captor-death (→ **freed to original
   owner**), captive guard cap, recapture immunity, resource-negative ransom cut, ransom→Oath mutual-consent.
7. Captured Steward/Herald passives confirmed OFF while held (and not gained by the captor).

**Discovery:**
8. Pre-bound token contents `f(seed, nodeId)`; the `observableState` projection; risk mix
   (~60% recruit / 25% Blight-seed / 15% Death-Knight as a starting point) **plus** the "bad flip yields
   agency, not pure loss" rule (a revealed threat is a fightable bonus, not just a punishment) and partial
   risk telegraph (press-your-luck, not blind).

**Roster & climax:**
9. Final archetype numbers/verbs (4, Herald advanced); seeded name pools; the Warlord/villain voice layer
   and the new-system barks.
10. Kill-the-Dark: where the heart is, its HP track, the multi-round commit, the force cost (committed
    pieces that can't also defend), and the short-sharp two-act resolution for 2/3/4 survivors.

The next document, `DESIGN-V3-ALGORITHM.md`, closes these in spec form; `DESIGN-V3-STRESS-TEST.md` then
tries to break the result.
