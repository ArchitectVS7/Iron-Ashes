# 21-node baseline READING — v3 (T-227)

**This is the NEW v3 balance baseline. It REPLACES the voided 17-node §9 lock.**
Date: 2026-07-20. Board: the true 8-spoke topology (`data/board-v3.json`, 21 nodes = Keystone + 4
approaches + 4 forges + 8 outer + **4 new cardinal mid-belt nodes**, T-222…T-225). The 17-node §9
balance lock is **voided by the topology change** (user-authorized M2.5 exception, ROADMAP-V3.1-UI §3 /
T-221): the new board is a different game, so the old bands no longer apply. This is a **MEASUREMENT,
not a tuning stage** — every band miss below is **recorded, nothing is tuned. Zero tunable-value edits.**

Protocol: the canonical 2-seed sweep — base seeds **20260622** and **20260628**, each **n=40**, player
counts 2/3/4, both modes (competitive + `--bloodpact`). Identical seeds/AI to the old lock, so every
delta below is attributable purely to the 17→21-node topology change. Sub-run REPORTs live under
`comp-s20260622/`, `bp-s20260622/`, `comp-s20260628/`, `bp-s20260628/`.

The old 17-node lock evidence is preserved on disk at `sim-results/v3-s20260622-n40{,-bp}` and
`sim-results/v3-s20260628-n40{,-bp}` (restored after this run overwrote them — those dirs still hold the
17-node numbers as the historical regression gate).

---

## Headline — competitive (flag OFF, the shipped game)

| Metric | 21-node s622 | 21-node s628 | 17-node s622 (old lock) | 17-node s628 (old lock) | Δ (pooled, new−old) |
|---|---|---|---|---|---|
| **Shadowking (dark) win — pooled** | **53.4%** ❌ | **52.3%** ❌ | 18.9% ✅ | 18.3% ✅ | **+34.3 pp** |
| SK win 2p / 3p / 4p | 44.8 / 58.6 / 56.7 | 41.9 / 58.6 / 56.3 | 17.1 / 23.3 / 16.4 | 16.0 / 23.3 / 15.7 | 2p +27, 3p +35, 4p +40 |
| Mean rounds | 10.62 ✅ | 10.68 ✅ | 12.20 | 12.19 | **−1.55 rounds** |
| **Dark win by path — doom / attrition** | **53.1 / 0.3** | **52.0 / 0.2** | 17.8 / 1.1 | 17.4 / 1.0 | doom **+34.9 pp**; attrition **−0.8 pp** |
| Attrition share of SK wins | 0.5% | 0.5% | 6.0% | 5.3% | **−5.2 pp** |
| doom_complete ending share | 53.1% | 52.0% | 17.8% | 17.4% | +34.9 pp |
| territory_victory ending share | 33.8% | 34.8% | 60.5% | 60.7% | −26.3 pp |
| last_standing ending share | 2.0% | 2.4% | 9.8% | 10.1% | −7.7 pp |
| Mean nodes ashed (doom progress) | 4.83 | 4.86 | 5.56 | 5.55 | −0.71 |
| **Captures per game** | **1.32** | **1.42** | 1.57 | 1.64 | −0.24 |
| **Capture→ransom-back rate** | **33.1%** | **35.6%** | 32.8% | 34.3% | +0.8 pp |
| Kill-the-Dark fire rate | 17.0% | 17.6% | 20.2% | 21.1% | −3.4 pp |
| Deliberate gambit fire (gambler-free) | 14.6% ✅ | 14.8% ✅ | 17.5% ✅ | 17.9% ✅ | −3.2 pp |
| Top-archetype win guard (≤30%) | 26.5% ✅ | (≤30) ✅ | 35.3% ❌ | 37.4% ❌ | now PASS |

## Headline — Blood Pact (flag ON, advanced toggle)

| Metric | 21-node s622 | 21-node s628 | 17-node s622 (old) | 17-node s628 (old) | Δ (pooled) |
|---|---|---|---|---|---|
| **Traitor win rate** | **33.1%** | **36.1%** | 15.8% | 17.2% | **+18.1 pp** |
| Traitor exposure rate | 62.8% | 59.7% | 69.4% | 66.9% | **−6.9 pp** |
| Accusation accuracy | 79.3% | 81.1% | 78.1% | 80.3% | +1.0 pp |
| Accusations resolved / game | 0.79 | 0.74 | 0.89 | 0.83 | −0.10 |

The **Blood-Pact triple** (traitor win / exposure / accuracy) on the 21-node board:
**s622 = 33.1 / 62.8 / 79.3; s628 = 36.1 / 59.7 / 81.1.**

---

## Tunable-vs-structural assessment

The task named two 4-spoke-era failure modes to watch. **Neither is what happened here** — the 21-node
board fails in a *different, doom-pacing* direction:

### 1. Attrition-dominant dark wins? — **NO.** The opposite.
Attrition share of SK wins *fell* 5.3–6.0% → **0.5%**, and the doom/attrition split went **17.8/1.1 →
53.1/0.3**. The dark is winning **almost entirely by completing doom (the Keystone-assault path is
exactly what §6 wants), not by timing out**. So the "dark grinds the table down by attrition" pathology
is not present — if anything it is cleaner than the old lock. **Structural, but a *healthy-shaped* win
path** — the problem is only the *magnitude*, not the *route*.

### 2. Dead capture economy? — **NO.** Alive and healthy.
Captures/game 1.57–1.64 → **1.32–1.42** (a modest −0.24, not a collapse toward 0), and
**capture→ransom-back held / rose to 33.1–35.6%** (vs 32.8–34.3%). The +4 mid-belt nodes did **not**
dilute contact/adjacency enough to kill the capture loop. **Not a failure mode — no action indicated.**

### 3. The actual miss — dark win % is far too high: **STRUCTURAL (doom-pacing), not a clean tunable.**
Pooled dark win jumped **~18.6% → ~52.9% (+34 pp)** while **mean rounds dropped 12.2 → 10.65** and
**doom_complete share tripled (17.6% → 52.5%)**. The signature is unambiguous: on the 8-ray board **doom
completes much faster and far more often**. Mechanism: the topology change added **4 cardinal mid-belt
nodes and wired 8 blight seams** (T-224) where the 17-node board had 4. More blight seams = more doom
front per Act, so the dark reaches doom-completion *before* the table can convert its territory lead
(territory_victory fell 60.6% → 34.3%, and doom now beats the table to the finish). Nodes-ashed-at-end
actually *dropped* (5.56 → 4.83) — i.e. doom completes on **fewer** total ashings, consistent with a
**shorter, denser doom path** rather than a longer one.

**Verdict: STRUCTURAL, not a single-knob band-recenter.** Re-centering to 18–22% would *not* be a clean
tunable move because the miss is driven by the **doom node/seam economy the topology itself defines** (8
seams vs 4), which is coupled to the blight-threshold Act pacing and the doom-completion node count — no
single existing knob in `src/v3/tunables.ts` cleanly restores the band without re-shaping the whole doom
front. A future re-lock (post-playtest / V4, explicitly out of M2.5 scope) would likely need a
*topology-aware* doom recalibration (seam density, doom-completion requirement, or Act-advance
thresholds re-derived for 8 rays), not a scalar nudge. **Not performed here — recorded only.**

### 4. Blood-Pact traitor win doubling — **STRUCTURAL, downstream of #3.**
Traitor win 16.5% → 34.6% (pooled) is the *same doom acceleration seen from the traitor's chair*: an
easier, faster doom path is easier for the hidden traitor to ride to completion before exposure.
Exposure fell only −6.9 pp and accuracy is essentially flat (~80%), so the accusation *machinery* is
intact — the traitor simply reaches doom sooner. Same root cause as #3; same structural verdict; same
"recorded, not tuned" disposition.

---

## Guardrail statement
Zero engine edits, zero tunable-value edits, zero `data/` edits were made to produce this reading. The
sim read the new 21-node board automatically via the compiled `board.gen.ts` (source
`data/board-v3.json`, built in T-222). Per the M2.5 exception this reading **becomes the new baseline**;
re-establishing the §9 bands on the new board is deferred, user-gated post-playtest / V4 work.
