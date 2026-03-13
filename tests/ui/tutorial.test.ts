/**
 * Tests — TutorialEngine
 *
 * Verifies that TutorialEngine correctly renders tutorial steps,
 * handles navigation, and manages tutorial state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
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
    const id = selector.replace('#', '');
    for (const child of this.children) {
      // Simple matching by checking if any attribute matches
      if (child.innerHTML?.includes(id) || child.className?.includes(id)) {
        return child;
      }
    }
    return this.children.length > 0 ? this.children[0] : null;
  }
}

const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  body: mockBody,
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { TutorialEngine } from '../../src/ui/tutorial.js';
import { TutorialState } from '../../src/systems/tutorial-state.js';

// ─── Helpers ─────────────────────────────────────────────────────

function cleanup() {
  mockBody.children = [];
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
    expect(overlay.className).toContain('active');
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
    const steps = [{ title: 'Step 1', content: 'Content 1' }];

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
    expect(overlay.className).not.toContain('active');
    expect(overlay.innerHTML).toBe('');
  });

  it('closes tutorial after completing all steps', () => {
    const engine = new TutorialEngine();
    const steps = [
      { title: 'Step 1', content: 'Content 1' },
      { title: 'Step 2', content: 'Content 2' },
    ];

    engine.startGuidedTutorial(steps);
    
    // Click continue to advance past last step
    const nextBtn = mockBody.children[0].children[1];
    nextBtn.dispatchEvent('click');
    
    const overlay = mockBody.children[0];
    expect(overlay.className).not.toContain('active');
  });

  it('starts mandatory tutorial flow with TutorialState', () => {
    const engine = new TutorialEngine();
    const tutorialState = new TutorialState();
    
    engine.startMandatoryTutorialFlow(tutorialState);
    
    const overlay = mockBody.children[0];
    expect(overlay.className).toContain('active');
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
    
    expect(tooltip.className).not.toContain('visible');
  });
});
