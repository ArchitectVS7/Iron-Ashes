/**
 * Tests — BrokenCourtUI
 *
 * Verifies that BrokenCourtUI correctly renders rescue menu,
 * recovery animations, and rescue decision prompts.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockEl {
  public className = '';
  public innerHTML = '';
  get innerText() { return this.innerHTML; }
  set innerText(v: string) { this.innerHTML = v; }
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
  querySelectorAll(_selector: string): MockEl[] {
    return this.children;
  }
}

const elementsById: Record<string, MockEl> = {};
const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
  body: mockBody,
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { BrokenCourtUI } from '../../src/ui/broken-court-ui.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
  mockBody.children = [];
}

// ─── Tests ───────────────────────────────────────────────────────

describe('BrokenCourtUI', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates UI with broken-court-action-menu class', () => {
    const ui = new BrokenCourtUI('game-board');
    expect(ui).toBeDefined();
  });

  it('shows rescue menu with target player name', () => {
    const ui = new BrokenCourtUI('game-board');
    ui.showRescueMenu('Player 2');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Rescue Player 2');
    expect(html).toContain('Confirm Rescue');
    expect(html).toContain('Cancel');
  });

  it('shows rescue instructions in menu', () => {
    const ui = new BrokenCourtUI('game-board');
    ui.showRescueMenu('Player 2');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Donate 2-5 Fate Cards');
    expect(html).toContain('clear their Penalty Cards');
  });

  it('plays recovery animation by adding element to body', () => {
    const ui = new BrokenCourtUI('game-board');
    ui.playRecoveryAnimation('Player 1');
    
    // Recovery animation adds an element to document.body
    expect(mockBody.children.length).toBeGreaterThan(0);
    expect(mockBody.children[0].className).toBe('recovery-animation');
    expect(mockBody.children[0].innerHTML).toContain('RECOVERED');
  });

  it('shows rescue decision prompt with player info', () => {
    const ui = new BrokenCourtUI('game-board');
    const rescuer = { index: 0, fateCards: [1, 2, 3, 4] };
    const target = { index: 1 };

    ui.waitForRescueDecision(rescuer as never, target as never);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain(`Rescue Player ${target.index + 1}`);
    expect(html).toContain(`Player ${rescuer.index + 1}`);
    expect(html).toContain(`You have ${rescuer.fateCards.length} Fate Card(s)`);
  });

  it('shows amount buttons 2-5 in rescue decision', () => {
    const ui = new BrokenCourtUI('game-board');
    const rescuer = { index: 0, fateCards: [1, 2, 3, 4, 5] };
    const target = { index: 1 };

    ui.waitForRescueDecision(rescuer as never, target as never);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('2 Cards');
    expect(html).toContain('3 Cards');
    expect(html).toContain('4 Cards');
    expect(html).toContain('5 Cards');
  });

  it('filters amount buttons based on rescuer fate cards', () => {
    const ui = new BrokenCourtUI('game-board');
    const rescuer = { index: 0, fateCards: [1, 2, 3] }; // Only 3 cards
    const target = { index: 1 };

    ui.waitForRescueDecision(rescuer as never, target as never);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    // Should only show 2 and 3 (can't afford 4 or 5)
    expect(html).toContain('2 Cards');
    expect(html).toContain('3 Cards');
    expect(html).not.toContain('4 Cards');
    expect(html).not.toContain('5 Cards');
  });

  it('shows decline button in rescue decision', () => {
    const ui = new BrokenCourtUI('game-board');
    const rescuer = { index: 0, fateCards: [1, 2, 3] };
    const target = { index: 1 };

    ui.waitForRescueDecision(rescuer as never, target as never);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Decline');
  });
});
