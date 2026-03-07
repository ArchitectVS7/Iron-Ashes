import type { Player } from '../models/player.js';
import type { GameState, VoteChoice } from '../models/game-state.js';
import { getVoteCost } from '../systems/doom-toll.js';

export interface VotingState {
    playerId: string;
    hasFateCards: boolean;
    timeRemaining: number; // in seconds
}

/** Voting timer duration in seconds. Exported for test access. */
export const VOTE_TIMEOUT_SECONDS = 15;

export class VotingPanel {
    private container: HTMLElement;
    private timerInterval: ReturnType<typeof setInterval> | undefined;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'voting-panel';
        this.container.style.display = 'none';
        parent.appendChild(this.container);
    }

    public showVoting(state: VotingState) {
        this.container.style.display = 'flex';
        let timeLeft = state.timeRemaining;

        const render = () => {
            this.container.innerHTML = `
        <div class="voting-modal">
          <h2>THE VOTING PHASE</h2>
          <div class="vote-timer">${timeLeft}s</div>
          ${!state.hasFateCards ? `
             <div class="auto-abstain-warning">AUTO-ABSTAIN: You have 0 Fate Cards.</div>
          ` : ''}
          <div class="vote-actions">
             <button class="vote-btn btn-counter" ${!state.hasFateCards ? 'disabled' : ''}>COUNTER</button>
             <button class="vote-btn btn-abstain">ABSTAIN</button>
          </div>
        </div>
      `;
        };

        render();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.container.style.display = 'none';
            } else {
                render();
            }
        }, 1000);
    }

    /**
     * Present the voting modal and wait for the player's decision.
     *
     * Uses the real vote cost (1 card standard, 2 in Final Phase) to
     * determine whether the COUNTER button is available. Auto-resolves
     * to 'abstain' on timer expiry.
     */
    public waitForVote(player: Player, state: GameState): Promise<VoteChoice> {
        const cost = getVoteCost(state);
        const canCounter = player.fateCards.length >= cost;

        return new Promise<VoteChoice>((resolve) => {
            this.container.style.display = 'flex';
            let timeLeft = VOTE_TIMEOUT_SECONDS;
            let resolved = false;

            const finish = (choice: VoteChoice) => {
                if (resolved) return;
                resolved = true;
                if (this.timerInterval) clearInterval(this.timerInterval);
                this.container.style.display = 'none';
                resolve(choice);
            };

            const render = () => {
                this.container.innerHTML = `
          <div class="voting-modal">
            <h2>THE VOTING PHASE</h2>
            <p class="vote-player-label">Player ${player.index + 1}</p>
            <div class="vote-timer">${timeLeft}s</div>
            ${!canCounter ? `
               <div class="auto-abstain-warning">AUTO-ABSTAIN: Not enough Fate Cards to counter.</div>
            ` : ''}
            <div class="vote-actions">
               <button class="vote-btn btn-counter" ${!canCounter ? 'disabled' : ''}>COUNTER</button>
               <button class="vote-btn btn-abstain">ABSTAIN</button>
            </div>
          </div>
        `;

                const counterBtn = this.container.querySelector('.btn-counter');
                const abstainBtn = this.container.querySelector('.btn-abstain');
                counterBtn?.addEventListener('click', () => finish('counter'));
                abstainBtn?.addEventListener('click', () => finish('abstain'));
            };

            render();

            if (this.timerInterval) clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    finish('abstain');
                } else {
                    const timerEl = this.container.querySelector('.vote-timer');
                    if (timerEl) timerEl.textContent = `${timeLeft}s`;
                }
            }, 1000);
        });
    }

    public hide() {
        this.container.style.display = 'none';
        if (this.timerInterval) clearInterval(this.timerInterval);
    }
}
