Did the code deliver the vision? A skeptic's verdict

  Short answer: the math and the skeleton, yes; the game, not yet — and not provably ever until a human plays it. The project has quietly conflated "balance-validated by simulation" with "the 
  game is good." Everything the sim could measure (incentives, determinism, balance) is genuinely solid and honestly documented. Everything the sim couldn't measure (drama, onboarding, a
  thinking opponent) is the weak or unbuilt half — and the cruel irony is that the two pillars holding up replayability, a credible AI and an unsolvable villain, are the two weakest parts of 
  the codebase. The GAME-DESIGN.md we just wrote was accurate about its own untested risks; the code confirms them.

  Product metrics

  ┌────────────────┬─────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │     Metric     │        Score        │                                                              The skeptical evidence                                                              │
  ├────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │                │                     │ The dramatic spine is emitted but not rendered. The engine fires CROWN_CHANGED and ACT_ESCALATED events — I confirmed zero consumers in          │
  │ Player         │ 3/10                │ src/ui-v2/. The "leading is dangerous" handoff and the named escalation beats — the design's headline moments — are silent tag/number swaps. The │
  │ engagement     │                     │  villain speaks once at THREAT (view.ts:259) then goes quiet. The Pledge is a one-shot button grid (view.ts:266), not the promised live          │
  │                │                     │ staredown. This is the exact layer the redesign existed to fix.                                                                                  │
  ├────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Ease of        │                     │ Better than v1 (errors now explain themselves, session.ts:149), but the only coach is a single box that appears only in Act WHISPER              │
  │ onboarding     │ 4/10                │ (view.ts:240) and vanishes on first escalation. No board tooltips; the glyph alphabet ◆ ⚒ ⌂ ⛬ ☠ ✉ ♛ has no legend. A first-timer cannot decode   │
  │                │                     │ the board.                                                                                                                                       │
  ├────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Adequate       │ 8/10 mechanically,  │ The real win: 12 verbs are wired with cost readouts, and the sim proves they fire (oaths 6.1/game, heralds 1.8, tolls 0.9). But the default AI   │
  │ complexity     │ ~5/10 as posed      │ never uses them (see below), and two spine verbs — Last Stand and Gambit seize — have no human control at all. Last Stand is auto-played for the │
  │                │                     │  human by chooseLastStandCards (actions.ts:463). A solo player never feels the complexity their opponents ignore.                                │
  ├────────────────┼─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │                │ 5/10,               │ Genuine combinatorial surface (2/3/4p × 2 modes × 7 archetypes × seed). Capped hard by two things: the AI is a 1-ply greedy heuristic with no    │
  │ Replayability  │ human-dependent     │ lookahead and no model of who's winning (ai-player.ts:467), and the villain's effect playbook is partly a literal round-parity script —          │
  │                │                     │ RECKONING → round % 2 ? 'SURGE' : 'REAP' (shadowking-policy.ts:183). A strategy-minded human solves both in ~8–15 games.                         │
  └────────────────┴─────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  The throughline: state visibility is excellent (8/10), drama is absent. The frontend is an honest render-from-state HUD at ~60% of the plumbing but ~30% of the experience. The owner's caveat
  ("frontend not yet redesigned") is the single biggest gap between vision and delivery, and it's the right next investment.

  Engineering

  Structure — sound core, two embarrassments. The "one applyCommand reducer" claim genuinely holds; the old 3–4-duplicate-rules problem is killed; type safety is strict with zero 
  any/@ts-ignore. But:
  - board.ts is a shipped debugging session. I confirmed 17 "Wait — let me re-read…" stream-of-consciousness comment markers and a build-then-Object.keys(nodes).forEach(k => delete 
  nodes[k])-then-rebuild dead-code path (board.ts:142). The first node table is constructed and immediately wiped. This file should be a quarter of its 595 lines.
  - Duplication survives in pockets: the terminal-loss block is copy-pasted between reducer.ts:498 and sequencer.ts:407; getSpokePath is triplicated; ai-player.ts has six near-identical BFS
  helpers.

  Efficiency — one real liability. The reducer's immutability is JSON.parse(JSON.stringify(state)) per command (reducer.ts:50), and it serializes the monotonically-growing actionLog every time
  — clone cost rises over the game, and this dominates sim runtime. The file's own header comment says "Structured-clone" and "pure, no mutation"; both are false (it's
  deep-clone-then-mutate-in-place). Fix: structuredClone, or clone once per turn, and correct the stale comments.

  Best practices — mostly good, with a determinism footgun. withTunables mutates a module-global (tunables.ts:514); it's safe only because the sim runs serially — it breaks the instant anything
  runs games in parallel. A few Object.entries(nodes) loops are deterministic by accident of insertion order rather than by an explicit sort.

  Dependencies — the headline inverts: not outdated, but unpatched and one major mismatched. Stable releases, but npm audit reports 8 vulns (1 critical, 4 high) — all dev-tooling: a critical 
  Vitest UI arbitrary-file-exec and high Vite path-traversals, all fixable in-range with a plain npm audit fix (no --force). Separately, @types/node is ^25 while the runtime is Node 24 — types
  describe APIs that don't exist at runtime. And package.json main/types point at dist/index.js, which never builds (there's no src/index.ts) — dead pointers.

  Magic numbers / data files — the infrastructure is good, the claim is overstated, and the goal is unmet. tunables.ts is clean injectable plumbing, but:
  1. No data file exists. Every weight is a TS const; tuning requires tsc. A non-programmer cannot change a number. The "data files for tuning" goal is at 0%.
  2. ~half the declared tunables aren't actually injectable. CARD_VALUE_MAX (its own comment calls it "the core pledge/combat scaling lever"), BASE_BANNER_INCOME, all GRUDGE_* rates, and 7 of
  ~10 Blood-Pact knobs are frozen into the TUNABLES aggregate but absent from the Tunables interface — the balance search literally cannot reach them.
  3. The most play-shaping numbers are the least parameterized. The 7 AI archetype weight-vectors (sim/archetypes.ts) are neither data nor sweepable — the balance search optimizes a surface
  that holds the AI personalities fixed. Plus true magic numbers remain: MARCH/CLAIM cost = 1 (actions.ts:112,328), node income 3/1/1/0 (board.ts:382), AI cover fractions 0.25/0.35
  (ai-player.ts:207,229), the suspicion +2 (blood-pact.ts:300).

  Recommended path: extract to Zod-validated JSON (data/tunables.json, data/archetypes.json, data/board.json), wire the unwired levers in the same pass, and keep tunables.ts as a
  loader+validator with a deep-equal snapshot test so a JSON edit can't silently move a "locked" value.

  Two project-rule violations the audits surfaced (your own "no stale comments" non-negotiable): CLAUDE.md's Balance Parameters still lists the v1 behavior deck ("6 SPAWN, 6 MOVE…") that
  doesn't exist in v2, and .githooks/pre-commit still references the deleted v1 lint/test.

  What I'd do, in priority order

  1. Cheap credibility wins (hours): npm audit fix; pin @types/node@^24; render CROWN_CHANGED + ACT_ESCALATED as narration beats (events already exist — this recovers the "named beats" promise
  for ~10 lines); fix the two stale-comment rule violations.
  2. Make the balance lock real (half a day): turn the 18–22% band into an asserted test — right now sim.mjs only exits non-zero on termination guards (sim.mjs:78), so any tunable change can
  silently break the game's central promise and CI stays green.
  3. Parameterize to data (1–2 days): archetypes + tunables → Zod JSON, wiring the unwired levers. Highest tuning leverage.
  4. Clean board.ts to a quarter its size; de-dupe the loss-check and BFS helpers; fix the clone-per-command perf + its lying comments.
  5. The real work — the experience layer: a thinking AI (even 2-ply + a "who's winning" eval), a villain effect-table that isn't parity-scripted, the Pledge staredown, Last Stand under human
  control, onboarding beyond Act 1. This is the frontend/AI redesign the roadmap already names as the next gate, and the audits confirm it's where the vision lives or dies.
