/**
 * GameSession (v3) — the UI's driver over the v3 engine (Stage 3i-a).
 *
 * Render-from-state contract: the session owns a single `GameState`, and EVERY
 * mutation goes through the one `applyCommand` reducer (ALGORITHM §7). The human
 * occupies seat 0; all other seats are AI, driven by the pure `f(state, seed)`
 * choosers from the v3 engine. The view never mutates state — it renders from
 * `session.observable()` (the fog-applied projection, §7 D2) and calls these
 * reducer-routed methods.
 *
 * The session sequences the phases: it auto-pledges/auto-acts for AI seats and
 * only stops to wait for human input at the human's decision points (the Pledge,
 * and the human's ACTION turn). 3i-a wires the driver + render; the human ACTION
 * controls arrive in 3i-b.
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
  type Command,
  type GameEvent,
  type GameMode,
  type GameState,
  type ObservableState,
} from '../v3/index.js';

/** A short on-screen narration line (villain voice, beats, results). */
export interface Narration {
  readonly text: string;
  readonly kind: 'villain' | 'beat' | 'system';
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

  constructor(playerCount: number, mode: GameMode, seed: number) {
    this.seed = seed;
    // Seat 0 is the lone human; the rest are AI.
    this.state = createGame(playerCount, mode, seed, 1);
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

  /** Pull villain lines and notable beats out of the event stream. */
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
          text: `The war deepens — the Act turns to ${e.newAct}.`,
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
      } else if (e.type === 'GAME_OVER') {
        this.narration.unshift({ text: this.describeEnding(), kind: 'system' });
      }
    }
    this.narration = this.narration.slice(0, 8);
  }

  // ─── Phase flow ─────────────────────────────────────────────────

  get phase(): GameState['phase'] { return this.state.phase; }
  get isOver(): boolean { return this.state.gameEndReason !== null; }
  get isHumanTurn(): boolean {
    const human = this.state.players[this.humanIndex];
    return this.state.phase === 'ACTION'
      && this.state.activePlayerIndex === this.humanIndex
      && !human.isEliminated;
  }

  /** THREAT → PLEDGE. The Shadowking telegraph is set during this step. */
  advanceFromThreat(): void {
    if (this.state.phase !== 'THREAT' || this.isOver) return;
    this.dispatch({ type: 'ADVANCE_PHASE' });
    this.onChange();
  }

  /**
   * Submit the human's pledge, auto-pledge every AI seat, resolve the Pledge,
   * then run AI ACTION turns up to the human's turn (or end of phase).
   */
  submitHumanPledge(amount: number): void {
    if (this.state.phase !== 'PLEDGE' || this.isOver) return;

    this.dispatch({ type: 'SUBMIT_PLEDGE', playerIndex: this.humanIndex, amount });

    // AI seats pledge (concealed in blood_pact, but the engine handles that).
    for (const p of this.state.players) {
      if (p.index === this.humanIndex || p.isEliminated) continue;
      if (this.state.pledgeBuffer.some(e => e.playerIndex === p.index)) continue;
      this.state = runAIPledge(this.state, p.index, this.seed).state;
    }

    // Resolve PLEDGE → ACTION (the threshold beat).
    this.dispatch({ type: 'ADVANCE_PHASE' });

    this.runAIUntilHumanOrDone();
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
    if (!this.isHumanTurn) this.runAIUntilHumanOrDone();
    this.onChange();
  }

  /** Run AI ACTION turns until it's the human's turn again, the phase ends, or game over. */
  private runAIUntilHumanOrDone(): void {
    let guard = 0;
    while (!this.isOver && this.state.phase === 'ACTION' && guard < 64) {
      guard++;
      const active = this.state.activePlayerIndex;
      const p = this.state.players[active];

      if (active === this.humanIndex && !p.isEliminated && p.actionsRemaining > 0) {
        return; // wait for the human
      }

      if (active !== this.humanIndex && !p.isEliminated && p.actionsRemaining > 0) {
        this.state = runAITurn(this.state, active, this.seed).state;
        continue;
      }

      // Active player is out of actions (or eliminated). If the phase is done, roll to Dawn.
      if (this.state.turnOrderPosition >= this.state.turnOrder.length) {
        this.dispatch({ type: 'ADVANCE_PHASE' }); // ACTION → DAWN → next THREAT
        return;
      }
      // Otherwise nudge: a PASS advances the pointer (defensive).
      this.dispatch({ type: 'PLAYER_ACTION', playerIndex: active, action: { type: 'PASS' } });
    }
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
