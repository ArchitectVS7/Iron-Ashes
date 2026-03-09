import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const mockStorage: Record<string, string> = {};
global.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (_key: string, value: string) => { mockStorage[_key] = value; },
    clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
    removeItem: (_key: string) => { delete mockStorage[_key]; },
    length: 0,
    key: () => null,
} as unknown as Storage;

// Minimal DOM mock for modal creation
class MockElement {
    public className = '';
    public innerHTML = '';
    public disabled = false;
    public scrollHeight = 200;
    public scrollTop = 0;
    public clientHeight = 100;
    private listeners: Record<string, Array<() => void>> = {};
    public children: MockElement[] = [];
    public style: Record<string, string> = {};

    setAttribute(_k: string, _v: string) { }
    getAttribute(_k: string): string | null { return null; }
    appendChild(child: MockElement) { this.children.push(child); return child; }
    remove() { }
    querySelector(selector: string): MockElement | null {
        // Minimal: find first child matching class
        const cls = selector.replace('.', '');
        return this.children.find(c => c.className.includes(cls)) ?? null;
    }
    addEventListener(event: string, cb: () => void) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
    }
    removeEventListener(event: string, cb: () => void) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(fn => fn !== cb);
        }
    }
    dispatchEvent(event: string) {
        (this.listeners[event] ?? []).forEach(fn => fn());
    }

    // Simulate scrolling to bottom
    scrollToBottom() {
        this.scrollTop = this.scrollHeight - this.clientHeight;
        this.dispatchEvent('scroll');
    }
}

// Patch document.createElement and document.body for the tests
const createdElements: MockElement[] = [];
const mockBody = new MockElement();
mockBody.className = 'body';

global.document = {
    createElement: (_tag: string) => {
        const el = new MockElement();
        createdElements.push(el);
        return el;
    },
    body: mockBody,
} as unknown as Document;

// Now import the module under test (after DOM mocks are set up)
import { SocialPressureOnboarding } from '../../src/ui/social-pressure-onboarding.js';

const STORAGE_KEY = 'iron_ashes_onboarding_seen';

describe('Social Pressure Onboarding (F-006b)', () => {

    beforeEach(() => {
        localStorage.clear();
        createdElements.length = 0;
        mockBody.children = [];
    });

    it('shows modal on first call when key is not set', async () => {
        const onboarding = new SocialPressureOnboarding();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

        // We need to immediately dismiss to resolve the promise
        const showPromise = onboarding.showIfFirstSession();

        // Find the dismiss button in the appended children and simulate scroll + click
        const overlay = mockBody.children[mockBody.children.length - 1];
        expect(overlay).toBeDefined();

        // Get box child, then scroll area and dismiss button
        const box = overlay?.children[0];
        const scrollArea = box?.children[0];
        const dismissBtn = box?.children[1] as MockElement | undefined;

        // Simulate scroll to bottom to enable button
        if (scrollArea) scrollArea.scrollToBottom();
        expect(dismissBtn?.disabled).toBe(false);

        // Click dismiss
        dismissBtn?.dispatchEvent('click');

        await showPromise;
        expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    });

    it('skips modal on second call when key is set', async () => {
        localStorage.setItem(STORAGE_KEY, '1');
        const onboarding = new SocialPressureOnboarding();

        const childrenBefore = mockBody.children.length;
        await onboarding.showIfFirstSession(); // should resolve immediately
        expect(mockBody.children.length).toBe(childrenBefore); // no modal appended
    });

    it('showFromSettings always shows the modal regardless of key', async () => {
        localStorage.setItem(STORAGE_KEY, '1'); // already seen
        const onboarding = new SocialPressureOnboarding();

        const showPromise = onboarding.showFromSettings();

        const overlay = mockBody.children[mockBody.children.length - 1];
        expect(overlay).toBeDefined();

        const box = overlay?.children[0];
        const scrollArea = box?.children[0];
        const dismissBtn = box?.children[1] as MockElement | undefined;

        if (scrollArea) scrollArea.scrollToBottom();
        dismissBtn?.dispatchEvent('click');

        await showPromise;
    });

    it('dismiss button is disabled until scrolled to bottom', async () => {
        const onboarding = new SocialPressureOnboarding();
        const showPromise = onboarding.showIfFirstSession();

        const overlay = mockBody.children[mockBody.children.length - 1];
        const box = overlay?.children[0];
        const dismissBtn = box?.children[1] as MockElement | undefined;

        // Should start disabled (content requires scrolling)
        expect(dismissBtn?.disabled).toBe(true);

        // Now scroll to bottom
        const scrollArea = box?.children[0];
        if (scrollArea) scrollArea.scrollToBottom();
        expect(dismissBtn?.disabled).toBe(false);

        dismissBtn?.dispatchEvent('click');
        await showPromise;
    });
});
