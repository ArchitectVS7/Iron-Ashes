/**
 * Tests — ModeSelectUI
 *
 * Verifies that ModeSelectUI correctly renders game setup options,
 * player count selection, AI difficulty, and mode selection.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

// Global registry of elements by id
const mockRegistry: Map<string, MockEl> = new Map();
// Global registry of elements by class name (all elements with that class)
const mockByClass: Map<string, MockEl[]> = new Map();

function registerByClass(el: MockEl, cls: string) {
  cls.split(/\s+/).forEach(c => {
    if (!c) return;
    if (!mockByClass.has(c)) mockByClass.set(c, []);
    mockByClass.get(c)!.push(el);
  });
}

class MockEl {
  public className = '';
  private _id = '';
  get id(): string { return this._id; }
  set id(v: string) {
    if (this._id) mockRegistry.delete(this._id);
    this._id = v;
    if (v) mockRegistry.set(v, this);
  }

  private _innerHTML = '';
  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(html: string) {
    this._innerHTML = html;
    this._parseChildren(html);
  }

  private _parseChildren(html: string) {
    this.children = [];
    // Extract ALL elements with id or class or data- attributes
    const tagRe = /<(\w+)([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(html)) !== null) {
      const attrs = m[2];
      const child = new MockEl();
      // id
      const idMatch = /\bid="([^"]+)"/.exec(attrs);
      if (idMatch) { child.id = idMatch[1]; }
      // class
      const clsMatch = /\bclass="([^"]+)"/.exec(attrs);
      if (clsMatch) {
        child.className = clsMatch[1];
        registerByClass(child, clsMatch[1]);
      }
      // value
      const valMatch = /\bvalue="([^"]*)"/.exec(attrs);
      if (valMatch) { child.value = valMatch[1]; }
      // checked
      if (/\bchecked\b/.test(attrs)) { child.checked = true; }
      // data-mode
      const dataModeMatch = /\bdata-mode="([^"]+)"/.exec(attrs);
      if (dataModeMatch) { child._dataMode = dataModeMatch[1]; }
      // name attribute (for radio buttons)
      const nameMatch = /\bname="([^"]+)"/.exec(attrs);
      if (nameMatch) { child._name = nameMatch[1]; }

      this.children.push(child);
    }
  }

  public _dataMode = '';
  public _name = '';
  public children: MockEl[] = [];
  public style: Record<string, string> = { display: 'none' };
  public value: string = '';
  public checked: boolean = false;
  private listeners: Record<string, Listener[]> = {};

  addEventListener(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event: string, eventObj?: unknown) {
    (this.listeners[event] ?? []).forEach(fn => fn(eventObj ?? { currentTarget: this }));
  }
  appendChild(child: MockEl) { this.children.push(child); return child; }

  getAttribute(name: string): string | null {
    if (name === 'data-mode') return this._dataMode || null;
    if (name === 'name') return this._name || null;
    return null;
  }

  querySelector(selector: string): MockEl | null {
    // id selector
    if (selector.startsWith('#')) {
      return mockRegistry.get(selector.slice(1)) ?? null;
    }
    // class selector (with optional pseudo like :checked)
    const clsMatch = /^\.([\w-]+)/.exec(selector);
    if (clsMatch) {
      const candidates = mockByClass.get(clsMatch[1]) ?? [];
      if (/:checked/.test(selector)) {
        return candidates.find(c => c.checked) ?? null;
      }
      return candidates[0] ?? null;
    }
    // input[name="x"]:checked
    const inputNameChecked = /input\[name="([^"]+)"\]:checked/.exec(selector);
    if (inputNameChecked) {
      const name = inputNameChecked[1];
      return [...mockRegistry.values()].find(el =>
        el._name === name && el.checked
      ) ?? null;
    }
    // input[name="x"] (without :checked)
    const inputName = /input\[name="([^"]+)"\]/.exec(selector);
    if (inputName) {
      const name = inputName[1];
      return [...mockRegistry.values()].find(el => el._name === name) ?? null;
    }
    return null;
  }

  querySelectorAll(selector: string): MockEl[] {
    // class selector
    const clsMatch = /^\.([\w-]+)/.exec(selector);
    if (clsMatch) {
      return [...(mockByClass.get(clsMatch[1]) ?? [])];
    }
    // input[name="x"]
    const inputName = /input\[name="([^"]+)"\]/.exec(selector);
    if (inputName) {
      const name = inputName[1];
      return [...mockRegistry.values()].filter(el => el._name === name);
    }
    return [];
  }

  remove() {}
}

const elementsById: Record<string, MockEl> = {};

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? mockRegistry.get(id) ?? null; },
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { ModeSelectUI } from '../../src/ui/mode-select.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  el.id = id;
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
  mockRegistry.clear();
  mockByClass.clear();
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

    // Resolve promise by clicking a mode button
    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) {
      modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
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

    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
    await promise;
  });

  it('shows AI difficulty options', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();

    const container = elementsById['mode-select'];
    const outerHtml = container.children[0].innerHTML;
    // AI Opponents heading is in the outer HTML template
    expect(outerHtml).toContain('AI Opponents');
    // AI difficulty options are rendered into the ai-slots-container div
    const aiSlots = mockRegistry.get('ai-slots-container');
    const aiHtml = (aiSlots?.innerHTML ?? '') + outerHtml;
    expect(aiHtml).toContain('Apprentice');
    expect(aiHtml).toContain('Knight-Commander');
    expect(aiHtml).toContain('Arch-Regent');

    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
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

    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
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

    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
    await promise;
  });

  it('shows Blood Pact requires 3+ players note', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();

    const container = elementsById['mode-select'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('3+ Players');

    const modeBtns = container.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
    await promise;
  });

  it('returns game setup with selected mode', async () => {
    const ui = new ModeSelectUI('mode-select');
    const promise = ui.showModeSelection();

    const container = elementsById['mode-select'];

    // Click competitive mode button (first mode-btn, data-mode="competitive")
    const modeBtns = container.querySelectorAll('.mode-btn');
    const competitiveBtn = modeBtns.find(btn =>
      btn._dataMode === 'competitive'
    );

    if (competitiveBtn) {
      competitiveBtn.dispatchEvent('click', { currentTarget: competitiveBtn });
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
      modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
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
      modeBtns[0].dispatchEvent('click', { currentTarget: modeBtns[0] });
    }

    const result = await promise;
    expect(result.network).toBe('local');
  });
});
