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

// ─── Real WebSocket Client ──────────────────────────────────────────

export class WebSocketMultiplayerSession implements MultiplayerSessionStub {
    private ws: WebSocket | null = null;
    private stateCallback: ((state: GameState) => void) | null = null;
    private disconnectCallback: ((playerId: string) => void) | null = null;
    private activeSessionId: string | null = null;
    private activePlayerId: string | null = null;
    private serverUrl = 'ws://localhost:3001';

    public get isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    public async hostSession(config: LobbyConfig): Promise<string> {
        // HTTP POST to /api/host to spawn a session
        const res = await fetch(`http://localhost:3001/api/host`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        return data.sessionId;
    }

    public async joinSession(sessionId: string, playerId: string = '0'): Promise<boolean> {
        this.activeSessionId = sessionId;
        this.activePlayerId = playerId;

        return new Promise((resolve) => {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.onopen = () => {
                this.ws?.send(JSON.stringify({
                    type: 'RECONNECT',
                    payload: { sessionId, playerId }
                }));
                resolve(true);
            };

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'FULL_STATE' || msg.type === 'STATE_UPDATE') {
                    if (this.stateCallback) this.stateCallback(msg.payload);
                } else if (msg.type === 'PLAYER_DISCONNECTED') {
                    if (this.disconnectCallback) this.disconnectCallback(msg.payload.playerId);
                }
            };

            this.ws.onerror = () => {
                resolve(false);
            };
        });
    }

    public async disconnect(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.activeSessionId = null;
        this.activePlayerId = null;
    }

    public async submitVote(vote: 'COUNTER' | 'ABSTAIN'): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected');
        this.ws!.send(JSON.stringify({
            type: 'VOTE',
            payload: { choice: vote.toLowerCase() } // Our backend uses lowercase 'counter' | 'abstain'
        }));
    }

    public async submitAction(action: PlayerAction): Promise<void> {
        if (!this.isConnected) throw new Error('Not connected');
        this.ws!.send(JSON.stringify({
            type: 'ACTION',
            payload: action
        }));
    }

    public async getSessionState(): Promise<GameState | null> {
        return null; // The server pushes FULL_STATE on reconnect, so we don't pull it here synchronously
    }

    public async reconnectWithTimeout(_timeoutMs: number): Promise<boolean> {
        if (!this.activeSessionId || !this.activePlayerId) return false;
        return this.joinSession(this.activeSessionId, this.activePlayerId);
    }

    public onStateUpdate(callback: (state: GameState) => void): void {
        this.stateCallback = callback;
    }

    public onPlayerDisconnected(callback: (playerId: string) => void): void {
        this.disconnectCallback = callback;
    }
}
