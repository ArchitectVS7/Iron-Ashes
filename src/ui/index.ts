// src/ui/index.ts

interface MockPlayerUI {
  id: string;
  name: string;
  strongholds: number;
  warBanners: number;
  isActiveTurn: boolean;
  isBrokenCourt: boolean;
}

interface MockGameStateUI {
  round: number;
  phase: 'VOTING' | 'ACTION' | 'SHADOWKING';
  doomToll: number;
  players: MockPlayerUI[];
}

export class StandingsPanel {
  private container: HTMLElement;
  private state: MockGameStateUI;

  constructor(parentId: string) {
    const parent = document.getElementById(parentId);
    if (!parent) throw new Error(`Parent element #${parentId} not found`);

    this.container = document.createElement('div');
    this.container.className = 'standings-panel';
    parent.appendChild(this.container);

    // Default mock state
    this.state = {
      round: 3,
      phase: 'ACTION',
      doomToll: 8,
      players: [
        { id: '1', name: 'Court of Ash', strongholds: 4, warBanners: 2, isActiveTurn: true, isBrokenCourt: false },
        { id: '2', name: 'House Frost', strongholds: 3, warBanners: 0, isActiveTurn: false, isBrokenCourt: true },
        { id: '3', name: 'The Iron Core', strongholds: 5, warBanners: 4, isActiveTurn: false, isBrokenCourt: false },
      ]
    };

    this.render();
    this.createTestControls();
  }

  public updateState(newState: Partial<MockGameStateUI>) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  private render() {
    const isFinalPhase = this.state.doomToll >= 10;
    const isGameOver = this.state.doomToll >= 13;

    let phaseName = 'Action Phase';
    if (this.state.phase === 'VOTING') phaseName = 'Voting Phase';
    else if (this.state.phase === 'SHADOWKING') phaseName = 'Shadowking';

    this.container.innerHTML = `
      <div class="hud-header">
        <div class="round-info">
          <div class="round-number">Round ${this.state.round}</div>
          <div class="phase-indicator phase-${this.state.phase.toLowerCase()}">
            <div class="phase-dot ${this.state.phase === 'VOTING' ? 'pulse' : ''}"></div>
            ${phaseName}
          </div>
        </div>
        <div class="doom-toll-wrapper">
          <div class="doom-toll-label">Doom Toll</div>
          <div class="doom-toll-value ${isFinalPhase && !isGameOver ? 'doom-warning' : ''}" style="color: ${isFinalPhase ? 'var(--color-accent-red)' : ''}">
            ${this.state.doomToll} / 13
          </div>
        </div>
      </div>
      <div class="player-list">
        ${this.state.players.map(p => this.renderPlayerCard(p)).join('')}
      </div>
    `;
  }

  private renderPlayerCard(player: MockPlayerUI) {
    return `
      <div class="player-card ${player.isActiveTurn ? 'active-turn' : ''} ${player.isBrokenCourt ? 'broken-court' : ''}">
        <div class="player-header">
          <div class="player-name">${player.name}</div>
          <div class="broken-icon">BROKEN COURT</div>
        </div>
        <div class="player-stats">
          <div class="stat-item" title="Strongholds Required for Victory">
            <svg class="stat-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M10 2l-8 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12v-6l-8-4m0 2.18l6 3V12c0 4.46-2.93 8.61-7 9.8-4.07-1.19-7-5.34-7-9.8V7.18l6-3z"/></svg>
            <span class="stat-value">${player.strongholds}</span>
          </div>
          <div class="stat-item" title="War Banners">
            <svg class="stat-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>
            <span class="stat-value">${player.warBanners}</span>
          </div>
        </div>
      </div>
    `;
  }

  private createTestControls() {
    const div = document.createElement('div');
    div.className = 'test-controls';
    div.innerHTML = `
      <div style="margin-bottom: 8px;"><b>Dev Tools</b></div>
      <button id="btn-doom">Advance Doom (+1)</button>
      <button id="btn-next-turn">Next Turn</button>
      <button id="btn-broken">Toggle Broken</button>
    `;
    document.body.appendChild(div);

    document.getElementById('btn-doom')?.addEventListener('click', () => {
      this.updateState({ doomToll: Math.min(13, this.state.doomToll + 1) });
    });

    document.getElementById('btn-next-turn')?.addEventListener('click', () => {
      const p = [...this.state.players];
      const activeIdx = p.findIndex(x => x.isActiveTurn);
      p.forEach(x => x.isActiveTurn = false);
      p[(activeIdx + 1) % p.length].isActiveTurn = true;
      
      const nextPhase = this.state.phase === 'ACTION' ? 'VOTING' : 'ACTION';
      this.updateState({ players: p, phase: nextPhase });
    });

    document.getElementById('btn-broken')?.addEventListener('click', () => {
      const p = [...this.state.players];
      p[0].isBrokenCourt = !p[0].isBrokenCourt;
      this.updateState({ players: p });
    });
  }
}

// Initialize Application UI
window.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing Iron Throne of Ashes UI Engine...");
  const ui = new StandingsPanel('ui-layer');
});
