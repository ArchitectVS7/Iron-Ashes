# Stage 5 — Balance Tuning Log

Real evidence trail for every tuning step (no boilerplate — the v1 ML-system failure was
undocumented balance mutation). One block per coordinate-descent step.

**Targets** (`src/v2/sim/report.ts` `TARGETS`): SK win 18–22% · rounds 10–16 · gambit 10–20%
(judge on the **gambler-free** diagnostic) · rescues 2–4. **Guardrails:** no dominant strategy;
free-riding not rewarded. **Stability:** each of 2/3/4p SK-win within ~±5pp of pooled; lock only
after a 2-seed re-run. **Blood Pact:** traitor win 12–20%, accusation accuracy ≥45%, ≤2.5
accusations/game, exposure 40–70%.

**How to run a step:** edit `src/v2/tunables.ts` (or, for the search, pass overrides to
`runTunableCandidates` / `npm run sim`), `npm run sim` + `npm run sim -- --bloodpact`, read the
REPORT diagnostics, record the block, KEEP or REVERT.

### Block format
```
## <stepId> — <one-line hypothesis>
Lever(s): <const> <old>→<new>, ...
Sweep: <runId> (<games> games), commit <sha>
Before → After (4 bands + 2 guards + per-count):
  SK win   <a>% → <b>%   [PASS/FAIL]   (2p .. / 3p .. / 4p ..)
  rounds   <a>  → <b>     [..]
  rescues  <a>  → <b>     [..]
  gambit(gambler-free) <a>% → <b>%  [..]
  dominance <..> / free-rider <..>   [held / FLIPPED]
Side effects: <key diagnostics that moved>
Decision: KEEP / REVERT — <why>. Next: <lever>.
```

---

## 5a-baseline — the "before" (no tunable changed; diagnostics added)
Sweep: s20260622-n40 (4200 games competitive + 360 BP), post-4g hardening.
- SK win **14.3%** [FAIL] — per-count **2p 29.2% / 3p 11.6% / 4p 1.9%** (the real problem: doomCost
  player-count SCALING — the dark is unwinnable at 4p).
- rounds 11.9 [PASS]
- rescues **0.10/game** [FAIL] — breaks 0.73/game, conditional-rescue 13.4%, **DK-kills 0.00/game**
  (players never engage the dark's forces → pushback/grudge dormant).
- gambit(gambler-free) **27.2%** [FAIL, mildly above 10–20].
- dominance PASS (gambler 44.9%) · free-rider NOT rewarded PASS.
- BP: traitor win 8.9%, exposure 71.7%, accusation accuracy **20.5%** (≈ random), 3.5 accusations/game.
- Pledge full-block 40%, mean ashed 6.09.

**Decision: the data is the baseline.** 5c targets the doomCost player-count scaling first
(`DOOM_COST_*` + `DOOM_COST_PLAYER_DIVISOR` are now injectable via the 5b seam).

<!-- 5c+ blocks appended below -->

## 5c — tune the dark (doomCost player-count scaling + landed-strike damage)
Lever(s): `DOOM_COST_WHISPER` 3→6, `DOOM_COST_MARCH` 5→9, `DOOM_COST_RECKONING` 8→12,
`DOOM_COST_PER_PLAYER` 0→6, `SPREAD_AMOUNT_BASE` 2→5.
Sweep: s20260622-n40 (4200 games) — LOCKED defaults, plus a 2nd-seed confirm s13371337-n24.
Search: 5 candidate grids (~120k games) via `scripts/tune-5c.mjs` (runSweep + tuningLoss).

Before (5a) → After (locked):
  SK win   14.3% → **20.2%**  [PASS]   per-count 2p 29.2→34.6 / 3p 11.6→17.9 / 4p 1.9→**7.9**
  rounds   11.9  → 11.52      [PASS]
  rescues  0.10  → 0.06       [FAIL — 5d's target, not 5c's]
  gambit(gambler-free) 27.2% → 26.7%  [unchanged — NOT a 5c regression; gambit is a separate concern]
  dominance PASS (even share 25.8%) / free-rider NOT-rewarded PASS   [both guards HELD]
2nd-seed (s13371337): SK win 20.3%, per-count 33.1/18.9/8.8, rounds 11.5, guards PASS — STABLE.

### Why these levers (mechanism)
`C = telegraph.doomCost` IS the strike threshold; `ratio = effective_pledge / C`; a strike lands
when ratio < 1. At high player counts 3-4 hands of pledge easily meet a low `C`, so strikes are
fully blocked and the dark cannot win. Raising the base AND adding a steep per-player tilt makes `C`
high enough at 4p (WHISPER 12 / MARCH 15 / RECKONING 18) that the table sometimes fails to block;
`SPREAD_AMOUNT_BASE=5` then makes those rare landed strikes actually hurt. At 2p the tilt floors `C`
to 1 (the dark is already dominant there — spread carries its damage).

### Dead lever finding
`DK_PER_PLAYER` / `DK_START_COUNT` scaling is a **dead lever for SK win rate** — scaling the Death
Knight army (even 2→4 at 4p) is byte-equivalent in outcome to baseline, because players never engage
the dark's forces (5a: dkKills = 0.00/game; the DKs sit on outer seams). Left at defaults. The DK
scaling seam stays wired (it's correct and tested) but is not used by the 5c tune.

### STRUCTURAL CAVEAT — per-count ±5pp is NOT achievable by number-tuning (ESCALATE)
The plan's strictness goal "each of 2p/3p/4p within ~±5pp of pooled" is **structurally unreachable**
with the current pledge/strike mechanic. Proven across 5 grids: an EXTREME doom probe (tilt6, 4p
doomCost up to 18) lifts 4p only to ~10% and actually *weakens* it past that, while nothing lifts 4p
to band without exploding 2p past 40% (which also flips the dominance guard). Root cause: pledge
supply scales with player count, so more allies ⇒ strikes blocked ⇒ co-op is structurally easier with
more players (a monotonic 2p→4p difficulty gradient, arguably desirable). **Closing the 4p gap fully
needs a MECHANIC change** (e.g. per-player-decaying pledge effectiveness, or a strike threshold that
scales super-linearly with pledge supply) — a design decision deferred to the user, NOT a number.

Decision: **KEEP** — 5c's primary targets (SK-win 18-22%, rounds 10-16) and both guardrails PASS and
are 2-seed-stable; 4p lifted from 1.9%→7.9% (as far as numbers allow). Per-count flatness reframed as
a documented structural limitation. Next: 5d (rescue/break economy — breaks 0.95/game,
conditional-rescue 6.6%; both must rise for 2-4 rescues/game).
