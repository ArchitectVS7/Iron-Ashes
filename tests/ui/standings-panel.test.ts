/**
 * Tests — StandingsPanel (F-016)
 *
 * Verifies that StandingsPanel.update() correctly reflects game state:
 * stronghold counts, doom toll color thresholds, broken status, and
 * leading player highlighting.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  appendChild(child: MockEl) { this.children.push(child); return child; }
}

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { StandingsPanel } from '../../src/ui/standings-panel.js';
import { createGameState } from '../../src/engine/game-loop.js';
import {
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  FATE_DECK_AMBER_THRESHOLD,
  FATE_DECK_RED_THRESHOLD,
} from '../../src/models/game-state.js';

// ─── Helpers ─────────────────────────────────────────────────────

function makePanel() {
  const container = new MockEl() as unknown as HTMLElement;
  return { panel: new StandingsPanel(container), container };
}

function getHTML(container: MockEl): string {
  // The StandingsPanel appends a child div; innerHTML is on that child
  return container.children[0]?.innerHTML ?? '';
}

// ─── Tests ───────────────────────────────────────────────────────

describe('StandingsPanel', () => {
  let container: MockEl;
  let panel: StandingsPanel;

  beforeEach(() => {
    const result = makePanel();
    container = result.container as unknown as MockEl;
    panel = result.panel;
  });

  it('renders round number and phase', () => {
    const state = createGameState(2, 'competitive', 1);
    panel.update(state);
    const html = getHTML(container);
    expect(html).toContain(`Round ${state.round}`);
    expect(html).toContain('Shadowking Phase');
  });

  it('shows correct stronghold counts per player', () => {
    const state = createGameState(2, 'competitive', 1);

    // Give player 0 ownership of 3 nodes
    let claimed = 0;
    for (const [nodeId, nodeState] of Object.entries(state.boardState)) {
      if (claimed >= 3) break;
      const nodeDef = state.boardDefinition.nodes[nodeId];
      if (nodeDef && (nodeDef.type === 'standard' || nodeDef.type === 'forge')) {
        nodeState.claimedBy = 0;
        claimed++;
      }
    }

    panel.update(state);
    const html = getHTML(container);
    // Player 0 stronghold count should appear as stat-value 3
    // (stat-value spans appear as: ">3<")
    expect(html).toContain('>3<');
  });

  it('applies doom-warning class when doom toll >= threshold', () => {
    const state = createGameState(2, 'competitive', 1);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD;
    panel.update(state);
    const html = getHTML(container);
    expect(html).toContain('doom-warning');
  });

  it('does not apply doom-warning below threshold', () => {
    const state = createGameState(2, 'competitive', 1);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD - 1;
    panel.update(state);
    const html = getHTML(container);
    expect(html).not.toContain('doom-warning');
  });

  it('applies fate-deck-red when fateDeck length <= red threshold', () => {
    const state = createGameState(2, 'competitive', 1);
    state.fateDeck = state.fateDeck.slice(0, FATE_DECK_RED_THRESHOLD);
    panel.update(state);
    const html = getHTML(container);
    expect(html).toContain('fate-deck-red');
  });

  it('applies fate-deck-amber when fateDeck length <= amber threshold', () => {
    const state = createGameState(2, 'competitive', 1);
    // Trim to between amber and red thresholds
    state.fateDeck = state.fateDeck.slice(0, FATE_DECK_AMBER_THRESHOLD);
    panel.update(state);
    const html = getHTML(container);
    // Should be amber (not red, since length = AMBER_THRESHOLD > RED_THRESHOLD)
    if (FATE_DECK_AMBER_THRESHOLD > FATE_DECK_RED_THRESHOLD) {
      expect(html).toContain('fate-deck-amber');
    }
  });

  it('shows broken-court class for broken players', () => {
    const state = createGameState(2, 'competitive', 1);
    state.players[0].isBroken = true;
    panel.update(state);
    const html = getHTML(container);
    expect(html).toContain('broken-court');
  });

  it('highlights leading player with crown symbol', () => {
    const state = createGameState(2, 'competitive', 1);

    // Give player 1 more strongholds than player 0 → player 1 leads
    let claimed = 0;
    for (const [nodeId, nodeState] of Object.entries(state.boardState)) {
      if (claimed >= 5) break;
      const nodeDef = state.boardDefinition.nodes[nodeId];
      if (nodeDef && (nodeDef.type === 'standard' || nodeDef.type === 'forge')) {
        nodeState.claimedBy = 1;
        claimed++;
      }
    }

    panel.update(state);
    const html = getHTML(container);
    // Leading player gets the crown prefix
    expect(html).toContain('♛');
  });

  it('shows heartstone holder when artifact is held', () => {
    const state = createGameState(2, 'competitive', 1);
    state.artifactHolder = 1;
    panel.update(state);
    const html = getHTML(container);
    expect(html).toContain('Player 2'); // artifactHolder = 1 → "Player 2"
  });

  it('shows heartstone node when no one holds the artifact', () => {
    const state = createGameState(2, 'competitive', 1);
    state.artifactHolder = null;
    panel.update(state);
    const html = getHTML(container);
    expect(html).toContain(state.artifactNode);
  });
});
