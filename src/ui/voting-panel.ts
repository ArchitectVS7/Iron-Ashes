export interface VotingState {
    playerId: string;
    hasFateCards: boolean;
    timeRemaining: number; // in seconds
}

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
                // Auto abstain trigger...
            } else {
                render();
            }
        }, 1000);
    }

    public hide() {
        this.container.style.display = 'none';
        if (this.timerInterval) clearInterval(this.timerInterval);
    }
}
