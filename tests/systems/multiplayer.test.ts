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
});
