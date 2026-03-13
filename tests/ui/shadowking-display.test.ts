/**
 * Tests — ShadowkingDisplay
 *
 * Verifies that ShadowkingDisplay correctly renders behavior cards,
 * icons per card type, and auto-hide timing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  public style: { display: string } = { display: 'none' };
  appendChild(child: MockEl) { this.children.push(child); return child; }
}

const elementsById: Record<string, MockEl> = {};

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
} as unknown as Document;

// Mock setTimeout
vi.useFakeTimers();

// ─── Imports ─────────────────────────────────────────────────────

import { ShadowkingDisplay } from '../../src/ui/shadowking-display.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
  vi.clearAllTimers();
}

// ─── Tests ───────────────────────────────────────────────────────

describe('ShadowkingDisplay', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates display with shadowking-display class', () => {
    const display = new ShadowkingDisplay('game-board');
    expect(display).toBeDefined();
  });

  it('shows behavior card with correct title', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('SPAWN', 'Place 2 Blight Wraiths');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('SHADOWKING BEHAVIOR');
    expect(html).toContain('SPAWN');
  });

  it('shows correct icon for SPAWN card', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('SPAWN', 'Place 2 Blight Wraiths');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('🧟');
  });

  it('shows correct icon for MOVE card', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('MOVE', 'Death Knight moves');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('💀');
  });

  it('shows correct icon for CLAIM card', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('CLAIM', 'Claim Stronghold');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('🏰');
  });

  it('shows correct icon for ASSAULT card', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('ASSAULT', 'Initiate War Field');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('⚔️');
  });

  it('shows correct icon for ESCALATE card', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('ESCALATE', 'Doom Toll +2');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('🔔');
  });

  it('shows behavior card description', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('SPAWN', 'Place 2 Blight Wraiths adjacent to Dark Fortress');
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Place 2 Blight Wraiths adjacent to Dark Fortress');
  });

  it('auto-hides after 5 seconds', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('SPAWN', 'Place 2 Blight Wraiths');
    
    // Advance timers by 5 seconds
    vi.advanceTimersByTime(5000);
    
    const container = elementsById['game-board'];
    expect(container.children[0].style.display).toBe('none');
  });

  it('is visible before auto-hide timeout', () => {
    const display = new ShadowkingDisplay('game-board');
    display.showBehaviorCard('SPAWN', 'Place 2 Blight Wraiths');
    
    // Advance timers by 2 seconds (before 5s timeout)
    vi.advanceTimersByTime(2000);
    
    const container = elementsById['game-board'];
    expect(container.children[0].style.display).toBe('flex');
  });
});
