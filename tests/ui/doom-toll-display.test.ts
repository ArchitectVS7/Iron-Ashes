/**
 * Tests — DoomTollDisplay
 *
 * Verifies that DoomTollDisplay correctly renders the doom track,
 * marker positions, and final phase indicators.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  public style: { display: string } = { display: '' };
  appendChild(child: MockEl) { this.children.push(child); return child; }
}

const elementsById: Record<string, MockEl> = {};

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { DoomTollDisplay } from '../../src/ui/doom-toll-display.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
}

// ─── Tests ───────────────────────────────────────────────────────

describe('DoomTollDisplay', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates display with doom-toll-large class', () => {
    const display = new DoomTollDisplay('game-board');
    expect(display).toBeDefined();
  });

  it('renders all 13 doom markers', () => {
    const display = new DoomTollDisplay('game-board');
    display.updateToll(0);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;
    
    // Count marker occurrences
    const markerMatches = html.match(/doom-marker/g);
    expect(markerMatches).toHaveLength(13);
  });

  it('shows correct marker states for doom toll position', () => {
    const display = new DoomTollDisplay('game-board');
    display.updateToll(5);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;
    
    // Position 5 should be current
    expect(html).toContain('marker-current');
    // Positions 1-4 should be past
    expect(html).toContain('marker-past');
    // Positions 6-13 should be future
    expect(html).toContain('marker-future');
  });

  it('marks positions 10+ as final phase', () => {
    const display = new DoomTollDisplay('game-board');
    display.updateToll(11);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;
    
    // Final phase markers should have the class
    const finalPhaseMatches = html.match(/final-phase/g);
    expect(finalPhaseMatches).toBeDefined();
    expect(finalPhaseMatches!.length).toBeGreaterThanOrEqual(4); // positions 10, 11, 12, 13
  });

  it('shows pulsing animation on current marker', () => {
    const display = new DoomTollDisplay('game-board');
    display.updateToll(7);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;
    
    expect(html).toContain('pulsing');
  });

  it('renders doom toll header', () => {
    const display = new DoomTollDisplay('game-board');
    display.updateToll(0);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;
    
    expect(html).toContain('THE DOOM TOLL');
  });

  it('updates correctly when doom toll changes', () => {
    const display = new DoomTollDisplay('game-board');
    
    // Initial state
    display.updateToll(3);
    const container = elementsById['game-board'];
    let html = container.children[0].innerHTML;
    expect(html).toContain('marker-current');
    
    // Advance doom toll
    display.updateToll(8);
    html = container.children[0].innerHTML;
    // Position 8 should now be current
    expect(html).toContain('marker-current');
  });

  it('handles maximum doom toll (13)', () => {
    const display = new DoomTollDisplay('game-board');
    display.updateToll(13);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;
    
    // All markers should be past or current
    expect(html).not.toContain('marker-future');
  });
});
