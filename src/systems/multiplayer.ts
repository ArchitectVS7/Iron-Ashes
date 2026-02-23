import { GameState } from '../models/game-state.js';

export interface LobbyConfig {
    mode: 'competitive' | 'blood_pact' | 'cooperative';
    playerCount: number;
    aiCount: number;
    seed: string;
}

export interface MultiplayerSessionStub {
    hostSession(config: LobbyConfig): Promise<string>;
    joinSession(sessionId: string): Promise<boolean>;
    disconnect(): Promise<void>;
    submitVote(vote: 'COUNTER' | 'ABSTAIN'): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitAction(action: any): Promise<void>;
    onStateUpdate(callback: (state: GameState) => void): void;
    onPlayerDisconnected(callback: (playerId: string) => void): void;
}

export class MockMultiplayerSession implements MultiplayerSessionStub {
    private stateCallback: ((state: GameState) => void) | null = null;
    private disconnectCallback: ((playerId: string) => void) | null = null;
    private activeSessionId: string | null = null;

    public async hostSession(config: LobbyConfig): Promise<string> {
        this.activeSessionId = "mock-session-" + config.seed;
        return this.activeSessionId;
    }

    public async joinSession(sessionId: string): Promise<boolean> {
        if (!sessionId) return false;
        this.activeSessionId = sessionId;
        return true;
    }

    public async disconnect(): Promise<void> {
        this.activeSessionId = null;
    }

    public async submitVote(_vote: 'COUNTER' | 'ABSTAIN'): Promise<void> {
        // Mock success
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async submitAction(_action: any): Promise<void> {
        // Mock success
    }

    public onStateUpdate(callback: (state: GameState) => void): void {
        this.stateCallback = callback;
    }

    public onPlayerDisconnected(callback: (playerId: string) => void): void {
        this.disconnectCallback = callback;
    }

    // For tests
    public simulateStatePush(state: GameState) {
        if (this.stateCallback) this.stateCallback(state);
    }

    public simulateDisconnect(playerId: string) {
        if (this.disconnectCallback) this.disconnectCallback(playerId);
    }
}
