import { GameState } from '../models/game-state.js';
import { PlayerAction } from './ai-player.js';

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
    submitAction(action: PlayerAction): Promise<void>;
    getSessionState(): Promise<GameState | null>;
    reconnectWithTimeout(timeoutMs: number): Promise<boolean>;
    onStateUpdate(callback: (state: GameState) => void): void;
    onPlayerDisconnected(callback: (playerId: string) => void): void;
    readonly isConnected: boolean;
}

export class MockMultiplayerSession implements MultiplayerSessionStub {
    private stateCallback: ((state: GameState) => void) | null = null;
    private disconnectCallback: ((playerId: string) => void) | null = null;
    private activeSessionId: string | null = null;

    public get isConnected(): boolean {
        return this.activeSessionId !== null;
    }

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
        if (!this.isConnected) throw new Error('Not connected to a session');
        // Mock success
    }

    public async submitAction(_action: PlayerAction): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected to a session');
        // Mock success
    }

    /** Returns null — mock has no persisted session state. */
    public async getSessionState(): Promise<GameState | null> {
        return null;
    }

    /** Returns false — mock never reconnects. */
    public async reconnectWithTimeout(_timeoutMs: number): Promise<boolean> {
        return false;
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
