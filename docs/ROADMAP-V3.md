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

**Immediate next action:** **Stage V3-5 (balance) — but two findings need a DESIGN CALL first** (see §8
2026-06-27 V3-4 baseline). The v3 **ENGINE is feature-complete and the sim runs** (Stages V3-3a→3h + V3-4
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
`state.json` still tracks **v2** (its `handoff:check` is wired to `ROADMAP.md`); repoint it to v3 only when the
handoff machinery is made v3-aware or v3 promotes — tracked here in §4/§8 meanwhile.

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
- [ ] **Stage V3-3 — Build the v3 engine (from the spec; §13 is the checklist).** Recommended order:
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
  - [ ] **3i. UI — render-from-state** — port `src/ui-v2`; add the new controls + the **mandated legibility**
    (Exposure meter, pre-commit combat-margin, the "Hold" rail, the capture/heart scene beats — §13 P0-11).
- [ ] **Stage V3-4 — Sim harness** — port `src/v2/sim/` to the v3 reducer + AI; new archetypes that exercise
  capture/ransom/discovery/heart/wraith. **New metrics (ALGORITHM §9):** captures/game, ransoms/game,
  elimination-timing distribution, **spectator dead-time** (flag any human eliminated before
  `ROUND_CAP × DEAD_TIME_FLOOR`), Kill-the-Dark fire rate, the snowball↔turtle balance, an attachment proxy
  (capture→ransom-back rate).
- [ ] **Stage V3-5 — Balance validation** — re-tune `tunables` (v3) to bands. ⚠️ **Re-validate the Shadowking
  win-rate FROM SCRATCH** — retiring `all_broken` changed a dark win-path; do NOT assume v2's 18–22% transfers.
  Watch the three load-bearing metrics (snowball↔turtle, captures/elimination-timing, dead-time) from sweep #1.
  Set a **design-level per-turn time budget** (the RAID elect-chain × 4 archetypes inflation risk).
- [ ] **Stage V3-6 — UI polish + human playtest** — walk a v3 `human-playtest-checklist.md` (the elimination
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
