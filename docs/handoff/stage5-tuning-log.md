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
