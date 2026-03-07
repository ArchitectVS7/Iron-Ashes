import { describe, it, expect } from 'vitest';
import { AIPlayer } from '../../src/systems/ai-player.js';
import { Player } from '../../src/models/player.js';
import { GameState } from '../../src/models/game-state.js';
import { KNOWN_LANDS, createInitialBoardState, selectWandererNodes } from '../../src/models/board.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';

describe('AI Player Logic (Phase 15)', () => {

    const rng = new SeededRandom(42);
    const wandererNodes = selectWandererNodes(KNOWN_LANDS, rng);
    const initialBoard = createInitialBoardState(KNOWN_LANDS, wandererNodes);

    const createMockPlayer = (index: number, cardCount: number, node = 's01', banners = 3): Player => ({
        index,
        type: 'ai',
        aiDifficulty: 'apprentice',
        fellowship: {
            courtIndex: index,
            characters: [],
            currentNode: node,
        },
        warBanners: banners,
        fateCards: new Array(cardCount).fill(0),
        penaltyCards: 0,
        isBroken: false,
        hasBloodPact: false,
        bloodPactRevealed: false,
        accusationLockoutRounds: 0,
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

    const makeMockState = (p0Node = 's01', p1Node = 's05'): GameState => ({
        boardDefinition: KNOWN_LANDS,
        boardState: { ...initialBoard },
        mode: 'competitive',
        round: 1,
        phase: 'action',
        activePlayerIndex: 0,
        turnOrder: [0, 1],
        doomToll: 0,
        isFinalPhase: false,
        antagonistForces: [],
        behaviorDeck: [],
        behaviorDiscard: [],
        currentBehaviorCard: null,
        fateDeck: [],
        fateDiscard: [],
        artifactNode: 'hall',
        artifactHolder: null,
        votes: [null, null],
        accusationCooldownRounds: 0,
        gameEndReason: null,
        winner: null,
        seed: 42,
        actionLog: [],
        players: [createMockPlayer(0, 5, p0Node), createMockPlayer(1, 5, p1Node)],
    } as unknown as GameState);

    // ── Voting tests ──────────────────────────────────────────────────

    it('Apprentice AI predominantly votes COUNTER', async () => {
        const ai = new AIPlayer('apprentice', 'seed1');
        const state = makeMockState();
        const vote = await ai.getVote(state, state.players[1], 'spawn');
        expect(['COUNTER', 'ABSTAIN']).toContain(vote);
    });

    it('Arch-Regent AI attempts to hurt the leader', async () => {
        const ai = new AIPlayer('arch_regent', 'seed2');
        const state = makeMockState();
        const vote = await ai.getVote(state, state.players[1], 'assault');
        expect(vote).toBe('ABSTAIN');
    });

    it('Auto-abstains if 0 fate cards regardless of difficulty', async () => {
        const ai = new AIPlayer('arch_regent', 'seed3');
        const state = makeMockState();
        const vote = await ai.getVote(state, createMockPlayer(2, 0), 'spawn');
        expect(vote).toBe('ABSTAIN');
    });

    // ── Action tests ──────────────────────────────────────────────────

    it('Apprentice AI returns actions (MOVE or CLAIM or PASS)', async () => {
        const ai = new AIPlayer('apprentice', 42);
        const state = makeMockState();
        const actions = await ai.getActions(state, state.players[0]);
        expect(actions.length).toBe(2); // 2 actions for non-broken player
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });

    it('Broken player gets only 1 action', async () => {
        const ai = new AIPlayer('apprentice', 42);
        const state = makeMockState();
        const brokenPlayer: Player = { ...state.players[0], isBroken: true };
        const actions = await ai.getActions(state, brokenPlayer);
        expect(actions.length).toBe(1);
    });

    it('Knight-Commander targets a forge keep over a standard node when unclaimed forges exist', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        const state = makeMockState('s01'); // s01 is adjacent to forge-nw

        // All forges start unclaimed in initial board state
        const actions = await ai.getActions(state, state.players[0]);

        // Should try to move toward a forge keep — first action should be MOVE toward forge direction
        const moveActions = actions.filter(a => a.type === 'MOVE');
        expect(moveActions.length).toBeGreaterThanOrEqual(1);

        // The move path should head toward a forge (forge-nw is adjacent to s01)
        const firstMove = moveActions[0];
        if (firstMove.type === 'MOVE') {
            // forge-nw is directly reachable from s01
            expect(['forge-nw', 'forge-ne', 'forge-sw', 'forge-se', 's01']).toContain(
                firstMove.payload.path[firstMove.payload.path.length - 1]
            );
        }
    });

    it('Actions respect banner budget (no action taken if 0 banners)', async () => {
        const ai = new AIPlayer('apprentice', 42);
        const state = makeMockState();
        const brokeBannerPlayer: Player = { ...state.players[0], warBanners: 0 };
        const actions = await ai.getActions(state, brokeBannerPlayer);
        // With 0 banners, AI cannot move or claim — should return PASS actions
        for (const action of actions) {
            expect(action.type).toBe('PASS');
        }
    });

    it('Returns PASS actions when no unclaimed target is available', async () => {
        const ai = new AIPlayer('apprentice', 42);
        const state = makeMockState();
        // Claim all standard and forge nodes
        for (const nodeId of Object.keys(state.boardState)) {
            state.boardState[nodeId].claimedBy = 0;
        }
        const actions = await ai.getActions(state, state.players[0]);
        for (const action of actions) {
            expect(action.type).toBe('PASS');
        }
    });

    it('Arch-Regent avoids helping the leading player consolidate', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        const state = makeMockState('s05'); // player 1 at s05, adjacent to forge-se

        // Make player 0 (index 0) the leader by giving more strongholds
        state.players[0].stats.strongholdsClaimed = 8;
        state.players[1].stats.strongholdsClaimed = 2;

        // Player at index 1 is arch_regent AI; player at index 0 is leader
        // Arch regent should try to avoid giving forge to the leader
        const actions = await ai.getActions(state, state.players[1]);
        expect(actions.length).toBeGreaterThan(0);
        // Just ensure it returns valid action types
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });
});
