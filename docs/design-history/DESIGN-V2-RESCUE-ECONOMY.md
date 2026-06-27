# Design v2 — Rescue/Break Economy (Stage 5d)

> Status: Stage-5d mechanic + tuning patch. Authority for mechanics: `DESIGN-V2-ALGORITHM.md`
> §5.4 (Broken-with-teeth) + §4.2. Companion: `DESIGN-V2-FOCUS-GROUP-R2.md` §4 (the panel's
> "same win-currency template" prescription). Evidence: `docs/handoff/stage5-tuning-log.md`.
> Date: 2026-06-22

---

## 1. The problem (two coupled gates)

Rescues measure **0.07/game** vs a 2–4 target. Two root causes, both must be fixed:

1. **Breaks are too rare (~1/game).** Wounds accumulate ONLY from PvP raids (negative-sum, so rare)
   and lost STRIKEs — **the dark never wounds a warlord directly** (its strikes ash *nodes*, not
   players). At BREAK_THRESHOLD=6, almost nobody reaches Broken. With ~1 break/game you cannot reach
   2–4 rescues no matter how willing players are.
2. **Rescue pays the rescuer in a soft favor.** The rescuer spends 2 cards NOW (hard, scarce: cards
   are the pledge+combat currency) for a future favor (the rescued owes a min-pledge + can't attack
   for one round). In a game decided by hard present territory, that's a bad trade — so the AI skips
   it (conditional-rescue ~7%). The same inverted-currency disease the focus group named for the grudge.
   Also: rescue only fires when a broken ally is already *adjacent* — the AI never moves to reach one.

## 2. The fix — four coupled changes (the win-currency template + a break-vector)

### 2.1 The dark is a break-vector — `sequencer.ts` (`LANDED_STRIKE_WOUNDS`)
When an un-averted strike lands, the **named target takes wounds** `ceil((1-ratio) * LANDED_STRIKE_WOUNDS)`
and a break check runs. This gives the dark a way to actually *break the leader it hunts* — the
ALGORITHM §5.4 "a beaten lord's lost lands feed the enemy" loop, currently dormant — and creates
break opportunities from a NON-PvP source (so rescues don't depend on rare raiding). It also makes
"leading is dangerous" bite (the dark's named target is usually the leader).

### 2.2 Rescue pays the rescuer in win-currency — `actions.ts` (`RESCUE_TRIBUTE_BANNERS`)
On rescue, the rescued ally pays the rescuer a **banner tribute** (`min(RESCUE_TRIBUTE_BANNERS, their
banners)`) — banners are the claim/march currency, so this moves the rescuer's win math *this round*.
The "strings" now cut both ways: the rescued owes a forced min-pledge + a withheld attack (existing)
AND a hard tribute (new). Rescue becomes a real political deal (bind a rival as a one-round vassal and
take their banners), not charity. `RESCUE_COST` also drops (2→1, via the seam) to lower the barrier.

### 2.3 The AI can REACH a broken ally — `ai-player.ts`, `archetypes.ts`
New pathing **`bestStepTowardBrokenAlly`** + a rescue-seek step: a policy with `rescueWillingness` marches
toward the nearest reachable broken player, then RESCUEs when adjacent (the existing step). Without the
verb, rescue can only fire on incidental adjacency. Cooperative archetypes get higher `rescueWillingness`.

### 2.4 Seam-wire the break/rescue levers — `tunables.ts`
`BREAK_THRESHOLD` and `RESCUE_COST` move into the injectable `Tunables` seam (they were module
constants); plus the two new levers. So the Stage-5d search can sweep them like 5c/5-dark.

### 2.5 New/wired tunables (LOCKED values after the 5d search)
| Lever | Locked | Meaning |
|---|---|---|
| `BREAK_THRESHOLD` | 6 (wired, unchanged) | wounds to enter Broken |
| `RESCUE_COST` | 2 → **1** | cards to rescue (cheaper) |
| `BROKEN_MAX_ROUNDS` | 3 → **2** | faster auto-recovery (cuts all_broken draws) |
| `LANDED_STRIKE_WOUNDS` | 0 → **2** | the dark wounds its named target on a landed strike |
| `RESCUE_TRIBUTE_BANNERS` | 0 → **2** | banners the rescued pays the rescuer (win-currency) |

Plus AI: `bestStepTowardBrokenAlly` rescue-seek + raised archetype `rescueWillingness`.

## 3. Targets & guardrails (Stage 5d) — and the RESULT
- **Rescues 2–4/game** (the headline) — **NOT met pooled; STRUCTURALLY CAPPED.** Landed **0.98/game**
  (per-count 4p 1.85 / 3p 0.88 / 2p 0.21), up 14× from 0.07; conditional-rescue 7% → **51.5%**.
- **all_broken < ~5%** ✅ — **2.9%**.
- **SK-win 18–22%** ✅ — **19.1%** (2-seed stable 18.5%).
- **Guards hold** ✅ — even seat 26.0%, free-riding not rewarded; DK-kills 2.03 (5-dark intact).

**Why 2–4 pooled is unreachable (the structural cap):** breaking the leader makes the dark *thrash its
steered front* (more breaks ⇒ WEAKER dark, below the 18% floor), and frequent breaks pile into all_broken
draws faster than rescues can offset (baseline seats never rescue). The safe frontier is rescues ~1.0 at
all_broken ~3%; pushing to ~1.5 breaks all_broken (~8%) and SK-win (<18). The economy is nonetheless
**alive where it makes sense** (3–4p); 2p is naturally low (rescuing your sole rival is rare). Closing to
2–4 needs the §5 design change — escalated to the user. Evidence: `stage5-tuning-log.md` §5d.

## 4. Determinism & invariants (unchanged)
All new logic pure `f(state, seed)`: `bestStepTowardBrokenAlly` BFS in fixed order; the tribute and
landed-strike-wounds read live state; rescue-seek uses the existing `decisionRng`. Mutation flows
through `applyCommand` → executors. The dark's wound is telegraphed (the strike was announced).

## 5. Deferred
- **Ash-on-break timing.** A broken player's Holdings ash at break-time, so a later rescue can't save
  them. Deferring the ash to Dawn-if-still-broken would make rescue *protect the table* (urgency), a
  stronger rationale — but it's a bigger change; the tribute (§2.2) already supplies the win-currency.
  Revisit if the sim shows rescue still strategically marginal.
