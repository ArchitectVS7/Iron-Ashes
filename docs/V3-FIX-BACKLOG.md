# v3 Fix Backlog — running to-do (the cross-session reference)

> **Purpose:** the durable, referenceable to-do list from the 2026-07-01 second-pass design review
> (`DESIGN-REVIEW-V3-SECOND-PASS.md`). Each item: the gap, the problem statement, the recommended fix, and
> the **integrations** it touches (engine / UI / sim / tests / docs). **Update the Status column as items
> land; log completions in `ROADMAP-V3.md §8`.** If context is cleared, resume from this file + ROADMAP §8.
>
> Baseline at creation: branch `v3-redesign`, v3 586 tests green, v2 451 green, both modes balance-locked
> (competitive dark 21.4% / BP traitor ~17%), UI functional/unstyled, full UI revision still planned.
> **Standing guard for EVERY item:** v2 untouched; determinism (§7 D1–D9); locked balance either
> byte-identical or re-validated 2-seed with the change logged in ROADMAP §8.

Legend: ☐ open · ◐ in progress · ☑ done · ✗ rejected/recorded-out

---

## TIER 1 — pre-playtest (protects the playtest's validity)

### T1-1 ☑ Persist + surface retainer names (review drift D5) — **HIGHEST**
- **Problem:** Discovery draws a seeded name, shows it once in the flip event, then drops it — no `name` on
  `CourtPiece`, Hold rail shows `marshal-2-1`. The playtest's attachment items (checklist #3/#5) would be
  falsified by a missing cosmetic, not a real design failure. The spec mandates names as *state* (§2).
- **Fix:** add `name` (+ a seeded one-line `identity`) to `CourtPiece`; copy from the pre-bound token at
  recruit; give starting Warlords their faction name; surface in the court panel, Hold rail, and
  capture/ransom/bequest beats & events.
- **Integrations:** engine (`types.ts`, `court.ts`, `discovery.ts`, `events.ts`) · UI (`view.ts` court
  panel/Hold rail/scene beats) · tests (parity + a name-persistence test) · sim (names are cosmetic state —
  **summary must stay byte-identical**) · docs (none).
- **Status:** ☑ DONE 2026-07-01 (W1) — `name`+`identity` on `CourtPiece` (token-bound / faction-fixed /
  faction-voice Herald; identity = pure `identityFor(name)`, no stream draw); surfaced in court panel,
  Hold rail, standings, ransom/bequest controls, capture/ransom/recruit-flip beats; capture/rout/ransom/
  return/free/bequest events carry the name. 597 v3 tests (11 new); sim summary verified BYTE-IDENTICAL.

### T1-2 ☑ Resolve the Rally + the Whisper last-stronghold reading (drifts D1 + D3)
- **Problem:** (D1) ALGORITHM §13 P0-10 mandates a one-time **Rally** for a Warlord reduced below a
  threshold; it was silently dropped — the project's first *unrecorded* dropped mandate (violates
  resolve-or-record). (D3) Whisper blocks the *deposal* but not *taking the last stronghold*, so a player
  zeroed in Whisper is auto-eliminated at the first March Dawn with no recourse — weaker than the spec's
  hopelessness-protection intent, and the reading is unrecorded.
- **Fix:** BUILD the minimal Rally (one-time, auto at the Dawn a Warlord is stronghold-less pre-March —
  e.g. reclaim the Keep-adjacent Holding / a card+banner surge), THEN re-sweep: if the locked bands hold
  (2-seed), keep; if they break, **record the removal instead** as a dated ROADMAP §8 decision + annotate
  §13 P0-10. Either way, decide + record the D3 Whisper reading (recommended: taking a LAST stronghold in
  Whisper is blocked, mirroring the last-retainer capture rule — if bands hold).
- **Integrations:** engine (`sequencer.ts` Dawn, `actions.ts` raid gate, a `RALLIED` event, 1–2 tunables) ·
  sim (a full re-sweep — this is balance-touching) · tests (Rally fires once; Whisper gate) · UI (a Rally
  beat line) · docs (ALGORITHM §13 P0-10 annotation + ROADMAP §8 entry REQUIRED whichever way it lands).
- **Status:** ☑ DONE 2026-07-01 (W2) — **split verdict, both halves resolved-or-recorded.** (D3) Whisper
  last-stronghold gate BUILT + VALIDATED: `canTakeLand` blocks a TAKE_LAND elect vs a last living
  stronghold pre-March (fail-fast, AI throw-safe, UI election gated + hint); 2-seed both modes in band
  (dark 21.4/20.9, BP unchanged). (D1) The Rally was BUILT (auto reclaim + RALLY_CARDS at a
  stronghold-less Whisper Dawn) and REVERTED on the sweep: it pushed seed 20260628 dark to 22.0% (over
  the 18–22 ceiling; mechanism: revived seats extend games → more doom wins) with no local tunable fix —
  removal recorded as the dated decision in ROADMAP §8 + the §13 P0-10 annotation (residual blight-ash
  hopelessness gap recorded there too). References refreshed.

### T1-3 ☑ Round-1 Crown landmine (learnability #4)
- **Problem:** `setup()` names the tie-broken seat-0 player Crown at game start — a first-time human is
  surcharged + hunted before understanding any of the three concepts involved. Worst first impression in
  the game.
- **Fix:** UI-only in-context callout (trivial, zero engine change — preserves locked balance): when the
  human is Crown at round 1, a one-line beat ("You hold the most land — the dark hunts YOU, and your
  pledged cards count for less"). The engine-side grace-round alternative is Tier-3 (balance-touching).
- **Integrations:** UI only (`view.ts`/`session.ts` beat) · tests (a jsdom assertion) · engine NONE.
- **Status:** ☑ DONE 2026-07-01 (W2) — UI-only one-shot beat at session start (`crownCalloutText`, a pure
  helper: round 1 + human crowned → "the dark hunts YOU... cards count for less"); zero engine change.
  jsdom-tested both polarities (crowned → renders; not-crowned / round>1 → absent).

### T1-4 ☑ Human Last Stand control (the auto-play stub)
- **Problem:** `handleLastStandCommit` is cosmetic; a human defender's Last Stand is silently auto-played
  by the engine (`chooseLastStandCards`) — the one interactive heroic verb the spec grants never reaches
  the player ("the engine held my Keep for me"). Known 6a-class gap, now player-facing.
- **Fix:** an engine pause-flow: when a **human** defender would lose a stronghold, halt combat resolution
  into a `pendingLastStand` state; the UI prompts "commit how many cards?"; `LAST_STAND_COMMIT` resumes
  resolution. AI/sim seats keep the auto path — **sim byte-identity is the hard guard** (all-AI games never
  pause).
- **Integrations:** engine (`combat.ts`/`actions.ts`/`reducer.ts` pending-state + resume) · UI (the commit
  prompt with the "these are next round's Pledge cards" warning) · sim (byte-identical — verify summary) ·
  tests (pause fires for human seat, auto for AI; jsdom commit flow; determinism with scripted commits).
- **Status:** ☑ DONE 2026-07-02 (W3) — engine pause-flow BUILT: a losing HUMAN defender halts the RAID into
  `state.pendingLastStand` (a blocking state — the reducer rejects every other command until resolved);
  `LAST_STAND_COMMIT` carries the chosen card values and `resumeLastStand` finishes the resolution through
  the same shared tail (`finishRaidResolution`) as the AI auto path (UNTOUCHED). One recorded human-only
  edge: a partial stand that undercuts the CAPTURE margin without reversing ⇒ the capture FIZZLES (spec
  §5.2 annotated). UI: blocking prompt (card toggles, live projected totals with the ties-to-defender rule,
  the "these are next round's Pledge cards" warning); the session pump stops at the pause. 17 new tests
  (pause/resume 0-partial-full-fizzle, AI-never-pauses, command blocking, determinism with scripted
  commits, jsdom E2E through the real prompt) → v3 623 green. BALANCE GUARD: competitive summary.json
  BYTE-IDENTICAL to sample-v3; blood-pact byte-identical to the 9eedd1e baseline (and the STALE
  `sample-v3/BLOOD_PACT.summary.json` — a W2 leftover still carrying pre-Whisper-gate numbers — refreshed
  to the validated 19.4% baseline).

### T1-5 ☑ Doc honesty + the teach script (learnability #2/#3, drift D2)
- **Problem:** (a) ALGORITHM §6/§13 P0-5 still describe the Reckoning auto-pressure as live; it is zeroed
  (sanctioned 5b) — the spec oversells the shipped game. (b) Six end-conditions are taught where three
  sentences suffice. (c) The game's natural act-staging is not written down as the intended onboarding, so
  the UI revision can't implement it.
- **Fix:** annotate §13 P0-5 (+§6) with the 0-default and the "hiding is dangerous is currently inert —
  see backlog T2-2" note; add the 3-sentence taught end-conditions; write the canonical **progressive-
  disclosure teach script** (Whisper = march/claim/flip/pledge; the Exposure beat at March = elimination;
  heart-spawn = ASSAULT_HEART; first raid-win = the election; elimination = Wraith/Bequest) as a short doc
  the styled-UI pass implements.
- **Integrations:** docs only (`DESIGN-V3-ALGORITHM.md` annotations, a new `docs/v3-teach-script.md`,
  checklist cross-links) · UI (a requirement for the styled pass, not built now).
- **Status:** ☑ DONE 2026-07-02 (W4) — (a) ALGORITHM §6 auto-pressure bullet + §13 P0-5 annotated with the
  shipped `RECKONING_AUTOPRESSURE_NODES=0` default (sanctioned 5b): the anti-turtle pressure is currently
  INERT, re-arm tracked as T2-2 (§13 P0-10 was already annotated by W2 — verified, not duplicated).
  (b) `docs/v3-teach-script.md` written: the canonical progressive-disclosure onboarding — a 5–6 min
  upfront script (4-idea spine, THREAT→PLEDGE + Crown surcharge, two currencies, march/claim/flip, the
  "elimination from March — watch the Exposure meter" warning, the exactly-3-sentence end conditions
  with a §6 spec pointer) + 8 in-context one-shot beats (capture election at first raid-win, ransom,
  oaths, March exposure, heart-at-spawn + throne gate, Wraith/Bequest at elimination, the T1-4
  human-facing Last Stand prompt, the Gambit) + Blood-Pact-never-in-game-one — framed as a REQUIREMENT
  for the styled-UI pass (T3-10). (c) Cross-links: the playtest checklist now mandates teaching from the
  script; Tier-1 statuses verified against the landed commits (5fb1e48 W1, 9eedd1e W2, bb286ca W3);
  ROADMAP §8 Tier-1-sweep-complete entry added. Docs-only; full gate + byte-identical balance guard run
  as insurance.

**TIER 1 COMPLETE (2026-07-02).** All five pre-playtest items landed across W1–W4 (commits `5fb1e48`,
`9eedd1e`, `bb286ca`, + the W4 docs commit); the one build-then-revert (the T1-2 Rally) is a dated,
recorded decision, not a silent drop. v3 623 tests green, v2 451, both modes in band (dark 21.4%, BP
traitor 19.4%), sim reference byte-stable. **The playtest is unblocked** — run it from
`docs/human-playtest-checklist-v3.md` teaching from `docs/v3-teach-script.md`.

---

## TIER 2 — design calls (reopen balance; USER decision, then one re-balance wave each)

### T2-1 ☑ Feed the court (engagement #1 — the pitch-matching change)
- **Problem:** ~4 discovery tokens hard-cap retainer supply at ~1.5/game; the median court is Warlord + ONE
  retainer; captures touch a player ~once per 6 games. "Build a court" — the reason v3 exists — is the
  least-delivered clause of the pitch. (The 42% ransom-back rate proves attachment works when it fires.)
- **Fix (recommended):** more token-bearing Holdings and/or every player starts with one named retainer +
  a recruit trickle; target courts of 3–4 by March; captures should rise toward ~1/game *without* touching
  the capture brakes. Then a full re-balance wave (this moves elimination pressure + pledge supply).
- **Integrations:** engine (board/§5.1 token density, setup) · sim (full 2-seed re-balance; watch captures,
  eliminations, dark-win, dead-time) · UI (court panel scales) · tests (supply + balance-band updates) ·
  docs (ALGORITHM §2/§5.1 + ROADMAP §8).
- **Status:** ☑ DONE 2026-07-02 (T2 wave) — levers (a)+(b): every player STARTS with one named MARSHAL
  (fixed archetype — the A/B refuted a seeded Marshal/Steward split: a starting Steward's economy heats 3p
  +8pp; name pre-bound `f(hash(seed,'start-retainer-<seat>'))` §7 D9) + a seed-picked PAIR of Forges
  carries a pre-bound token (`FORGE_TOKEN_COUNT`=2 ⇒ 6 tokens/game; all 8 over-heated 3p to 33.9%).
  Objective: court-at-March median 2 → **3** (new sim metric), captures 0.35 → **1.39/1.46**/game (brakes
  untouched). Knock-on re-lock (v3 literals): `DISCOVERY_BLIGHT_DELTA` 1→0, `SPREAD_AMOUNT_BASE` 3→1,
  `DOOM_COST_MARCH` 9→11, `DOOM_COST_RECKONING` 12→14. 2-seed both modes: dark 19.4/19.5 pooled,
  [18.4/22.3/17.6]·[17.6/23.2/17.6] per-count, doom 17.9/17.8, attrition share 8.0/8.8, rounds 12.2;
  BP 18.1/18.9 · 56.1/53.6 · 70.6/71.2. 627 v3 tests. WATCH items recorded in the sample-v3 REPORT
  banner: eliminations 0.52→0.30/game (attrition endings ~1.5% — a feel change for the playtest),
  saboteur gambler-free 31.4/32.7% vs the 30% archetype guard line (T2-2's natural home), difficulty-tier
  magnitudes stale (recalibrate at the next difficulty-touching stage).

### T2-2 ☐ Re-arm "hiding is dangerous" (engagement #2, drift D2's design half)
- **Problem:** the wave-1 fix zeroed `RECKONING_AUTOPRESSURE_NODES`, disarming the stress-test's
  anti-turtle lever. Sim bots don't turtle like humans; the playtest will likely rediscover
  build-quietly-and-be-second.
- **Fix (recommended):** re-arm in a currency that can't re-break the doom/attrition mix — steer *Blight
  spread* (not deposals) toward the least-engaged quadrant, or a hoard-tax on the Pledge — plus a real
  passivity metric in the sim (comeback-rate doesn't measure it).
- **Integrations:** engine (`blight.ts` steer or pledge tax) · sim (new passivity metric + re-balance) ·
  docs (§13 P0-5 re-annotation).
- **Status:** ☑ DONE 2026-07-02 (T2 wave) — the "steer Blight at the least-engaged" option WON the
  validation. Shipped: (1) a public per-seat **engagement tally** (`PlayerState.engagement`: +1 per card
  pledged / STRIKE-committed / heart-committed, +1 per PARLEY — deterministic, derived from public verbs);
  (2) **`applyReckoningBlightPressure`** (`RECKONING_AUTOPRESSURE_BLIGHT`=1, new injectable): each
  Reckoning Dawn (no live heart assault — the P0-6 suppression carries over) the dark advances 1 blight on
  the least-engaged living seat's most-imperiled **non-Keep** stronghold (lowest tally → most production →
  lowest seat; telegraphs one Dawn before ashing at BLIGHT_TO_ASH=2). Two shapes keep it doom/attrition-safe,
  both build-then-validated: **Keeps never targeted** and **spare-the-broken** (only seats holding 2+
  productive non-Keep nodes qualify — the pressure can never ash a seat's last production). REJECTED on the
  2-seed sweeps: the keep-inclusive deposal-currency re-arm (strongest metric, 25.2/24.0, but last_standing
  7→21% of games + 3p 24.7% over the credible cap), a full-block dose gate and a 3+-living gate (both
  neutered the 2p regime where hiding is most rewarded), and the doom-cost-family compensators (provably
  inverted: lower thresholds → more full blocks → faster patience escalation → HOTTER dark, 3p 28.9%).
  (3) **Passivity metric** `passiveSeatWinRate` (+ winner/field mean engagement) in metrics/report — the
  min-engagement seat's win share: baseline **35.9/36.3%** pooled (ABOVE the ~26.9% even share — hiding
  WAS the best line), **66.1/66.6% at 2p**; shipped **34.7/34.0** pooled, **61.5/59.8** at 2p. 3p/4p flat
  (~27/~15) — sim bots don't turtle there (the backlog's own prediction); the 3p/4p bite is a HUMAN
  playtest item, now armed + taught (teach script beat C9). **2-seed re-validation, all §9 bands:** dark
  **19.2/19.3%** pooled [18.6/21.9/17.1]·[18.3/23.1/16.5], doom-of-games **17.3/17.6**, attrition share
  **9.8/8.8**, rounds 12.16/12.13, eliminations 0.36/0.36, last_standing 9.3/9.3, free-rider + dominance +
  termination PASS, captures 1.38/1.45 + court median 3 (T2-1 holds); BP **17.8/19.2 · 55.6/53.3 ·
  69.4/70.9** (bands hold; T2-1 lock was 18.1/18.9 · 56.1/53.6 · 70.6/71.2). A magnitude-2 probe was
  run and REJECTED (passive 34.0 — no metric gain; pooled dark sags to 18.05 and the blighted-node
  telegraph is lost). Spec §6 + §13 P0-5 re-annotated from INERT to the shipped mechanism; teach-script
  beat C9 added; `RECKONING_AUTOPRESSURE_NODES` stays 0 (the deposal executioner remains retired).

### T2-3 ☑ Herald default-OFF (learnability #1)
- **Problem:** the 4th archetype imports a verb (PARLEY), 2 tunables, and a never-fights exception; it's
  the worst teach-cost item and is already flagged "advanced." A 3-archetype default (protect/fight/earn)
  is a cleaner first game.
- **Fix:** a `heraldEnabled` setup flag, default OFF; Herald becomes an advanced toggle. One re-validation
  sweep (locked balance includes Heralds).
- **Integrations:** engine (setup flag) · sim (re-validation 2-seed) · UI (toggle on the start screen;
  hide PARLEY when off) · tests (both-flag coverage) · docs (§2 note).
- **Status:** ☑ DONE 2026-07-02 — `heraldEnabled` setup flag, DEFAULT OFF (3-archetype default), UI toggle,
  sim `--herald` variant; AI/verbs routed. The OFF-default needed a real re-center (the `HERALD_OFF_REBALANCE`
  overlay: BLIGHT_TO_ASH 2→3 + SPREAD 2.6, doomCost M14/R17.5/div4.5, SURGE 1.5, BP re-pair 1.2/0.735) —
  validated 2-seed (dark 18.9/18.3, per-count credible, rounds 12.2, BP 15.8/69.4/78.1). ON variant 1-seed
  sanity. Stage agent hit a session limit post-validation; orchestrator verified + committed the close-out.

### T2-4 ☐ Right-size the Wraith (engagement #4)
- **Problem:** ~2-round median afterlife, one click/round, in a minority of games — the worst
  rules-weight-to-value ratio in the design. The Bequest is the beat that earns its keep.
- **Fix:** decide at the playtest: (a) cut to Bequest-only (reclaim the complexity budget), or (b) enrich —
  one banked "manifestation" payoff the wraith builds toward. Don't ship the current middle.
- **Integrations:** engine (`elimination.ts`) · sim (wraith metrics) · UI (wraith panel) · docs.
- **Status:** OPEN — deliberately playtest-gated (checklist #2 is the test).

---

## TIER 3 — post-playtest roadmap (replayability + hardening)

| # | Item | Problem → fix | Integrations | Status |
|---|---|---|---|---|
| T3-1 | **Asymmetric Warlord passives** | Zero player asymmetry caps replay at ~8–12 plays → one unique passive/verb per faction (tech exists) | engine+AI+sim re-balance+UI+docs | ☐ |
| T3-2 | **Shadowking aspects** | One villain policy → 2–3 named presets (aggressive spreader / grudge-hunter / patient sieger) over the tunable policy layer | engine(policy presets)+sim+UI(select)+docs | ☐ |
| T3-3 | **Variable token setup** | Fixed discovery density → a setup card varying token count/mix (compounds T2-1) | engine(setup)+sim+docs | ☐ |
| T3-4 | **Type-enforce the fog (review D4)** | Core AI takes full `GameState` — fair by convention only → narrow `chooseAction`/`choosePledge` to `ObservableState` so a future edit can't silently peek | engine(AI signatures; large refactor)+tests(a "no-hidden-reads" guard) | ☐ |
| T3-5 | **2p difficulty lever** | doomCost floors at 1 card at 2p → tiers don't bite; needs a 2p-specific lever | engine(tunables)+sim | ☐ |
| T3-6 | **Heart off the Keystone** | The heart-vs-throne conflation is patched by the 5h win-gate (a rules-text fix) → moving the heart to its own node dissolves it — **only if** playtest confirms checklist-#7 confusion (reopens gambit balance) | engine(heart spawn)+sim(gambit re-balance)+UI+docs | ☐ |
| T3-7 | **Round-1 Crown grace (engine-side)** | The T1-3 callout is a patch; a no-Crown-until-first-Dawn grace is cleaner but balance-touching | engine(setup/§5.2)+sim | ☐ |
| T3-8 | **Minor letter-drifts batch (review D6)** | freed-piece "rallied" defense bonus unbuilt; ally-ransom consent one-sided; ransom destroys all cards (more brake than spec — maybe keep, then amend spec); flip-spawned DKs invisible to the dark's maneuvers ("acts next THREAT" ≈ never acts) | engine small fixes OR spec amendments — resolve-or-record each | ☐ |
| T3-9 | **Surface-merge verbs** | RAID/STRIKE → one ATTACK surface; SWEAR/BREAK_OATH → one OATH interaction (−2 taught verbs, zero engine change) | UI only (styled pass) | ☐ |
| T3-10 | **Full styled-UI revision** | The planned post-playtest pass — must implement the teach script (T1-5), scene beats, and the P0-11 legibility as designed | UI+jsdom tests | ☐ |

## Standing recorded debts (pre-review, still open)
- `data/tunables.json` / `archetypes.json` v2-lever drift (inert; resync when v3 gets its own `data/` dir +
  gen workflow; v3 tunables live as literals in `src/v3/tunables.ts`).
- strikePool baseline-strike consumption unwired (wraith-only conduit; `consumeStrikePower` has no engine
  call site — wire it or amend §5.5, a resolve-or-record).
- `GRUDGE_PER_SK_WOUND` dead lever (carried from v2).
- `state.json`/handoff machinery still points at v2; make v3-aware or repoint at promotion.
- v3 promotion decision (when v3 replaces v2 as the shipped game: retire `src/v2`, swap `index.html`,
  port the balance-lock test + pre-push hooks to v3).
