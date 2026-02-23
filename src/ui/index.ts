// src/ui/index.ts
import { AtmosphereEngine } from './atmosphere.js';
import { SummaryEngine } from './summary.js';
import { TutorialEngine } from './tutorial.js';
import { BoardRenderer } from './board-renderer.js';
import { KNOWN_LANDS, createInitialBoardState, selectWandererNodes } from '../models/board.js';
import { SeededRandom } from '../utils/seeded-random.js';

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
  private atmosphere: AtmosphereEngine;
  private summary: SummaryEngine;
  private tutorial: TutorialEngine;

  constructor(parentId: string) {
    const parent = document.getElementById(parentId);
    if (!parent) throw new Error(`Parent element #${parentId} not found`);

    this.container = document.createElement('div');
    this.container.className = 'standings-panel';
    parent.appendChild(this.container);

    this.atmosphere = new AtmosphereEngine('game-app');
    this.summary = new SummaryEngine();
    this.tutorial = new TutorialEngine();

    // Default mock state
    this.state = {
      round: 3,
      phase: 'ACTION',
      doomToll: 5,
      players: [
        { id: '1', name: 'Court of Ash', strongholds: 4, warBanners: 2, isActiveTurn: true, isBrokenCourt: false },
        { id: '2', name: 'House Frost', strongholds: 3, warBanners: 0, isActiveTurn: false, isBrokenCourt: true },
        { id: '3', name: 'The Iron Core', strongholds: 5, warBanners: 4, isActiveTurn: false, isBrokenCourt: false },
      ]
    };

    this.render();
    this.createTestControls();
    this.atmosphere.updateDoomTollEvent(0, this.state.doomToll);
  }

  public updateState(newState: Partial<MockGameStateUI>) {
    const oldDoomToll = this.state.doomToll;
    this.state = { ...this.state, ...newState };

    if (newState.doomToll !== undefined && newState.doomToll !== oldDoomToll) {
      this.atmosphere.updateDoomTollEvent(oldDoomToll, newState.doomToll);
    }

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
      <button id="btn-doom-recede">Recede Doom (-1)</button>
      <button id="btn-rescue">Test Rescue Sound</button>
      <button id="btn-defeat">Defeat Knight</button>
      <button id="btn-summary">Test Summary (Phase 18)</button>
      <button id="btn-tutorial">Test Tutorial (Phase 14)</button>
      <button id="btn-tooltip">Test Tooltip</button>
    `;
    document.body.appendChild(div);

    document.getElementById('btn-doom')?.addEventListener('click', () => {
      this.updateState({ doomToll: Math.min(13, this.state.doomToll + 1) });
    });

    document.getElementById('btn-doom-recede')?.addEventListener('click', () => {
      this.updateState({ doomToll: Math.max(0, this.state.doomToll - 1) });
    });

    document.getElementById('btn-rescue')?.addEventListener('click', () => {
      this.atmosphere.playRescueSound();

      const p = [...this.state.players];
      if (p[1].isBrokenCourt) {
        p[1].isBrokenCourt = false;
        this.updateState({ players: p });
      }
    });

    document.getElementById('btn-defeat')?.addEventListener('click', () => {
      this.atmosphere.explodeParticles(window.innerWidth / 2, window.innerHeight / 2, '#3b82f6');
      if (this.state.doomToll > 0) {
        this.updateState({ doomToll: this.state.doomToll - 1 });
      }
    });

    document.getElementById('btn-summary')?.addEventListener('click', () => {
      // Mock blood pact and game over logic
      this.summary.showBloodPactReveal("House Frost", () => {
        // Trigger summary after acknowledgment
        const mockStats = [
          { name: "Court of Ash", strongholds: 4, fellowships: 6, bannersSpent: 12, combats: "3W / 1L", timesBroken: 0, rescues: 1, votes: "5C / 1A" },
          { name: "House Frost", strongholds: 3, fellowships: 4, bannersSpent: 6, combats: "1W / 4L", timesBroken: 3, rescues: 0, votes: "2C / 4A" },
          { name: "The Iron Core", strongholds: 5, fellowships: 8, bannersSpent: 18, combats: "4W / 0L", timesBroken: 0, rescues: 2, votes: "6C / 0A" }
        ];
        this.summary.showPostGameSummary(
          "SHADOWKING VICTORY",
          "victory-shadowking",
          "The Doom Toll Reached 13",
          mockStats,
          13
        );
      });
    });

    document.getElementById('btn-tutorial')?.addEventListener('click', () => {
      this.tutorial.startGuidedTutorial([
        { title: "Turn 1 — March from Your Keep", content: "Learn basic movement, War Banner costs, and claiming your first Stronghold." },
        { title: "Turn 2 — Send the Herald Ahead", content: "Learn how to use your Herald to safely recruit Unknown Wanderers using Diplomatic Protection." },
        { title: "Turn 3 — Your First Battle", content: "Engage in War Field resolution. Learn how Fate Cards and Penalty Cards are applied." },
        { title: "Turn 4 — The Toll Strikes", content: "The Doom Toll advances! Understand the Voting Phase and the devastating cost of abstaining." },
        { title: "Turn 5 — Claim the Forge Keep", content: "Secure the production loop. Forge Keeps provide extreme strategic value by generating mass War Banners." }
      ]);
    });

    document.getElementById('btn-tooltip')?.addEventListener('click', () => {
      this.tutorial.showDiscoveredTooltip(
        "First Rescue Performed",
        "You have rescued a Broken Court. Restoring their War Banners returns them to active status immediately. They owe you their loyalty.",
        window.innerWidth / 2 - 150,
        window.innerHeight / 2
      );
    });
  }
}

// Initialize Application UI
window.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing Iron Throne of Ashes UI Engine...");

  // Initialize Board Renderer
  const boardRenderer = new BoardRenderer('game-canvas');
  const rng = new SeededRandom(12345);
  const wandererNodes = selectWandererNodes(KNOWN_LANDS, rng);
  const mockBoardState = createInitialBoardState(KNOWN_LANDS, wandererNodes);

  // Add some test antagonist forces
  mockBoardState['dark-fortress'].antagonistForces = ['dk1', 'dk2'];
  mockBoardState['s09'].antagonistForces = ['bw1'];

  boardRenderer.updateState(mockBoardState);

  const _ui = new StandingsPanel('ui-layer');
});
