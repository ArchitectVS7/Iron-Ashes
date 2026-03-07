import { TUTORIAL_TURNS, TutorialTurnStep } from './tutorial-script.js';

export interface ServerSideTutorialStub {
    isFirstSession(): Promise<boolean>;
    markTutorialComplete(): Promise<void>;
}

export type DiscoveredTutorialTrigger =
    | 'FIRST_ARTIFICER_RECRUIT'
    | 'FIRST_RESCUE'
    | 'FIRST_DEATH_KNIGHT_COMBAT'
    | 'FIRST_FINAL_PHASE'
    | 'FIRST_BLOOD_PACT_ACCUSATION';

export class TutorialState {
    private readonly STORAGE_KEY = 'iron_ashes_tutorial_completed';
    private serverStub: ServerSideTutorialStub;
    private isMandatoryTutorialActive: boolean = false;
    private discoveredTutorialsShown: Set<DiscoveredTutorialTrigger> = new Set();

    /** Current tutorial turn index (0-based). */
    public currentTurnIndex: number = 0;

    // In-memory cache of completion so we don't spam storage
    private isCompletedLocally: boolean;

    constructor(serverStub?: ServerSideTutorialStub) {
        this.serverStub = serverStub || {
            isFirstSession: async () => false,
            markTutorialComplete: async () => { }
        };
        this.isCompletedLocally = localStorage.getItem(this.STORAGE_KEY) === 'true';
    }

    /** Ensure we only trigger the mandatory tutorial on brand new accounts. */
    public async checkShouldRunMandatoryTutorial(): Promise<boolean> {
        // If local storage says done, we don't run it (fast path)
        if (this.isCompletedLocally) return false;

        // If local storage is empty, defer to server (handles reinstalls)
        const isFirst = await this.serverStub.isFirstSession();
        return isFirst;
    }

    public startMandatoryTutorial() {
        this.isMandatoryTutorialActive = true;
        this.currentTurnIndex = 0;
    }

    /**
     * Get the current tutorial turn step, or null if past the end.
     */
    public getCurrentTurn(): TutorialTurnStep | null {
        if (this.currentTurnIndex >= TUTORIAL_TURNS.length) return null;
        return TUTORIAL_TURNS[this.currentTurnIndex];
    }

    /**
     * Advance to the next tutorial turn.
     * Returns false when all turns are complete (caller should finalize).
     */
    public advanceTurn(): boolean {
        this.currentTurnIndex++;
        if (this.currentTurnIndex >= TUTORIAL_TURNS.length) {
            this.finalizeMandatoryTutorial();
            return false;
        }
        return true;
    }

    public async finalizeMandatoryTutorial() {
        this.isMandatoryTutorialActive = false;
        this.isCompletedLocally = true;
        try {
            localStorage.setItem(this.STORAGE_KEY, 'true');
            await this.serverStub.markTutorialComplete();
        } catch (e) {
            console.warn("Could not persist tutorial completion state", e);
        }
    }

    /** 
     * Try to trigger a discovered tutorial. 
     * Returns false if suppressed by mandatory tutorial or already shown. 
     */
    public triggerDiscoveredTutorial(trigger: DiscoveredTutorialTrigger): boolean {
        if (this.isMandatoryTutorialActive) return false;
        if (this.discoveredTutorialsShown.has(trigger)) return false;

        this.discoveredTutorialsShown.add(trigger);
        return true;
    }

    // Expose for tests
    public isMandatoryActive(): boolean {
        return this.isMandatoryTutorialActive;
    }
}
