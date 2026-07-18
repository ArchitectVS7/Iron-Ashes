# Design history — provenance, not authority

These documents record **how the v2 design was reached**. They are kept for provenance and rationale.
They are **not** the current authority and may describe superseded proposals or interim states.

**For the current game, read these instead:**

| You want… | Read |
|---|---|
| What the game is & why (design authority) | [`../GAME-DESIGN.md`](../GAME-DESIGN.md) |
| How to play (player-facing rules) | [`../USER-MANUAL.md`](../USER-MANUAL.md) |
| Implementation spec (pseudocode, determinism, state) | [`../DESIGN-V2-ALGORITHM.md`](../DESIGN-V2-ALGORITHM.md) |
| The exact balance numbers (single source of truth) | [`../../src/v2/tunables.ts`](../../src/v2/tunables.ts) |
| Per-stage tuning evidence | [`../archive-V2/stage5-tuning-log.md`](../archive-V2/stage5-tuning-log.md) |

## What's in here

**The v1 post-mortems** — diagnoses of the earlier build that the v2 redesign replaced:
- `REDESIGN-ANALYSIS.md` — why v1 felt broken (code drift, UI debt, the reuse-vs-rebuild call).
- `ML-SYSTEM-ANALYSIS.md` — why the old RL/ML "balance" harness was invalid and scrapped.

**The design deliberation** — the focus-group rounds and adversarial review that forged the v2 core:
- `DESIGN-V2-FOCUS-GROUP.md` (R1) — the ground-up redesign: the Pledge, the dangerous Crown, doom-as-map.
- `DESIGN-V2-FOCUS-GROUP-R2.md` — found the "dead pillars" (grudge/rescue not firing) and prescribed fixes.
- `DESIGN-V2-FOCUS-GROUP-R3.md` — the passion wave: Oaths/Ledger, Herald, Forge tolls, sealed gambit.
- `DESIGN-V2-STRESS-TEST.md` — the pre-code adversarial audit (the P0/P1 fixes folded into the spec).

**The folded mechanic specs** — detailed designs for individual systems, now merged into `GAME-DESIGN.md`
and `DESIGN-V2-ALGORITHM.md`. Kept because the handoff/tuning-log and some source comments cite them as the
rationale of record for specific tunables:
- `DESIGN-V2-DARK-ENGAGEMENT.md` — DK-kill payoff + asymmetric grudge mark (→ ALGORITHM §2/§5.1/§5.6).
- `DESIGN-V2-OATHS.md` — Oaths + the Ledger (→ ALGORITHM §4.3/§5.4/§5.6).
- `DESIGN-V2-RESCUE-ECONOMY.md` — the dark's break-vector + win-currency rescue (→ ALGORITHM §5.4).
