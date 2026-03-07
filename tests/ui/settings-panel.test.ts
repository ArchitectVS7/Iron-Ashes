/**
 * Tests — SettingsPanel
 *
 * Verifies that clicking the settings gear button calls
 * SocialPressureOnboarding.showFromSettings().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Minimal DOM mock ─────────────────────────────────────────────

type Listener = (...args: unknown[]) => void;

class MockEl {
  public className = '';
  public textContent = '';
  public children: MockEl[] = [];
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
}

const mockBody = new MockEl();

globalThis.document = {
  createElement(_tag: string) { return new MockEl(); },
  body: mockBody,
} as unknown as Document;

// Mock localStorage
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  length: 0,
  key: () => null,
} as unknown as Storage;

// ─── Imports ─────────────────────────────────────────────────────

import { SettingsPanel } from '../../src/ui/settings-panel.js';
import { SocialPressureOnboarding } from '../../src/ui/social-pressure-onboarding.js';

// ─── Tests ───────────────────────────────────────────────────────

describe('SettingsPanel', () => {
  beforeEach(() => {
    for (const k in mockStorage) delete mockStorage[k];
    mockBody.children = [];
  });

  it('creates a button with settings class in the container', () => {
    const container = new MockEl() as unknown as HTMLElement;
    new SettingsPanel(container);
    const mockContainer = container as unknown as MockEl;
    expect(mockContainer.children.length).toBe(1);
    expect(mockContainer.children[0].className).toBe('settings-btn');
  });

  it('calls SocialPressureOnboarding.showFromSettings on click', () => {
    const showFromSettings = vi.spyOn(
      SocialPressureOnboarding.prototype,
      'showFromSettings',
    ).mockResolvedValue(undefined);

    const container = new MockEl() as unknown as HTMLElement;
    new SettingsPanel(container);

    const mockContainer = container as unknown as MockEl;
    const btn = mockContainer.children[0];
    btn.dispatchEvent('click');

    expect(showFromSettings).toHaveBeenCalledOnce();
    showFromSettings.mockRestore();
  });
});
