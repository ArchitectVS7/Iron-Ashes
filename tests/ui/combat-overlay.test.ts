/**
 * Tests — CombatOverlay
 *
 * Verifies that CombatOverlay correctly renders combat state,
 * fate card reveals, and combat outcomes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

// Registry of elements by id for querySelector lookups
const mockRegistry: Map<string, MockEl> = new Map();

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
    // Re-extract id-tagged elements (clear old ones first)
    this.children = [];
    const tagRe = /<(\w+)([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(html)) !== null) {
      const attrs = m[2];
      const idMatch = /\bid="([^"]+)"/.exec(attrs);
      if (idMatch) {
        const child = new MockEl();
        child.id = idMatch[1];
        const clsMatch = /\bclass="([^"]+)"/.exec(attrs);
        if (clsMatch) child.className = clsMatch[1];
        this.children.push(child);
      }
    }
  }

  public children: MockEl[] = [];
  public style: { display: string } = { display: 'none' };
  private listeners: Record<string, Listener[]> = {};

  setAttribute(_k: string, _v: string) {}
  addEventListener(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event: string) {
    (this.listeners[event] ?? []).forEach(fn => fn());
  }
  appendChild(child: MockEl) { this.children.push(child); return child; }
  querySelector(selector: string): MockEl | null {
    if (selector.startsWith('#')) {
      return mockRegistry.get(selector.slice(1)) ?? null;
    }
    return null;
  }
  querySelectorAll(_selector: string): MockEl[] {
    return [];
  }
}

const mockBody = new MockEl();
const elementsById: Record<string, MockEl> = {};

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
  body: mockBody,
} as unknown as Document;

// Mock setTimeout for async tests
vi.useFakeTimers();

// ─── Imports ─────────────────────────────────────────────────────

import { CombatOverlay, CombatState } from '../../src/ui/combat-overlay.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
  mockRegistry.clear();
  vi.clearAllTimers();
}

// ─── Tests ───────────────────────────────────────────────────────

describe('CombatOverlay', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates overlay with combat class', () => {
    const overlay = new CombatOverlay('game-board');
    expect(overlay).toBeDefined();
  });

  it('shows combat state with attacker and defender info', async () => {
    const overlay = new CombatOverlay('game-board');
    const state: CombatState = {
      attackerId: 'Player 1',
      defenderId: 'Player 2',
      baseStrengthAttacker: 15,
      baseStrengthDefender: 12,
      attackerCardIndex: null,
      defenderCardIndex: null,
      attackerFaceDown: true,
      defenderFaceUp: true,
      margin: null,
      reshuffleOccurred: false,
    };

    const promise = overlay.showCombat(state);
    
    const container = elementsById['game-board'];
    expect(container.children.length).toBeGreaterThan(0);
    expect(container.children[0].className).toBe('combat-overlay');

    // Resolve the promise
    const btn = container.children[0].querySelector('#combat-resolve-btn');
    btn?.dispatchEvent('click');
    await promise;
  });

  it('shows face-down card for attacker', async () => {
    const overlay = new CombatOverlay('game-board');
    const state: CombatState = {
      attackerId: 'Player 1',
      defenderId: 'Player 2',
      baseStrengthAttacker: 10,
      baseStrengthDefender: 10,
      attackerCardIndex: 0,
      defenderCardIndex: null,
      attackerFaceDown: true,
      defenderFaceUp: true,
      margin: null,
      reshuffleOccurred: false,
    };

    const promise = overlay.showCombat(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('face-down');
    expect(html).toContain('Attacker plays Face-Down');

    // Resolve
    const btn = container.children[0].querySelector('#combat-resolve-btn');
    btn?.dispatchEvent('click');
    await promise;
  });

  it('shows face-up card for defender', async () => {
    const overlay = new CombatOverlay('game-board');
    const state: CombatState = {
      attackerId: 'Player 1',
      defenderId: 'Player 2',
      baseStrengthAttacker: 10,
      baseStrengthDefender: 10,
      attackerCardIndex: null,
      defenderCardIndex: 0,
      attackerFaceDown: true,
      defenderFaceUp: true,
      margin: null,
      reshuffleOccurred: false,
    };

    const promise = overlay.showCombat(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('face-up');
    expect(html).toContain('Defender plays Face-Up');

    // Resolve
    const btn = container.children[0].querySelector('#combat-resolve-btn');
    btn?.dispatchEvent('click');
    await promise;
  });

  it('shows reshuffle notification when it occurred', async () => {
    const overlay = new CombatOverlay('game-board');
    const state: CombatState = {
      attackerId: 'Player 1',
      defenderId: 'Player 2',
      baseStrengthAttacker: 10,
      baseStrengthDefender: 10,
      attackerCardIndex: null,
      defenderCardIndex: null,
      attackerFaceDown: true,
      defenderFaceUp: true,
      margin: null,
      reshuffleOccurred: true,
    };

    const promise = overlay.showCombat(state);
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('FATE DECK RESHUFFLED');
    expect(html).toContain('DOOM TOLL ADVANCES');

    // Resolve
    const btn = container.children[0].querySelector('#combat-resolve-btn');
    btn?.dispatchEvent('click');
    await promise;
  });

  it('shows combat result with winner highlight', async () => {
    const overlay = new CombatOverlay('game-board');
    const mockResult = {
      winner: 'attacker' as const,
      attackerStrength: 18,
      defenderStrength: 14,
      attackerCardValue: 3,
      defenderCardValue: 2,
      margin: 4,
      penaltyCards: 4,
    };
    const attacker = { index: 0 };
    const defender = { index: 1 };

    const promise = overlay.showCombatResult(mockResult, attacker as never, defender as never, 0);
    
    // Advance timers to trigger auto-dismiss
    vi.advanceTimersByTime(100);
    await promise;
  });

  it('shows tie outcome when margin is 0', async () => {
    const overlay = new CombatOverlay('game-board');
    const mockResult = {
      winner: 'defender' as const,
      attackerStrength: 15,
      defenderStrength: 15,
      attackerCardValue: 3,
      defenderCardValue: 3,
      margin: 0,
      penaltyCards: 0,
    };
    const attacker = { index: 0 };
    const defender = { index: 1 };

    const promise = overlay.showCombatResult(mockResult, attacker as never, defender as never, 0);
    
    const container = elementsById['game-board'];
    const html = container.children[0].innerHTML;

    expect(html).toContain('TIE');
    expect(html).toContain('Defender holds');

    vi.advanceTimersByTime(100);
    await promise;
  });
});
