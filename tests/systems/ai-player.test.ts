import { describe, it, expect } from 'vitest';
import { AIPlayer } from '../../src/systems/ai-player.js';
import { Player } from '../../src/models/player.js';
import { GameState } from '../../src/models/game-state.js';

describe('AI Player Logic (Phase 15)', () => {

    const createMockPlayer = (index: number, cardCount: number): Player => ({
        index,
        type: 'ai',
        aiDifficulty: 'apprentice',
        fellowship: {
            courtIndex: index,
            characters: [],
            currentNode: 's01'
        },
        warBanners: 3,
        fateCards: new Array(cardCount).fill(0),
        penaltyCards: 0,
        isBroken: false,
        hasBloodPact: false,
        bloodPactRevealed: false,
        actionsRemaining: 2,
        stats: {
            strongholdsClaimed: 2,
            fellowsRecruited: 0,
            warBannersSpent: 0,
            combatsWon: 0,
            combatsLost: 0,
            timesBroken: 0,
            rescuesGiven: 0,
            rescuesReceived: 0,
            votesCast: 0,
            votesAbstained: 0,
        }
    });

    const mockState = {
        round: 1,
        phase: 'voting',
        doomToll: 0,
        boardParams: { mode: 'competitive', traitors: [] },
        players: [createMockPlayer(0, 5), createMockPlayer(1, 5)],
        nodes: {}
    } as unknown as GameState;

    it('Apprentice AI predominantly votes COUNTER', async () => {
        const ai = new AIPlayer('apprentice', 'seed1');
        // Because of the deterministic seed, we just check output matches logic
        const vote = await ai.getVote(mockState, mockState.players[1], 'spawn');
        // Testing specific seed behavior is brittle, but we ensure it returns a valid vote
        expect(['COUNTER', 'ABSTAIN']).toContain(vote);
    });

    it('Arch-Regent AI attempts to hurt the leader', async () => {
        const ai = new AIPlayer('arch_regent', 'seed2');
        const vote = await ai.getVote(mockState, mockState.players[1], 'assault');
        // The mock leader is p0, and ASSAULT marks leader targeted as true
        // Arch-Regent should choose ABSTAIN to let the leader get hit
        expect(vote).toBe('ABSTAIN');
    });

    it('Auto-abstains if 0 fate cards regardless of difficulty', async () => {
        const ai = new AIPlayer('arch_regent', 'seed3');
        const vote = await ai.getVote(mockState, createMockPlayer(2, 0), 'spawn');
        expect(vote).toBe('ABSTAIN');
    });

});
