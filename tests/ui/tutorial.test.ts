/**
 * Tests — TutorialEngine
 *
 * Verifies that TutorialEngine correctly renders tutorial steps,
 * handles navigation, and manages tutorial state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockClassList {
  private classes: Set<string> = new Set();

  add(...tokens: string[]) { tokens.forEach(t => this.classes.add(t)); }
  remove(...tokens: string[]) { tokens.forEach(t => this.classes.delete(t)); }
  toggle(token: string) {
    if (this.classes.has(token)) { this.classes.delete(token); } else { this.classes.add(token); }
  }
  contains(token: string) { return this.classes.has(token); }
  toString() { return [...this.classes].join(' '); }
}


// Registry of all elements by id for getElementById lookups
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
    // Extract child elements with ids (or classes for class-only elements)
    this.children = [];
    const tagRe = /<(\w+)([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(html)) !== null) {
      const attrs = m[2];
      const idMatch = /id="([^"]+)"/.exec(attrs);
      const clsMatch = /class="([^"]+)"/.exec(attrs);
      // Only track elements that have an id (to avoid nesting confusion)
      if (idMatch) {
        const child = new MockEl();
        child.id = idMatch[1];
        if (clsMatch) { child.className = clsMatch[1]; }
        this.children.push(child);
      } else if (clsMatch && /tooltip-close/.test(clsMatch[1])) {
        // Special-case: tooltip-close button (no id, accessed via children[0] of tooltip-title)
        const child = new MockEl();
        child.className = clsMatch[1];
        this.children.push(child);
      }
    }
  }

  public children: MockEl[] = [];
  public style: Record<string, string> = {};
  public classList: MockClassList;
  constructor() { this.classList = new MockClassList(); }
  private listeners: Record<string, Listener[]> = {};

  addEventListener(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatchEvent(event: string) {
    (this.listeners[event] ?? []).forEach(fn => fn());
  }
  appendChild(child: MockEl) { this.children.push(child); return child; }
  remove() {}
  querySelector(selector: string): MockEl | null {
    // Support id selectors
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return mockElRegistry.get(id) ?? null;
    }
    // Support class selectors - search children
    const cls = selector.replace(/^\./, '');
    for (const child of this.children) {
      if (child.className?.includes(cls)) return child;
    }
    return null;
  }
}

const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  getElementById(id: string) { return mockElRegistry.get(id) ?? null; },
  body: mockBody,
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { TutorialEngine } from '../../src/ui/tutorial.js';
import { TutorialState } from '../../src/systems/tutorial-state.js';

// ─── Helpers ─────────────────────────────────────────────────────

function cleanup() {
  mockBody.children = [];
  mockElRegistry.clear();
}

// ─── Tests ───────────────────────────────────────────────────────

describe('TutorialEngine', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('creates engine with tutorial overlay', () => {
    const engine = new TutorialEngine();
    expect(engine).toBeDefined();
  });

  it('adds overlay to document body', () => {
    const engine = new TutorialEngine();
    expect(mockBody.children.length).toBeGreaterThan(0);
    expect(mockBody.children[0].className).toBe('tutorial-overlay');
  });

  it('starts guided tutorial with steps', () => {
    const engine = new TutorialEngine();
    const steps = [
      { title: 'Step 1', content: 'Content 1' },
      { title: 'Step 2', content: 'Content 2' },
    ];

    engine.startGuidedTutorial(steps);

    const overlay = mockBody.children[0];
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.innerHTML).toContain('Step 1');
  });

  it('renders tutorial step title and content', () => {
    const engine = new TutorialEngine();
    const steps = [
      { title: 'Movement', content: 'Move your Warband to the Stronghold.' },
    ];

    engine.startGuidedTutorial(steps);

    const overlay = mockBody.children[0];
    expect(overlay.innerHTML).toContain('Movement');
    expect(overlay.innerHTML).toContain('Move your Warband');
  });

  it('shows Skip and Continue buttons', () => {
    const engine = new TutorialEngine();
    // Use 2 steps so the first step shows "Continue" (not "Complete")
    const steps = [
      { title: 'Step 1', content: 'Content 1' },
      { title: 'Step 2', content: 'Content 2' },
    ];

    engine.startGuidedTutorial(steps);

    const overlay = mockBody.children[0];
    expect(overlay.innerHTML).toContain('Skip Tutorial');
    expect(overlay.innerHTML).toContain('Continue');
  });

  it('shows Complete button on last step', () => {
    const engine = new TutorialEngine();
    const steps = [{ title: 'Step 1', content: 'Content 1' }];

    engine.startGuidedTutorial(steps);

    const overlay = mockBody.children[0];
    expect(overlay.innerHTML).toContain('Complete');
  });

  it('advances to next step on Continue click', () => {
    const engine = new TutorialEngine();
    const steps = [
      { title: 'Step 1', content: 'Content 1' },
      { title: 'Step 2', content: 'Content 2' },
    ];

    engine.startGuidedTutorial(steps);

    // Click continue (second button)
    const nextBtn = mockBody.children[0].children[1];
    nextBtn.dispatchEvent('click');

    const overlay = mockBody.children[0];
    expect(overlay.innerHTML).toContain('Step 2');
  });

  it('closes tutorial on Skip click', () => {
    const engine = new TutorialEngine();
    const steps = [{ title: 'Step 1', content: 'Content 1' }];

    engine.startGuidedTutorial(steps);

    // Click skip (first button)
    const skipBtn = mockBody.children[0].children[0];
    skipBtn.dispatchEvent('click');

    const overlay = mockBody.children[0];
    expect(overlay.classList.contains('active')).toBe(false);
    expect(overlay.innerHTML).toBe('');
  });

  it('closes tutorial after completing all steps', () => {
    const engine = new TutorialEngine();
    // 1 step: the only step is the last step, showing "Complete" button
    const steps = [
      { title: 'Step 1', content: 'Content 1' },
    ];

    engine.startGuidedTutorial(steps);

    // Click Complete on the (only/last) step to close the tutorial
    const nextBtn = mockBody.children[0].children[1];
    nextBtn.dispatchEvent('click');

    const overlay = mockBody.children[0];
    expect(overlay.classList.contains('active')).toBe(false);
  });

  it('starts mandatory tutorial flow with TutorialState', () => {
    const engine = new TutorialEngine();
    const tutorialState = new TutorialState();

    engine.startMandatoryTutorialFlow(tutorialState);

    const overlay = mockBody.children[0];
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.innerHTML).toContain('Turn 1');
  });

  it('renders mandatory step with turn badge', () => {
    const engine = new TutorialEngine();
    const tutorialState = new TutorialState();

    engine.startMandatoryTutorialFlow(tutorialState);

    const overlay = mockBody.children[0];
    expect(overlay.innerHTML).toContain('Turn 1 of 5');
    expect(overlay.innerHTML).toContain('Objective:');
  });

  it('advances mandatory tutorial on Continue', () => {
    const engine = new TutorialEngine();
    const tutorialState = new TutorialState();

    engine.startMandatoryTutorialFlow(tutorialState);

    // Click continue
    const nextBtn = mockBody.children[0].children[1];
    nextBtn.dispatchEvent('click');

    const overlay = mockBody.children[0];
    expect(overlay.innerHTML).toContain('Turn 2');
  });

  it('finalizes tutorial on Skip', () => {
    const engine = new TutorialEngine();
    const tutorialState = new TutorialState();
    const finalizeSpy = vi.spyOn(tutorialState, 'finalizeMandatoryTutorial');

    engine.startMandatoryTutorialFlow(tutorialState);

    // Click skip
    const skipBtn = mockBody.children[0].children[0];
    skipBtn.dispatchEvent('click');

    expect(finalizeSpy).toHaveBeenCalled();
    finalizeSpy.mockRestore();
  });

  it('shows discovered tooltip at position', () => {
    const engine = new TutorialEngine();

    engine.showDiscoveredTooltip('First Combat', 'War Field explanation', 100, 200);

    expect(mockBody.children.length).toBeGreaterThan(0);
    const tooltip = mockBody.children[mockBody.children.length - 1];
    expect(tooltip.className).toContain('discovered-tooltip');
    expect(tooltip.innerHTML).toContain('First Combat');
  });

  it('positions tooltip at given coordinates', () => {
    const engine = new TutorialEngine();

    engine.showDiscoveredTooltip('Tooltip', 'Content', 150, 250);

    const tooltip = mockBody.children[mockBody.children.length - 1];
    expect(tooltip.style.left).toBe('150px');
    expect(tooltip.style.top).toBe('250px');
  });

  it('closes tooltip on close button click', () => {
    const engine = new TutorialEngine();

    engine.showDiscoveredTooltip('Tooltip', 'Content', 100, 100);

    const tooltip = mockBody.children[mockBody.children.length - 1];
    const closeBtn = tooltip.children[0]; // First child has close button
    closeBtn.dispatchEvent('click');

    expect(tooltip.classList.contains('visible')).toBe(false);
  });
});
