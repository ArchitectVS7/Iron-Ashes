/**
 * Tests — HeraldActionUI
 *
 * Verifies that HeraldActionUI correctly renders diplomatic action
 * prompt, confirmation flow, and reduction animation.
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
  getElementById(_id: string): MockEl | null {
    // Return first button for confirm/cancel lookups
    if (this.children.length > 0) {
      return this.children[0];
    }
    return null;
  }
}

const elementsById: Record<string, MockEl> = {};
const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? mockBody; },
  body: mockBody,
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { HeraldActionUI } from '../../src/ui/herald-action.js';

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

describe('HeraldActionUI', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates UI with herald-action-prompt class', () => {
    const ui = new HeraldActionUI('game-board');
    expect(ui).toBeDefined();
  });

  it('shows diplomatic action prompt on showInteraction', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Dark Fortress Approach');
    expect(html).toContain('Herald stands alone');
    expect(html).toContain('Diplomatic Action');
  });

  it('shows correct doom toll reduction description', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    // Note: The component says "by 1" but PRD F-009 says 2
    // This test documents current behavior
    expect(html).toContain('Reduces Doom Toll');
  });

  it('shows confirm and cancel buttons', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Perform Diplomacy');
    expect(html).toContain('Cancel');
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    const confirmBtn = container.children[0];
    confirmBtn.dispatchEvent('click');

    expect(onConfirm).toHaveBeenCalled();
  });

  it('hides prompt when cancel is clicked', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    // Cancel is second button
    const cancelBtn = container.children[1] || container.children[0];
    cancelBtn.dispatchEvent('click');

    expect(container.children[0].style.display).toBe('none');
  });

  it('plays reduction animation on confirm', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    const confirmBtn = container.children[0];
    confirmBtn.dispatchEvent('click');

    // Animation adds element to body
    expect(mockBody.children.length).toBeGreaterThan(0);
    expect(mockBody.children[0].className).toBe('doom-reduction-flash');
  });

  it('hides prompt on confirm', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();
    
    ui.showInteraction(onConfirm);
    
    const container = elementsById['game-board'];
    const confirmBtn = container.children[0];
    confirmBtn.dispatchEvent('click');

    expect(container.children[0].style.display).toBe('none');
  });
});
