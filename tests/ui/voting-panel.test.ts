/**
 * Tests — VotingPanel
 *
 * Verifies that VotingPanel correctly renders voting state,
 * timer countdown, and auto-abstain warnings.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  public style: { display: string } = { display: 'none' };
  private listeners: Record<string, Listener[]> = {};

  addEventListener(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event: string) {
    (this.listeners[event] ?? []).forEach(fn => fn());
  }
  appendChild(child: MockEl) { this.children.push(child); return child; }
  querySelector(selector: string): MockEl | null {
    for (const child of this.children) {
      if (child.className?.includes(selector.replace('.', ''))) {
        return child;
      }
    }
    return null;
  }
  querySelectorAll(selector: string): MockEl[] {
    const results: MockEl[] = [];
    for (const child of this.children) {
      if (child.className?.includes(selector.replace('.', ''))) {
        results.push(child);
      }
    }
    return results;
  }
}

const elementsById: Record<string, MockEl> = {};
let timerIdCounter = 0;

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
} as unknown as Document;

globalThis.setInterval = vi.fn(() => {
  timerIdCounter++;
  return timerIdCounter as never;
});

globalThis.clearInterval = vi.fn();

// ─── Imports ─────────────────────────────────────────────────────

import { VotingPanel, VotingState, VOTE_TIMEOUT_SECONDS } from '../../src/ui/voting-panel.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
  vi.clearAllMocks();
}

// ─── Tests ───────────────────────────────────────────────────────

describe('VotingPanel', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates panel with voting-panel class', () => {
    const panel = new VotingPanel('game-board');
    expect(panel).toBeDefined();
  });

  it('shows voting panel when showVoting is called', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: true,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    const container = elementsById['game-board'];
    
    expect(container.children[0].style.display).toBe('flex');
  });

  it('shows auto-abstain warning when player has no fate cards', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: false,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('AUTO-ABSTAIN');
    expect(html).toContain('0 Fate Cards');
  });

  it('does not show auto-abstain warning when player has fate cards', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: true,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).not.toContain('AUTO-ABSTAIN');
  });

  it('shows vote timer with initial time', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: true,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('15s');
  });

  it('shows COUNTER and ABSTAIN buttons', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: true,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('COUNTER');
    expect(html).toContain('ABSTAIN');
  });

  it('disables COUNTER button when player has no fate cards', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: false,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('disabled');
  });

  it('hides panel when hide is called', () => {
    const panel = new VotingPanel('game-board');
    const state: VotingState = {
      playerId: 'Player 1',
      hasFateCards: true,
      timeRemaining: 15,
    };

    panel.showVoting(state);
    panel.hide();
    
    const container = elementsById['game-board'];
    expect(container.children[0].style.display).toBe('none');
  });

  it('exports VOTE_TIMEOUT_SECONDS constant', () => {
    expect(VOTE_TIMEOUT_SECONDS).toBe(15);
  });
});
