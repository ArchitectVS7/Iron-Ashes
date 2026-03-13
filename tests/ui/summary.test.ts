/**
 * Tests — SummaryEngine
 *
 * Verifies that SummaryEngine correctly renders post-game summary,
 * blood pact reveal, and player statistics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  private listeners: Record<string, Listener[]> = {};

  addEventListener(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event: string) {
    (this.listeners[event] ?? []).forEach(fn => fn());
  }
  appendChild(child: MockEl) { this.children.push(child); return child; }
}

const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  body: mockBody,
} as unknown as Document;

globalThis.window = {
  location: {
    reload: vi.fn(),
  },
} as unknown as Window;

// Mock setTimeout
vi.useFakeTimers();

// ─── Imports ─────────────────────────────────────────────────────

import { SummaryEngine, PlayerStatsData } from '../../src/ui/summary.js';

// ─── Helpers ─────────────────────────────────────────────────────

function cleanup() {
  mockBody.children = [];
  vi.clearAllTimers();
}

// ─── Tests ───────────────────────────────────────────────────────

describe('SummaryEngine', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('creates engine with summary container', () => {
    const engine = new SummaryEngine();
    expect(engine).toBeDefined();
  });

  it('adds summary container to body', () => {
    const engine = new SummaryEngine();
    expect(mockBody.children.length).toBeGreaterThan(0);
    expect(mockBody.children[0].className).toBe('post-game-overlay');
  });

  it('creates blood pact reveal element', () => {
    const engine = new SummaryEngine();
    expect(mockBody.children.length).toBe(2);
    expect(mockBody.children[1].className).toBe('blood-pact-reveal');
  });

  it('shows blood pact reveal with traitor name', () => {
    const engine = new SummaryEngine();
    const onComplete = vi.fn();
    
    engine.showBloodPactReveal('Player 2', onComplete);
    
    const reveal = mockBody.children[1];
    expect(reveal.className).toContain('visible');
    expect(reveal.innerHTML).toContain('BLOOD PACT REVEALED');
    expect(reveal.innerHTML).toContain('Player 2');
  });

  it('calls onComplete when dismiss button is clicked', () => {
    const engine = new SummaryEngine();
    const onComplete = vi.fn();
    
    engine.showBloodPactReveal('Player 2', onComplete);
    
    // Advance timers to make button clickable
    vi.advanceTimersByTime(100);
    
    const reveal = mockBody.children[1];
    const dismissBtn = reveal.children[0];
    dismissBtn.dispatchEvent('click');
    
    expect(onComplete).toHaveBeenCalled();
  });

  it('hides blood pact reveal after dismiss', () => {
    const engine = new SummaryEngine();
    const onComplete = vi.fn();
    
    engine.showBloodPactReveal('Player 2', onComplete);
    
    vi.advanceTimersByTime(100);
    
    const reveal = mockBody.children[1];
    const dismissBtn = reveal.children[0];
    dismissBtn.dispatchEvent('click');
    
    expect(reveal.className).not.toContain('visible');
  });

  it('shows post-game summary with victory title', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [
      {
        name: 'Player 1',
        strongholds: 8,
        fellowships: 5,
        bannersSpent: 12,
        combats: '5/2',
        timesBroken: 1,
        rescues: '2/1',
        votes: '8/2',
      },
    ];
    
    engine.showPostGameSummary('TERRITORY VICTORY', 'victory-territory', 'Most Strongholds', stats, 5);
    
    const container = mockBody.children[0];
    expect(container.className).toContain('visible');
    expect(container.innerHTML).toContain('TERRITORY VICTORY');
  });

  it('shows win condition and doom toll', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [];
    
    engine.showPostGameSummary('Victory', 'victory', 'Most Strongholds', stats, 8);
    
    const container = mockBody.children[0];
    expect(container.innerHTML).toContain('Most Strongholds');
    expect(container.innerHTML).toContain('Final Doom Toll: 8 / 13');
  });

  it('renders player statistics grid', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [
      {
        name: 'Player 1',
        strongholds: 8,
        fellowships: 5,
        bannersSpent: 12,
        combats: '5/2',
        timesBroken: 1,
        rescues: '2/1',
        votes: '8/2',
      },
    ];
    
    engine.showPostGameSummary('Victory', 'victory', 'Condition', stats, 5);
    
    const container = mockBody.children[0];
    expect(container.innerHTML).toContain('Player 1');
    expect(container.innerHTML).toContain('Strongholds Owned');
    expect(container.innerHTML).toContain('8');
  });

  it('renders all stat categories', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [
      {
        name: 'Player 1',
        strongholds: 8,
        fellowships: 5,
        bannersSpent: 12,
        combats: '5/2',
        timesBroken: 1,
        rescues: '2/1',
        votes: '8/2',
      },
    ];
    
    engine.showPostGameSummary('Victory', 'victory', 'Condition', stats, 5);
    
    const container = mockBody.children[0];
    expect(container.innerHTML).toContain('Fellowships Recruited');
    expect(container.innerHTML).toContain('War Banners Spent');
    expect(container.innerHTML).toContain('Combats (W/L)');
    expect(container.innerHTML).toContain('Times Broken');
    expect(container.innerHTML).toContain('Rescues');
    expect(container.innerHTML).toContain('Votes (Cast/Abstain)');
  });

  it('shows Play Again and Return to Lobby buttons', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [];
    
    engine.showPostGameSummary('Victory', 'victory', 'Condition', stats, 5);
    
    const container = mockBody.children[0];
    expect(container.innerHTML).toContain('Play Again');
    expect(container.innerHTML).toContain('Return to Lobby');
  });

  it('reloads page on Play Again click', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [];
    
    engine.showPostGameSummary('Victory', 'victory', 'Condition', stats, 5);
    
    // Advance timers to make buttons clickable
    vi.advanceTimersByTime(5000);
    
    const container = mockBody.children[0];
    const playAgainBtn = container.children[0];
    playAgainBtn.dispatchEvent('click');
    
    expect(globalThis.window.location.reload).toHaveBeenCalled();
  });

  it('reloads page on Return to Lobby click', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [];
    
    engine.showPostGameSummary('Victory', 'victory', 'Condition', stats, 5);
    
    vi.advanceTimersByTime(5000);
    
    const container = mockBody.children[0];
    const lobbyBtn = container.children[1];
    lobbyBtn.dispatchEvent('click');
    
    expect(globalThis.window.location.reload).toHaveBeenCalled();
  });

  it('buttons are not clickable for first 5 seconds', () => {
    const engine = new SummaryEngine();
    const stats: PlayerStatsData[] = [];
    
    engine.showPostGameSummary('Victory', 'victory', 'Condition', stats, 5);
    
    // Try to click before 5 seconds
    const container = mockBody.children[0];
    const playAgainBtn = container.children[0];
    playAgainBtn.dispatchEvent('click');
    
    // Should not have called reload yet
    expect(globalThis.window.location.reload).not.toHaveBeenCalled();
  });
});
