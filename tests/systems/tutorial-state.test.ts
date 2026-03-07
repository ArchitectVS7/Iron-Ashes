import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TutorialState, ServerSideTutorialStub } from '../../src/systems/tutorial-state.js';

// Mock localStorage for Node environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => mockStorage[key] = value,
    clear: () => {
        for (const key in mockStorage) {
            delete mockStorage[key];
        }
    },
    removeItem: (key: string) => delete mockStorage[key],
    length: 0,
    key: () => null,
};

describe('Tutorial System Constraints (Phase 14)', () => {

    beforeEach(() => {
        localStorage.clear();
    });

    it('relies on server-side first-session detection on fresh install', async () => {
        const mockServer: ServerSideTutorialStub = {
            isFirstSession: vi.fn().mockResolvedValue(true),
            markTutorialComplete: vi.fn().mockResolvedValue(undefined)
        };

        const state = new TutorialState(mockServer);
        expect(await state.checkShouldRunMandatoryTutorial()).toBe(true);
        expect(mockServer.isFirstSession).toHaveBeenCalled();
    });

    it('relies on local storage fast-path for returning players', async () => {
        const mockServer: ServerSideTutorialStub = {
            isFirstSession: vi.fn(), // Should not be called
            markTutorialComplete: vi.fn().mockResolvedValue(undefined)
        };

        localStorage.setItem('iron_ashes_tutorial_completed', 'true');
        const state = new TutorialState(mockServer);

        expect(await state.checkShouldRunMandatoryTutorial()).toBe(false);
        expect(mockServer.isFirstSession).not.toHaveBeenCalled();
    });

    it('persists completion to both local storage and server', async () => {
        const mockServer: ServerSideTutorialStub = {
            isFirstSession: vi.fn().mockResolvedValue(true),
            markTutorialComplete: vi.fn().mockResolvedValue(undefined)
        };

        const state = new TutorialState(mockServer);
        state.startMandatoryTutorial();
        await state.finalizeMandatoryTutorial();

        expect(localStorage.getItem('iron_ashes_tutorial_completed')).toBe('true');
        expect(mockServer.markTutorialComplete).toHaveBeenCalled();
        expect(state.isMandatoryActive()).toBe(false);
    });

    it('suppresses discovered tutorials during mandatory tutorial', () => {
        const state = new TutorialState();
        state.startMandatoryTutorial();

        const canShow = state.triggerDiscoveredTutorial('FIRST_RESCUE');
        expect(canShow).toBe(false); // Should be suppressed
    });

    it('allows discovered tutorials after mandatory tutorial, but only once each', () => {
        const state = new TutorialState();
        // mandatory is NOT active

        const showFirst = state.triggerDiscoveredTutorial('FIRST_ARTIFICER_RECRUIT');
        expect(showFirst).toBe(true);

        const showSecond = state.triggerDiscoveredTutorial('FIRST_ARTIFICER_RECRUIT');
        expect(showSecond).toBe(false); // Suppressed, already shown

        const showOther = state.triggerDiscoveredTutorial('FIRST_DEATH_KNIGHT_COMBAT');
        expect(showOther).toBe(true); // Different trigger allowed
    });

    describe('5-turn sequence (F-012)', () => {

        it('getCurrentTurn returns the first step on start', () => {
            const state = new TutorialState();
            state.startMandatoryTutorial();
            const step = state.getCurrentTurn();
            expect(step).not.toBeNull();
            expect(step?.turn).toBe(1);
            expect(step?.mechanic).toBe('movement');
        });

        it('advanceTurn returns true for turns 1–4', () => {
            const state = new TutorialState();
            state.startMandatoryTutorial();
            for (let i = 0; i < 4; i++) {
                expect(state.advanceTurn()).toBe(true);
            }
            expect(state.getCurrentTurn()?.turn).toBe(5);
        });

        it('advanceTurn returns false after turn 5 (triggers finalize)', async () => {
            const markComplete = vi.fn().mockResolvedValue(undefined);
            const mockServer: ServerSideTutorialStub = {
                isFirstSession: vi.fn().mockResolvedValue(true),
                markTutorialComplete: markComplete,
            };
            const state = new TutorialState(mockServer);
            state.startMandatoryTutorial();

            // Advance through all 5 turns
            for (let i = 0; i < 4; i++) state.advanceTurn();
            const result = state.advanceTurn(); // 5th advance triggers completion
            expect(result).toBe(false);
            expect(state.getCurrentTurn()).toBeNull();
        });

        it('getCurrentTurn returns null after all turns completed', () => {
            const state = new TutorialState();
            state.startMandatoryTutorial();
            for (let i = 0; i < 5; i++) state.advanceTurn();
            expect(state.getCurrentTurn()).toBeNull();
        });

        it('currentTurnIndex increments with each advanceTurn call', () => {
            const state = new TutorialState();
            state.startMandatoryTutorial();
            expect(state.currentTurnIndex).toBe(0);
            state.advanceTurn();
            expect(state.currentTurnIndex).toBe(1);
            state.advanceTurn();
            expect(state.currentTurnIndex).toBe(2);
        });

        it('startMandatoryTutorial resets currentTurnIndex to 0', () => {
            const state = new TutorialState();
            state.startMandatoryTutorial();
            state.advanceTurn();
            state.advanceTurn();
            expect(state.currentTurnIndex).toBe(2);
            state.startMandatoryTutorial();
            expect(state.currentTurnIndex).toBe(0);
        });
    });

});
