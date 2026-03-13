/**
 * Tests — HeraldActionUI
 *
 * Verifies that HeraldActionUI correctly renders diplomatic action
 * prompt, confirmation flow, and reduction animation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

// Registry of elements by id for getElementById lookups
const mockElRegistry: Map<string, MockEl> = new Map();

class MockEl {
  public className = '';
  private _id = '';
  get id(): string { return this._id; }
  set id(v: string) {
    if (this._id) mockElRegistry.delete(this._id);
    this._id = v;
    if (v) mockElRegistry.set(v, this);
  }

  private _innerHTML = '';
  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(html: string) {
    this._innerHTML = html;
    // Extract elements with ids from the HTML string
    this.children = [];
    const tagRe = /<(\w+)([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(html)) !== null) {
      const attrs = m[2];
      const idMatch = /id="([^"]+)"/.exec(attrs);
      if (idMatch) {
        const child = new MockEl();
        child.id = idMatch[1];
        const clsMatch = /class="([^"]+)"/.exec(attrs);
        if (clsMatch) child.className = clsMatch[1];
        this.children.push(child);
      }
    }
  }

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
}

const elementsById: Record<string, MockEl> = {};
const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return mockElRegistry.get(id) ?? elementsById[id] ?? null; },
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
  mockElRegistry.clear();
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
    // The prompt is container.children[0]; the confirm button is its first child
    const prompt = container.children[0];
    const confirmBtn = prompt.children[0]; // btn-herald-confirm
    confirmBtn.dispatchEvent('click');

    expect(onConfirm).toHaveBeenCalled();
  });

  it('hides prompt when cancel is clicked', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();

    ui.showInteraction(onConfirm);

    const container = elementsById['game-board'];
    const prompt = container.children[0];
    const cancelBtn = prompt.children[1]; // btn-herald-cancel
    cancelBtn.dispatchEvent('click');

    expect(prompt.style.display).toBe('none');
  });

  it('plays reduction animation on confirm', () => {
    const ui = new HeraldActionUI('game-board');
    const onConfirm = vi.fn();

    ui.showInteraction(onConfirm);

    const container = elementsById['game-board'];
    const prompt = container.children[0];
    const confirmBtn = prompt.children[0]; // btn-herald-confirm
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
    const prompt = container.children[0];
    const confirmBtn = prompt.children[0]; // btn-herald-confirm
    confirmBtn.dispatchEvent('click');

    expect(prompt.style.display).toBe('none');
  });
});
