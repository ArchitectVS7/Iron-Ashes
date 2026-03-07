import { describe, it, expect } from 'vitest';
import { MockMultiplayerSession } from '../../src/systems/multiplayer.js';

describe('Multiplayer Stubs (Phase 17)', () => {

    it('Creates and joins mock sessions', async () => {
        const network = new MockMultiplayerSession();
        const sessionId = await network.hostSession({
            mode: 'competitive',
            playerCount: 2,
            aiCount: 0,
            seed: '123'
        });
        expect(sessionId).toContain('mock-session');

        const success = await network.joinSession(sessionId);
        expect(success).toBe(true);
    });

    it('Forwards simulated state updates and disconnects', () => {
        const network = new MockMultiplayerSession();
        let statePushed = false;
        let disconnectedId: string | null = null;

        network.onStateUpdate(() => statePushed = true);
        network.onPlayerDisconnected((id) => disconnectedId = id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        network.simulateStatePush({} as any);
        network.simulateDisconnect('p1');

        expect(statePushed).toBe(true);
        expect(disconnectedId).toBe('p1');
    });

    it('isConnected is false before joining', () => {
        const network = new MockMultiplayerSession();
        expect(network.isConnected).toBe(false);
    });

    it('isConnected is true after joining a session', async () => {
        const network = new MockMultiplayerSession();
        await network.hostSession({ mode: 'competitive', playerCount: 2, aiCount: 0, seed: 'abc' });
        expect(network.isConnected).toBe(true);
    });

    it('isConnected is false after disconnect', async () => {
        const network = new MockMultiplayerSession();
        await network.hostSession({ mode: 'competitive', playerCount: 2, aiCount: 0, seed: 'abc' });
        await network.disconnect();
        expect(network.isConnected).toBe(false);
    });

    it('getSessionState returns null for mock', async () => {
        const network = new MockMultiplayerSession();
        const state = await network.getSessionState();
        expect(state).toBeNull();
    });

    it('reconnectWithTimeout returns false for mock', async () => {
        const network = new MockMultiplayerSession();
        const result = await network.reconnectWithTimeout(5000);
        expect(result).toBe(false);
    });

    it('submitAction rejects when not connected', async () => {
        const network = new MockMultiplayerSession();
        await expect(
            network.submitAction({ type: 'PASS', payload: {} })
        ).rejects.toThrow('Not connected');
    });

    it('submitVote rejects when not connected', async () => {
        const network = new MockMultiplayerSession();
        await expect(
            network.submitVote('COUNTER')
        ).rejects.toThrow('Not connected');
    });

    it('submitAction succeeds when connected', async () => {
        const network = new MockMultiplayerSession();
        await network.hostSession({ mode: 'competitive', playerCount: 2, aiCount: 0, seed: 'x' });
        await expect(
            network.submitAction({ type: 'PASS', payload: {} })
        ).resolves.toBeUndefined();
    });
});
