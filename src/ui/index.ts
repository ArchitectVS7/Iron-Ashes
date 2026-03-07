/**
 * Application Entry Point
 *
 * Presents mode selection, then hands control to GameController which
 * manages the full game lifecycle: phase transitions, rendering, and
 * player interaction.
 */

import { ModeSelectUI } from './mode-select.js';
import { GameController } from './game-controller.js';

// Re-export for any consumers that still import from index
export { GameController } from './game-controller.js';

window.addEventListener('DOMContentLoaded', async () => {
  // Create root containers
  const app = document.getElementById('game-app') ?? document.body;

  const modeLayer = document.createElement('div');
  modeLayer.id = 'mode-select-layer';
  app.appendChild(modeLayer);

  const gameLayer = document.createElement('div');
  gameLayer.id = 'game-layer';
  app.appendChild(gameLayer);

  // Mode selection
  const modeSelect = new ModeSelectUI('mode-select-layer');
  const mode = await modeSelect.showModeSelection();

  // Launch the game
  const controller = new GameController(gameLayer);
  await controller.start(4, mode);
});
