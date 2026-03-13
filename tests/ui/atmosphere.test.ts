/**
 * Tests — AtmosphereEngine
 *
 * Verifies that AtmosphereEngine correctly renders atmospheric effects,
 * audio cues, and doom toll visual state changes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  public style: { display: string } = { display: '' };
  public offsetWidth: number = 100;
  private listeners: Record<string, (() => void)[]> = {};

  addEventListener(event: string, fn: () => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event: string) {
    (this.listeners[event] ?? []).forEach(fn => fn());
  }
  appendChild(child: MockEl) { this.children.push(child); return child; }
  insertBefore(child: MockEl, _ref: MockEl | null) {
    this.children.unshift(child);
    return child;
  }
  querySelector(_selector: string): MockEl | null {
    return this.children.length > 0 ? this.children[0] : null;
  }
  animate(_keyframes: unknown[], _options: unknown) {
    return {
      onfinish: null as (() => void) | null,
      finish: () => { this.onfinish?.(); },
    };
  }
}

const elementsById: Record<string, MockEl> = {};
const mockBody = new MockEl();

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  createOscillator: () => ({
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }),
  createGain: () => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }),
  resume: vi.fn().mockResolvedValue(undefined),
};

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return elementsById[id] ?? null; },
  body: mockBody,
} as unknown as Document;

globalThis.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
globalThis.webkitAudioContext = globalThis.AudioContext;

vi.useFakeTimers();

// ─── Imports ─────────────────────────────────────────────────────

import { AtmosphereEngine } from '../../src/ui/atmosphere.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';

// ─── Helpers ─────────────────────────────────────────────────────

function setupElement(id: string): MockEl {
  const el = new MockEl();
  elementsById[id] = el;
  return el;
}

function cleanup() {
  for (const key in elementsById) delete elementsById[key];
  mockBody.children = [];
  vi.clearAllMocks();
}

// ─── Tests ───────────────────────────────────────────────────────

describe('AtmosphereEngine', () => {
  beforeEach(() => {
    cleanup();
    setupElement('game-board');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates engine with atmosphere layer', () => {
    const engine = new AtmosphereEngine('game-board');
    expect(engine).toBeDefined();
  });

  it('creates atmosphere layer with correct child elements', () => {
    const engine = new AtmosphereEngine('game-board');
    
    const container = elementsById['game-board'];
    expect(container.children.length).toBeGreaterThan(0);
    
    const layer = container.children[0];
    expect(layer.id).toBe('atmosphere-layer');
  });

  it('creates lighting element', () => {
    const engine = new AtmosphereEngine('game-board');
    
    const container = elementsById['game-board'];
    const layer = container.children[0];
    
    const lighting = layer.children.find(c => c.className === 'board-lighting');
    expect(lighting).toBeDefined();
  });

  it('creates silhouette element', () => {
    const engine = new AtmosphereEngine('game-board');
    
    const container = elementsById['game-board'];
    const layer = container.children[0];
    
    const silhouette = layer.children.find(c => c.className === 'shadowking-silhouette');
    expect(silhouette).toBeDefined();
  });

  it('creates particle layer', () => {
    const engine = new AtmosphereEngine('game-board');
    
    const container = elementsById['game-board'];
    const layer = container.children[0];
    
    const particles = layer.children.find(c => c.id === 'particle-layer');
    expect(particles).toBeDefined();
  });

  it('accepts custom SeededRandom', () => {
    const rng = new SeededRandom(12345);
    const engine = new AtmosphereEngine('game-board', rng);
    expect(engine).toBeDefined();
  });

  it('plays bell strike with audio context', () => {
    const engine = new AtmosphereEngine('game-board');
    engine.playBellStrike();
    
    // AudioContext methods should be called
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });

  it('plays rescue sound', () => {
    const engine = new AtmosphereEngine('game-board');
    engine.playRescueSound();
    
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });

  it('explodes particles at given coordinates', () => {
    const engine = new AtmosphereEngine('game-board');
    engine.explodeParticles(100, 200, '#ff0000');
    
    const container = elementsById['game-board'];
    const layer = container.children[0];
    const particleLayer = layer.children.find(c => c.id === 'particle-layer');
    
    expect(particleLayer?.children.length).toBeGreaterThan(0);
  });

  it('updates doom toll visual state for position 7-9', () => {
    const engine = new AtmosphereEngine('game-board');
    engine.updateDoomTollEvent(6, 8);
    
    const container = elementsById['game-board'];
    const layer = container.children[0];
    const lighting = layer.children.find(c => c.className?.includes('board-lighting'));
    
    expect(lighting?.className).toContain('vignette-dim');
  });

  it('updates doom toll visual state for position 10+', () => {
    const engine = new AtmosphereEngine('game-board');
    engine.updateDoomTollEvent(9, 11);
    
    const container = elementsById['game-board'];
    const layer = container.children[0];
    const lighting = layer.children.find(c => c.className?.includes('board-lighting'));
    
    expect(lighting?.className).toContain('vignette-heavy');
    expect(lighting?.className).toContain('lighting-cold');
  });

  it('triggers game over cutscene at doom toll 13', () => {
    const engine = new AtmosphereEngine('game-board');
    engine.updateDoomTollEvent(12, 13);
    
    // Game over cutscene is added to body
    expect(mockBody.children.length).toBeGreaterThan(0);
    expect(mockBody.children[0].className).toBe('game-over-cutscene');
    expect(mockBody.children[0].innerHTML).toContain('THE SHADOWKING REIGNS');
  });

  it('plays bell strike on doom toll advance', () => {
    const engine = new AtmosphereEngine('game-board');
    const spy = vi.spyOn(engine, 'playBellStrike');
    
    engine.updateDoomTollEvent(5, 7);
    
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not play bell strike on doom toll recede', () => {
    const engine = new AtmosphereEngine('game-board');
    const spy = vi.spyOn(engine, 'playBellStrike');
    
    engine.updateDoomTollEvent(7, 5);
    
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
