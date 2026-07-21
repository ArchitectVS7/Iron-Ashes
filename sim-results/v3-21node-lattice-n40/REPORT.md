# 21-node LATTICE balance READING — v3 (T-233)

**This is a MEASUREMENT of the rewired star-lattice board. Nothing is tuned. Zero tunable-value edits.**
Date: 2026-07-20. Board: the **rewired star lattice** (`data/board-v3.json`, still 21 nodes = Keystone +
4 approaches + 4 forges + 8 outer + 4 cardinal mid-belt) with the M2.6 **ring-rewire** applied
(T-231/T-232): the **−4 forge-ring edges** removed and **+16 lattice edges** added (52 undirected edges,
zero forge↔forge edges remaining; confirmed on disk + by the T-232 edge-parity assert). The §9 balance
lock **stays VOIDED** under the M2.6 topology exception (ROADMAP-V3.1-UI §3 / T-230): the board is a
different game, the old bands no longer apply as a gate. This is a **MEASUREMENT, not a tuning stage** —
every band miss below is **recorded, nothing is tuned.**

Protocol: the canonical 2-seed sweep — base seeds **20260622** and **20260628**, each **n=40**, player
counts 2/3/4, both modes (competitive + `--bloodpact`). Identical seeds/AI to the T-227 21-node **ring**
baseline, so every delta below is attributable purely to the **ring → lattice** edge surgery. Sub-run
REPORTs live under `comp-s20260622/`, `bp-s20260622/`, `comp-s20260628/`, `bp-s20260628/`. All four
sub-runs exited **0** with **hitGuardCount = 0** (no termination-guard hit).

**The delta baseline here is the T-227 21-node RING** (`sim-results/v3-21node-baseline-n40/`), NOT the
voided 17-node §9 lock. The 17-node lock evidence is preserved untouched on disk at
`sim-results/v3-s20260622-n40{,-bp}` and `sim-results/v3-s20260628-n40{,-bp}` (this run overwrote them
during simulation, then restored them via `git checkout` so those dirs still hold the 17-node numbers as
the historical regression gate — the exact T-227 handling).

---

## Headline — competitive (Herald OFF, the shipped game)

| Metric | lattice s622 | lattice s628 | ring s622 (T-227) | ring s628 (T-227) | Δ (pooled, lattice−ring) |
|---|---|---|---|---|---|
| **Shadowking (dark) win — pooled** | **52.2%** ❌ | **54.4%** ❌ | 53.4% ❌ | 52.3% ❌ | **+0.5 pp** (still far above band) |
| SK win 2p / 3p / 4p | 44.2 / 54.9 / 57.4 | 43.1 / 58.4 / 61.6 | 44.8 / 58.6 / 56.7 | 41.9 / 58.6 / 56.3 | 2p +0.3, 3p −1.9, 4p **+3.0** |
| Mean rounds | 10.50 ✅ | 10.47 ✅ | 10.62 ✅ | 10.68 ✅ | **−0.17 rounds** |
| **Dark win by path — doom / attrition** | 52.0 / 0.14 | 54.2 / 0.21 | 53.1 / 0.26 | 52.0 / 0.24 | doom **+0.5 pp**; attrition −0.07 pp |
| Attrition share of SK wins | 0.27% | 0.39% | 0.49% | 0.46% | **−0.14 pp** |
| doom_complete ending share | 52.0% | 54.2% | 53.1% | 52.0% | +0.5 pp |
| territory_victory ending share | 35.5% | 34.1% | 33.8% | 34.8% | +0.5 pp |
| last_standing ending share | 0.95% | 1.00% | 2.05% | 2.38% | **−1.24 pp** |
| Mean nodes ashed (doom progress) | 4.68 | 4.65 | 4.83 | 4.86 | −0.19 |
| **Captures per game** | 1.32 | 1.36 | 1.32 | 1.42 | −0.03 |
| **Capture→ransom-back rate** | 33.1% | 34.2% | 33.1% | 35.6% | −0.7 pp |
| Kill-the-Dark fire rate | 18.5% | 18.7% | 17.0% | 17.6% | **+1.3 pp** |
| **Deliberate gambit fire (gambler-free)** | **20.6%** ❌ | **21.9%** ❌ | 14.6% ✅ | 15.5% ✅ | **+6.2 pp — NEW MISS** |
| Top-archetype win guard (≤30%) | 27.1% ✅ | 26.5% ✅ | 26.5% ✅ | 27.4% ✅ | flat, still PASS |

Two band checks are red on the lattice: **Shadowking win rate** (52.2 / 54.4%) and — new to the lattice —
**deliberate gambit fire** (20.6 / 21.9%). Mean-rounds and top-archetype guards remain green.

## Headline — Blood Pact (Herald ON, advanced toggle)

| Metric | lattice s622 | lattice s628 | ring s622 (T-227) | ring s628 (T-227) | Δ (pooled) |
|---|---|---|---|---|---|
| **Traitor win rate** | 33.1% | 35.3% | 33.1% | 36.1% | **−0.4 pp** |
| Traitor exposure rate | 62.8% | 59.4% | 62.8% | 59.7% | **−0.2 pp** |
| Accusation accuracy | 78.7% | 81.4% | 79.3% | 81.1% | −0.1 pp |
| Accusations resolved / game | 0.80 | 0.73 | 0.79 | 0.74 | ≈0 |

The **Blood-Pact triple** (traitor win / exposure / accuracy) on the lattice:
**s622 = 33.1 / 62.8 / 78.7; s628 = 35.3 / 59.4 / 81.4** — statistically indistinguishable from the T-227
ring (33.1 / 62.8 / 79.3 and 36.1 / 59.7 / 81.1). The rewire did not move the traitor economy.

---

## Tunable-vs-structural assessment

**Headline reading: the ring → lattice edge surgery barely moved balance.** The −4 forge-ring / +16
lattice edges added lateral connectivity but left the doom economy — the dominant driver of dark win % —
essentially where the 21-node ring left it. Pooled dark win moved **+0.5 pp** (52.8% ring → 53.3%
lattice); the doom/attrition split, mean rounds, captures, ransom-back and the whole Blood-Pact triple
are all within noise. So the two 4-spoke-era pathologies the task named do **not** appear, and the
lattice did **not** re-center the board toward the 18–22% band.

### 1. Shadowking win far too high — **STRUCTURAL, carried over from the 21-node topology; UNCHANGED by the rewire.**
Pooled dark win stays **~53%** (❌ vs 18–22%), a +0.5 pp non-move from the T-227 ring. This is the same
miss T-227 diagnosed: the 21-node board's **8 blight seams** (vs 4 on the 17-node lock) complete doom
faster and more often (doom_complete share ~53%, mean rounds ~10.5). The lattice rewire touched
**forge-ring lateral edges**, not the seam/doom economy, so it left this miss exactly where it was.
**Verdict: STRUCTURAL (doom-pacing / seam density), not a single-knob band-recenter** — identical
mechanism and disposition to T-227. No knob in `src/v3/tunables.ts` cleanly restores the band without
reshaping the doom front for 8 rays; a re-lock is deferred, user-gated post-playtest / V4 work.
**Not performed here — recorded only.**

### 2. Deliberate gambit fire crossed the guard — **NEW on the lattice; STRUCTURAL (adjacency-driven).**
Deliberate gambler-free Gambit fire rose **14.6–15.5% (ring, ✅) → 20.6–21.9% (lattice, ❌)**, a **+6.2 pp**
move that just clears the 20% upper bound. Mechanism: the **+16 lattice edges** give the central and
Keystone-adjacent nodes materially more neighbors, so more pieces **transit and sit the Keystone** each
game, and a larger share of that occupancy registers as a **deliberate Gambit-path claim**. It is an
**adjacency/contact-economy effect of the topology**, not a mis-scaled knob — the Gambit *conversion*
(deliberate fire → win) is unchanged and the top-archetype dominance guard still passes (26–27%), so the
extra fire is honest positional claiming, not a broken payoff. **Verdict: STRUCTURAL (denser central
adjacency), not a clean tunable** — the miss is a ~1–2 pp overshoot of a fire-rate band that measures
*how often a central node is claimed*, which the edge count directly sets; re-centering it would mean
re-shaping the lattice, not nudging a scalar. **Recorded, not tuned.**

### 3. Capture economy & attrition — **healthy, no failure mode.**
Captures/game 1.37 → 1.34 (−0.03, not a collapse), capture→ransom-back held at ~34%, attrition share of
SK wins is ~0.3% (already negligible on the ring). The extra adjacency did **not** dilute contact enough
to kill the capture loop, nor did it create an attrition-grind. **No action indicated.** One minor,
*healthy-shaped* shift: **last_standing endings roughly halved** (2.2% → 1.0%) — more connectivity means
fewer isolated survive-to-win finishes, with that share redistributing to doom/territory. Recorded as a
benign structural consequence, not a miss.

### 4. Blood-Pact — **unchanged, downstream of an unchanged doom economy.**
The traitor triple is statistically identical to the ring (Δ traitor win −0.4 pp, exposure −0.2 pp,
accuracy −0.1 pp). Since the traitor rides the same doom path and the rewire didn't touch seam density,
the traitor economy didn't move. Same "recorded, not tuned" disposition.

---

## Board-derivation audit (re-run on the lattice)

- **Node-id string literals in logic** — `grep -rnE '"(keep|approach|forge|holding|mid|keystone|outer)-'
  src/v3/ --include='*.ts' | grep -v '.gen.ts'` → **zero matches.** No hard-coded node ids in logic.
- **4-fold structural assumptions** — `grep -rnE '=== ?[34]\b|\.quadrant|% ?4' src/v3/ --include='*.ts'
  | grep -v '.gen.ts'` → the only hits are legitimate **board-derived quadrant routing**:
  `getNodeQuadrant` / `getNodeInQuadrant` `.quadrant` reads (per the T-226 audit), and
  `(quadrant + 3) % 4` in `getSpokeSeam` (board.ts:365) which walks the 4-quadrant corner-flanking to
  find the seam **by adjacency, not by id string**. The board has exactly **4 keeps / 4 forges / 4
  approaches** — an invariant the rewire did not change (it rewired forge-ring lateral edges, not
  quadrant count) — so `%4` = quadrant count is board-consistent, not a broken 4-spoke hardcode. **No
  `===3` / `===4` structural assumptions.**
- **Real `Math.random`** — `grep -rn 'Math.random' src/ | grep -v node_modules` → every hit is a
  comment / doc-string **forbidding** it. **Zero real calls.**

**Audit result (T-226 phrasing): zero node-id literals, zero `===3|4`/distance/`.quadrant`/`%4`
assumptions, no real `Math.random`.**

---

## Guardrail statement
Zero engine edits, zero tunable-value edits, zero `data/` edits were made to produce this reading.
`git diff` at commit touches only `sim-results/`, `docs/ROADMAP-V3.md`, and `docs/handoff/state.json`;
`src/v3/tunables.ts` and `src/v3/tunables.gen.ts` (and all of `src/`) are byte-identical to HEAD. The sim
read the rewired lattice automatically via the compiled `board.gen.ts` (source `data/board-v3.json`,
rewired in T-231, regenerated in T-232). Per the M2.6 exception this reading is **recorded only**;
re-establishing the §9 bands on the lattice is deferred, user-gated post-playtest / V4 work.
