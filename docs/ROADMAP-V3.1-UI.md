# Iron Throne of Ashes **V3.1** — Presentation Sprint Roadmap

**Goal:** turn the placeholder web-app UI (`src/ui-v3`) into a reactive, engaging *digital board game* —
cards that read as cards, animated moves with sound, tokens/board/turn-track as game artifacts — so the
**V3-6 human playtest can actually vet v3's felt experience**. Source design rationale:
`docs/Redesign-V3.1/Design Advice (Fable).md` (the merged Fable+Sonnet advice).

**Status: ACTIVE — wired into the handoff machinery at Stage V3.1-M0 (2026-07-18, T-001).** `docs/handoff/state.json`
`currentStage` is `V3.1-M0`; Stage V3-6 in `ROADMAP-V3.md` §4 is expanded into the V3.1-M0…M5 sub-track
(see §2). The sprint is open.

---

## 1. Why V3.1 and not V4 (numbering decision)

**Recommendation: V3.1.** Rationale:

1. **Version majors in this repo mean mechanics redesigns.** v1→v2→v3 each ran concept → focus group →
   algorithm spec → adversarial stress-test. This sprint touches **zero engine code**: balance is LOCKED,
   all mutation stays in `applyCommand`, the UI remains a projection of `observableState`. Calling a
   presentation layer "V4" would misstate its provenance and scope.
2. **v3 was never vetted — and this sprint is the prerequisite for vetting it.** The first unchecked
   box in `ROADMAP-V3.md` §4 is Stage V3-6 "UI polish + human playtest". The checklist items it must
   answer (elimination feel, capture-as-scene, Wraith engagement, the two-act ending) are
   *felt-experience* questions that a sidebar-of-numbers UI cannot surface. V3.1 is Stage V3-6's "UI
   polish" half, expanded into a real milestone track; the playtest is its exit gate.
3. **V4 is reserved for the playtest verdict.** If the M5 playtest reveals mechanical failures, *that*
   becomes the V4 charter (with the usual concept→spec→stress-test provenance). Until then there is no
   V4-shaped work.


## 2. Wiring into the handoff machinery (first task of M0)

When this sprint opens:
- Expand Stage V3-6 in `ROADMAP-V3.md` §4 into sub-boxes `- [ ] **V3.1-M0 …**` … `- [ ] **V3.1-M5 …**`
  (the checker already parses sub-boxes), each pointing at this file; the human playtest stays the final
  sub-box. M6 (kit extraction) lives outside the §4 gate — it is cross-project work, not a v3 blocker.
- Repoint `state.json` `currentStage` to `V3.1-M0` and run `npm run handoff:check`.
- The AGENT-PROTOCOL Definition of Done applies **per milestone**: `npm run verify` exits 0 → update
  state.json + this file (+ ROADMAP-V3 §8 changelog) → commit → `handoff:check` exits 0.

## 3. Guardrails (non-negotiable, inherited)

- **Engine untouched.** No edits under `src/v2/`, `src/v3/` (except *read-only* imports of types /
  `observableState`). Balance stays LOCKED — no tunable edits, ever, in this sprint.
- **Fog (D2) extends to presentation.** Animations must not leak: nothing hidden from `viewerSeat`'s
  `observableState` projection may ever reach the DOM, a texture, or the move stream — including
  *mid-animation* (a flip may not show face content before the reveal frame). Enforced by leak tests (M1).
- **Determinism invariant, scoped (dated decision to record in state.json at M0):** the "no
  Math.random/Date.now under src/" invariant is **engine+sim scoped** (`src/v2`, `src/v3`, `src/utils`).
  The presentation layer (`src/ui-v3`) may use `requestAnimationFrame`/GSAP internal timing, but (a)
  still **no `Math.random`** — presentational jitter uses a dedicated `SeededRandom` instance that never
  touches `GameState`, and (b) no timing value ever feeds back into game state or commands.
- **Instant mode is load-bearing:** every animation path must run in a synchronous "instant" mode —
  it is both the `prefers-reduced-motion` accessibility path and how jsdom tests stay fast and green.
- **First runtime dependencies** (repo currently has zero): `gsap` + `howler`, pinned. Note GSAP's
  license terms for commercial games (anime.js is the MIT fallback). No other runtime deps without a
  dated decision here.
  - **2026-07-18 (T-002)** — Pinned (exact, non-range): `gsap@3.15.0`, `howler@2.2.4` (runtime deps),
    `@types/howler@2.2.13` (dev; gsap ships its own types, so no `@types/gsap`). GSAP 3 core (the
    tween/timeline API this sprint uses) is distributed under GreenSock's "No Charge" standard license
    (MIT-style for standard use); the paid Club GreenSock tier only gates special bonus plugins, none
    of which are used here. anime.js (MIT) remains the fallback if the license posture ever changes.
    No usage yet beyond a type-level import smoke test (`tests/v3/deps-smoke.test.ts`).
- **Verify stays green at every milestone boundary** — the FULL v2+v3 suite, lint, typecheck.

## 4. Milestones

### M0 — Foundations & the screenshot feedback loop
*Nothing visual yet; make the sprint safe and the agent sighted.*
- [x] Wire handoff machinery per §2; record the invariant-scoping decision in `state.json`. (2026-07-18, T-001)
- [ ] Screenshot loop working: headless browser (Playwright MCP or a `scripts/` Playwright script) boots
      `npm run dev`, drives `/index-v3.html`, captures every screen (start/difficulty, board mid-game,
      capture election, Ransom, Wraith, Bequest, victory/defeat).
- [ ] **Baseline "before" gallery** committed under `docs/Redesign-V3.1/baseline/`.
- [ ] `tabletop-ui` house-style skill scaffolded (`~/.claude/skills/tabletop-ui/SKILL.md`) — global, not
      in-repo; records the aesthetic rules + this stack so every project session inherits them.
- [ ] Add `gsap` + `howler` (pinned); `vite build` + verify green.

**Exit metrics:** `npm run verify` 0; `handoff:check` 0; ≥7 distinct screens captured headlessly by one
command; baseline gallery in-repo.

### M1 — The semantic move stream (transition layer; architecture before art)
*The §3b fix for "snaps instead of animates": diff old→new `observableState`, emit typed semantic
`Move`s ("card hand→discard", "token A→B", "score 4→7"), play them through an animation queue.*
- [ ] `src/ui-v3/moves.ts`: `diffObservable(prevObs, nextObs) → Move[]` — pure, typed, derived **only**
      from the two fog projections (leak-safe by construction).
- [ ] Animation queue: sequences `Move[]` through GSAP timelines; **instant mode** collapses to
      synchronous DOM settlement.
- [ ] `SoundManager` skeleton (Howler): `play(moveType)`; silent in tests.

**Exit metrics (all vitest-enforced):**
- Every v3 command type, driven over full simmed games (reuse the sim/E2E harnesses), produces a typed
  `Move[]` — an exhaustive `Record<CommandType, …>` makes misses a **compile error**.
- Determinism: same seed + same command script → byte-identical move stream (2 seeds).
- Fog leak test: serialize the move stream for each `viewerSeat` over full games; assert it never
  contains redacted token content or the seed.
- Replay test: instant-mode playback of the move stream settles to DOM identical to a cold render of
  the final state (**"snap count 0"** — no state change can bypass the queue).
- Full suite green (currently 1,142 tests — count may only go up).

### M2 — Theme foundation ("stop looking like a spreadsheet")
- [ ] Board-centric layout: board center-stage on a **textured table surface**; the right-hand status
      column dissolves into diegetic HUD elements (banners, plaques, ribbons at the edges).
- [ ] Typography: thematic display font + readable body font (e.g. Cinzel + a serif/sans body).
- [ ] **Every resource/stat becomes a token or gauge**: game-icons.net SVGs + Kenney frames; icon+count
      chips, never bare numbers in a table.
- [ ] Card frames + a **data-driven card-face generator** (piece/token data → SVG face) — art swaps
      never touch layout code.
- [ ] Turn/round/Act (Whisper→March→Reckoning) as a visual track with a marker, not a text line.

**Exit metrics:**
- Grep-able: zero resource values rendered outside the token/chip component (enforced by a DOM audit
  test over a full game: every numeric stat node carries the token class + an icon).
- Screenshot rubric scored ≥8/10 against a 10-item checklist committed with the gallery (table texture
  visible; cards read as cards at arm's length; no default-font text; act/turn track visible; palette
  cohesive; board is the largest element; etc.).
- **Blind read test:** a fresh agent instance shown only the new screenshots, asked "web app or digital
  board game?", answers *board game* for every screen.
- `vite build` bundle + assets ≤ 3 MB (keeps the prototype snappy; assets licensed CC0/CC-BY, credited
  in `docs/CREDITS.md`).

### M3 — Cards & hand live
- [ ] Hand rendered as a **fanned card row** (CSS 3D; hover-raise, selected-lift).
- [ ] Deal / draw / play / discard animated via the M1 queue; **3D flip** on any reveal.
- [ ] Legal actions glow on hover/selection; illegal interactions shake (juice, not alerts).

**Exit metrics:**
- Coverage: every hand-delta `Move` type has an animation preset + sound (the M1 compile-time record
  extends to presets — a new move type without a preset is a type error).
- Fog at frame level: face content is only swapped at the flip midpoint — instant-mode assertion
  ordering proves pre-flip DOM never contains face data.
- The existing jsdom E2E full-game-via-UI tests still pass in instant mode, unmodified in intent.

### M4 — Board life & sound
- [ ] Piece movement animated **along board paths** (not teleporting), with arrival effects.
- [ ] Scene moments: capture → election, Ransom, discovery flips, ASSAULT_HEART, Shadowking telegraph
      (WHISPER/MARCH/RECKONING each visually distinct), elimination, victory/defeat sequences.
- [ ] Full SFX pass: every `Move` type has a sound (Kenney/freesound, credited); master volume + mute.

**Exit metrics:**
- Exhaustiveness: `Record<MoveType, {preset, sound}>` fully populated — compile-enforced.
- Mechanic visibility map: a table in this doc mapping **every item of
  `human-playtest-checklist-v3.md` to its on-screen representation** — no unmapped rows.
- Performance: a full AI-vs-AI game played through the animated UI (Playwright, animations ON) with no
  main-thread stall >100 ms and steady ≥55 fps during animation bursts (Playwright trace).
- `prefers-reduced-motion` honored end-to-end (whole game in instant mode, sound intact).

### M5 — Playtest readiness → **run the V3-6 human playtest** (exit gate for v3)
- [ ] Polish pass driven by screenshot review; align UI affordances with `docs/v3-teach-script.md`
      (the UI should surface what the teach script must otherwise explain).
- [ ] Accessibility: reduced motion (done), colorblind-safe token palette (shape+icon, never
      color-only), minimum text sizes; settings panel (sound, **animation intensity: Cinematic
      (default) / Snappy / Instant** — a user decision (2026-07-18, from MTG-Arena experience: repeat
      players turn animations off in favor of gameplay); the tiers ride the M1 instant-mode rail as
      one global speed knob, not three implementations; herald toggle).
- [ ] **Scripted full-UI playtest** (per the global rule: through the UI, no API shortcuts) as the
      pre-human smoke run.
- [ ] **The human playtest**: walk `human-playtest-checklist-v3.md`; set the shipped difficulty default
      (item 11); collect the T2-4 Wraith signal; record verdict + felt-experience notes in
      ROADMAP-V3 §8.

**Exit metrics:**
- A complete game (start → victory/defeat) playable via UI only, all verbs reachable, zero console
  errors — verified by the scripted run.
- Playtest survey: each checklist felt-experience item scored (target: no item below "acceptable");
  session length lands in the designed 30–45 min; "looked/felt like a board game" affirmed.
- Difficulty default recorded; open playtest-gated risks (T2-4 Wraith, difficulty-tier magnitudes)
  resolved-or-recorded with dates.
- **This closes Stage V3-6 — v3 is vetted.** The verdict decides: ship-and-stop, V3.2 polish, or a V4
  mechanics charter.

### M6 — Extract the tabletop kit (post-vet; cross-project payoff, outside the §4 gate)
- [ ] Lift into a standalone package (own repo): `GameCard`, `TokenChip`, `HandFan`, `BoardStage`,
      turn-track ribbon, `SoundManager`, animation presets, instant-mode contract, base theme, card-face
      generator.
- [ ] Iron Ashes consumes the kit; optional: DesignSync the kit to a claude.ai Design System project;
      fold learnings back into the `tabletop-ui` skill.

**Exit metrics:** kit builds + tests standalone; Iron Ashes imports it with the full suite green and
pixel-comparable screenshots; a second prototype stands up a demo scene from the kit in under a day.

## 5. Sequencing rationale

M1 before M2 is deliberate: the move-stream architecture is the piece that makes everything after it
cheap and testable, and it is pure logic — highest risk-reduction per hour, zero aesthetic judgment
required. M2–M4 are then largely *content* flowing through proven rails, iterated with the M0
screenshot loop. M5's playtest is the whole point; M6 amortizes the sprint across the other prototypes.

## 6. Changelog

- **2026-07-18** — Roadmap authored (proposed). Numbering decision recommended: **V3.1** (presentation
  sprint on the locked v3 engine); V4 reserved for a post-playtest mechanics charter. Not yet wired
  into §4/state.json (M0 task).
- **2026-07-18 (T-001)** — Status flipped PROPOSED → ACTIVE. Wired into the handoff machinery: Stage V3-6
  expanded into V3.1-M0…M5 in `ROADMAP-V3.md` §4, `state.json` `currentStage` → `V3.1-M0`, the dated
  determinism-invariant scoping decision recorded in `state.json` `invariants`, and `handoff-check.mjs`'s
  stage regex widened to parse the `V3.1-Mn` sub-box form. Engine/tunables untouched; balance LOCKED.
- **2026-07-18 (T-002)** — Added the repo's first runtime dependencies, pinned exact: `gsap@3.15.0` +
  `howler@2.2.4` (plus dev `@types/howler@2.2.13`), with the GSAP license check recorded in §3. No usage
  yet beyond a type-level import smoke test (`tests/v3/deps-smoke.test.ts`). Engine/tunables untouched.
