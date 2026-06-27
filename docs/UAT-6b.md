# UAT — Stage 6b Human Playtest

> **Purpose.** The deterministic sim has locked *balance and incentives*. This UAT validates the
> things only a human at the keyboard can: that every control works through the real UI, that the
> screen tells you what you need to decide, and that the shipped mechanics *feel* the way the design
> claims. This is the gate before the styled UI pass (7k) and the human-gated experience work (7f–7j).
>
> **Companion docs:** felt-experience claims live in [`human-playtest-checklist.md`](human-playtest-checklist.md)
> (folded into §4 below); rules in [`USER-MANUAL.md`](USER-MANUAL.md); the why in [`GAME-DESIGN.md`](GAME-DESIGN.md).

## Ground rules for the tester (non-negotiable)

These come straight from the project's test-intent rules — a UAT that cheats hides the bug a real
player would hit:

1. **Drive everything through the UI.** Click the buttons, click the board nodes. Never reach into
   the engine or console to make something happen.
2. **Test the trivial actions too.** "End turn" and "New game" are one click — they get a row.
3. **A statistical anomaly is a bug, not a note.** If you expect to see Forge tolls / travel hazards /
   accusations and you play several games without one firing, **stop and flag it** — don't write
   "not observed" and move on.
4. **When a click does nothing or the wrong thing, that's a FAIL** — record it, don't route around it.
5. **Think like a player.** Upgrade before you fight, react to being hunted, notice when you've been
   broke for 5 rounds. A scripted click-through is not a playtest.

## How to launch

```bash
npm run dev        # Vite dev server — open the printed localhost URL
```

Start screen fields: **Players** (2/3/4), **Mode** (Competitive / Blood Pact), **Seed** (default 42).
You are **Player 1**; all other seats are AI. **Seed 42 is fully deterministic** — same seed + same
clicks ⇒ same game, so when you find a bug, note the seed and your move sequence and it reproduces.

**Record results inline** in the tables below (✅ / ❌ / ⚠️ + a note). When done, copy the §5 summary
verdicts into the relevant `DESIGN-V2-*.md` / `GAME-DESIGN.md` and into `state.json` `openRisks`.

---

## Run plan (three games, ~60–75 min total)

| Run | Config | What it primarily exercises |
|----|--------|------------------------------|
| **A** | Competitive · 4 players · seed 42 | Full control surface, the core loop, onboarding, a full game to a terminal end |
| **B** | Blood Pact · 4 players · seed 7 | Suspicion Log, Audit, Accuse, the traitor cover/sabotage tension |
| **C** | Competitive · 2 players · seed 99 | Session length / pacing, the Gambit endgame, replay via New game |

Play each run to a real ending (someone wins, or the dark wins, or the round cap). Don't quit early.

---

## §1 — Start & shell (do once)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1.1 | Load the dev URL | Start screen: title, tagline, Players/Mode/Seed, **Begin** | |
| 1.2 | Change Players to 2, then 3, then 4 | Selector holds the value | |
| 1.3 | Toggle Mode to Blood Pact and back | Selector holds the value | |
| 1.4 | Click **Begin** (Run A config) | Board + side HUD render; no console errors | |
| 1.5 | Read the HUD header | Shows `Round 1/​cap · Act WHISPER · Phase THREAT` and `Dark patience` | |

---

## §2 — The core loop (Run A, every round until the game ends)

Walk these three phases each round. The first round is the onboarding round — read the coach tips.

### THREAT phase
| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.1 | Click **Reveal the dark's intent →** | A villain line in quotes appears | |
| 2.2 | Read the threat detail | Shows which **node** it strikes, which **player** it names, and a **threshold** number | |
| 2.3 | (Act WHISPER only) | A **Whisper coach tip** explains telegraph→pledge | |
| 2.4 | Click **To the Pledge →** | Advances to the Pledge panel | |

### PLEDGE phase
| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.5 | Read the threshold line | "Table must reach **N** effective cards" | |
| 2.6 | Check your weight note | Either "full value", a **Crown discount ×**, or a **Gambit surcharge ×0.25** | |
| 2.7 | Look at the pledge buttons `0..hand` | Each shows `n → effective`; one is marked **suggested** | |
| 2.8 | Pledge **less** than suggested once (deliberately under-pledge) | The strike should land — narration shows `lands at X%` and a node may ash | |
| 2.9 | On a later round, pledge **at/above** suggested | Narration shows `strike is held — met the threshold` | |
| 2.10 | (Crown rounds) Hold the Crown and pledge | The discount actually reduces your effective count vs the same cards uncrowned | |

### ACTION phase (your turn)
| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.11 | Read the panel title | "Your turn — N actions · ⚑banners · stance" | |
| 2.12 | Read the **March cost readout** | Each adjacent node lists `⚑cost`; ashed/toll nodes show the surcharge | |
| 2.13 | **March:** click an adjacent board node | Your Warlord moves there; an action is spent; costs update | |
| 2.14 | Try to March to a **non-adjacent** node | Rejected with an error line (⛔), no move, no action lost | |
| 2.15 | End the turn with **End turn** | AI seats take their turns ("Rivals are moving…"), then next round | |

---

## §3 — Full control coverage (the 6a parity surface)

Every discrete player action must be exercised **through its button at least once** across the runs.
Some need a setup (be on the right node / have banners / a Broken ally). Tick each when you fire it.

| Control | How to make it appear | Fired? | Worked? | Note |
|---------|----------------------|--------|---------|------|
| **March (Warlord)** | Click any adjacent node | | | |
| **Claim** | Stand on an unowned holding/forge with ⚑≥1 | | | |
| **Strike** | Stand on a node with dark forces | | | |
| **Raid** | Stand on a node with a rival Warlord | | | |
| **Rescue** | Be on/adjacent to a Broken ally with enough cards | | | |
| **Recruit a Herald** | Martial stance + ⚑ ≥ recruit cost | | | |
| **Parley** | Political stance + Herald at the front | | | |
| **March Herald** | Have a Herald on the board (separate from Warlord) | | | |
| **Swear an Oath** | Oath-free + an oath-free unbroken rival exists | | | |
| **Break your Oath** | Hold an Oath at least one Dawn old | | | |
| **Pass / End turn** | Always available | | | |
| **Audit** (Blood Pact) | Run B: ⚑ ≥ audit cost + pledge history exists | | | |
| **Accuse** (Blood Pact) | Run B: not locked out | | | |
| **New game** | At game over | | | |

> If any control **never becomes available** across all three runs, that is a coverage failure to
> investigate (per ground rule 3) — note which one and what state you were in.

### HUD displays — confirm each shows real, changing data
| Display | Confirm | OK? | Note |
|---------|---------|-----|------|
| Standings table | Land / ⚑ / Hand / State tags update per player | | |
| State tags | Crown ♛, Broken, wounds `n/​break`, stance 🕊/⚔, Oath ⛓P#, grudge ☠n, **You** | | |
| Your hand | Card values shown, count matches | | |
| Oaths block | Appears when an Oath exists; shows "matures in N" | | |
| The Ledger | Appears when the dark holds a grudge; sorted by weight | | |
| Gambit alarm | Spans the top when a player seizes/names the Keystone | | |
| Narration feed | Villain lines, pledge beats, node-ashed, act-escalation | | |
| Board | Node ownership colors, blight pips, Herald piece, ash | | |

---

## §4 — Felt-experience claims (the reason this can't be a sim)

For each, give a verdict: **KEEP** (lands as designed) / **CHANGE** (note how) / **CUT**. These mirror
`human-playtest-checklist.md` — record the verdict back there too.

| # | Claim to feel | Watch for | Verdict + note |
|---|---------------|-----------|----------------|
| 4.1 | **The Pledge is a real squeeze** | Do you actually agonize over how many cards to hold back? Does free-riding tempt you? | |
| 4.2 | **Being hunted (the Ledger) bites** | When ☠ appears on you, does it change how you play? | |
| 4.3 | **Sealed-pledge volunteer's dilemma** (Run C, Gambit) | When a rival seizes the Keystone, is "do I spend cards to bail them out, not knowing if anyone else will?" tense? | |
| 4.4 | **The Herald lone-runner is a scene** | Does marching the vulnerable Herald to the front feel like a watched journey? Does intercepting one feel like a coup? | |
| 4.5 | **Blood Pact accusation is a gamble** (Run B) | Does the wrong-accusation cost create "are we SURE?" hesitation? Do you Audit before accusing, or accuse on a hunch and get burned? | |
| 4.6 | **The traitor's cover-vs-sabotage** (Run B) | If you suspect the traitor, does reading the Suspicion Log (pattern of ∅/▁) feel like detective work? | |
| 4.7 | **Onboarding gets you playing** | After Act WHISPER ends and the coach stops, do you know what to do? Or did the help vanish too early? | |
| 4.8 | **Session length** | Wall-clock each run. Target 30–45 min for 2–4p. Note turn-length creep / analysis paralysis. | |
| 4.9 | **The villain has a voice** | Do the telegraph lines + reckoning feel like a character, or a script you solved in 2 games? | |

---

## §5 — Summary verdict (fill in after all three runs)

**Runs completed:** A ☐  B ☐  C ☐   ·   **Wall-clock:** A ___ / B ___ / C ___ min

**Blocking bugs (must fix before styled UI):**
- …

**Controls that failed or never appeared:**
- …

**Displays that were wrong / missing / confusing:**
- …

**Felt-experience verdicts (→ copy into DESIGN-V2-*.md + human-playtest-checklist.md):**
- 4.1 … 4.9: …

**Top UI requests for the styled pass (7k) / experience work (7f–7j):**
- …

**Overall:** ☐ Ready for styled UI  ☐ Functional bugs to fix first  ☐ Design rethink needed

---

*When this is filled in: record the verdicts into the design docs + `state.json` `openRisks`, then
the next stage is the styled UI (7k) plus any experience-layer items the playtest surfaced (7f–7j).*
