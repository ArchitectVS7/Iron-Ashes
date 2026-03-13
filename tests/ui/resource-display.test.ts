/**
 * Tests — ResourceDisplay
 *
 * Verifies that ResourceDisplay correctly renders war banner counts,
 * production indicators, and zero-resource state.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

class MockEl {
  public className = '';
  public innerHTML = '';
  public children: MockEl[] = [];
  appendChild(child: MockEl) { this.children.push(child); return child; }
}

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
} as unknown as Document;

// ─── Imports ─────────────────────────────────────────────────────

import { ResourceDisplay, ResourceState } from '../../src/ui/resource-display.js';

// ─── Helpers ─────────────────────────────────────────────────────

function makeDisplay() {
  const container = new MockEl() as unknown as HTMLElement;
  return { display: new ResourceDisplay(container), container };
}

function getHTML(container: MockEl): string {
  return container.children[0]?.innerHTML ?? '';
}

// ─── Tests ───────────────────────────────────────────────────────

describe('ResourceDisplay', () => {
  let container: MockEl;
  let display: ResourceDisplay;

  beforeEach(() => {
    const result = makeDisplay();
    container = result.container as unknown as MockEl;
    display = result.display;
  });

  it('renders resource banner count', () => {
    const state: ResourceState = {
      currentBanners: 5,
      generatedThisTurn: 0,
    };

    display.update(state);
    const html = getHTML(container);

    expect(html).toContain('resource-banner');
    expect(html).toContain('>5<');
  });

  it('shows zero state class when no banners', () => {
    const state: ResourceState = {
      currentBanners: 0,
      generatedThisTurn: 0,
    };

    display.update(state);
    const html = getHTML(container);

    expect(html).toContain('resource-zero');
  });

  it('shows generated this turn when positive', () => {
    const state: ResourceState = {
      currentBanners: 5,
      generatedThisTurn: 3,
    };

    display.update(state);
    const html = getHTML(container);

    expect(html).toContain('(+3)');
    expect(html).toContain('generated');
  });

  it('hides generated indicator when zero', () => {
    const state: ResourceState = {
      currentBanners: 5,
      generatedThisTurn: 0,
    };

    display.update(state);
    const html = getHTML(container);

    expect(html).not.toContain('generated');
  });

  it('renders banner icon SVG', () => {
    const state: ResourceState = {
      currentBanners: 1,
      generatedThisTurn: 0,
    };

    display.update(state);
    const html = getHTML(container);

    expect(html).toContain('resource-icon');
    expect(html).toContain('<svg');
  });

  it('displays current banners separately from generated', () => {
    const state: ResourceState = {
      currentBanners: 8,
      generatedThisTurn: 4,
    };

    display.update(state);
    const html = getHTML(container);

    // Current should appear as standalone number
    expect(html).toContain('>8<');
    // Generated should be in parentheses
    expect(html).toContain('(+4)');
  });

  it('handles large banner counts', () => {
    const state: ResourceState = {
      currentBanners: 25,
      generatedThisTurn: 12,
    };

    display.update(state);
    const html = getHTML(container);

    expect(html).toContain('>25<');
    expect(html).toContain('(+12)');
  });
});
