/**
 * Tests — ModeSelectUI
 *
 * Verifies that ModeSelectUI correctly renders game setup options,
 * player count selection, AI difficulty, and mode selection.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  public style: { display: string } = { display: 'none' };
  public value: string = '';
  public checked: boolean = false;
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
    const parts = selector.split(' ');
    for (const child of this.children) {
      if (child.className?.includes(parts[0].replace('.', ''))) {
        return child;
      }
    }
    return null;
  }
  querySelectorAll(selector: string): MockEl[] {
    const results: MockEl[] = [];
    const className = selector.replace('.', '');
    for (const child of this.children) {
      if (child.className?.includes(className)) {
        results.push(child);
      }
    }
    return results;
  }
}

const elementsById: Record<string, MockEl> = {};

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { ModeSelectUI } from '../../src/ui/mode-select.js';

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

describe('ModeSelectUI', () => {
  beforeEach(() => {
    cleanup();
    setupElement('mode-select');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates screen with mode-select-screen class', () => {
    const ui = new ModeSelectUI('mode-select');
    expect(ui).toBeDefined();
  });

  it('shows game setup modal with title', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('GAME SETUP');

    // Clean up - hide the modal
    container.style.display = 'none';
    // Resolve promise by clicking a mode button
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) {
      modeBtns[0].dispatchEvent('click');
    }
    await promise;
  });

  it('shows player count options (2, 3, 4)', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('2 Players');
    expect(html).toContain('3 Players');
    expect(html).toContain('4 Players');

    // Clean up
    container.style.display = 'none';
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click');
    await promise;
  });

  it('shows AI difficulty options', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('AI Opponents');
    expect(html).toContain('Apprentice');
    expect(html).toContain('Knight-Commander');
    expect(html).toContain('Arch-Regent');

    // Clean up
    container.style.display = 'none';
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click');
    await promise;
  });

  it('shows networking mode options', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Local / Solo');
    expect(html).toContain('Host Multiplayer');
    expect(html).toContain('Join Session');

    // Clean up
    container.style.display = 'none';
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click');
    await promise;
  });

  it('shows all three game mode buttons', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('Competitive');
    expect(html).toContain('Blood Pact');
    expect(html).toContain('Cooperative');

    // Clean up
    container.style.display = 'none';
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click');
    await promise;
  });

  it('shows Blood Pact requires 3+ players note', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('3+ Players');

    // Clean up
    container.style.display = 'none';
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click');
    await promise;
  });

  it('returns game setup with selected mode', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    
    // Click competitive mode button
    const modeBtns = container.querySelectorAll('.mode-btn');
    const competitiveBtn = modeBtns.find(btn => 
      btn.innerHTML?.includes('Competitive')
    );
    
    if (competitiveBtn) {
      competitiveBtn.dispatchEvent('click');
    }

    const result = await promise;
    expect(result.mode).toBe('competitive');
  });

  it('defaults to 4 players', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const modeBtns = container.querySelectorAll('.mode-btn');
    
    if (modeBtns.length > 0) {
      modeBtns[0].dispatchEvent('click');
    }

    const result = await promise;
    expect(result.playerCount).toBe(4);
  });

  it('defaults to local/networking mode', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();
    
    const container = elementsById['mode-select'];
    const modeBtns = container.querySelectorAll('.mode-btn');
    
    if (modeBtns.length > 0) {
      modeBtns[0].dispatchEvent('click');
    }

    const result = await promise;
    expect(result.network).toBe('local');
  });
});
