/**
 * Tests — CharacterPanel
 *
 * Verifies that CharacterPanel.update() correctly renders fellowship
 * characters, role icons, and recruit action availability.
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

import { CharacterPanel, CharacterPanelState } from '../../src/ui/character-panel.js';

// ─── Helpers ─────────────────────────────────────────────────────

function makePanel() {
  const container = new MockEl() as unknown as HTMLElement;
  return { panel: new CharacterPanel(container), container };
}

function getHTML(container: MockEl): string {
  return container.children[0]?.innerHTML ?? '';
}

// ─── Tests ───────────────────────────────────────────────────────

describe('CharacterPanel', () => {
  let container: MockEl;
  let panel: CharacterPanel;

  beforeEach(() => {
    const result = makePanel();
    container = result.container as unknown as MockEl;
    panel = result.panel;
  });

  it('renders all characters in the fellowship', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c2', role: 'warrior', powerLevel: 6 },
        { id: 'c3', role: 'diplomat', powerLevel: 0 },
        { id: 'c4', role: 'producer', powerLevel: 3 },
      ],
      hasHerald: true,
      canRecruit: true,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('role-leader');
    expect(html).toContain('role-warrior');
    expect(html).toContain('role-diplomat');
    expect(html).toContain('role-producer');
  });

  it('shows correct power levels for each character', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c2', role: 'warrior', powerLevel: 6 },
      ],
      hasHerald: true,
      canRecruit: true,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('Power: 8');
    expect(html).toContain('Power: 6');
  });

  it('renders correct icons for each role', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c2', role: 'warrior', powerLevel: 6 },
        { id: 'c3', role: 'diplomat', powerLevel: 0 },
        { id: 'c4', role: 'producer', powerLevel: 3 },
      ],
      hasHerald: true,
      canRecruit: true,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('👑');
    expect(html).toContain('⚔️');
    expect(html).toContain('📜');
    expect(html).toContain('⚒️');
  });

  it('shows recruit button enabled when herald is present', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c3', role: 'diplomat', powerLevel: 0 },
      ],
      hasHerald: true,
      canRecruit: true,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('btn-recruit');
    expect(html).not.toContain('action-disabled');
    expect(html).not.toContain('disabled');
  });

  it('disables recruit button when no herald is present', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c2', role: 'warrior', powerLevel: 6 },
      ],
      hasHerald: false,
      canRecruit: false,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('action-disabled');
    expect(html).toContain('disabled');
  });

  it('disables recruit button when not active turn', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c3', role: 'diplomat', powerLevel: 0 },
      ],
      hasHerald: true,
      canRecruit: true,
      isActiveTurn: false,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('action-disabled');
    expect(html).toContain('disabled');
  });

  it('enables recruit button when herald present and active turn', () => {
    const state: CharacterPanelState = {
      characters: [
        { id: 'c1', role: 'leader', powerLevel: 8 },
        { id: 'c3', role: 'diplomat', powerLevel: 0 },
      ],
      hasHerald: true,
      canRecruit: true,
      isActiveTurn: true,
    };

    panel.update(state);
    const html = getHTML(container);

    expect(html).toContain('btn-recruit');
    expect(html).not.toContain('action-disabled');
  });
});
