// src/ui/standings-panel.ts
// F-016 — Mid-game standings display

import type { GameState } from '../models/game-state.js';
import {
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  FATE_DECK_AMBER_THRESHOLD,
  FATE_DECK_RED_THRESHOLD,
} from '../models/game-state.js';
import {
  getPlayerStrongholdCount,
  getLeadingPlayer,
} from '../systems/doom-toll.js';

const PHASE_LABELS: Record<string, string> = {
  shadowking: 'Shadowking Phase',
  voting: 'Voting Phase',
  action: 'Action Phase',
  cleanup: 'Cleanup Phase',
};

export class StandingsPanel {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'standings-panel';
    container.appendChild(this.el);
  }

  public update(state: GameState): void {
    const leadingPlayer = getLeadingPlayer(state);
    const fateDeckCount = state.fateDeck.length;
    const fateDeckClass =
      fateDeckCount <= FATE_DECK_RED_THRESHOLD
        ? 'fate-deck-red'
        : fateDeckCount <= FATE_DECK_AMBER_THRESHOLD
          ? 'fate-deck-amber'
          : '';

    const doomWarning = state.doomToll >= DOOM_TOLL_FINAL_PHASE_THRESHOLD;

    const heartstoneInfo =
      state.artifactHolder !== null
        ? `Player ${state.artifactHolder + 1}`
        : state.artifactNode;

    const playerRows = state.players
      .map((player) => {
        const strongholds = getPlayerStrongholdCount(state, player.index);
        const isLeading = player.index === leadingPlayer;
        const isBroken = player.isBroken;
        const isActive =
          state.phase === 'action' && player.index === state.activePlayerIndex;

        const cardClasses = [
          'player-card',
          isBroken ? 'broken-court' : '',
          isActive ? 'active-turn' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return `
        <div class="${cardClasses}">
          <div class="player-header">
            <span class="player-name">
              ${isLeading ? '♛ ' : ''}Player ${player.index + 1}
              <span class="broken-icon">BROKEN</span>
            </span>
          </div>
          <div class="player-stats">
            <span class="stat-item">⚑ <span class="stat-value">${strongholds}</span></span>
            <span class="stat-item">⚐ <span class="stat-value">${player.warBanners}</span></span>
            <span class="stat-item">🃏 <span class="stat-value">${player.fateCards.length}</span></span>
          </div>
        </div>`;
      })
      .join('');

    this.el.innerHTML = `
      <div class="hud-header">
        <div class="round-info">
          <span class="round-number">Round ${state.round}</span>
          <span class="phase-indicator">
            <span class="phase-dot${state.phase === 'voting' ? '' : ' pulse'}"></span>
            ${PHASE_LABELS[state.phase] ?? state.phase}
          </span>
        </div>
        <div class="doom-toll-wrapper">
          <span class="doom-toll-label">Doom Toll</span>
          <span class="doom-toll-value${doomWarning ? ' doom-warning' : ''}">${state.doomToll}</span>
        </div>
      </div>
      <div class="fate-deck-row">
        <span class="stat-item">
          Fate Deck: <span class="stat-value ${fateDeckClass}">${fateDeckCount}</span>
        </span>
        <span class="stat-item">
          Heartstone: <span class="stat-value">${heartstoneInfo}</span>
        </span>
      </div>
      <div class="player-list">
        ${playerRows}
      </div>`;
  }
}
