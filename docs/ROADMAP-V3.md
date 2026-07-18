# Iron Throne of Ashes v3 — Code-Sprint Roadmap & Resume Point

> **READ THIS FIRST to resume the v3 code sprint.** The single entry point that survives context clearing.
> Last updated: 2026-06-26.
> Scope: this roadmap governs the **v3 code sprint** (the rewrite). The v3 **design sprint is COMPLETE** —
> its four docs are the spec this sprint builds from. The shipped **v2** game (`src/v2/`, 451 tests green)
> stays intact and playable until v3 reaches parity (see §5).

---

## 0. Where we are right now

**v3 DESIGN sprint COMPLETE; v3 CODE sprint NOT STARTED.** A ground-up redesign was run on paper, mirroring
the v2 provenance process (concept → focus group → algorithm spec → adversarial stress-test). The headline
change: **retire the "no-elimination / Broken Court" comeback system and rebuild the game as a Shadowlord-
style ROSTER game** — a court of differentiated pieces you grow by discovery, capture & ransom, and can
genuinely lose (elimination), with a heroic "kill the dark" win.

The stress-test found and folded **twelve P0 fixes** (the first pass over-fixed the snowball and accidentally
built a turtle meta; two new subsystems were non-deterministic). Those fixes are the build checklist.

> **Authoritative design status:**
> - `docs/DESIGN-V3-ALGORITHM.md` — ⭐ THE SPEC to code from. **§13 (the stress-test hardening) is
>   AUTHORITATIVE** and overrides earlier prose; §12 is the edge-case table.
> - `docs/design-history/DESIGN-V3-CONCEPT.md` / `…-FOCUS-GROUP.md` / `…-STRESS-TEST.md` — the "why".
> - `docs/handoff/state.json` stays pointed at the **v2** status until the v3 code sprint opens its own
>   stage (see §7).

**Immediate next action:** the **V3-6 HUMAN PLAYTEST** (`npm run dev` → `/index-v3.html`; walk
`docs/human-playtest-checklist-v3.md`, teaching from `docs/v3-teach-script.md`) — the ball is now in the
human's court. Everything build-able is DONE: **v3 IS FUNCTIONALLY COMPLETE END-TO-END** (design → engine →
sim → balance both modes → UI → difficulty selector → playtest checklist), **and the Tier-1 pre-playtest
fix sweep is COMPLETE** (`V3-FIX-BACKLOG.md` T1-1…T1-5; §8 2026-07-02). **Tier-2 is UNDERWAY: T2-1 "feed
the court" is LANDED** (starting Marshal + 6-token supply + full 2-seed re-lock; see §8 2026-07-02 T2-1)
**and T2-2 "hiding is dangerous" is RE-ARMED** (the engagement tally + the Reckoning blight pressure on
the least-engaged seat + the sim's passivity metric — dark 19.2/19.3%, all §9 bands PASS 2-seed; see §8
2026-07-02 T2-2). v3 646 tests green, v2 451, tsc clean. The playtest sets the difficulty default +
drives the styled-UI pass + any felt-experience tuning; remaining Tier-2 items (T2-3/4) await user calls.

*(Prior-status prose accumulated below is historical; the accurate running record is §8. Also note the
"DESIGN sprint / CODE sprint NOT STARTED" header at the top of §0 is stale — the code sprint is essentially
done; kept only because §8 is the authoritative timeline.)*

**[historical]** balance (both modes, 2-seed) → **3i UI DONE** (`src/ui-v3`, all verbs wired incl. capture-election / Ransom /
ASSAULT_HEART / Wraith / Bequest, the §13 P0-11 legibility, jsdom E2E over full competitive + Blood-Pact
games). v3 569 tests green, v2 451 green, tsc + `vite build` clean, and the competitive sim is **byte-identical
to the locked balance** (the UI's two sim-neutral human-only commands don't perturb it). Only the difficulty
feature + the human playtest remain. **Calibration decided
(user): the dark's strength becomes a DIFFICULTY SETTING** — a feature scaling the dark (doomCost curve) by
an expected-play-quality tier, calibrated off the noise data (dark-win ~+0.5pp per 1% error), default picked
at the V3-6 playtest; recorded as a planned feature (build near the UI/playtest, not now). Current lock =
the "flawless-play" calibration point (errorRate 0 → 18–22%), which is the natural top difficulty tier. **v3 COMPETITIVE BALANCE is essentially LOCKED,
2-seed stable** (after V3-5 waves 1–3): dark 21.4/20.7% in band (per-count 16–24 credible), attrition 26/30%
of dark-wins, doom 15.7/14.5% (co-primary), captures 0.35/0.36 (rare-but-dramatic), rounds 11.3, free-rider
+ termination OK. **5h gambit win-gate** (no declare/convert while the dark heart sits the Keystone) removed
the ~10.6pp incidental throne-wins → gambit_victory 23→10%, deliberate fire ~18% (in band), conversion 26→12%,
dark stayed flat (no compensation needed). **5i proved the no-dominance "fail" is an ARTIFACT:** gambler-free
the top is BASELINE (33%, a oneVsField-filler over-representation); the top *chosen strategy* is the cooperator
at **27.5% — already under the 30% guard**. Engine green: v3 516, v2 451. Remaining v3: dominance framing,
Blood-Pact 5e (traitor hot 34%), 3i UI, V3-6 playtest. The v3 **ENGINE is feature-complete and the sim runs** (Stages V3-3a→3h + V3-4
all DONE; `npm run sim:v3`). Verified: typecheck PASS, determinism clean, **v3 = 510 tests green**, **v2 =
451 green**; all games terminate at 2/3/4p + both modes. The untuned baseline (sim-results/sample-v3/REPORT.md)
surfaced two issues that are likely **structural, not pure tuning**: (1) the dark wins ~76% by **attrition**,
not by ashing the Keystone (doom only 6.1% of games) — inverts design pillar #1 "doom is the map"; (2) the
**capture/ransom economy fires ~0** (0.01/game) — the marquee redesign mechanic is effectively dead in sim.
3i (UI) still pending after balance.

**Recorded debt (resolve-or-record, from the 3a/3b sub-agents):** `data/tunables.json` + `data/archetypes.json`
still list the removed Broken/Rescue levers (`rescueWillingness` etc.) — **inert** (the engine reads the cleaned
`src/v3/tunables.gen.ts`), but a `npm run gen:data` resync is owed once v3 gets its own `data/` dir. The four
new court tunables (`MARSHAL_POWER`/`STEWARD_POWER`/`HERALD_PIECE_POWER`/`STEWARD_INCOME`) are plain literals in
`src/v3/tunables.ts` pending that v3 data split. Blood-Pact exposure re-tune deferred to the v3 5e-equivalent.
`state.json`/`handoff:check` were repointed to v3 in T-008 (`handoff-check.mjs` now reads this file's §4);
the v2-era roadmap this used to wire to now lives at `docs/archive-V2/ROADMAP.md`.

---

## 1. The game in one paragraph (orient a cold session)

**"Build a court. Save the world — or take it. Don't lose your head."** A 30–45 min digital board game for
2–4 rival Warlords who **command a court of distinct retainers** (Warlord / Marshal / Steward / Herald),
grown by **flipping seeded recruit tokens** on the land, while an autonomous, *telegraphed* AI villain (the
Shadowking) burns the map to ash and hunts whoever leads. Each round: the villain **telegraphs** its strike →
players **Pledge** cards to hold it back (proportional, no veto; the leader's cards count for less) → players
**act** (march, claim/flip, **raid → capture a rival's piece**, strike the dark, **ransom** a captive, swear/
break oaths, assault the heart) → **Dawn** (income, escalation, elimination). Doom IS the map: if the central
**Keystone** is ashed, *everyone* loses. **Elimination is real** (gated to The March+): strip a rival's court
and depose their Warlord and they are **out** (they spectate as a bounded "Wraith" serving the dark). You win
by being the **last Warlord standing**, by **territory** at the cap, by the **Crown's Gambit**, or by
**killing the dark** and winning the short scramble that follows. A separable **Blood Pact** hidden-traitor
mode rides on top.

---

## 2. Locked decisions (the v3 spine — do not relitigate without sign-off)

| Decision | Choice | Where |
|---|---|---|
| Defeat model | **Full elimination** (eliminated → spectate as a bounded Wraith). Broken Court **RETIRED**. | ALGORITHM §0, §5.5 |
| Court | **4 archetypes** (Warlord/Marshal/Steward/Herald), Herald flagged advanced; each = a distinct capture-consequence | ALGORITHM §2 |
| Combat outcome | **Capture** — by choice, margin-gated, one-effect-per-combat; a hostage economy | ALGORITHM §5.2, §13 P0-1/2 |
| Rescue → **Ransom** | Free a captive (resource-negative; recapture-immune); ally-ransom may forge an Oath | ALGORITHM §5.3 |
| Discovery | Flip seeded face-down tokens (recruit / Blight-seed / Death-Knight); pre-bound, fogged | ALGORITHM §5.1, §7 D1/D2/D9 |
| Heroic win | **Kill the Dark** — assault the heart, then a single-Dawn throne scramble (two-act) | ALGORITHM §5.6, §13 P0-7 |
| Dark's terminal win | `doom_complete` + **attrition** (last-two/simultaneous depose) + **Reckoning auto-pressure** (taxes the turtle first) | ALGORITHM §6, §13 P0-5 |
| Catch-up | **"Leading is dangerous" + a MILITARY lever** (`CAPTURE_MARGIN` rises with standing). No comeback subsidy. | ALGORITHM §5.4, §13 P0-2 |
| Anti-passivity | **"Hiding is dangerous"** — the dark's pressure hits the most-hoarded/least-engaged seat first | ALGORITHM §13 P0-5; CONCEPT §8 |
| Kept from v2 | Closing-Ring map, the Pledge, Oaths/Ledger, Crown's Gambit, telegraphed Shadowking policy + 3 acts, full determinism, Blood Pact as a flag | ALGORITHM §0 "Kept wholesale" |
| **Build strategy** | **OPEN — needs sign-off.** Recommended: **parallel `src/v3/`** (copy+transform the reusable v2 substrate; keep v2 green/playable), mirroring the v1→v2 transition. Alt: branch-and-replace. | §5 |

---

## 3. Document map (read order)

1. **`docs/ROADMAP-V3.md`** — this file. v3 code-sprint status + plan + how to resume.
2. **`docs/DESIGN-V3-ALGORITHM.md`** — ⭐ THE SPEC. **§13 authoritative**; §12 edge cases; §8 the
   remove/rebuild/reuse map; §9 the tunable registry the sim will tune.
3. **`docs/design-history/DESIGN-V3-STRESS-TEST.md`** — the P0/P1 punch list (P0 folded into §13; P1 = openRisks).
4. **`docs/design-history/DESIGN-V3-CONCEPT.md`** — the spine and the Shadowlord-roster turn (the "why").
5. **`docs/design-history/DESIGN-V3-FOCUS-GROUP.md`** — the panel synthesis (capture-as-heart, the snowball/dead-time finds).
6. (Reference) `docs/DESIGN-V2-ALGORITHM.md` — the v2 spec; §7 = the determinism contract v3 inherits and extends.
7. (Reference) `docs/Shadowlord.md` — the 1983 inspiration v3 moves back toward.

---

## 4. The plan (stages → concrete steps → status)

Workflow (same as v2): **① idea → ② textual algorithm → ③ code → ④ sim → ⑤ balance → ⑥ UI + playtest.**

- [x] **Stage V3-1 — Concept / focus group** → `design-history/DESIGN-V3-CONCEPT.md` + `…-FOCUS-GROUP.md`
- [x] **Stage V3-2 — Textual algorithm** → `DESIGN-V3-ALGORITHM.md`
- [x] **Stage V3-2.5 — Adversarial stress-test + 12 P0 fixes folded** → `design-history/DESIGN-V3-STRESS-TEST.md` (→ ALGORITHM §13)
- [x] **Stage V3-3 — Build the v3 engine (from the spec; §13 is the checklist).** Recommended order:
  - [x] **3a. Scaffold + retire Broken Court** — DONE (`63eadb2` Foundation faithful clone → `8d7f575` retire
    Broken). Removed all Broken/Rescue fields + `checkBrokenState`/`executeRescue`/`checkBrokenRecovery` + the
    `all_broken` checks + 7 Broken/Rescue tunables; added `isEliminated`/`deposed`, `resolveDeposals`
    (zero-strongholds → deposed, resolved at Dawn in seat order, Whisper-protected §12 #13), and
    `checkEndConditions` with loss-preempts-win ordering (doom → **attrition** [the `all_broken` successor] →
    last-standing). Reuses SeededRandom/board/Pledge/Crown/Blight/policy/Oaths/Gambit. Rescue tests removed
    (mechanic gone); end-condition tests added.
  - [x] **3b. The court (archetypes)** — DONE (`efb67ae`). New `src/v3/court.ts` + `court[]` on PlayerState;
    Warlord/Marshal/Steward/Herald with distinct power/verb/passive (Steward income at Dawn, Marshal combat +
    Last-Stand gate, Herald hand/parley generalized from v2). Four placeholder court tunables added.
  - [x] **3c. Discovery + determinism** — DONE (`43c98b9`). Determinism-first: pre-bound tokens via a
    namespaced `SeededRandom(hash(seed, nodeId))` (D1/D9), the `observableState(state, viewerSeat)` projection
    redacting content **and `seed`** (D2), the frozen back-sigil field, CLAIM-flips-token (§12 #19) with the
    recruit/Blight-seed/Death-Knight outcomes. Determinism tests added (identical layout + scripted-input replay
    + projection never leaks). **v3 = 431 tests green; v2 = 451 green; typecheck + lint PASS.**
  - [x] **3d. Capture & ransom** — DONE (`7b3fdb6`). New `src/v3/capture.ts`: RAID elects one of
    {TAKE_LAND/ROUT_PIECE/CAPTURE_PIECE} (margin+standing-gated `CAPTURE_MARGIN`, trailing-seat defense bonus);
    **ROUT = tempo loss** (returns next Dawn, recapture-immune); `captives[]` + guard cap; resource-negative
    RANSOM (replaces RESCUE; ally-ransom forges an Oath); captive-on-captor-death → freed-to-owner; Whisper
    last-retainer protection. *Note: `STEWARD_INCOME` 1→2 so `STEWARD_DENIED_TRICKLE`=1 is genuinely partial
    (§13 P0-3 softens §12 #7 — captor gains nothing, owner keeps a trickle).*
  - [x] **3e. Elimination + end-conditions** — DONE (`56a4199`). New `src/v3/elimination.ts`: the strikePool
    (eliminated hands → dark, cap+decay, Σ(power), lowest-id-first consume, conservation census, §7 D7);
    Reckoning auto-pressure targeting the **most-production/least-engaged seat first** (gated on a heart-live
    flag finalized in 3g); the Death-Curse target rule (leader/oathbreaker/beneficiary, never the killer, §12
    #26); simultaneous/last-two → attrition; loss-preempts-win extended to last-standing.
  - [x] **3f. Residual agency** — DONE (`e60f45c`). Death Bequest (scripted `f(observableState)` in
    `resolveDeposals`: bequeath to a **standing oath ally** — proof they aren't the killer, preserving
    no-free-spoils — forging a dissolve-exempt posthumous Oath, OR Death-Curse) + the Wraith (underworld
    score axis; one capped input/round; targeting **constrained to the dark's existing precedence**, never a
    personal face; ascending seat-index, nudges-before-/cards-after-telegraph, §12 #24).
  - [x] **3g. Kill the Dark** — DONE (`a4811f9`). New `src/v3/heart.ts`: the heart spawns at the Reckoning
    Keystone with a public HP track; `ASSAULT_HEART` multi-round commit + real liveness (suppresses 3e
    auto-pressure); largest-committer = raid-leader; on kill → off-Keystone displacement + un-producing
    penalty + hero shielded that Dawn + single-Dawn scramble overriding `ROUND_CAP` (§12 #17/#18/#21).
  - [x] **3h. Blood Pact v3 interactions** — DONE (`5709c92`). Eliminated traitor still wins on a later
    doom/attrition (win-check reads `bloodPactHolder` regardless of elimination); wraith-traitor tension within
    the cap; competitive (flag off) byte-identical. Full BP re-tune deferred to a v3 5e-equivalent.
  - [x] **3i. UI — render-from-state** — port `src/ui-v2`; add the new controls + the **mandated legibility**
    (Exposure meter, pre-commit combat-margin, the "Hold" rail, the capture/heart scene beats — §13 P0-11).
- [x] **Stage V3-4 — Sim harness** — DONE. `npm run sim:v3`; all v3 metrics (captures/ransoms, elimination
  timing, dead-time, kill-the-dark, snowball↔turtle, attachment proxy) + the bounded-rationality `errorRate`
  noise axis. Games terminate deterministically at 2/3/4p + both modes.
- [x] **Stage V3-5 — Balance validation — COMPLETE (both modes, 2-seed stable).** Competitive (waves 1–3 +
  noise pass): dark 21% in band, doom co-primary (hybrid), captures rare-but-dramatic, gambit win-gated,
  dominance settled (Option A), noise-robustness-checked. Blood-Pact (5e): traitor win ~17%, exposure ~58%,
  accuracy ~71%, accusations 0.81 — 2-seed stable, competitive byte-identical. Tunable journey logged in §8.
- [x] **3i — UI port** — DONE (`3e9934c`/`6b51976`/`aebc27a`). New `src/ui-v3` (renders from `observableState`,
  fog-respecting) + `index-v3.html` + `vite.config.ts` (both UIs bundle; v2 untouched). Every verb wired via
  `applyCommand` (incl. the capture election, Ransom, ASSAULT_HEART, and — via two sim-neutral human-only
  commands `SET_WRAITH_INPUT`/`SET_BEQUEST` — the Wraith input + Death Bequest); §13 P0-11 legibility
  (Exposure meter + "tide reached you" beat, pre-commit margin, captives Hold rail, capture/heart scene beats).
  jsdom E2E plays full competitive + Blood-Pact games via real DOM clicks (drives an elimination + a heart
  assault). v3 569 tests; competitive sim **byte-identical** to the locked balance. Functional/unstyled — the
  styled pass follows the playtest.
- [x] **Difficulty-setting feature** — DONE (`08a5899`/`2bbab87`). A `difficulty` tier (warlord/knight/squire)
  scaling the dark via the doomCost curve, calibrated at flawless play to **21% / 17.5% / 13%**; **warlord =
  DEFAULT = the locked balance (byte-identical, re-verified)**. Wired through the sim (`SweepConfig.difficulty`)
  and the UI (a selector on the `src/ui-v3` start screen, applied via the `withTunables` seam around each step).
  Emergent property: only the HARD tier amplifies under error (→25%); knight/squire are forgiving (~flat). Known
  limit: the doomCost floors at 1 card at 2p, so tiers only bite at 3p/4p (2p ≈23% across tiers). **The playtest
  picks the shipped default** (checklist item 11).
- [ ] **Stage V3-6 — UI polish + human playtest** — walk `human-playtest-checklist-v3.md` (the elimination
  feel, the Wraith engagement, the two-act ending, capture-as-scene, the 30–45 min length with 4 archetypes).

---

## 5. Reuse vs. rebuild (v3 builds on `src/v2/`, not v1)

From ALGORITHM §8. Unlike v1→v2 (a near-total rewrite), v3 **reuses most of the v2 substrate** and rebuilds
the defeat/roster systems. **Recommended build strategy: copy `src/v2/` → `src/v3/` and transform**, so v2
stays green and playable as a reference until v3 reaches parity (then promote v3 and retire v2, mirroring how
v1 was retired). Confirm this vs. branch-and-replace before 3a (§2 open row).

| v2 asset | v3 verdict | Note |
|---|---|---|
| `seeded-random`, board graph + topology data, GLL tokens | **REUSE as-is** | Foundational; the Closing Ring is unchanged. |
| The Pledge (§4.2), Crown (§5.2), Blight/ash-map (§5.1), Shadowking policy + grudge + acts (§5.6), Oaths/Ledger, Gambit (§6) | **REUSE** | Kept wholesale; extend the voice layer with new-system barks. |
| `combat.ts` `checkBrokenState` / wounds→Broken / Holdings-ash-on-Broken | **REMOVE** | Replace with capture election + the `deposed` flag. |
| `actions.ts` `executeRescue` / `checkBrokenRecovery` | **REMOVE → REBUILD as `executeRansom`** | §5.3. |
| `sequencer.ts` Broken income/actions/recovery, **`all_broken`**; `reducer.ts` `all_broken` | **REMOVE → REBUILD** end-conditions | attrition + last-standing + auto-pressure (§6). |
| `types.ts` Broken fields | **REMOVE → ADD** `court/captives/strikePool/wraiths/heart` | §2. |
| 7 Broken/Rescue tunables | **REMOVE**; add the §9 v3 levers | — |
| `ai-player.ts` | **REFACTOR** to the new verb space (RAID-elect, RANSOM, ASSAULT_HEART, CLAIM-flip, wraith inputs) | must stay pure `f(observableState, seed)`. |
| `src/v2/sim/` harness | **REUSE / RE-POINT** to the v3 reducer | new archetypes + metrics (§4 V3-4). |
| `src/ui-v2/` | **PORT + EXTEND** | new controls + the §13 P0-11 legibility mandates. |
| The v2 test suite | **PORT the determinism/contract tests; write fresh for the new systems** | the v2 suite anchors v2; don't green it against v3. |

---

## 6. Known risks / parked questions (carried from the stress-test P1 list)

- **PRIMARY (was the snowball; now the meta-balance):** does v3 sit between the snowball the brakes fight and
  the **turtle** they accidentally created? The §13 P0-5 retarget is the centering lever — **prove it in the
  Stage V3-5 sim** (captures/game and elimination-timing both in-band) before the design is trusted.
- **Re-validate the Shadowking win-rate from scratch** — a win-path (`all_broken`) was replaced.
- **Spectator dead-time** is a launch-risk metric, not just a feel — no human eliminated before
  `ROUND_CAP × DEAD_TIME_FLOOR`; the Wraith must read as agency, not a chore (P1-8).
- **P1 punch list** (DESIGN-V3-STRESS-TEST.md): wraith/curse concentration (let the cursed shed it),
  ransom-direction kingmaking, discovery bonus rewarding the strong, **unclocked negotiation dead-time**,
  attachment-without-recourse, the capture-worth-doing band, and a **per-turn time budget** for 4 archetypes.
- **Build strategy** (§2/§5) is unsettled — parallel `src/v3/` vs. branch-and-replace — sign off before 3a.
- E (cards-under-pieces) and F (open trade market) remain **parked** (CONCEPT §4); revisit post-core.

---

## 7. How to resume (fresh session checklist)

**Follow `docs/AGENT-PROTOCOL.md` — the enforced Definition of Done.** This sprint adds two preconditions:

1. **Commit the four v3 design docs first** (they are currently uncommitted) — they are the spec this sprint
   builds from. On a branch, per repo convention.
2. **When the code sprint opens, point `docs/handoff/state.json` at the v3 stage** (`currentStage: "V3-3a"`),
   and add a v3 changelog stream here (§8). Until then, `state.json` legitimately tracks the v2 status.
3. Read this file (§2 locked decisions; §4 — first unchecked box = current stage), then
   `DESIGN-V3-ALGORITHM.md` **§13 + §12 + §2 + §8**. §13 is authoritative over earlier prose.
4. Build through the one `applyCommand` reducer; everything deterministic (§7 + the new D1–D9 clauses);
   AI/human/wraith all read `observableState`; write tests as you go.
5. **DoD:** `npm run verify` exits 0 → update `state.json` + this §4 box + §8 changelog + the memory file →
   commit → `npm run handoff:check` exits 0.

---

## 8. Changelog / decision log (v3)

- **2026-07-17** — **T2-V · 40-SEED HERALD-OFF PRESSURE SWEEP (both modes, canonical + fresh) — SWEPT;
  ONE MARGINAL FRESH-SEED BP-EXPOSURE MISS FLAGGED (user call).** Pressure-tested the T2-3 Herald-OFF
  default at the project's 40-seed standard: `npm run sim:v3 -- <seed> 40` and `… --bloodpact` for the two
  canonical base seeds **20260622 / 20260628** and two never-before-used fresh seeds **20260717 / 424242**
  (8 sweeps, n=40; competitive matchups=35, BP matchups=3 → 360 BP games each). Balance stayed **LOCKED —
  zero tunable / zero `src/` changes**; a band miss on a fresh seed is recorded, never tuned.
  **npm-flag note for future runs:** npm 11 drops a bare `--bloodpact`/`--quick` ("Unknown cli config") and
  silently runs a *competitive* sweep — you must separate script flags with `--`, i.e.
  `npm run sim:v3 -- <seed> 40 --bloodpact`.
  **Canonical reproduction (regression gate) — byte-exact vs the T2-3 record:** 20260622 comp dark **18.9%**
  (2p 17.1 / 3p 23.3 / 4p 16.4, rounds 12.2); 20260628 comp dark **18.3%** (2p 16.0 / 3p 23.3 / 4p 15.7,
  rounds 12.2); 20260622 **BP 15.8 / 69.4 / 78.1**. All three recorded targets reproduced exactly → no code
  regression.
  **All eight sweeps — pooled dark · per-count 2p/3p/4p · mean rounds · BP win/exposure/accuracy:**
  - **20260622** (canonical): dark 18.9% · 17.1/23.3/16.4 · 12.2r · BP 15.8/69.4/78.1 — all bands ✓
  - **20260628** (canonical): dark 18.3% · 16.0/23.3/15.7 · 12.2r · BP 17.2/66.9/80.3 — all bands ✓ (the
    fresh BP re-run lands in band; the stale on-disk Jun-28 BP file had read 21.4/53.3/71.1 and was discarded)
  - **20260717** (fresh): dark 19.0% · 18.4/23.0/15.6 · 12.1r · BP 16.4/**71.4**/71.0 — **exposure 71.4% is
    +1.4pp over the 40–70 ceiling → fresh-seed band miss**; dark/rounds/traitor-win/accuracy all in band
  - **424242** (fresh): dark 19.3% · 16.8/24.6/16.5 · 12.1r · BP 15.6/67.5/75.0 — all bands ✓ (3p 24.6 sits
    +0.6 over the ~24 credible edge, within the soft per-count tilde)
  **Bands checked:** dark pooled 18–22 (all 4 ✓); mean rounds 10–16 (all ✓); gambit-fire 10–20% (all ✓,
  16.7–17.9); per-count ~16–24 *credible* (soft — 20260717 4p 15.6 and 424242 3p 24.6 sit a fraction outside,
  as the canonical record's own 628 4p 15.7 already does); BP traitor-win 12–20 (all ✓, 15.6–17.2), exposure
  40–70 (three ✓; **20260717 71.4 over**), accuracy ≥45 (all ✓, 71.0–80.3).
  **Finding:** the sole headline-band deviation across all 8 sweeps is 20260717's BP exposure at 71.4%
  (+1.4pp), on a FRESH seed, with its traitor-win (16.4% — the primary balance lever) healthy mid-band: a
  marginal sampling-edge overshoot, not a balance failure. Per the "no tuning on a fresh-seed band miss"
  protocol it is recorded, not tuned → **T-004 set BLOCKED(band miss on fresh seed — user call)** for the
  user to decide whether a +1.4pp fresh-seed exposure edge warrants any action. Eight
  `sim-results/v3-s{20260622,20260628,20260717,424242}-n40{,-bp}` run dirs committed (n=40, `git add -f`
  past `.gitignore sim-results/*`).

- **2026-07-02** — **T2-3 HERALD DEFAULT-OFF COMPLETE (orchestrator-salvaged close-out).** `heraldEnabled`
  setup flag, **DEFAULT OFF → the shipped game is 3-archetype** (Warlord/Marshal/Steward); Herald+PARLEY are an
  advanced toggle (UI start-screen + sim `--herald`). Removing the Herald's hand-bonus/Parley genuinely reshaped
  the default balance — ~10 tuning passes landed the **`HERALD_OFF_REBALANCE` overlay** (BLIGHT_TO_ASH 2→3 +
  SPREAD_AMOUNT_BASE 2.6 core swap — a slower, 2-Dawn-telegraph ash clock vs a meatier strike; DOOM_COST
  M11→14/R14→17.5/div 4→4.5; SURGE 2→1.5; BP re-pair SPREAD_BONUS 1→1.2 + SABOTEUR_COVER 0.745→0.735).
  **Validated 2-seed at the new default:** dark **18.9/18.3%** (band), per-count 2p 17.1/16.0 · 3p 23.3/23.3 ·
  4p 16.4/15.7 (credible), rounds 12.2, court-at-March 3, **BP 15.8/69.4/78.1** (all bands). ROUND_CAP made
  injectable (probe; default unchanged). v3 **662 tests green**, tsc/eslint/vite clean; sample-v3 references
  refreshed to the herald-OFF default. *(The stage agent validated the finalist but hit a session limit before
  committing; work verified independently — full gate + 2-seed + BP — and committed by the orchestrator.)*
  **Remaining: ~~T2-V final lock~~ SWEPT 2026-07-17 (see the T2-V entry above: 8 sweeps at n=40, both
  modes, canonical byte-reproduced; one marginal fresh-seed BP-exposure edge flagged for a user call)** —
  difficulty-tier re-anchoring folded into the T2-3 test updates; T2-4 Wraith stays playtest-gated.

- **2026-07-02** — **TIER-2 T2-2: RE-ARM "HIDING IS DANGEROUS" (+ the passivity metric) — the
  anti-turtle lever is LIVE again, in the BLIGHT currency.** The wave-1/5b disarm
  (`RECKONING_AUTOPRESSURE_NODES`=0) had left nothing punishing the least-engaged seat. Shipped:
  (1) a public per-seat **engagement tally** (`PlayerState.engagement`: +1 per card pledged /
  STRIKE-committed / ASSAULT_HEART-committed, +1 per PARLEY — deterministic, from public verbs);
  (2) **`applyReckoningBlightPressure`** (new injectable `RECKONING_AUTOPRESSURE_BLIGHT`=1): each
  Reckoning Dawn, no live heart assault (P0-6 carries over), the dark advances 1 blight on the
  least-engaged living seat's most-imperiled **non-Keep** stronghold (lowest tally → most production →
  lowest seat) — it telegraphs one Dawn before ashing (BLIGHT_TO_ASH=2), and engaging moves the gaze.
  Doom/attrition-safe by TWO validated shapes: **Keeps never targeted** + **spare-the-broken** (only
  seats with 2+ productive non-Keep nodes qualify — the pressure can never economically execute).
  **Build-then-validate ledger (all 2-seed):** keep-inclusive deposal-currency re-arm REJECTED (best
  metric, 25.2/24.0, but last_standing 7→21% of games + 3p 24.7% over the credible cap — the 5b
  inversion in miniature); full-block + 3-living dose gates REJECTED (both neutered the 2p regime where
  hiding is most rewarded); doom-cost compensators REJECTED (provably inverted — easier blocks → faster
  patience escalation → 3p 28.9%); a magnitude-2 probe REJECTED (no metric gain, pooled sags to 18.05,
  telegraph lost). (3) **The sim passivity metric** `passiveSeatWinRate` (+ winner/field mean
  engagement; per-count in the banner): the min-engagement seat's win share was **35.9/36.3% pooled —
  ABOVE the ~26.9% even share; hiding WAS the best line — and 66.1/66.6% at 2p**; shipped:
  **34.7/34.0 pooled, 61.5/59.8 at 2p**. 3p/4p flat (~27/~15) — sim bots don't turtle there (the
  backlog's own prediction); the 3p/4p bite is a human-playtest item, now armed and TAUGHT (teach-script
  beat **C9**, the "quietest banner" bark). **2-seed re-validation, all §9 bands:** dark **19.2/19.3%**
  pooled [18.6/21.9/17.1]·[18.3/23.1/16.5], doom-of-games **17.3/17.6**, attrition share **9.8/8.8**,
  rounds 12.16/12.13, eliminations 0.36/0.36 (texture holds), free-rider/dominance/termination PASS,
  captures 1.38/1.45 + court median 3 (T2-1 holds); **BP 17.8/19.2 · 55.6/53.3 · 69.4/70.9** (holds).
  **VERIFIED:** v3 646 tests green (tsc + eslint clean), v2 451 untouched; `sim-results/sample-v3/`
  refreshed (banner = this re-validation). Spec §6 + §13 P0-5 re-annotated INERT → shipped mechanism.

- **2026-07-02** — **TIER-2 T2-1: FEED THE COURT (supply + re-lock) — the pitch-matching change
  (engagement review #1) LANDED.** Levers (a)+(b) of the backlog recommendation: (a) **every player
  STARTS with one named MARSHAL** at their Keep — archetype FIXED (the sanctioned A/B refuted a seeded
  Marshal/Steward split: a starting Steward's +2/Dawn economy inflates early claims→flips→front heat, 3p
  dark 32.9% vs 24.8% all-Marshal, and deals unequal round-1 economies); the NAME is pre-bound on its own
  namespaced sub-stream `f(hash(seed,'start-retainer-<seat>'))` (§7 D9 — main setup RNG unperturbed).
  (b) **a seed-picked PAIR of Forges carries a pre-bound Discovery token** (`FORGE_TOKEN_COUNT`=2, new
  injectable lever; pair = sub-stream shuffle `f(hash(seed,'forge-token-wave'))`; presence+sigil public,
  content fogged) ⇒ **6 tokens/game** — ALL 8 was built first and REFUTED (3p dark 33.9%, no tunable fix
  in reach: doom tilt provably inert at 3p (pivot-3), SURGE/PUSHBACK/heart/strikepool all <1pp).
  **Objective delivered:** court-at-March median 2 → **3** (new driver-snapshot metric
  `medianCourtAtMarch`), captures 0.35 → **1.39/1.46**/game (capture brakes untouched), retainer supply
  ~1.5 → ~3+/game. **Knock-on re-lock (v3-native literals, the standing v2-JSON recorded debt):**
  `DISCOVERY_BLIGHT_DELTA` 1→0 (the on-claim front-delta compounded flip volume; the fightable-threat
  agency half unchanged — §5.1 annotated), `SPREAD_AMOUNT_BASE` 3→1 (primary cooler; the doom clock rides
  the BLIGHT_TO_ASH=2 Dawn march), `DOOM_COST_MARCH` 9→11 + `DOOM_COST_RECKONING` 12→14 (fewer full
  blocks ⇒ slower patience-forced act escalation at 3p; re-heats 4p via the pivot-3 +6 tilt). **2-seed
  40-seed re-lock, both modes:** dark **19.4/19.5%** pooled, per-count **[18.4/22.3/17.6]** /
  **[17.6/23.2/17.6]** (3p BETTER than the old lock's 24.9/24.1), doom-of-games **17.9/17.8%**, attrition
  share **8.0/8.8%**, rounds **12.20/12.19**, free-rider + termination PASS both; BP **18.1/18.9 ·
  56.1/53.6 · 70.6/71.2**. `sim-results/sample-v3/` refreshed (REPORT banner = the re-lock record).
  **VERIFIED:** v3 **627** tests green (tsc + eslint clean); spec §2/§3/§5.1/§9 updated. **Recorded
  watch items (dated, in the REPORT banner):** eliminations 0.52→0.30/game + attrition endings ~1.5% of
  games (the dark now wins almost purely by doom — a playtest feel item); saboteur gambler-free win
  31.4/32.7% vs the 30% archetype guard line (pooled dominance + free-rider PASS; T2-2's hoard-tax is
  the natural fix home); difficulty-tier (knight/squire) MAGNITUDES stale post-T2-1 (monotonicity
  test-verified; recalibrate at the next difficulty-touching stage).

- **2026-07-02** — **TIER-1 PRE-PLAYTEST SWEEP COMPLETE (W4, backlog T1-5: doc honesty + the teach
  script) — the playtest is UNBLOCKED.** W4 (docs-only): (a) **spec honesty** — ALGORITHM §6 + §13 P0-5
  now carry a SHIPPED-STATE annotation: the Reckoning auto-pressure ships `RECKONING_AUTOPRESSURE_NODES=0`
  (the sanctioned 5b decision), so the anti-turtle "hiding is dangerous" lever is currently **INERT** —
  the spec no longer oversells the shipped game; re-arm tracked as backlog T2-2 (P0-10 was already
  annotated by W2). (b) **`docs/v3-teach-script.md`** — the canonical progressive-disclosure onboarding
  (a 5–6 min upfront script: 4-idea spine, THREAT→PLEDGE + the Crown surcharge, cards-vs-banners,
  march/claim/flip, "elimination from March — watch the Exposure meter", the exactly-3-sentence taught
  end conditions; 8 in-context one-shot beats: capture election / ransom / oaths / March exposure /
  heart-at-spawn + throne gate / Wraith+Bequest / the T1-4 Last Stand prompt / the Gambit; Blood Pact
  NEVER in game one) — a stated REQUIREMENT for the styled-UI pass (T3-10); §6 points teaching at it.
  (c) The playtest checklist now mandates teaching from the script; backlog Tier-1 statuses verified
  against the landed commits and T1-5 marked done. **Tier-1 ledger:** T1-1 names (`5fb1e48`) · T1-2
  Whisper gate BUILT + Rally built→REVERTED-recorded + T1-3 Crown callout (`9eedd1e`) · T1-4 human Last
  Stand (`bb286ca`) · T1-5 this entry. **State:** v3 623 tests green, v2 451, both modes in band (dark
  21.4%, BP traitor 19.4%), sim reference byte-stable (W4 guard re-verified byte-identical). **Next:**
  the V3-6 human playtest (`human-playtest-checklist-v3.md`), teaching from the teach script; Tier-2
  items await user calls.

- **2026-07-02** — **Tier-1 W3 (backlog T1-4): HUMAN LAST STAND CONTROL — the pause-flow.** The one
  interactive heroic verb the spec grants now reaches the player: when a HUMAN defender would lose a
  stronghold in a RAID, the engine HALTS resolution into `state.pendingLastStand` (a BLOCKING state — the
  reducer rejects every other command; `runAITurn` + the session pump stop) instead of auto-playing
  `chooseLastStandCards`. `LAST_STAND_COMMIT` (now carrying the chosen card VALUES, `cardIds`) resumes via
  `resumeLastStand` → `finishRaidResolution`, the tail shared VERBATIM with the AI auto path (UNTOUCHED).
  RAID is the only Last-Stand call site (the dark's RAID_DK is Blight-only — verified). **One recorded
  human-only rule:** a partial stand that undercuts the attacker's CAPTURE margin without reversing the
  winner ⇒ the capture **FIZZLES** (never a throw mid-resume); illegal elects still fail atomically AT the
  pause, mirroring the auto path (ALGORITHM §5.2 annotated). UI: a blocking prompt — per-card toggles,
  live projected totals (ties-to-defender surfaced), the "committed cards are next round's Pledge cards"
  warning. **VERIFIED:** v3 623 tests green (17 new: pause fires human-only / resume 0-partial-full-fizzle
  / commands blocked while paused / determinism with scripted commits / jsdom E2E clicking the real
  prompt), v2 451, tsc + eslint + `vite build` clean. **BALANCE GUARD:** competitive `sim:v3` summary.json
  **BYTE-IDENTICAL** to sample-v3; blood-pact sweep **BYTE-IDENTICAL** to the 9eedd1e baseline
  (stash-verified both ways). Found + fixed a W2 leftover: `sample-v3/BLOOD_PACT.summary.json` still
  carried the pre-Whisper-gate numbers (traitor 18.6%) — refreshed to the validated current baseline
  (19.4%, the number the W2 entry below records); `BLOOD_PACT.md` kept as the 5n validation narrative.

- **2026-07-02** — **Tier-1 W2 (backlog T1-2 + T1-3) — split verdict, both halves resolved-or-recorded.**
  (T1-2a, drift D3) **Whisper last-stronghold gate BUILT + VALIDATED:** `canTakeLand` (capture.ts) blocks a
  TAKE_LAND elect against a defender's last living stronghold pre-March (fail-fast before cards are spent;
  AI throw-safe; UI election gated + hinted) — §5.2/§12 #13 now literally true in the engine. 2-seed both
  modes in band (dark 21.4/20.9; BP traitor 19.4/exposure 57.2/accuracy 70.5 — all in band); the sample-v3
  reference refreshed. (T1-2b, drift D1) **The Rally was BUILT, swept, and REVERTED — a dated decision, not
  a silent omission:** it pushed seed-20260628 dark-win to **22.0%** (over the ceiling; revived seats extend
  games → the doom clock lands more) with no local tunable fix; removal recorded in ALGORITHM §13 P0-10.
  **Residual owned gap:** a Warlord zeroed *by Blight ash* in Whisper still falls at the first March Dawn —
  revisit with T2-1 (feed-the-court) or a compensated Rally. (T1-3) **Round-1 Crown callout** built (UI-only,
  one-shot, jsdom-tested both polarities; zero engine change). *(Stage executed by the W2 sub-agent, which
  hit a session limit before committing; work verified independently — full gate + byte-reproduction + BP
  bands — and committed by the orchestrator.)*

- **2026-07-01** — **T1-1 (Tier-1 sweep W1): RETAINER NAMES PERSIST + SURFACE (review drift D5).**
  `CourtPiece` gains `name` + `identity` (§2 "names are state"): Discovery recruits copy the PRE-BOUND token
  name (main + blight-seed-bonus paths, §7 D9); starting Warlords carry FIXED faction names (`FACTION_NAMES`,
  §3 `factionName[i]`); the Herald is `Voice of <faction>`. The one-line identity is `identityFor(name)` — a
  PURE hash of the name into a fixed pool, never a live-stream draw. Names surfaced in the court panel
  (+identity line), Hold rail, standings, ransom/bequest controls, and the capture / ransom / recruit-flip
  scene beats; capture/rout/ransom/rout-return/captive-freed/bequest events all carry the name. **VERIFIED:**
  v3 597 tests green (11 new: persistence recruit→capture→ransom→return + UI parity), v2 451, tsc + eslint +
  `vite build` clean, and `sim:v3` summary.json **BYTE-IDENTICAL** to the locked reference (names are cosmetic
  state — guard (a) held).
- **2026-07-01** — **DIFFICULTY-SETTING FEATURE COMPLETE + PLAYTEST CHECKLIST → v3 READY FOR PLAYTEST**
  (commits `08a5899`/`2bbab87`/`4511db2`). A `difficulty` tier (**warlord / knight / squire**) scales the dark
  via the doomCost curve, calibrated at flawless play to **21% / 17.5% / 13%** dark-win; **warlord = DEFAULT =
  the locked balance, byte-identical** (re-verified: `sim:v3` default summary.json == locked reference). Wired
  through the sim (`SweepConfig.difficulty`) and the UI (a selector on the `src/ui-v3` start screen applied via
  the `withTunables` seam around each engine step). **Honest emergent finding:** only HARD amplifies under human
  error (→25% at ~7%); knight/squire are *forgiving* (~flat) because a weaker doomCost floor is blockable even
  with degraded pledges — so the tiers read as "brutal-if-sloppy / steady / easy". **Known limit:** doomCost
  floors at 1 card at 2p, so the tiers only bite at 3p/4p (2p ≈23% across tiers) — a future 2p-specific lever if
  needed. Also added `docs/human-playtest-checklist-v3.md` (11 human-only items). v3 586 tests, v2 451, `vite
  build` clean. **v3 is now FUNCTIONALLY COMPLETE + PLAYTEST-READY** — next is the V3-6 human playtest, which
  sets the difficulty default + drives the styled-UI pass.
- **2026-07-01** — **Stage 3i UI PORT COMPLETE → v3 FUNCTIONALLY COMPLETE END-TO-END** (commits
  `3e9934c`/`6b51976`/`aebc27a`). New `src/ui-v3` ported from `src/ui-v2`, wired to the v3 engine, rendering
  from `observableState` (never leaks unflipped tokens / seed, §7 D2). Every v3 verb has a control routed
  through `applyCommand`; the Wraith input + Death Bequest — which were engine-auto scripted policies with no
  command surface (like v2's Last-Stand gap) — got two **sim-neutral human-only** commands
  (`SET_WRAITH_INPUT`/`SET_BEQUEST`; optional `pendingBequests`/`wraithInputs` state consulted only when
  present+legal, else the scripted fallback → sim/AI never set them). §13 P0-11 legibility all present. jsdom
  E2E plays full competitive + Blood-Pact games via real DOM clicks (incl. an elimination → Wraith/Bequest and
  a heart assault). **VERIFIED:** v3 569 green, v2 451 green, tsc + eslint + `vite build` (both UIs) clean, and
  the competitive sim `summary.json` is **byte-identical** to the locked reference — the engine-touch did not
  move balance. Functional/unstyled UI; playable via `npm run dev` → `/index-v3.html`. **Remaining v3: the
  difficulty-setting feature + the V3-6 human playtest.**
- **2026-06-29** — **V3-5e BLOOD-PACT RE-TUNE COMPLETE (2-seed; commits `ec973d4`/`38718cb`) → v3 BALANCE
  COMPLETE, BOTH MODES.** Two mode-gated levers: `BLOOD_PACT_SPREAD_BONUS` 1→0 (the on-top doom bonus was
  redundant once the competitive 5b doom-path buff made `doom_complete` — the traitor's win — far more
  reachable) + `SABOTEUR_COVER` 0.745→0.78 (a touch more cover lifts exposure into band). Result (2-seed):
  traitor win 34.4→**18.6/16.1%** (band 12–20 ✅), exposure 52.5→**56.9/58.6%** (band 40–70 ✅), accuracy
  86.3→**70.7/72.3%** (≥45 ✅), accusations 0.61→**0.81/0.81** (≤2.5 ✅) — **all four bands HOLD, 2-seed
  stable**, cleaner than v2's 5e (which never centered win+exposure). **Competitive BYTE-IDENTICAL** (verified:
  competitive `summary.json` == locked reference; both levers mode-gated, inert with the flag off). 532 v3
  green, 451 v2 green. **Remaining v3: 3i UI port + the difficulty-setting feature → V3-6 human playtest.**
- **2026-06-29** — **TWO USER DECISIONS off the noise pass.** (1) **Dominance = Option A, ADOPTED** (judge
  the no-dominance guard on the top deliberately-chosen strategy, excluding the baseline engine-default filler;
  confirmed safe by the noise robustness) → **competitive balance LOCKED.** (2) **Calibration = a DIFFICULTY
  SETTING:** the dark-is-fragile-to-error finding becomes a feature — a `difficulty` tier scaling the dark's
  strength (the doomCost curve / a dark scalar) by an assumed play-quality, calibrated off the noise mapping
  (~+0.5pp dark-win per 1% error), default chosen at the V3-6 playtest. PLANNED FEATURE (build near the UI; the
  current errorRate-0 lock = the top "flawless-play" tier). **Next work = Blood-Pact 5e re-tune.**
- **2026-06-29** — **V3-5 BOUNDED-RATIONALITY ("d20") NOISE PASS (commits `59d24e3`/`ed4fee7`; report
  `sim-results/sample-v3/NOISE_SWEEP.md`).** Added a seeded `errorRate` AI knob (a failed "skill check" →
  a uniformly-random LEGAL action / perturbed pledge; **byte-identical at 0**, all noise via SeededRandom,
  determinism + legality tested; v3 532 green). Swept the locked competitive suite (4200 games/level) at
  errorRate {0,.05,.10,.15,.20}. **THREE READS:** (a) **DOMINANCE SETTLED → Option A safe:** every archetype's
  win-share regresses toward even as everyone errs (gambler 40.9→32.8, cooperator 27.5→23.5, baseline 33.4→21.6)
  — nothing grows, the signature of an ARTIFACT, not a real edge; **the no-dominance guard passes on the top
  CHOSEN strategy → competitive balance LOCKED.** (b) **NEW FINDING — the dark is calibrated to FLAWLESS play
  and is fragile to human error:** dark-win 21.4→24.5(5%)→26.9(10%)→29.0(15%)→31.6%(20%), ~+0.5pp per +1% error,
  worst at 3-4p (→35.6/33.1% at 20%); mechanism = pledging is COORDINATION, so a failed check under-pledges and
  *helps the dark*. Crucially the **path mix stays healthy** (extra wins via doom_complete 15.7→21.3%, NOT
  attrition; attrition ≤40 and rounds 10-16 hold every level) — the shape is robust, only the *rate* climbs.
  (c) **Rare-but-dramatic SURVIVES:** captures 0.35→0.31, deliberate gambit fire stays in 10-20 every level.
  **OPEN — calibration philosophy (design call):** target balance at flawless play (skill-gradient: sloppy
  tables lose more, by design) vs re-calibrate to a realistic error level vs a difficulty knob; lean = keep
  flawless calibration + revisit with real error data at the V3-6 human playtest. `errorRate` is now a standing
  AI-realism validation axis (NOT a §9 lever; locked numbers untouched, proven byte-identical at 0).
- **2026-06-29** — **V3-5 TUNING WAVE 3 (2-seed validated; commits `66c785c`/`53d4e4a`/`e417b4b`) — COMPETITIVE
  BALANCE ESSENTIALLY LOCKED.** **5h gambit WIN-gate** (user Option B): a Crown's Gambit can be neither declared
  nor converted while the dark's heart is exposed at the Keystone (the heart spawns ON the Keystone, so
  ASSAULT_HEART convergers were winning the throne by accident). Result (gambler-free, 2-seed): total gambit win
  15.5→2.3/2.4%, **incidental cheap wins ~11pp → ~0.1pp (GONE)**, deliberate fire preserved ~18% (in 10-20 band),
  conversion 26→12% (a rare special play); gambit_victory share 23.4→10.5%; gambler 45→40%. **No dark compensation
  needed** — removed wins flowed to territory, not doom/attrition, so dark stayed flat 21.4% (the rule change is
  in `gambit.ts` `evaluateGambitAtDawn`; spec §6 updated). **5i cooperator investigation (diagnosis only):
  PREMISE CORRECTED** — gambler-free the 30%-guard breach is BASELINE (33.4%, a oneVsField filler
  over-representation + weak strategy-bots), NOT the cooperator (25.5–27.5%, already under the guard). The
  cooperator's edge is a pairwise stress-bot ARTIFACT (it crushes weak bots, loses to baseline 1.3%; wins 98% by
  outlasting the self-eliminating aggressor; its territory is *below* field; oath levers are NOT the cause —
  banners are only the 3rd tiebreak). **Fix options (user call): A (RECOMMENDED, zero-risk) — judge the guard on
  the top deliberately-CHOSEN strategy, excluding baseline filler (analogous to gambler-free) → cooperator 27.5%
  PASSES; B — buff the under-tuned aggressor via the sim override layer so round-robins tighten (cooperator −3-5pp,
  no engine lever); C — real lever nerf, NOT recommended.** 5j: all 8 core bands HOLD 2-seed; report refreshed.
  **Remaining v3: dominance framing → Blood-Pact 5e re-tune (traitor hot 34%) → 3i UI port → V3-6 playtest.**
- **2026-06-29** — **V3-5 TUNING WAVE 2 (2-seed validated; commits `4710372`/`7bd4104`/`383a962`).** **5e
  loosened the capture rule** (a winning RAID may capture a co-located rival retainer even without its Warlord
  present; all other brakes intact) → captures **0.16→0.34/game** (2.1×, the rare-but-dramatic feel) and **all
  wave-1 core bands HOLD** (dark 21.3/20.1, attrition 26/28%, doom 15.7/14.6, rounds 10.9, per-count credible)
  with no compensating nudge. **5f gambit investigation (diagnosis only — added a deliberate/incidental metric
  split, byte-identical):** the headline ~39% gambit-fire is **~57% incidental** Keystone occupation; the
  **deliberate** claim rate is **~16.3%, already IN the 10–20% band**. Root cause of the incidental: the
  **dark's heart spawns ON the Keystone** (heart.ts), so ASSAULT_HEART convergers occupy the Keystone, get
  named, and win the gambit without a deliberate claim (~10.6pp of cheap incidental wins dominate the ~15%
  total gambit wins). The **no-dominance fail is PARTLY non-gambit**: removing the gambler drops top-archetype
  45→~34.5%, still >30% — the gambler-free top is the **COOPERATOR (~34%)**. **Open → wave 3:** gambit fix =
  A1 judge-on-deliberate (metric, zero-risk) vs A2 block incidental gambit wins (rule; fixes the heart/Keystone
  conflation) vs B win-gate (higher SK risk); PLUS the separate cooperator dominance (investigate like 5f).
  5g: all 5 core bands 2-seed stable; report refreshed.
- **2026-06-28** — **V3-5 TUNING WAVE 1 (2-seed validated; commits `bf396ac`/`f071719`/`a215461`; 5c made no
  change — honest).** **Core objective LANDED:** 5b disabled the Reckoning auto-pressure (`RECKONING_AUTOPRESSURE_NODES`
  1→0) + `BLIGHT_TO_ASH` 3→2 + `SPREAD_AMOUNT_BASE` 7→3 → dark win 25.2→**20.7/19.4%** (band, 2-seed stable),
  attrition share of dark-wins 75.7→**26.7/31.3%** (≤40 cap met), doom share 6.1→**15.2/13.3%** (co-primary),
  rounds 10.8, guards hold. **The hybrid call is met and pillar #1 ("doom is the map") is restored.** 5a made
  captures FIRE (intent-aware combat sizing + a default-AI capture economy; 0.01→**0.17/game**, 17.5×) but hit a
  **structural ceiling**: only 4 token-Holdings cap retainer supply (~1.5/game) and a retainer is capturable only
  while co-located with its Warlord — reaching the 0.5–2 band needs a board/§2/§5.1 change (more retainer supply).
  **Stable misses → WAVE 2:** (a) gambit-fire (gambler-free) **40%** + gambler dominance **43–46%** — 5c proved
  the seize-gate trades 1:1 against dark-win (cover 4→5 fixes gambit but pushes dark to 23%) and `GAMBIT_SURCHARGE`
  is inert (claimant races the Keystone, never pledges); the real fix is a true gambit **WIN-gate** and/or lowering
  the gambler archetype's `gambitAmbition`, possibly with a metric split (incidental vs deliberate Keystone hold).
  (b) captures-ceiling (above) — a USER design call. (c) Blood-Pact traitor hot **32–34%** / exposure low (the 5b
  doom-path fix fed the traitor's win) — deferred to a v3 5e-equivalent. **Two user calls open before wave 2.**
- **2026-06-28** — **V3-5 DESIGN DIRECTION SET (user call).** (1) Doom/attrition inversion → **HYBRID**: tune so
  doom and attrition are co-primary (target **attrition ≤ ~40% of dark wins**, doom share up from 6.1%) — keep the
  knockout stakes without burying the Keystone race; the main lever is weakening the Reckoning auto-pressure /
  elimination tempo (which both lowers dark-win AND lets games run long enough for the Blight to reach the
  Keystone). (2) Capture economy → **RARE BUT DRAMATIC**: fire a few times a game (**target ~0.5–2 captures/game**,
  up from 0.01) via `CAPTURE_MARGIN`/win-commit + a modest AI positioning nudge — a real scene, not a dominant loop.
  **V3-5 bands:** dark 18–22 pooled (from 25.2) + credible per-count 16–24; attrition ≤40% of SK-wins; gambit-fire
  10–20 (from 33.4) + no archetype >30% (gambler is 42.3); rounds 10–16; dead-time low (hold). Blood-Pact 5e deferred.
- **2026-06-27** — **Stage V3-4 COMPLETE — sim re-pointed + FIRST DIAGNOSTIC BASELINE** (commits
  `6ac25a1`/`3d6acaf`/`44f92f6`; baseline at `sim-results/sample-v3/REPORT.md`, 4200 games untuned, **NO
  tuning** — the v3 Stage-5a equivalent). `npm run sim:v3` works; v3 510 tests green, v2 451 green.
  **Headline (untuned):** dark win **25.2%** (band 18–22, too STRONG; per-count 2p 17.2 / 3p 31.5 / 4p 26.9),
  rounds 10.4 ✅, gambit-fire 33.4% (too HIGH), gambler archetype 42.3% (dominance guard FAIL). Endings:
  last_standing 28.7% / territory 26.7% / gambit 19.4% / attrition 19.1% / doom 6.1%. Dead-time OK (0 Whisper
  deposals, early-death 7.8%, mean earliest deposal r9.7/14). Comeback 65.1% (tips AWAY from snowball — not a
  turtle/snowball problem). **The V3-5 target list, prioritized:**
  1. **DESIGN CALL — the doom/attrition inversion** (highest): the dark wins **75.7% of its wins by attrition**,
     doom_complete only 6.1% of games — design pillar #1 ("doom is the map") is bypassed by the elimination /
     Reckoning auto-pressure killing the table before the Blight reaches the Keystone. Decide: accept a
     knockout-centric v3 (tune the dark to band, attrition stays primary) vs. restore doom-as-primary (weaken
     auto-pressure so the Blight→Keystone race is the dark's main win). Likely structural, not pure tuning.
  2. **Capture/ransom ~0** (0.01/game): the marquee mechanic is dead in sim — structural per 4b (a RAID needs
     rival-Warlord + rival-retinue + attacker co-located, and a barely-win commit rarely clears `CAPTURE_MARGIN`).
     Fix via `CAPTURE_MARGIN`/commit tuning + AI positioning; may need an engine look.
  3. Dark too strong at 3p/4p → tune down to 18–22 (intertwined with #1).
  4. Gambit too easy (fire 33.4%, gambler 42.3%) → raise the seize gate / surcharge.
  5. Blood-Pact traitor win 0% (doom path starved by #1) — deferred to a v3 5e-equivalent; helped by fixing #1.
- **2026-06-27** — **Stages V3-3d→3h COMPLETE — the v3 ENGINE is feature-complete** (commits
  `7b3fdb6`/`56a4199`/`e60f45c`/`a4811f9`/`5709c92`, second sub-agent pipeline run). **Independently verified:**
  `tsc --noEmit` PASS, `eslint src/v3 tests/v3` PASS, no real `Math.random`/`Date.now`/`: any` in `src/v3`,
  **v3 497 tests green**, **v2 451 green** (untouched). New modules: `capture.ts`, `elimination.ts`, `heart.ts`.
  Built: the capture economy (elect-one-effect, ROUT-as-tempo, RANSOM, guard cap), the strikePool + attrition +
  auto-pressure end-conditions, Death Bequest + Wraith, Kill-the-Dark (heart/assault/two-act), and the Blood-Pact
  v3 interactions. **Recorded debts (resolve-or-record):** (1) the strikePool is fed+decayed+**consumed via the
  Wraith card-add**, but a *baseline* "strikes draw from the pool" path (§5.5) is NOT wired — a deliberate
  V3-5/wiring decision (the wraith is currently the only conduit). (2) `STEWARD_INCOME` 1→2 to keep
  `STEWARD_DENIED_TRICKLE`=1 partial — **§13 P0-3 authoritatively softens §12 #7** (captor gains nothing; owner
  keeps a trickle); the spec §12 #7 row is annotated to match. (3) data/*.json drift + the v3 court/elimination
  tunables-as-literals carry forward (resync on the v3 `data/` split). **Next: 3i UI port → V3-4 sim.**
- **2026-06-26** — **Stages V3-3a/3b/3c COMPLETE** (commits `63eadb2`/`8d7f575`/`efb67ae`/`43c98b9`). Built by
  an orchestrated sub-agent pipeline (orchestrator workflow → per-stage coding+testing sub-agents, commit-on-green,
  red-halts). **Independently verified:** `tsc --noEmit` PASS, `eslint src/v3 tests/v3` PASS, **v3 431 tests
  green**, **v2 451 tests green** (untouched). Foundation = a faithful `src/v2→src/v3` clone; 3a retired Broken
  Court → elimination end-conditions (attrition + last-standing, depose-at-Dawn); 3b added the 4-archetype court;
  3c added Discovery determinism-first (pre-bound tokens + `observableState` + back-sigil). Recorded debt:
  `data/*.json` drift (inert) + the v3 court tunables pending a v3 `data/` split; `state.json` stays on v2 until
  the handoff machinery is v3-aware. **Next: 3d (capture & ransom).**
- **2026-06-26** — **v3 DESIGN sprint COMPLETE.** Ground-up redesign on paper (design-only): retire
  no-elimination/Broken Court → full elimination + a Shadowlord-style roster (court/discovery/capture/ransom/
  kill-the-dark). Four docs produced (`DESIGN-V3-CONCEPT`, `-FOCUS-GROUP`, `DESIGN-V3-ALGORITHM`,
  `-STRESS-TEST`). The stress-test (3 adversarial breakers) found the first pass over-fixed the snowball and
  built a turtle meta, and that two new subsystems (strikePool, the fog projection) were non-deterministic;
  **12 P0 fixes folded into ALGORITHM §13** (authoritative) + §12 rows #17–#26. v3 CODE sprint planned here.
  Next: sign off the build strategy (§2), commit the design docs, start V3-3a.
