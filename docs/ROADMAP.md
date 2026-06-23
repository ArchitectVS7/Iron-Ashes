# Iron Throne of Ashes — Roadmap & Resume Point

> **READ THIS FIRST to resume work.** This is the single entry point that survives context clearing.
> Last updated: 2026-06-21.

---

## 0. Where we are right now

**The design phase is COMPLETE and stress-tested. The next action is Stage 3 (code scaffolding) —
not started.** We have NOT written any new engine code yet; we have a full, hardened spec to build from.

The short story: the shipped v1 ("Iron Throne of Ashes") was a vibe-coded mess — broken UI, an
unreachable tutorial, 50 failing tests, and balance silently mutated by a broken ML bot. Rather than
patch it, we ran a 5-expert design focus group and did a **ground-up redesign of the game itself**. The
new design is settled, adversarially stress-tested, and documented. We are about to build the new engine.

**Immediate next action:** Stage 3a — scaffold the new engine (state shapes + a single `applyCommand`
reducer + a pure phase sequencer + determinism tests), reusing only the safe foundations (§Reuse below).

---

## 1. The game in one paragraph (orient a cold session)

**"Save the world, or take it."** A 30–45 min digital board game for 2–4 rival Warlords carving up a
dying kingdom while an autonomous, *telegraphed* AI villain (the Shadowking) **burns the map to permanent
ash** and hunts whoever leads. Each round: the villain **telegraphs** its next strike (aimed by name,
usually at the leader) → players **Pledge** cards toward a threshold to hold it back (partial = proportional
block, no veto; the leader's cards count for less; **open live in core, sealed in traitor mode**) → players
**act** (march, claim, raid, rescue-with-strings, heroic Last Stand) → **Dawn** (income, escalation). Doom
IS the map: the central **Keystone** is what the dark races to consume — if it's ashed, *everyone* loses.
You win by **territory lead** at a round cap, OR by the bold **Crown's Gambit** (hold the Keystone a full
round as the dark's named target). No elimination (Broken = an active comeback engine). A separable
**Blood Pact** hidden-traitor mode ships at launch.

---

## 2. Locked decisions (the spine — do not relitigate without explicit sign-off)

| Decision | Choice | Where |
|---|---|---|
| Doom model | **Doom IS the map** — Blight spreads node→node into permanent ash | ALGORITHM §2, §5.1 |
| Pledge (replaces voting) | **Open live window in core; sealed in Blood Pact**; both resolve deterministically | ALGORITHM §4.2 |
| Win condition | **Contested Throne + Gambit** — territory baseline + telegraphed Keystone-hold sudden-win | ALGORITHM §6 |
| Map | **Closing Ring with a steered front** — concentric, symmetric, 17 nodes, lateral mid-belt + Approach ZoC | ALGORITHM §2 |
| Traitor | **Full hidden-role Blood Pact at launch**, built as a separable mode flag over a self-contained core | ALGORITHM §10 |
| Leading is dangerous | **The Crown** = how you win + who the villain hunts + a defense surcharge | ALGORITHM §5.2 |
| No elimination | **Broken-with-teeth** — active comeback, recovery cap, debt-rescue, lost lands feed the dark | ALGORITHM §5.4 |
| Determinism | Whole game reproducible from a seed; one `SeededRandom`; AI decisions pure too | ALGORITHM §7 |

---

## 3. Document map (read order)

1. **`docs/ROADMAP.md`** — this file. Status + plan + how to resume.
2. **`docs/DESIGN-V2-ALGORITHM.md`** — ⭐ THE SPEC to code from. Hardened with stress-test fixes. Every
   turn, phase, mechanic, the determinism contract, the reuse map (§8), and the tunable list (§9).
3. **`docs/DESIGN-V2-STRESS-TEST.md`** — the pre-code punch list (P0/P1 folded into the spec; P2 = Stage-3 UI).
4. **`docs/DESIGN-V2-FOCUS-GROUP.md`** — Stage 1, the core idea and the panel synthesis (the "why").
5. **`docs/REDESIGN-ANALYSIS.md`** — why v1 failed; original reuse-vs-rebuild analysis.
6. **`docs/ML-SYSTEM-ANALYSIS.md`** — why the old ML harness was scrapped; what a sound one looks like.
7. (Reference) `docs/prd.md` = the OLD v1 PRD — historical; superseded by the v2 docs for mechanics.

---

## 4. The plan (stages → concrete steps → status)

Workflow defined with the user: **① idea → ② textual algorithm → ③ code → ④ ML training → ⑤ ML validation.**

- [x] **Stage 1 — Game idea / focus group** → `DESIGN-V2-FOCUS-GROUP.md`
- [x] **Stage 2 — Textual algorithm** → `DESIGN-V2-ALGORITHM.md`
- [x] **Stage 2.5 — Adversarial stress-test + fixes folded in** → `DESIGN-V2-STRESS-TEST.md`
- [ ] **Stage 3 — Build the new engine (from the spec).** Recommended order:
  - [x] **3a. Scaffold** — `GameState` shapes (ALGORITHM §2) + a single `applyCommand(state, cmd) → {state, events}`
    reducer + a pure phase sequencer (THREAT→PLEDGE→ACTION→DAWN) + determinism tests (§7). UI-less, headless.
    *Completed 2026-06-21. 9 source files in `src/v2/`, 5 test files (104 tests). Clean typecheck.*
  - [x] **3b. Layer A core mechanics** — Pledge (open) §4.2, Crown §5.2, ash-map/Blight §5.1, combat + Last
    Stand §5.3, Broken/Rescue §5.4, escalation acts §5.5, Shadowking policy §5.6, victory + Gambit §6.
    *All actors (human/AI/sim) route through the one reducer — no duplicate movement/claim logic.*
    *Completed 2026-06-22. 5 new modules (`blight`, `shadowking-policy`, `combat`, `actions`, `gambit`), 10 test files (260 tests). Clean typecheck.*
  - [x] **3c. AI players** — deterministic `f(state, seed)` for pledge + actions + (later) accusation.
    *Completed 2026-06-22. `src/v2/ai-player.ts`: pure `choosePledge`/`chooseAction` (fair-share pledge with
    a tunable free-rider lean; greedy economic actions via BFS) + `runAIPledge`/`runAITurn` drivers that route
    every decision through `applyCommand`. 11 test files (281 tests). Full AI-vs-AI games are seed-reproducible
    (§7.12). Accusation deferred to 3d with the rest of Blood Pact.*
  - [x] **3d. Layer B — Blood Pact** — sealed pledges, Suspicion Log, Audit, accusation (§10), behind the mode flag.
    *Completed 2026-06-22. `src/v2/blood-pact.ts`: sealed pledge reveal (PLEDGE_COMMITTED conceals amount/tier
    in blood_pact; real tiers → bounded Suspicion Log), the Audit action (`AUDIT`, costs banners, reveals one
    opponent's last pledge), and the full accusation lifecycle (initiate/vote/resolve → correct exposes the
    traitor & forfeits the doom win + pushes the front back; wrong vindicates & locks out; non-unanimous
    fizzles) + pure `f(state, seed)` AI choosers (suspicion-scored). 12 test files (304 tests). Competitive
    mode byte-identical.*
  - [x] **3e. UI — render-from-state** — readable board, persistent HUD, the P2 legibility items
    (`STRESS-TEST §P2`: threshold-beat pledge reveal, blightLevel pips, Gambit alarm, Crown-handoff beat,
    villain voice layer, Whisper-act onboarding). The old vanilla-TS UI is a debug/test harness only.
    *Completed 2026-06-22. `src/ui-v2/` (entry `index.html` → `main.ts`; old v1 harness preserved at
    `index-v1.html`): SVG Closing-Ring board (ownership, ash, blightLevel pips, Warlord/Crown/dark markers),
    persistent HUD/standings, phase panels (Threat telegraph, Pledge with Crown-discount-at-commit + threshold
    beat, Action with node-click MARCH + context verbs, Audit/Accuse for Blood Pact), Gambit alarm, villain
    voice narration, Whisper-act coach. Renders from GameState; all input via `applyCommand`. tsc + `vite build`
    clean; 13 test files (307, incl. 3 headless session-driver tests). UI is outside the verify lint/test scope
    (verify with `npm run dev`).*
  - [x] **3f. Spec-parity reconciliation** — a pre-Stage-4 review (5 audit passes) found several spec-critical
    mechanics stubbed/dead/missing behind the green suite; this stage builds them to spec so the Stage-4 sim
    measures the REAL designed game (per `ML-SYSTEM-ANALYSIS.md`).
    *Completed 2026-06-22. Built: the **anti-free-rider reward** (§4.2 step 5 — contributor land-shielding +
    persistent FAVOR grudge-reduction; was entirely absent); the **Gambit Keystone guardrail** (§6 — a
    garrisoned Keystone can't be blighted by any source; strike redirects to the adjacent ring; was dead code);
    **Last Stand wired into live combat** (§5.3 — deterministic defender reversal; was dead code); the full
    **Shadowking effect table** (§5.6 — SPREAD/SURGE/SEIZE/MARCH_DK/RAID_DK/REAP now actually fire + DK
    maneuver; effect was computed-then-discarded); the **Rescue binding debt** (§5.4 — forced-min pledge in open
    modes + withheld-attack, cleared at expiry; was an unenforced event detail); fixed the **warlord-power 3→2
    march bug** and the **FORGE_WEIGHT literal desync**; corrected the steered front to the Crown quadrant
    (§5.6). Replaced the Last-Stand false-confidence test. 14 test files (**323**, +16 spec-parity), typecheck +
    lint clean, deterministic. NOTE: this supersedes the 3b completion notes that claimed Last Stand / Rescue /
    Shadowking policy done — they were partial until 3f.*
- [ ] **Stage 4 — ML/sim harness** — a deterministic Monte-Carlo balance/strategy validator on the REAL
  reducer + REAL AI across DIVERSE archetypes (NOT a parallel rules path, NOT one greedy bot). Plan in
  `docs/handoff/plan-stage4.md` (mirror of the approved plan). NO neural RL (the failed v1 path).
  - [x] **4a. Extract the headless driver** — one canonical `playHeadlessGame(cfg)` in `src/v2/sim/driver.ts`,
    parameterized by per-seat `AIPolicy`; replaces the duplicated `playFullGame` loop. §7.12 byte-identical
    determinism preserved. *Completed 2026-06-22. `tests/v2/ai-player.test.ts` delegates to it; new
    `tests/v2/sim-driver.test.ts` (5 tests). 328 tests green.*
  - [x] **4b. Archetypes** — extend `AIPolicy` with additive strategy knobs (default-preserving via a
    referential-identity guard) + `src/v2/sim/archetypes.ts` roster (baseline/aggressor/turtle/opportunist/
    cooperator/gambler; saboteur deferred to 4f); wire RAID/RESCUE/Gambit action branches.
    *Completed 2026-06-22. `AIPolicy` gained 7 optional knobs (neutral = baseline); `chooseAction` dispatches
    to the untouched legacy body for DEFAULT_AI_POLICY (referential guard) → 328 baseline tests + §7.12 stay
    byte-identical. `tests/v2/sim-archetypes.test.ts` (13). The mixed-archetype safety net caught 2 latent
    bugs baseline never hit: choosePledge ignored the rescue-debt forced-minimum (→ reducer rejected the
    pledge), and the driver force-pass dispatched on a game ended mid-turn by combat — both fixed. 338 green.*
  - [x] **4c. Matchups + sweep** — `src/v2/sim/matchups.ts` (homogeneous / mixed / round-robin / one-vs-field)
    + `src/v2/sim/sweep.ts` over seeds × playerCount × mode × matchup; fast smoke-sweep test.
    *Completed 2026-06-22 (with 4d/4e). 27 matchups; deterministic SweepRow[]; `tests/v2/sim-sweep.test.ts`.*
  - [x] **4d. Metrics + report** — `src/v2/sim/metrics.ts` (pure, from state + actionLog) + `report.ts`
    (PASS/FAIL vs §9 + win-rate-by-archetype + free-rider verdict). Unit-tested on fixtures.
    *Completed 2026-06-22. `tests/v2/sim-metrics.test.ts` + `sim-report.test.ts`.*
  - [x] **4e. CLI + run** — `scripts/sim.mjs` + `npm run sim` (tsc → run dist/) → `sim-results/<runId>/`
    {rows,summary}.json + `REPORT.md`. *Completed 2026-06-22. Ran a 3240-game sweep (40 seeds × 27 matchups ×
    2/3/4p). FINDINGS at untuned defaults (sample in `sim-results/sample/REPORT.md`): Shadowking win 15.3%
    (target 18–22%, slightly weak); rounds 11.6 ✅; **Gambit fires 49%** (target 10–20%) and **gambler wins
    50.2%** vs 26.4% even-share → the Crown's Gambit is the dominant strategy and the #1 Stage-5 tuning target;
    rescues 0.2/game (target 2–4, far too rare); **free-riding NOT rewarded** ✅ (the 3f anti-free-rider reward
    works). 19 test files, 349 green.*
  - [x] **4f. Blood Pact + v1 cleanup** — saboteur archetype + sim-only AI-traitor affordance + accusation
    driving + traitor metrics; then the `ml_training/` disposition (delete dead PPO/venv/parallel-sims,
    archive reports) — confirmed before deleting.
    *BP sim DONE 2026-06-22: `saboteurPledgeSuppression` knob (active only when holding the Pact), `saboteur`
    archetype, driver `bloodPactSeat` affordance + AI accusation driving (pure `chooseAccusation`/Vote), traitor
    metrics, `npm run sim -- --bloodpact`. BP sweep (`sim-results/sample/BLOOD_PACT.md`): traitor exposed 70.8% /
    wins 6.7%, **accusation accuracy 20.3%** (AIs over-accuse innocents — a Stage-5 target). v1 cleanup DONE
    (user-approved): deleted the dead PPO/venv (750MB)/parallel-sims; archived the plan + reports + the 2 result
    JSONs to `docs/archive/ml_training-v1/` marked INVALIDATED; `ml_training/` removed. 352 green. **Stage 4 complete.***
  - [x] **4g. Pre-balance hardening** — a data-trust + mechanics-logic review (user-requested) found the sweep
    numbers were confounded by combat-fidelity gaps, and surfaced logic issues. Fixed BEFORE math-tuning so
    Stage 5 tunes trustworthy data. *Completed 2026-06-22.* **P0 fidelity:** value-aware combat commits
    (`chooseCombatCommit` — was an arbitrary `hand[0]`, which biased every combat metric by draw order) +
    pledges now spend the LOWEST-value cards (keep the best for combat). **P1 logic:** Death Knight respawn on
    Act escalation (was: 2 kills permanently disabled MARCH_DK/RAID_DK) + fixed the player-index/quadrant
    aliasing in SK targeting + documented the PUSHBACK/DAWN_BLIGHT_ADVANCE tuning constraint. **P2 data-file:**
    `CARD_VALUE_MIN/MAX` (card range was hardcoded — a core lever), ash literal → `BLIGHT_TO_ASH`, stale
    Gambit-stacking comment fixed. **AI contestation:** a `gambitContest` knob so archetypes race to/raid a
    gambiteer. **KEY RESULT — the data is now trustworthy AND correctly interpretable:** the "Gambit OP (49%)"
    headline was an artifact — *without a dedicated gambler archetype the gambit fires 16%* (in §9 band); the
    mechanic is fine, the aggregate was inflated by the gambler stress-archetype. Trustworthy Stage-5 targets
    now: SK win 14.3% (genuinely a bit weak), rescues 0.1/game (break/rescue economy under-fires), accusation
    accuracy 20.5% (AIs over-accuse). Free-riding NOT rewarded ✅ (robust). 21 test files, **359 green**;
    samples refreshed in `sim-results/sample/`.
- [ ] **Stage 5 — Balance validation** — math-tune `src/v2/tunables.ts` to the §9 bands using the sim as
  the instrument. Approved plan: goals/metrics/corrective-actions, phased 5a–5f. Targets: SK win 18–22%,
  10–16 rounds, gambit 10–20% (gambler-free), 2–4 rescues/game; guardrails (no dominant strategy, free-riding
  not rewarded) hold; stable across 2/3/4p + 2 seeds. Ratified Blood-Pact bands: traitor win 12–20%, accusation
  accuracy ≥45%, ≤2.5 accusations/game, exposure 40–70%.
  - [x] **5a. Diagnostics** — add tuning diagnostics to `src/v2/sim/metrics.ts` + `report.ts` (gambler-free
    gambit rate, breaks/game, conditional rescue rate, DK-kill rate, doom progress, pledge full-block rate,
    per-Act + **per-player-count split**); re-run the baseline; commit the richer "before" REPORT. NO tunable
    changed. *Completed 2026-06-22. 21 files, 360 green.* **The diagnostics already surfaced the real targets the
    pooled numbers hid: SK win is 2p 29% / 3p 12% / 4p 1.9% (a doomCost player-count-SCALING problem), and DK
    kills = 0.00/game (players never engage the dark's forces → pushback/grudge dormant). Gambler-free gambit is
    27% (somewhat above the 10–20% band, driven by opportunist/aggressor gambitAmbition).**
  - [x] **5b. Injectability + search harness** — per-run tunable overrides + the coordinate-descent core.
    *Completed 2026-06-22.* Built a scoped `withTunables()`/`getTunables()` seam in `src/v2/tunables.ts`
    (chosen over a GameState field to avoid the JSON-clone-drops-functions problem + signature churn); plumbed
    `tunables?: Partial<Tunables>` through `GameRunConfig`→`playHeadlessGame` (wraps the game in `withTunables`)
    and `SweepConfig`→`runSweep`; added `tuningLoss()` (Σ band-violations + heavy guardrail penalty) and
    `src/v2/sim/search.ts` `runTunableCandidates()` (ranks candidate tunable-sets). `tests/v2/sim-tunables.test.ts`:
    **bit-for-bit determinism** (no-override === current, §7.12), overrides take effect + are deterministic +
    leak-safe. `docs/handoff/stage5-tuning-log.md` scaffold + the 5a baseline block. 22 test files, **369 green**.
    *Scope: `Tunables` lists ONLY wired levers (no silent no-op) — 5b wires the **doomCost curve**
    (DOOM_COST_WHISPER/MARCH/RECKONING + DOOM_COST_PLAYER_DIVISOR — the #1 5c target). 5c-5e extend `Tunables` +
    convert each lever's call sites as they tune it (blight/DK for 5c, break/rescue for 5d, BP for 5e).*
  - [x] **5c. Tune the dark** — LOCKED `DOOM_COST_WHISPER/MARCH/RECKONING` 3/5/8→6/9/12, `DOOM_COST_PER_PLAYER`
    0→6, `SPREAD_AMOUNT_BASE` 2→5. **SK win 14.3%→20.2% ✅** (band 18–22), rounds 11.52 ✅, guards held,
    2-seed-stable (s20260622 + s13371337). 4p lifted 1.9%→7.9%. ⚠️ **Per-count ±5pp is STRUCTURALLY
    unreachable by numbers** (2p 34.6 / 3p 17.9 / 4p 7.9 — proven across 5 grids / ~120k games): pledge
    supply scales with player count, so co-op is inherently easier with more allies. Full 4p closure needs
    a MECHANIC change (pledge-effectiveness decay / super-linear strike threshold) — **escalated to user**,
    not a number. Evidence: `docs/handoff/stage5-tuning-log.md` §5c.
  - [x] **5-dark. Dark Engagement mechanic patch + retune** — the reconvened focus group
    (`DESIGN-V2-FOCUS-GROUP-R2.md`) ruled the dormant DK-engagement pillar an INVERTED incentive; the patch
    (`DESIGN-V2-DARK-ENGAGEMENT.md`) added the Hunt verb (AI `darkHuntBias` + cards-aware `canStrikeWin`),
    win-currency DK-kill auto-claim, asymmetric grudge Mark (`GRUDGE_MARK_TOP_N`, `territoryRank`), and
    DK-blocks-claim. **DK-kills 0.00→2.05** (pillar alive); a retune (`scripts/tune-5dark.mjs`) LOCKED
    `SPREAD_AMOUNT_BASE` 5→4 + `DK_PER_PLAYER` 1→0 (army scaling BACKFIRES once kills pay). **SK-win 20.5% ✅**
    (band, 2-seed stable), per-count 30.9/21.8/8.9 (gradient 26.7→22.0pp, flatter), guards PASS, 379 tests.
    The per-count A/B fork is now decidable on this data. Evidence: tuning-log §5-dark. *Completed 2026-06-22.*
  - [ ] **5d. Tune the rescue/break economy** — raise breaks + rescue uptake (BREAK_THRESHOLD, RESCUE_COST, AI
    rescueWillingness; consider engaging the dormant DKs) → rescues 2–4, all_broken < ~5%.
  - [ ] **5e. Blood Pact** — fix the chooseAccusation relative-gap heuristic + ACCUSATION knobs → accuracy ≥45%,
    ≤2.5 accusations/game, traitor win 12–20%, exposure 40–70%.
  - [ ] **5f. Final validation + lock** — 2-seed stability; all bands + guards + per-count + BP pass; LOCK
    values; update `DESIGN-V2-ALGORITHM.md §9` placeholder → FINAL + the AI-ceiling/human-playtest caveat.

---

## 5. Reuse vs. rebuild (rule: reuse only when refactor ≤ writing fresh)

From ALGORITHM §8 + REDESIGN-ANALYSIS. The new mechanics differ enough from v1 that most *systems* are
fresh, but the *foundations* are directly reusable.

| v1 asset | Verdict | Note |
|---|---|---|
| `src/utils/seeded-random.ts`, `src/utils/pathfinding.ts` | **REUSE as-is** | Clean, foundational. |
| `src/gll/` (registry, types) + `content/` packs | **REUSE as-is** | The engine's best idea; keep. |
| `src/models/board.ts` (BoardDefinition/Node, BFS, validation) | **REUSE the machinery, REPLACE the node data** | New 17-node Closing Ring topology + lateral links + ZoC + ash state. The graph/validation code is reusable; refactor < rewrite. |
| `src/models/game-state.ts` | **REWRITE** | New state shape (ALGORITHM §2); reference the old constants file but the model changed substantially. |
| `src/engine/game-loop.ts` (phase machine) | **REFACTOR** → pure THREAT/PLEDGE/ACTION/DAWN sequencer | Salvage the structure; new phases. |
| `src/systems/*` (voting, doom-toll, combat, shadowking, broken-court, victory, resources, etc.) | **REBUILD** | Mechanics changed (Pledge, ash-map, Crown, Gambit, policy). Consolidate all movement/claim/combat into the ONE reducer — kills the 3–4 duplicate copies. |
| `src/systems/ai-player.ts` | **REFACTOR** | New action/pledge space; must be pure `f(state, seed)`. |
| `src/ui/game-controller.ts` (1196 lines, 5 jobs) | **REBUILD** | Split driver / orchestrator / AI-runner / netcode; render-from-state. |
| `src/ui/board-renderer.ts` | **REBUILD** | Readable Closing-Ring layout; legible affordances. |
| `src/ui/*` panels, social-pressure onboarding | **REBUILD / drop the essay** | Teach in-context (Whisper act). |
| `ml_training/ugt_env.ts`, PPO model + checkpoints, `ugt.config.yaml` | **SCRAP** | Degenerate agent, never won, non-deterministic. (ML-SYSTEM-ANALYSIS.) |
| `ml_training/simulate_batch.ts` | **REBUILD on the reducer** | Right shape, wrong (parallel) rules path. |
| `src/index.ts` engine barrel | **REWRITE** as the new public API surfaces. |
| Existing test suite (50 failing) | **REPLACE** | Anchors the OLD design; write fresh tests against the new spec. Do not spend effort greening the old suite. |

---

## 6. Known risks / parked questions

- **PRIMARY:** Is the Pledge **free-rider incentive** solved? (ALGORITHM §4.2 step 5.) Must be proven in
  Stage-5 sim before the design is trusted. Candidate fixes are in the spec; ML decides.
- The 17-node production base is thin (8 production nodes) — watch the Crown for thrashing; add node
  `developmentLevel` if it thrashes (STRESS-TEST P2 / 40K H5).
- The old test suite is RED and stays red until replaced — this is expected (it tests v1).
- Pre-existing uncommitted v1 WIP exists in the working tree (CLAUDE.md, index.html, board-renderer.ts,
  game-controller.ts, event-feed.*) — **unrelated to this redesign; left untouched.** Don't assume it's ours.

---

## 7. How to resume (fresh session checklist)

**Follow the full protocol in `docs/AGENT-PROTOCOL.md` — it is the enforced Definition of Done.**

1. Run **`npm run handoff:check`** (confirms a clean, verified, committed baseline; if it fails, fix the
   previous handover first), then read **`docs/handoff/state.json`** — the machine source of truth for
   status (`currentStage`, `nextAction`, `specRefs`, `invariants`, `gotchas`).
2. Read this file (§2 locked decisions; §4 — the first unchecked box equals `state.currentStage`) and the
   `specRefs` sections of `docs/DESIGN-V2-ALGORITHM.md`. (Right now: **Stage 5-dark — Dark Engagement mechanic
   patch + retune COMPLETE & LOCKED** (`docs/DESIGN-V2-DARK-ENGAGEMENT.md`, `docs/DESIGN-V2-FOCUS-GROUP-R2.md`):
   DK-kills 0.00→2.05, SK-win re-locked to 20.5% (band, 2-seed stable), per-count gradient flatter
   (26.7→22.0pp), 379 tests green. **NEXT: settle the per-count A/B fork on the new data (FOCUS-GROUP-R2 §3),
   THEN Stage 5d rescue economy (same win-currency template — rescues still 0.07).**)
3. Build through the one `applyCommand` reducer; keep everything deterministic (§7); write tests as you go.
4. **Definition of Done (enforced):** `npm run verify` exits 0 → update `state.json` + §4 box + §8
   changelog + the memory file → commit → `npm run handoff:check` exits 0. See `docs/AGENT-PROTOCOL.md`.

---

## 8. Changelog / decision log

- **2026-06-21** — v1 analyzed (`REDESIGN-ANALYSIS`); old ML harness analyzed & scrapped (`ML-SYSTEM-ANALYSIS`).
- **2026-06-21** — Stage 1 focus group (5 experts) → core idea settled (`DESIGN-V2-FOCUS-GROUP`).
- **2026-06-21** — Stage 2 textual algorithm written (`DESIGN-V2-ALGORITHM`).
- **2026-06-21** — Forks decided by lead designer: doom=map; pledge=sealed→**revised to open-core/sealed-traitor**;
  traitor=full at launch; win=Contested Throne + Gambit; map=Closing Ring.
- **2026-06-21** — Stage 2.5 stress-test (5 experts, unanimous "fix-then-code") → P0/P1 fixes folded into the spec.
- **2026-06-21** — Roadmap created; design docs committed before scaffolding.
- **2026-06-21** — **Stage 3a complete.** 9 source files in `src/v2/`, 5 test files (104 tests, all green).
  New engine scaffold: types, board (17-node Closing Ring), commands, events, reducer (`applyCommand`),
  sequencer (THREAT→PLEDGE→ACTION→DAWN), setup (`createGame`), tunables, barrel export.
  Determinism contract (§7) proven. Typecheck clean. v1 code untouched.
- **2026-06-22** — **Stage 3b complete.** Layer A core mechanics added: `blight` (ash-map), `shadowking-policy`
  (telegraphed villain + grudge + voice lines), `combat` (sealed-commit + Last Stand), `actions`
  (MARCH/CLAIM/RAID/STRIKE/RESCUE/RECRUIT — all via the one reducer), `gambit` (Crown's Gambit + territory
  tiebreakers). 14 source + 10 test files, **260 tests green**, typecheck clean, deterministic.
- **2026-06-22** — **Stage 5c (tune the dark) complete.** Wired the remaining 5c lever cluster
  (SPREAD/DAWN/BLIGHT_TO_ASH/PUSHBACK + DK scaling) through `getTunables()`, then ran a coordinate-descent
  search (5 grids, ~120k games, `scripts/tune-5c.mjs`). LOCKED `DOOM_COST_*` 3/5/8→6/9/12,
  `DOOM_COST_PER_PLAYER` 0→6, `SPREAD_AMOUNT_BASE` 2→5: **SK win 14.3%→20.2%** (band 18–22), rounds 11.52,
  both guards held, 2-seed-stable. **Key finding: per-count ±5pp flatness is STRUCTURALLY unreachable by
  number-tuning** — pledge supply scales with player count, so 4p caps ~8% (lifted from 1.9%) while 2p sits
  ~35%; closing it needs a mechanic change (escalated to user). DK scaling proved a dead lever (players never
  engage the dark). 22 files, **373 green**. Next: 5d (rescue/break economy).
- **2026-06-22** — **Stage 5b (injectability + search harness) complete.** Built a scoped
  `withTunables()`/`getTunables()` seam (lower-risk than a GameState field — no JSON-clone/function issue, no
  signature churn) so the sim can vary tunables per run; plumbed overrides through GameRunConfig/SweepConfig;
  added `tuningLoss()` + `src/v2/sim/search.ts` `runTunableCandidates()` (the coordinate-descent core). A
  bit-for-bit determinism test proves the no-override path is byte-identical (§7.12). The doomCost curve (the
  #1 5c lever) is wired now; later sub-stages extend the wired set. `docs/handoff/stage5-tuning-log.md` scaffold
  created. Verify: 22 files, **369 passed**. Next: 5c (tune the dark — fix the doomCost player-count scaling).
- **2026-06-22** — **Stage 5 planned + 5a (diagnostics) complete.** Approved Stage-5 plan (goals/metrics/
  corrective-actions, phased 5a–5f). 5a added tuning diagnostics to the sim report (gambler-free gambit rate,
  breaks/game, conditional rescue rate, DK-kill rate, doom progress, pledge full-block rate, per-Act + per-
  player-count split) and re-ran the baseline — NO tunable changed. **The diagnostics immediately exposed what
  the pooled 14.3% SK-win hid: SK win is 2p 29% / 3p 12% / 4p 1.9% (a doomCost player-count-SCALING bug — the
  dark is unwinnable at 4p), and DK-kills = 0.00/game (players never engage the dark's forces). These are the
  real 5c targets.** Verify: 21 files, **360 passed**. Next: 5b (injectability + search harness).
- **2026-06-22** — **Pre-Stage-5 review + Stage 4g (hardening) complete.** A data-trust + mechanics-logic
  review (user-requested) found the sweep numbers were confounded: combat auto-committed `hand[0]` (draw-order
  noise biasing every combat metric), pledges discarded cards by position not value, and the "Gambit OP" finding
  was an AI-contestation artifact (gambler won 100% vs passive archetypes, 34% vs an aggressor). Fixed BEFORE
  tuning: value-aware combat commits + pledge-lowest-value (P0), DK respawn on escalation + index-aliasing fix +
  documented PUSHBACK/DAWN constraint (P1), `CARD_VALUE_MIN/MAX` + ash-literal + comment (P2 data-file), and a
  `gambitContest` AI knob. Re-swept: **the gambit is fine in normal play (16% without a dedicated gambler — in
  band)**; trustworthy targets are now SK win 14.3% (weak), rescues 0.1 (under-fires), accusation accuracy 20.5%.
  Free-riding still NOT rewarded. Verify: 21 files, **359 passed**. Next: Stage 5a (math-tuning on trusted data).
- **2026-06-22** — **Stage 4f complete → STAGE 4 DONE.** Blood Pact sim: `saboteur` archetype +
  `saboteurPledgeSuppression` (active only when holding the Pact) + driver `bloodPactSeat` sim-affordance +
  per-round AI accusation driving (pure choosers) + traitor metrics + `npm run sim -- --bloodpact`. BP sweep
  (360 games): traitor exposed 70.8% / wins 6.7%, accusation accuracy 20.3% (over-accusing — Stage-5 target).
  Then the user-approved **v1 `ml_training/` disposition**: deleted the dead PPO models / 750MB venv /
  parallel-rules sims / Python; archived the plan + boilerplate reports + the 2 result JSONs to
  `docs/archive/ml_training-v1/` (marked INVALIDATED); removed `ml_training/`. The v2 sim (`src/v2/sim/`,
  `npm run sim`) fully replaces it. Verify: 20 files, **352 passed**. Next: Stage 5a (tune to §9 — nerf the Gambit).
- **2026-06-22** — **Stage 4c/4d/4e complete — the balance harness runs.** `src/v2/sim/` gained
  matchups (homogeneous/mixed/round-robin/one-vs-field), `runSweep`, pure `computeMetrics` (from state +
  actionLog), and a PASS/FAIL report (§9 + win-rate-by-archetype + free-rider). `scripts/sim.mjs` (`npm run
  sim`) builds + runs a sweep → `sim-results/<runId>/`. First real run: **3240 games** (40 seeds × 27 matchups
  × 2/3/4p). Results at untuned defaults: Shadowking 15.3% (target 18–22%), rounds 11.6 ✅, **Gambit 49% fire /
  gambler 50.2% win → dominant strategy (#1 Stage-5 fix)**, rescues 0.2 (too rare), **free-riding NOT rewarded
  ✅** (3f reward works). Sample report committed at `sim-results/sample/REPORT.md`. Verify: 19 files, **349
  passed**. Next: 4f (Blood Pact saboteur + v1 `ml_training/` cleanup).
- **2026-06-22** — **Stage 4b complete.** Archetype-parameterized AI: 7 additive `AIPolicy` knobs
  (pledgeGenerosity/aggression/raidLeaderBias/defensiveness/claimVsRaidPref/gambitAmbition/rescueWillingness),
  neutral = baseline; `chooseAction` keeps the DEFAULT path byte-identical via a referential-identity guard
  and adds RAID/RESCUE/Gambit/hunt branches for archetypes. `src/v2/sim/archetypes.ts` roster
  (baseline/aggressor/turtle/opportunist/cooperator/gambler). The mixed-archetype termination safety net
  caught 2 real latent bugs (choosePledge ignored the rescue-debt forced-min; driver force-pass ran on a
  combat-ended game) — both fixed. Verify: 16 files, **338 passed** / 0 failed. Next: 4c (matchups + sweep).
- **2026-06-22** — **Stage 4 planned + 4a complete.** Approved plan (`docs/handoff/plan-stage4.md`): a
  deterministic Monte-Carlo balance validator on the REAL reducer + REAL AI across diverse archetypes (no
  neural RL — the failed v1 path). **4a** extracted the duplicated full-game loop into one canonical
  `playHeadlessGame(cfg)` (`src/v2/sim/driver.ts`), parameterized by per-seat `AIPolicy`;
  `tests/v2/ai-player.test.ts` delegates to it and the §7.12 byte-identical determinism test still passes.
  Verify: 15 files, **328 passed** / 0 failed, typecheck + lint clean. Next: 4b (archetypes).
- **2026-06-22** — **Pre-Stage-4 review + Stage 3f complete.** A 5-pass audit (determinism, mechanics
  conformance, structure/deps, test honesty) confirmed the architecture (single reducer, determinism, no v1
  imports, render-from-state UI) is sound, but found the green suite masked spec-critical gaps: the
  anti-free-rider reward (§4.2 step 5, the design's #1 balance risk) was entirely absent; the Gambit
  Keystone guardrail and Last Stand were dead code; the Shadowking effect table was computed-then-discarded
  (one real behaviour); the Rescue debt was unenforced; plus a warlord-power march bug and a FORGE_WEIGHT
  desync. **Stage 3f** built all of these to spec (`src/v2/shadowking-effects.ts` + edits across blight /
  combat / actions / sequencer / reducer / gambit / tunables / types). Verify: 14 files, **323 passed** / 0
  failed, typecheck + lint clean. The engine now matches the v2 design before the sim is built on it. Next: 4a.
- **2026-06-22** — **Stage 3e complete.** Render-from-state UI (`src/ui-v2/`): SVG Closing-Ring board with
  ownership/ash/blightLevel pips + Warlord/Crown/dark markers, persistent HUD + standings, phase panels
  (Threat telegraph, Pledge with Crown-discount-at-commit + threshold beat, Action with node-click MARCH +
  context verbs, Blood-Pact Audit/Accuse), Gambit alarm banner, villain voice narration, and a Whisper-act
  onboarding coach. The `GameSession` driver routes every input through `applyCommand`; `index.html` repointed
  to the v2 UI (old v1 harness preserved at `index-v1.html`). Verify: 13 files, **307 passed** / 0 failed
  (incl. 3 headless session-driver tests), typecheck + lint pass; `vite build` clean. UI is outside the
  verify lint/test scope — `npm run dev` to play. Roadmap §4 restructured: Stages 4/5 given `4a`/`5a` boxes so
  the handoff-check stage regex resolves. Next: 4a (sim harness).
- **2026-06-22** — **Stage 3d complete.** Layer B — Blood Pact (`src/v2/blood-pact.ts`), behind the mode
  flag: sealed pledge reveal (`PLEDGE_COMMITTED` conceals amount/tier; real tiers feed a bounded Suspicion
  Log), the `AUDIT` action (banner cost → reveals one opponent's last pledge), and the accusation lifecycle
  (initiate → unanimous vote → resolve: correct exposes the traitor & forfeits their `doom_complete` win &
  pushes the front back; wrong vindicates the accused & locks out; non-unanimous fizzles) with pure
  `f(state, seed)` AI deduction choosers. Competitive mode is byte-identical (verified by the unchanged 281).
  Verify: 12 files, 304 passed / 0 failed, typecheck+lint pass. Next: 3e (UI — render-from-state).
- **2026-06-22** — **Stage 3c complete.** Deterministic AI player (`src/v2/ai-player.ts`): pure
  `choosePledge` (fair-share vs. threshold, harder if named/struck, tunable free-rider lean) + `chooseAction`
  (greedy economic: STRIKE-if-favorable → CLAIM → BFS-MARCH toward the best claimable → PASS), both pure
  `f(state, seed)` (§7.9); `runAIPledge`/`runAITurn` drivers route through the one `applyCommand`. Fixed a
  last-player ACTION-pointer quirk (loop must stop on `actionsRemaining===0`, not just the seat index).
  Verify: 11 files, 281 passed / 0 failed, typecheck+lint pass. Next: 3d (Layer B — Blood Pact).
- **2026-06-22** — Handover audit + cleanup. Triaged the v2 suite: 1 real code bug (`pledgeHistory` stored
  in submission order → now seat order, determinism §7.2) + 7 stale/incorrect tests — including an
  infinite-loop test helper (`passAllActions`) that had prevented the suite from ever completing (so the
  earlier "all green" was never actually observed). All fixed → 260 green. Removed unused-import lint
  errors (0 v2 lint errors). Memory refreshed; stale `AGENTS.md` (a verbatim v1 copy) deleted.
