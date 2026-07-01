/**
 * GameSession (v3) — the UI's driver over the v3 engine (Stage 3i-b).
 *
 * Render-from-state contract: the session owns a single `GameState`, and EVERY mutation goes
 * through the one `applyCommand` reducer (ALGORITHM §7). The human occupies seat 0; all other seats
 * are AI, driven by the pure `f(state, seed)` choosers. The view never mutates state — it renders
 * from `session.observable()` (the fog-applied projection, §7 D2) and calls these reducer-routed
 * methods.
 *
 * A single `pump()` sequences the phases: it auto-pledges/auto-acts for AI seats (and for the human
 * once ELIMINATED — spectator/Wraith mode) and stops only at genuine human decision points:
 *   • THREAT      — the human clicks to face the dark (and, as a Wraith, sets its afterlife input).
 *   • PLEDGE      — the living human chooses a pledge.
 *   • ACTION      — the living human's turn.
 *   • BEQUEST     — the human is flagged `deposed` and about to fall: it names its exit beat first.
 *
 * 3i-b adds: every ACTION verb, the RAID capture ELECTION, the Blood-Pact AUDIT/ACCUSE surface, the
 * P0-11 legibility projections (exposure meter, projected combat margin), and the eliminated-human
 * WRAITH input + DEATH BEQUEST — all routed through applyCommand (the last two via the sim-neutral
 * SET_WRAITH_INPUT / SET_BEQUEST override commands).
 */

import {
  createGame,
  applyCommand,
  choosePledge,
  runAIPledge,
  runAITurn,
  chooseAccusationVote,
  getEffectivePledgeWeight,
  observableState,
  TUNABLES,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
  effectiveCaptureMargin,
  trailingDefenseBonus,
  stewardHomeDefenseBonus,
  livingStrongholdCount,
  chooseRaidAttackCommit,
  chooseCombatCommit,
  legalRaidTargets,
  canCapture,
  type Command,
  type GameEvent,
  type GameMode,
  type GameState,
  type ObservableState,
  type BequestChoiceInput,
  type WraithInputKind,
} from '../v3/index.js';

/** A short on-screen narration line (villain voice, beats, results). */
export interface Narration {
  readonly text: string;
  readonly kind: 'villain' | 'beat' | 'system';
}

/** A player's legibility exposure level (§13 P0-11). */
export type Exposure = 'safe' | 'can-lose-land' | 'can-be-deposed' | 'deposed' | 'eliminated';

/** The projected outcome of a RAID BEFORE committing (§13 P0-11) — cards are engine-auto (4g). */
export interface RaidProjection {
  readonly atkPower: number;
  readonly defPower: number;
  /** attacker margin: > 0 ⇒ the attacker is projected to win (before any defender Last Stand). */
  readonly margin: number;
  /** The standing-scaled margin a capture needs (§5.2). */
  readonly captureMargin: number;
  /** Whether TAKE_LAND is projected to succeed. */
  readonly takeLand: boolean;
  /** Whether a legal ROUT target is present (and the raid is projected to win). */
  readonly rout: boolean;
  /** Whether CAPTURE is projected legal (margin cleared + a legal, non-immune target). */
  readonly capture: boolean;
}

export class GameSession {
  state: GameState;
  readonly humanIndex = 0;
  readonly seed: number;

  /** Called after any state change so the host can re-render. */
  onChange: () => void = () => {};

  /** The most recent reducer events (for one-shot beats / voice lines). */
  recentEvents: GameEvent[] = [];
  /** A rolling narration feed shown in the HUD. */
  narration: Narration[] = [];
  /** Last rejected-input message (e.g. an illegal MARCH), shown then cleared. */
  lastError: string | null = null;

  /** True when the flow has paused for the human to name its Death Bequest (§5.5) before falling. */
  awaitingBequest = false;
  /** The human's last-seen exposure — drives the one-shot "the tide has reached you" beat (P0-11). */
  private prevHumanExposure: Exposure | null = null;

  constructor(playerCount: number, mode: GameMode, seed: number) {
    this.seed = seed;
    // Seat 0 is the lone human; the rest are AI.
    this.state = createGame(playerCount, mode, seed, 1);
    this.pump();
  }

  /** The fog-applied projection the view renders from (§7 D2) — never leaks hidden tokens/seed. */
  observable(): ObservableState {
    return observableState(this.state, this.humanIndex);
  }

  // ─── Core dispatch ──────────────────────────────────────────────

  private dispatch(cmd: Command): void {
    const result = applyCommand(this.state, cmd);
    this.state = result.state;
    this.recentEvents = result.events;
    this.absorbNarration(result.events);
  }

  /** Pull villain lines and notable beats out of the event stream (villain-voice / scene beats). */
  private absorbNarration(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'SK_VOICE_LINE') {
        this.narration.unshift({ text: e.line, kind: 'villain' });
      } else if (e.type === 'PLEDGE_RESOLVED') {
        this.narration.unshift({
          text: e.averted
            ? `The strike is held — the table met the threshold (${e.effective.toFixed(1)}/${e.threshold}).`
            : `The strike lands at ${Math.round((1 - e.ratio) * 100)}% — only ${e.effective.toFixed(1)}/${e.threshold} pledged.`,
          kind: 'beat',
        });
      } else if (e.type === 'NODE_ASHED') {
        this.narration.unshift({ text: `A node falls to ash.`, kind: 'beat' });
      } else if (e.type === 'PLAYER_ELIMINATED') {
        this.narration.unshift({ text: `Player ${e.playerIndex + 1} is eliminated — a Wraith joins the dark.`, kind: 'system' });
      } else if (e.type === 'ACCUSATION_RESOLVED') {
        this.narration.unshift({
          text:
            e.outcome === 'correct'
              ? `The accusation lands — the traitor is exposed!`
              : e.outcome === 'wrong'
                ? `Wrong! Player ${e.accused + 1} is vindicated; the accusers pay.`
                : `The accusation fizzles — no consensus.`,
          kind: 'system',
        });
      } else if (e.type === 'ACT_ESCALATED') {
        this.narration.unshift({
          text: e.newAct === 'MARCH'
            ? `The war deepens — the Act turns to MARCH. The last stronghold is no longer safe; the dark can now DEPOSE.`
            : `The war deepens — the Act turns to ${e.newAct}.`,
          kind: 'beat',
        });
      } else if (e.type === 'CROWN_CHANGED') {
        this.narration.unshift({
          text:
            e.newHolder === null
              ? `The Crown falls — no one wears it.`
              : `The Crown passes to Player ${e.newHolder + 1} — and with it, the target on their back.`,
          kind: 'beat',
        });
      } else if (e.type === 'PLAYER_ACTED') {
        this.absorbActBeat(e);
      } else if (e.type === 'GAME_OVER') {
        this.narration.unshift({ text: this.describeEnding(), kind: 'system' });
      }
    }
    this.narration = this.narration.slice(0, 10);
  }

  /** Stage CAPTURE and KILL-THE-DARK as scene beats out of the PLAYER_ACTED detail bag (§13 P0-11). */
  private absorbActBeat(e: Extract<GameEvent, { type: 'PLAYER_ACTED' }>): void {
    const d = (e.details ?? {}) as Record<string, unknown>;
    if (e.action === 'RAID' && d.capture !== undefined) {
      this.narration.unshift({
        text: `⛓ CAPTURE — Player ${e.playerIndex + 1} drags a rival's retainer into their hold.`,
        kind: 'beat',
      });
    } else if (e.action === 'ASSAULT_HEART') {
      const hp = Number(d.heartHp ?? 0);
      const hit = Number(d.hit ?? 0);
      this.narration.unshift({
        text: hp <= 0
          ? `☀ THE HEART BREAKS — Player ${e.playerIndex + 1} lands the blow that shatters the dark's heart!`
          : `⚔ Player ${e.playerIndex + 1} strikes the dark's heart (${hit} damage · ♥${hp} left).`,
        kind: 'beat',
      });
    } else if (e.action === 'PASS' && d.bequest !== undefined) {
      this.narration.unshift({
        text: d.bequest === 'curse'
          ? `A dying curse — Player ${e.playerIndex + 1} marks a hated rival for the dark.`
          : `A final gift — Player ${e.playerIndex + 1} bequeaths ${d.bequest === 'captive' ? 'a captive' : 'their cards'} to an ally, sealing a posthumous Oath.`,
        kind: 'beat',
      });
    }
  }

  // ─── Phase flow ─────────────────────────────────────────────────

  get phase(): GameState['phase'] { return this.state.phase; }
  get isOver(): boolean { return this.state.gameEndReason !== null; }
  get isHumanAlive(): boolean { return !this.state.players[this.humanIndex].isEliminated; }

  /** The human has a live ACTION turn with actions left (the action panel renders). */
  get isHumanTurn(): boolean {
    const human = this.state.players[this.humanIndex];
    return this.state.phase === 'ACTION'
      && this.state.activePlayerIndex === this.humanIndex
      && !human.isEliminated
      && human.actionsRemaining > 0;
  }

  /** The human is an eliminated Wraith and it's the THREAT window to set its afterlife input (§5.5). */
  get isWraithWindow(): boolean {
    return !this.isHumanAlive
      && this.state.phase === 'THREAT'
      && this.state.shadowking.wraiths.some(w => w.seat === this.humanIndex)
      && !this.isOver;
  }

  /**
   * The single flow driver: advance the game as far as it can WITHOUT a human decision, resolving AI
   * pledges/turns (and, once the human is eliminated, everything but the THREAT click). Stops at the
   * human's decision points. Idempotent-safe via a guard.
   */
  private pump(): void {
    let guard = 0;
    while (!this.isOver && guard < 512) {
      guard++;
      switch (this.state.phase) {
        case 'THREAT':
          // Always human-gated: the human clicks to face the dark (its Wraith input, if any, is set
          // beforehand). advanceFromThreat() drives the THREAT→PLEDGE step.
          this.updateExposureBeat();
          return;

        case 'PLEDGE': {
          if (this.isHumanAlive) { this.updateExposureBeat(); return; } // wait for the human pledge
          // Human eliminated — auto-pledge every living AI seat, then resolve.
          this.autoPledgeAI();
          this.dispatch({ type: 'ADVANCE_PHASE' });
          continue;
        }

        case 'ACTION': {
          const active = this.state.activePlayerIndex;
          const p = this.state.players[active];
          if (active === this.humanIndex && !p.isEliminated && p.actionsRemaining > 0) {
            this.updateExposureBeat();
            return; // the human's turn
          }
          if (active !== this.humanIndex && !p.isEliminated && p.actionsRemaining > 0) {
            this.state = runAITurn(this.state, active, this.seed).state;
            continue;
          }
          // Active seat is exhausted or eliminated.
          if (this.state.turnOrderPosition >= this.state.turnOrder.length) {
            // ACTION phase is complete — the next step is DAWN, where deposals resolve. If the human
            // is flagged to fall this Dawn, pause for its Death Bequest first (P0-11 scene beat).
            const me = this.state.players[this.humanIndex];
            if (me.deposed && !me.isEliminated && this.state.pendingBequests?.[this.humanIndex] === undefined) {
              this.awaitingBequest = true;
              this.updateExposureBeat();
              return;
            }
            this.dispatch({ type: 'ADVANCE_PHASE' }); // ACTION → DAWN → next round's THREAT
            continue;
          }
          // Defensive nudge (a 0-action/eliminated non-terminal seat): PASS to advance the pointer.
          this.dispatch({ type: 'PLAYER_ACTION', playerIndex: active, action: { type: 'PASS' } });
          continue;
        }

        case 'DAWN':
          this.dispatch({ type: 'ADVANCE_PHASE' });
          continue;
      }
    }
  }

  /** Auto-pledge every living AI seat that hasn't pledged this round (the pure chooser). */
  private autoPledgeAI(): void {
    for (const p of this.state.players) {
      if (p.index === this.humanIndex || p.isEliminated) continue;
      if (this.state.pledgeBuffer.some(e => e.playerIndex === p.index)) continue;
      this.state = runAIPledge(this.state, p.index, this.seed).state;
    }
  }

  /** THREAT → PLEDGE. Runs the Shadowking telegraph + the Wraith sweep (consuming any human input). */
  advanceFromThreat(): void {
    if (this.state.phase !== 'THREAT' || this.isOver) return;
    this.dispatch({ type: 'ADVANCE_PHASE' });
    this.pump();
    this.onChange();
  }

  /**
   * Submit the LIVING human's pledge, auto-pledge every AI seat, resolve the Pledge, then run the
   * flow up to the human's next decision point.
   */
  submitHumanPledge(amount: number): void {
    if (this.state.phase !== 'PLEDGE' || this.isOver || !this.isHumanAlive) return;
    this.lastError = null;
    try {
      this.dispatch({ type: 'SUBMIT_PLEDGE', playerIndex: this.humanIndex, amount });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.autoPledgeAI();
    this.dispatch({ type: 'ADVANCE_PHASE' }); // PLEDGE → ACTION (the threshold beat)
    this.pump();
    this.onChange();
  }

  /** The human's pledge counts at this weight (Crown discount / Gambit surcharge). */
  humanPledgeWeight(): number {
    return getEffectivePledgeWeight(this.state, this.humanIndex, TUNABLES.CROWN_PLEDGE_DISCOUNT);
  }

  /** What the engine's AI would pledge for the human (a hint, not binding). */
  suggestedHumanPledge(): number {
    return choosePledge(this.state, this.humanIndex, this.seed);
  }

  /** Apply a human ACTION; then advance AI seats / phase as needed. */
  humanAction(cmd: Command): void {
    if (!this.isHumanTurn || this.isOver) return;
    this.lastError = null;
    try {
      this.dispatch(cmd);
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.pump();
    this.onChange();
  }

  // ─── Blood Pact: accusation / audit ─────────────────────────────

  /** Human opens an accusation; AI seats then vote via the pure chooser. */
  humanAccuse(accused: number): void {
    if (this.state.mode !== 'blood_pact' || this.isOver) return;
    this.lastError = null;
    try {
      this.dispatch({ type: 'INITIATE_ACCUSATION', accuserIndex: this.humanIndex, accusedIndex: accused });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.resolveAIVotes();
    this.pump();
    this.onChange();
  }

  /** Have every required AI voter weigh in on the open accusation. */
  private resolveAIVotes(): void {
    let guard = 0;
    while (this.state.accusationState && !this.isOver && guard < 8) {
      guard++;
      const acc = this.state.accusationState;
      const pending = this.state.players.find(
        p => p.index !== acc.accused && !p.isEliminated && !acc.votes.some(v => v.playerIndex === p.index),
      );
      if (!pending) break;
      const agree = chooseAccusationVote(this.state, pending.index, this.seed);
      this.dispatch({ type: 'ACCUSATION_VOTE', playerIndex: pending.index, agree });
    }
  }

  // ─── Wraith input + Death Bequest (§5.5, §13 P0-11) ──────────────

  /** The human Wraith names its ONE bounded afterlife input for the coming strike (routed as a cmd). */
  setWraithInput(kind: WraithInputKind): void {
    this.lastError = null;
    try {
      this.dispatch({ type: 'SET_WRAITH_INPUT', playerIndex: this.humanIndex, kind });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
    }
    this.onChange();
  }

  /** The human names (or updates) its Death Bequest. If the flow was paused for it, resume. */
  setBequest(choice: BequestChoiceInput): void {
    this.lastError = null;
    try {
      this.dispatch({ type: 'SET_BEQUEST', playerIndex: this.humanIndex, choice });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    if (this.awaitingBequest) {
      this.awaitingBequest = false;
      this.pump();
    }
    this.onChange();
  }

  /** The human's currently-recorded Wraith input for this round, or null. */
  wraithInput(): WraithInputKind | null {
    return this.state.wraithInputs?.[this.humanIndex] ?? null;
  }

  /** The human's currently-recorded Death Bequest, or null. */
  pendingBequest(): BequestChoiceInput | null {
    return this.state.pendingBequests?.[this.humanIndex] ?? null;
  }

  // ─── Legibility projections (§13 P0-11) ──────────────────────────

  /** A player's exposure meter (§13 P0-11): SAFE → can-lose-land → can-be-DEPOSED → deposed. */
  exposure(seat: number): Exposure {
    const p = this.state.players[seat];
    if (p.isEliminated) return 'eliminated';
    if (p.deposed) return 'deposed';
    const strongholds = livingStrongholdCount(this.state, seat);
    // Whisper protects the last stronghold (§12 #13) — the dark cannot depose yet.
    if (this.state.act === 'WHISPER') return strongholds >= 2 ? 'can-lose-land' : 'safe';
    if (strongholds <= 1) return 'can-be-deposed';
    return 'can-lose-land';
  }

  /** Push the one-shot "the tide has reached you" beat when the human first becomes depose-eligible. */
  private updateExposureBeat(): void {
    const now = this.exposure(this.humanIndex);
    const prev = this.prevHumanExposure;
    if (now === 'can-be-deposed' && prev !== 'can-be-deposed' && prev !== 'deposed' && prev !== 'eliminated') {
      this.narration.unshift({
        text: 'The tide has reached you. One more lost stronghold and you fall — the dark can DEPOSE you now.',
        kind: 'system',
      });
    }
    this.prevHumanExposure = now;
  }

  /** Project a RAID's outcome BEFORE committing (§13 P0-11). Cards are engine-auto (4g note). */
  raidProjection(defenderIndex: number): RaidProjection {
    const node = this.state.players[this.humanIndex].warlordNodeId;
    const atkBase = getPlayerPowerAtNode(this.state, this.humanIndex, node);
    const defBase = getPlayerPowerAtNode(this.state, defenderIndex, node);
    const defenseBonus =
      trailingDefenseBonus(this.state, this.humanIndex, defenderIndex) +
      stewardHomeDefenseBonus(this.state, defenderIndex, node);
    const defCards = chooseCombatCommit(this.state.players[defenderIndex].hand, defBase, atkBase, 1);
    const defPower = defBase + sum(defCards) + defenseBonus;

    // TAKE_LAND / ROUT are sized thin; CAPTURE sizes up to clear the margin — project each honestly.
    const landCards = chooseRaidAttackCommit(this.state, this.humanIndex, defenderIndex, node, false);
    const landPower = atkBase + sum(landCards);
    const landMargin = landPower - defPower;

    const capCards = chooseRaidAttackCommit(this.state, this.humanIndex, defenderIndex, node, true);
    const capPower = atkBase + sum(capCards);
    const capMarginVal = capPower - defPower;
    const captureMargin = effectiveCaptureMargin(this.state, this.humanIndex);

    const targets = legalRaidTargets(this.state, defenderIndex, node);
    const routTarget = targets.length > 0;
    const captureLegal = targets.some(id => canCapture(this.state, defenderIndex, node, id));

    return {
      atkPower: landPower,
      defPower,
      margin: landMargin,
      captureMargin,
      takeLand: landMargin > 0,
      rout: landMargin > 0 && routTarget,
      capture: capMarginVal > 0 && capMarginVal >= captureMargin && captureLegal,
    };
  }

  /** Project a STRIKE vs the dark here (§13 P0-11). */
  strikeProjection(): { atkPower: number; skPower: number; margin: number } {
    const node = this.state.players[this.humanIndex].warlordNodeId;
    const base = getPlayerPowerAtNode(this.state, this.humanIndex, node);
    const skPower = getShadowkingPowerAtNode(this.state, node);
    const cards = chooseCombatCommit(this.state.players[this.humanIndex].hand, base, skPower, TUNABLES.COMBAT_COMMIT_MAX);
    const atkPower = base + sum(cards);
    return { atkPower, skPower, margin: atkPower - skPower };
  }

  /** Project an ASSAULT_HEART commit (§13 P0-11) — cards, and the heart HP it would face. */
  heartProjection(): { commit: number; hp: number } | null {
    const heart = this.state.shadowking.heart;
    if (!heart) return null;
    const hand = [...this.state.players[this.humanIndex].hand].sort((a, b) => b - a);
    const commit = sum(hand.slice(0, Math.min(hand.length, TUNABLES.COMBAT_COMMIT_MAX)));
    return { commit, hp: heart.hp };
  }

  // ─── Helpers for the view ───────────────────────────────────────

  describeEnding(): string {
    const reason = this.state.gameEndReason;
    const w = this.state.winner;
    switch (reason) {
      case 'territory_victory':
        return w === null ? 'The realm endures — a contested draw at the Last Dawn.'
          : `Player ${w + 1} wins on territory at the Last Dawn.`;
      case 'gambit_victory':
        return `Player ${(w ?? 0) + 1} seizes the throne — the Crown's Gambit pays off!`;
      case 'last_standing':
        return `Player ${(w ?? 0) + 1} is the last Warlord standing — the realm is theirs.`;
      case 'doom_complete':
        return w === null ? 'The Keystone is ash. Everyone loses.'
          : `The Keystone is ash — the traitor (Player ${w + 1}) wins.`;
      case 'attrition':
        return 'Every Warlord has fallen. The dark inherits the ashes.';
      default:
        return 'The game continues.';
    }
  }
}

/** Sum a list of card powers. */
function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
