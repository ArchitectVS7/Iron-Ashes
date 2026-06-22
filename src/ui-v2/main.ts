/**
 * Entry point for the v2 render-from-state UI (Stage 3e).
 *
 * Shows a small start screen (players / mode / seed), then mounts a GameSession
 * and the view. The whole game renders from a single GameState and routes every
 * input through the one applyCommand reducer (ALGORITHM §7).
 */

import './ui-v2.css';
import { GameSession } from './session.js';
import { mountView } from './view.js';
import type { GameMode } from '../v2/index.js';

const root = document.getElementById('app');
if (!root) throw new Error('#app mount point not found');

function startScreen(): void {
  root!.innerHTML = `
    <div class="start">
      <h1>Iron Throne of Ashes</h1>
      <p class="tagline">Save the world — or take it.</p>
      <div class="start-form">
        <label>Players
          <select id="player-count">
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4" selected>4</option>
          </select>
        </label>
        <label>Mode
          <select id="mode">
            <option value="competitive" selected>Competitive</option>
            <option value="blood_pact">Blood Pact (traitor)</option>
          </select>
        </label>
        <label>Seed
          <input id="seed" type="number" value="42" />
        </label>
        <button id="start-btn" class="primary">Begin</button>
      </div>
      <p class="note">You are Player 1; the rest are AI. Blood Pact secretly makes one player the traitor.</p>
    </div>`;

  document.getElementById('start-btn')!.addEventListener('click', () => {
    const playerCount = Number((document.getElementById('player-count') as HTMLSelectElement).value);
    const mode = (document.getElementById('mode') as HTMLSelectElement).value as GameMode;
    const seed = Number((document.getElementById('seed') as HTMLInputElement).value) || 42;
    const session = new GameSession(playerCount, mode, seed);
    mountView(root!, session);
  });
}

startScreen();
