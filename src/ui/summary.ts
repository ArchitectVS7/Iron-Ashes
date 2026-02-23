// src/ui/summary.ts
interface PlayerStatsData {
    name: string;
    strongholds: number;
    fellowships: number;
    bannersSpent: number;
    combats: string;
    timesBroken: number;
    rescues: number;
    votes: string;
}

export class SummaryEngine {
    private container: HTMLElement;
    private pactReveal: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'post-game-overlay';
        document.body.appendChild(this.container);

        this.pactReveal = document.createElement('div');
        this.pactReveal.className = 'blood-pact-reveal';
        document.body.appendChild(this.pactReveal);
    }

    public showBloodPactReveal(traitorName: string, onComplete: () => void) {
        this.pactReveal.innerHTML = `
      <div class="pact-title">BLOOD PACT REVEALED</div>
      <div class="pact-traitor">The Shadowking's ally was <b>${traitorName}</b></div>
      <button class="summary-btn primary pact-dismiss" id="btn-dismiss-pact">Acknowledge</button>
    `;

        this.pactReveal.classList.add('visible');

        setTimeout(() => {
            document.getElementById('btn-dismiss-pact')?.addEventListener('click', () => {
                this.pactReveal.classList.remove('visible');
                setTimeout(onComplete, 1000);
            });
        }, 100);
    }

    public showPostGameSummary(victoryTitle: string, titleClass: string, conditionStr: string, stats: PlayerStatsData[], doomToll: number) {
        this.container.innerHTML = `
      <div class="summary-panel">
        <div class="summary-header">
          <h1 class="victory-title ${titleClass}">${victoryTitle}</h1>
          <div class="win-condition">${conditionStr} • Final Doom Toll: ${doomToll} / 13</div>
        </div>
        <div class="stats-grid">
          ${stats.map(s => this.renderStatBox(s)).join('')}
        </div>
        <div class="summary-actions">
          <button class="summary-btn primary" id="btn-play-again">Play Again</button>
          <button class="summary-btn" id="btn-lobby">Return to Lobby</button>
        </div>
      </div>
    `;

        this.container.classList.add('visible');

        setTimeout(() => {
            document.getElementById('btn-play-again')?.addEventListener('click', () => {
                window.location.reload();
            });
            document.getElementById('btn-lobby')?.addEventListener('click', () => {
                window.location.reload();
            });
        }, 5000); // Only clickable after 5s per requirements
    }

    private renderStatBox(stat: PlayerStatsData) {
        return `
      <div class="player-stat-col">
        <div class="player-stat-name">${stat.name}</div>
        <div class="stat-row"><span class="stat-label">Strongholds Owned</span><span class="stat-val">${stat.strongholds}</span></div>
        <div class="stat-row"><span class="stat-label">Fellowships Recruited</span><span class="stat-val">${stat.fellowships}</span></div>
        <div class="stat-row"><span class="stat-label">War Banners Spent</span><span class="stat-val">${stat.bannersSpent}</span></div>
        <div class="stat-row"><span class="stat-label">Combats (W/L)</span><span class="stat-val">${stat.combats}</span></div>
        <div class="stat-row"><span class="stat-label">Times Broken</span><span class="stat-val">${stat.timesBroken}</span></div>
        <div class="stat-row"><span class="stat-label">Rescues</span><span class="stat-val">${stat.rescues}</span></div>
        <div class="stat-row"><span class="stat-label">Votes (Cast/Abstain)</span><span class="stat-val">${stat.votes}</span></div>
      </div>
    `;
    }
}
