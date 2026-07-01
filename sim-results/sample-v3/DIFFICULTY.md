# Difficulty Tiers — validation (Stage D1 calibration, D2 UI + re-validation)

The `difficulty` setting is a player-facing **DARK-STRENGTH** knob. Each tier maps to the
`DOOM_COST` curve (the pledge threshold the table must meet to avert a strike) through the existing
`getTunables`/`withTunables` seam — higher doomCost ⇒ the table must pledge more ⇒ a **stronger**
dark; lower ⇒ a **weaker** dark. It is a real lever on the dark, not a metric hack.

- **warlord (HARD, DEFAULT)** — the locked reference `DOOM_COST` values verbatim. A default game is
  **byte-identical** to the current locked competitive build.
- **knight (NORMAL)** — a gentler pledge threshold.
- **squire (EASY)** — the weakest pledge threshold.

## Tier table — pooled Shadowking (dark) win rate

Measured on the standard competitive sweep (2 base seeds × n40 × [2,3,4]p × 35 matchups = 4200
games/cell), per tier, at flawless play (errorRate 0 — the spec's calibration target) and under
typical human error (errorRate ~0.07). Reproduced in D2 (2026-07-01):

| tier             | errorRate 0 (flawless) | errorRate ~0.07 (human) |
|------------------|------------------------|-------------------------|
| warlord (HARD)   | 21.4% / 21.0%          | 25.0% / 24.7%           |
| knight  (NORMAL) | 17.5% / 18.9%          | 17.8% / 19.4%           |
| squire  (EASY)   | 13.2% / 13.7%          | 12.9% / 14.4%           |

(Format is `seed 20260622 / seed 20260623`.)

Flawless-play calibration lands on the spec's targets (~21 / ~17 / ~13) and the tiers stay monotone
at both error levels. HARD is the only tier that amplifies under human error (21 → 25) — a weaker
doomCost threshold is easy enough to block that error-degraded pledges still clear it, so NORMAL/EASY
stay ~flat. This is the honest shape of the lever, and it keeps the ladder monotone (25 / 18 / 13 at
~7% error), so a player who wants an easier or harder dark gets exactly that.

Structural note: at 2p the reference doomCost already **floors at 1 card** (the minimum threshold),
so the easier tiers cannot weaken the dark further at 2p — the lever only bites at 3p/4p, where the
threshold has headroom. The pooled separation is real and monotone; the 2p cell is fixed by the floor.

## Default byte-identity (re-confirmed in D2)

`npm run sim:v3` (no difficulty ⇒ `warlord`) → Shadowking win **0.21404761904761904** (PASS, §9
18–22 band). The produced `summary.json` **diffs byte-identical** to the locked
`sim-results/sample-v3/summary.json`. The default game is unchanged.

## D2 UI

The `src/ui-v3` new-game start screen adds a **Difficulty** `<select>` (Warlord / Knight / Squire)
with a one-line "how hard is the dark" hint; the chosen tier flows into `new GameSession(...)` →
`createGame` and is scoped around every engine step via `withDifficulty`, so it actually bites in
play. Covered by `tests/v3/ui-difficulty.test.ts` (jsdom: real `<select>` + Begin click →
session → createGame stores the tier).
