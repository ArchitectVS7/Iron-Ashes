/**
 * Entry point for the v3 render-from-state UI (Stage 3i-a scaffold; D2 difficulty selector).
 *
 * Shows a small start screen (players / mode / seed / difficulty / Herald advanced toggle),
 * then mounts a GameSession
 * and the view. The whole game renders from the fog-applied observable projection
 * (§7 D2) and routes every input through the one v3 applyCommand reducer (§7).
 *
 * The chosen DARK-STRENGTH difficulty tier (§D1) flows straight into `new GameSession(...)` →
 * `createGame`, and is scoped around every engine step via the getTunables/withDifficulty seam.
 */

import './ui-v3.css';
import { GameSession } from './session.js';
import { mountView } from './view.js';
import { DEFAULT_DIFFICULTY, type Difficulty, type GameMode } from '../v3/index.js';

/** The three tiers, in descending dark-strength order, with a one-line "how hard is the dark" hint. */
const DIFFICULTY_OPTIONS: readonly { readonly value: Difficulty; readonly label: string; readonly hint: string }[] = [
  { value: 'warlord', label: 'Warlord (Hard)', hint: 'The dark at full, locked strength — the reference balance (~21% dark win under flawless play).' },
  { value: 'knight', label: 'Knight (Normal)', hint: 'A gentler dark — a lower pledge threshold to block a strike (~17%).' },
  { value: 'squire', label: 'Squire (Easy)', hint: 'The dark goes easy on a squire — the weakest pledge threshold (~13%).' },
];

/**
 * Render the new-game start screen into `root`. When the player clicks Begin, the chosen
 * (players, mode, seed, difficulty) starts a GameSession and mounts the view; `onStart` (if given)
 * receives the live session — used by the jsdom test to assert the game started at the chosen tier.
 */
export function startScreen(root: HTMLElement, onStart: (session: GameSession) => void = () => {}): void {
  const options = DIFFICULTY_OPTIONS.map(
    o => `<option value="${o.value}"${o.value === DEFAULT_DIFFICULTY ? ' selected' : ''}>${o.label}</option>`,
  ).join('');

  root.innerHTML = `
    <div class="start">
      <h1>Iron Throne of Ashes</h1>
      <p class="tagline">Save the world — or take it. <b>v3</b></p>
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
        <label>Difficulty
          <select id="difficulty">${options}</select>
        </label>
        <label>Seed
          <input id="seed" type="number" value="42" />
        </label>
        <label class="advanced-toggle" title="Adds a 4th archetype: the Herald — a lone runner who PARLEYs the dark back without spending a card. Recommended after your first few games.">
          <input id="herald-enabled" type="checkbox" /> Herald (advanced)
        </label>
        <button id="start-btn" class="primary">Begin</button>
      </div>
      <p class="note" id="difficulty-hint"></p>
      <p class="note">You are Player 1; the rest are AI. Blood Pact secretly makes one player the traitor.</p>
    </div>`;

  const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
  const hint = document.getElementById('difficulty-hint')!;
  const updateHint = (): void => {
    const opt = DIFFICULTY_OPTIONS.find(o => o.value === difficultySelect.value);
    hint.textContent = opt ? `Dark strength — ${opt.hint}` : '';
  };
  difficultySelect.addEventListener('change', updateHint);
  updateHint();

  document.getElementById('start-btn')!.addEventListener('click', () => {
    const playerCount = Number((document.getElementById('player-count') as HTMLSelectElement).value);
    const mode = (document.getElementById('mode') as HTMLSelectElement).value as GameMode;
    const seed = Number((document.getElementById('seed') as HTMLInputElement).value) || 42;
    const difficulty = difficultySelect.value as Difficulty;
    // T2-3: the ADVANCED Herald toggle — unchecked (default) is the 3-archetype game.
    const heraldEnabled = (document.getElementById('herald-enabled') as HTMLInputElement).checked;
    const session = new GameSession(playerCount, mode, seed, difficulty, heraldEnabled);
    mountView(root, session);
    onStart(session);
  });
}

/** Boot the app when a real #app mount point is present (browser). Import-safe: a no-op under jsdom
 *  tests that haven't yet placed #app, so tests can import `startScreen` and drive it directly. */
function boot(): void {
  const root = document.getElementById('app');
  if (root) startScreen(root);
}

boot();
