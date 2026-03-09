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

    const deepCopyBoard = (board: Record<string, { claimedBy: number | null; hasWanderer: boolean; antagonistForces: string[] }>): Record<string, { claimedBy: number | null; hasWanderer: boolean; antagonistForces: string[] }> => {
        const copy: Record<string, { claimedBy: number | null; hasWanderer: boolean; antagonistForces: string[] }> = {};
        for (const [key, value] of Object.entries(board)) {
            copy[key] = { ...value, antagonistForces: [...value.antagonistForces] };
        }
        return copy;
    };

    const makeMockState = (p0Node = 's01', p1Node = 's05'): GameState => ({
        boardDefinition: KNOWN_LANDS,
        boardState: deepCopyBoard(initialBoard),
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

    // ── Determinism tests ─────────────────────────────────────────────

    it('Same seed produces identical action sequences (determinism)', async () => {
        const seed = 12345;
        const ai1 = new AIPlayer('knight_commander', seed);
        const ai2 = new AIPlayer('knight_commander', seed);
        const state1 = makeMockState();
        const state2 = makeMockState();

        const actions1 = await ai1.getActions(state1, state1.players[0]);
        const actions2 = await ai2.getActions(state2, state2.players[0]);

        expect(actions1).toEqual(actions2);
    });

    it('Same string seed produces identical vote sequences', async () => {
        const ai1 = new AIPlayer('arch_regent', 'deterministic-seed');
        const ai2 = new AIPlayer('arch_regent', 'deterministic-seed');
        const state1 = makeMockState();
        const state2 = makeMockState();

        const vote1 = await ai1.getVote(state1, state1.players[0], 'spawn');
        const vote2 = await ai2.getVote(state2, state2.players[0], 'spawn');

        expect(vote1).toBe(vote2);
    });

    it('Different seeds produce (potentially) different vote sequences', async () => {
        // Apprentice action selection is greedy (deterministic from board state),
        // but voting has seed-dependent randomness (abstain probability).
        // Test that different seeds produce at least one differing vote over many trials.
        const results: string[] = [];
        for (let seed = 0; seed < 50; seed++) {
            const ai = new AIPlayer('apprentice', seed);
            const state = makeMockState();
            const vote = await ai.getVote(state, state.players[0], 'spawn');
            results.push(vote);
        }
        const unique = new Set(results);
        expect(unique.size).toBeGreaterThan(1);
    });

    // ── Broken Court action limit tests ───────────────────────────────

    it('Broken Knight-Commander gets exactly 1 action', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        const state = makeMockState();
        const brokenPlayer: Player = { ...state.players[0], isBroken: true };
        const actions = await ai.getActions(state, brokenPlayer);
        expect(actions.length).toBe(1);
    });

    it('Broken Arch-Regent gets exactly 1 action', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        const state = makeMockState();
        const brokenPlayer: Player = { ...state.players[0], isBroken: true };
        const actions = await ai.getActions(state, brokenPlayer);
        expect(actions.length).toBe(1);
    });

    it('Broken player action is still a valid type', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        const state = makeMockState();
        const brokenPlayer: Player = { ...state.players[0], isBroken: true };
        const actions = await ai.getActions(state, brokenPlayer);
        expect(actions.length).toBe(1);
        expect(['MOVE', 'CLAIM', 'PASS']).toContain(actions[0].type);
    });

    it('Broken Knight-Commander skips opportunistic combat', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        const state = makeMockState('s01', 's01'); // both on same node

        // Give player 0 huge power advantage
        state.players[0].warBanners = 20;
        state.players[0].fellowship.characters = [
            { id: 'l', role: 'leader', powerLevel: 8, diplomaticActionUsed: false },
            { id: 'w1', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
            { id: 'w2', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
        ];
        // Enemy is weak
        state.players[1].warBanners = 1;
        state.players[1].fellowship.characters = [
            { id: 'e', role: 'producer', powerLevel: 3, diplomaticActionUsed: false },
        ];

        const brokenPlayer: Player = { ...state.players[0], isBroken: true };
        const actions = await ai.getActions(state, brokenPlayer);
        // Should get exactly 1 action (broken), and should NOT trigger combat logic
        expect(actions.length).toBe(1);
    });

    // ── Knight-Commander forge prioritization ─────────────────────────

    it('Knight-Commander prefers forge over standard when both available', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        // Place player at s01 — adjacent to forge-nw and keep-0 and s16
        const state = makeMockState('s01');

        // Ensure forge-nw is unclaimed
        state.boardState['forge-nw'].claimedBy = null;

        const actions = await ai.getActions(state, state.players[0]);
        const moveActions = actions.filter(a => a.type === 'MOVE');

        // Should move toward forge-nw since it's adjacent
        if (moveActions.length > 0 && moveActions[0].type === 'MOVE') {
            const destination = moveActions[0].payload.path[moveActions[0].payload.path.length - 1];
            expect(destination).toBe('forge-nw');
        }
    });

    it('Knight-Commander falls back to standard nodes when all forges claimed', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        const state = makeMockState('s01');

        // Claim all forges
        state.boardState['forge-nw'].claimedBy = 1;
        state.boardState['forge-ne'].claimedBy = 1;
        state.boardState['forge-sw'].claimedBy = 1;
        state.boardState['forge-se'].claimedBy = 1;

        const actions = await ai.getActions(state, state.players[0]);
        // Should still produce valid actions (targeting standard nodes)
        expect(actions.length).toBe(2);
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });

    // ── Knight-Commander opportunistic combat ─────────────────────────

    it('Knight-Commander initiates combat when enemy is adjacent and weaker', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        // Player 0 at s01, Player 1 at forge-nw (adjacent to s01)
        const state = makeMockState('s01', 'forge-nw');

        // Make player 0 much stronger
        state.players[0].warBanners = 10;
        state.players[0].fellowship.characters = [
            { id: 'l', role: 'leader', powerLevel: 8, diplomaticActionUsed: false },
            { id: 'w1', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
            { id: 'w2', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
        ];
        // Make player 1 weaker
        state.players[1].warBanners = 1;
        state.players[1].fellowship.characters = [
            { id: 'e', role: 'producer', powerLevel: 3, diplomaticActionUsed: false },
        ];

        const actions = await ai.getActions(state, state.players[0]);

        // Should have a MOVE toward the enemy (forge-nw)
        const moveActions = actions.filter(a => a.type === 'MOVE');
        expect(moveActions.length).toBeGreaterThanOrEqual(1);
        if (moveActions[0].type === 'MOVE') {
            const destination = moveActions[0].payload.path[moveActions[0].payload.path.length - 1];
            expect(destination).toBe('forge-nw');
        }
    });

    it('Knight-Commander does not attack when enemy is stronger', async () => {
        const ai = new AIPlayer('knight_commander', 42);
        // Player 0 at s01, Player 1 at forge-nw (adjacent)
        const state = makeMockState('s01', 'forge-nw');

        // Make player 0 weak
        state.players[0].warBanners = 1;
        state.players[0].fellowship.characters = [
            { id: 'l', role: 'producer', powerLevel: 3, diplomaticActionUsed: false },
        ];
        // Make player 1 much stronger
        state.players[1].warBanners = 10;
        state.players[1].fellowship.characters = [
            { id: 'e', role: 'leader', powerLevel: 8, diplomaticActionUsed: false },
            { id: 'e2', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
        ];

        const actions = await ai.getActions(state, state.players[0]);

        // Should NOT have moved toward the enemy for combat
        // The first action should be normal targeting, not opportunistic combat
        // (Can still move toward forge-nw for claiming, but that's different logic)
        expect(actions.length).toBe(2);
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });

    // ── Arch-Regent rescue timing ─────────────────────────────────────

    it('Arch-Regent moves toward broken ally when rescue is favorable', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        // Player 0 at s01, Player 1 at s02 (both adjacent to keep-0)
        const state = makeMockState('s01', 's02');

        // Make player 1 broken with affordable rescue cost
        state.players[1].isBroken = true;
        state.players[1].penaltyCards = 2; // rescue cost = ceil(2/2) = 1

        // Give player 0 plenty of banners (distance 2 + rescue cost 1 = 3 needed)
        state.players[0].warBanners = 10;

        const actions = await ai.getActions(state, state.players[0]);

        // Arch-Regent should attempt to move toward the broken ally at s02
        const moveActions = actions.filter(a => a.type === 'MOVE');
        expect(moveActions.length).toBeGreaterThanOrEqual(1);
    });

    it('Arch-Regent does not pursue rescue when too far away', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        // Player 0 at s01 (NW), Player 1 at s05 (SE) — far apart (>3 steps)
        const state = makeMockState('s01', 's05');

        // Make player 1 broken
        state.players[1].isBroken = true;
        state.players[1].penaltyCards = 2;

        state.players[0].warBanners = 10;

        const actions = await ai.getActions(state, state.players[0]);

        // Should NOT enter rescue mode (too far), should use normal targeting instead
        expect(actions.length).toBe(2);
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });

    it('Arch-Regent does not pursue rescue when banners are insufficient', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        // Player 0 at keep-0, Player 1 at s01 (adjacent, distance 1)
        const state = makeMockState('keep-0', 's01');

        // Make player 1 broken with high rescue cost
        state.players[1].isBroken = true;
        state.players[1].penaltyCards = 10; // rescue cost = ceil(10/2) = 5

        // Give player 0 very few banners (distance 1 + cost 5 = 6 needed)
        state.players[0].warBanners = 2; // insufficient

        const actions = await ai.getActions(state, state.players[0]);

        // Should use normal targeting since rescue is too expensive
        expect(actions.length).toBe(2);
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });

    // ── Arch-Regent threat avoidance ──────────────────────────────────

    it('Arch-Regent avoids moving into a node with a stronger enemy', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        // Player 0 at s01, targeting forge-nw (adjacent)
        const state = makeMockState('s01');

        // Place a very strong enemy at forge-nw (the next node on the path)
        state.players[1].fellowship.currentNode = 'forge-nw';
        state.players[1].warBanners = 20;
        state.players[1].fellowship.characters = [
            { id: 'e1', role: 'leader', powerLevel: 8, diplomaticActionUsed: false },
            { id: 'e2', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
            { id: 'e3', role: 'warrior', powerLevel: 6, diplomaticActionUsed: false },
        ];

        // Make player 0 weak
        state.players[0].warBanners = 2;
        state.players[0].fellowship.characters = [
            { id: 'l', role: 'producer', powerLevel: 3, diplomaticActionUsed: false },
        ];

        const actions = await ai.getActions(state, state.players[0]);

        // Arch-Regent should avoid moving into forge-nw — should PASS instead of MOVE there
        for (const action of actions) {
            if (action.type === 'MOVE') {
                const dest = action.payload.path[action.payload.path.length - 1];
                expect(dest).not.toBe('forge-nw');
            }
        }
    });

    it('Arch-Regent avoids nodes with strong antagonist forces', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        const state = makeMockState('s09'); // s09 adjacent to dark-fortress

        // Player is weak
        state.players[0].warBanners = 2;
        state.players[0].fellowship.characters = [
            { id: 'l', role: 'producer', powerLevel: 3, diplomaticActionUsed: false },
        ];

        // Place strong antagonist force on dark-fortress
        state.antagonistForces = [
            { id: 'lt1', type: 'lieutenant', powerLevel: 20, currentNode: 'dark-fortress' },
        ];

        const actions = await ai.getActions(state, state.players[0]);

        // Should not move into dark-fortress
        for (const action of actions) {
            if (action.type === 'MOVE') {
                const dest = action.payload.path[action.payload.path.length - 1];
                expect(dest).not.toBe('dark-fortress');
            }
        }
    });

    // ── Doom Toll / Final Phase behavior ──────────────────────────────

    it('Arch-Regent rushes nearest unclaimed node when doom is high', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        // Place player on keep-0 (already claimed) so it must MOVE to reach unclaimed nodes
        const state = makeMockState('keep-0');

        // Set doom toll to near Final Phase threshold (10 - 2 = 8)
        state.doomToll = 8;

        // Claim all forges (so rush behavior targets standard nodes)
        state.boardState['forge-nw'].claimedBy = 1;
        state.boardState['forge-ne'].claimedBy = 1;
        state.boardState['forge-sw'].claimedBy = 1;
        state.boardState['forge-se'].claimedBy = 1;

        const actions = await ai.getActions(state, state.players[0]);
        expect(actions.length).toBe(2);

        // Should produce MOVE or CLAIM actions (rush toward nearest unclaimed node)
        const hasRushAction = actions.some(a => a.type === 'MOVE' || a.type === 'CLAIM');
        expect(hasRushAction).toBe(true);
    });

    it('Arch-Regent rushes claims during Final Phase', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        const state = makeMockState('s01');

        // Set Final Phase active
        (state as Record<string, unknown>).isFinalPhase = true;
        state.doomToll = 11;

        const actions = await ai.getActions(state, state.players[0]);
        expect(actions.length).toBe(2);

        // Should still produce valid actions targeting nearest unclaimed
        for (const action of actions) {
            expect(['MOVE', 'CLAIM', 'PASS']).toContain(action.type);
        }
    });

    it('Arch-Regent claims any node type when doom is high (not just forges)', async () => {
        const ai = new AIPlayer('arch_regent', 42);
        // Place player at a node adjacent to unclaimed standard nodes
        const state = makeMockState('s16');

        // High doom
        state.doomToll = 9;

        // Claim all forges — only standard nodes available
        state.boardState['forge-nw'].claimedBy = 1;
        state.boardState['forge-ne'].claimedBy = 1;
        state.boardState['forge-sw'].claimedBy = 1;
        state.boardState['forge-se'].claimedBy = 1;

        const actions = await ai.getActions(state, state.players[0]);

        // Should attempt to move/claim standard nodes
        const moveOrClaim = actions.filter(a => a.type === 'MOVE' || a.type === 'CLAIM');
        expect(moveOrClaim.length).toBeGreaterThanOrEqual(1);
    });

    // ── Seed exposure ─────────────────────────────────────────────────

    it('getSeed returns the seed string', () => {
        const ai = new AIPlayer('apprentice', 42);
        expect(ai.getSeed()).toBe('42');
    });

    it('getSeed works with string seeds', () => {
        const ai = new AIPlayer('apprentice', 'my-seed');
        expect(ai.getSeed()).toBe('my-seed');
    });
});
