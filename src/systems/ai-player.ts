import { GameState, BehaviorCardType } from '../models/game-state.js';
import { Player, AIDifficulty } from '../models/player.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { findShortestPath, findNearest } from '../utils/pathfinding.js';
import { getNodesByType } from '../models/board.js';

/** Discriminated union for all player actions. */
export type PlayerAction =
    | { type: 'MOVE'; payload: { path: string[] } }
    | { type: 'CLAIM'; payload: { nodeId: string } }
    | { type: 'PASS'; payload: Record<string, never> };

export class AIPlayer {
    private difficulty: AIDifficulty;
    private seed: string;
    private rng: SeededRandom;

    constructor(difficulty: AIDifficulty, seed: string | number) {
        this.difficulty = difficulty;
        this.seed = seed.toString();
        this.rng = new SeededRandom(typeof seed === 'number' ? seed : 12345);
    }

    private nextFloat(): number {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rngAny = this.rng as any;
        return rngAny._s ? rngAny._s() : Math.random();
    }

    public async getVote(state: GameState, player: Player, activeBehavior: BehaviorCardType): Promise<'COUNTER' | 'ABSTAIN'> {
        if (player.fateCards.length === 0) return 'ABSTAIN';

        switch (this.difficulty) {
            case 'apprentice':
                return this.nextFloat() > 0.1 ? 'COUNTER' : 'ABSTAIN';

            case 'knight_commander':
                if (activeBehavior === 'escalate' && this.nextFloat() < 0.3) return 'ABSTAIN';
                return this.nextFloat() > 0.12 ? 'COUNTER' : 'ABSTAIN';

            case 'arch_regent': {
                const leader = this.identifyLeader(state);
                if (leader.index !== player.index && this.isLeaderTargeted(state, activeBehavior, leader)) {
                    return 'ABSTAIN';
                }
                return this.nextFloat() > 0.05 ? 'COUNTER' : 'ABSTAIN';
            }
        }
    }

    public async getActions(state: GameState, player: Player): Promise<PlayerAction[]> {
        const actions: PlayerAction[] = [];
        let actionsLeft = player.isBroken ? 1 : 2;
        let bannersLeft = player.warBanners;
        let currentNode = player.fellowship.currentNode;

        const board = state.boardDefinition;
        const boardState = state.boardState;

        // Determine target node based on difficulty
        const targetNode = this.selectTarget(state, player, currentNode);

        if (!targetNode) {
            // No valid target — pass all actions
            for (let i = 0; i < actionsLeft; i++) {
                actions.push({ type: 'PASS', payload: {} });
            }
            return actions;
        }

        // Try to move toward the target (one action = one move step)
        while (actionsLeft > 0) {
            if (currentNode === targetNode) {
                // At target: claim if unclaimed and can afford it
                const nodeState = boardState[currentNode];
                if (nodeState && nodeState.claimedBy === null && bannersLeft >= 1) {
                    actions.push({ type: 'CLAIM', payload: { nodeId: currentNode } });
                    bannersLeft--;
                    actionsLeft--;
                } else {
                    actions.push({ type: 'PASS', payload: {} });
                    actionsLeft--;
                }
            } else {
                // Move one step toward target
                const path = findShortestPath(board, currentNode, targetNode);
                if (!path || path.length < 2) {
                    actions.push({ type: 'PASS', payload: {} });
                    actionsLeft--;
                    continue;
                }
                // Move the next step along the path (costs 1 banner)
                if (bannersLeft < 1) {
                    actions.push({ type: 'PASS', payload: {} });
                    actionsLeft--;
                    continue;
                }
                const nextNode = path[1];
                actions.push({ type: 'MOVE', payload: { path: [currentNode, nextNode] } });
                bannersLeft--;
                actionsLeft--;
                currentNode = nextNode;
            }
        }

        return actions;
    }

    /**
     * Select the best target node based on difficulty.
     * Returns null when no valid target exists.
     */
    private selectTarget(state: GameState, player: Player, currentNode: string): string | null {
        const board = state.boardDefinition;
        const boardState = state.boardState;

        const unclaimedForges = getNodesByType(board, 'forge').filter(
            id => boardState[id]?.claimedBy === null,
        );
        const unclaimedStandard = getNodesByType(board, 'standard').filter(
            id => boardState[id]?.claimedBy === null,
        );

        switch (this.difficulty) {
            case 'apprentice': {
                // Nearest unclaimed standard node; no forge preference
                const nearest = findNearest(board, currentNode, unclaimedStandard);
                return nearest?.nodeId ?? null;
            }

            case 'knight_commander': {
                // Prefer forge keeps; fall back to standard if none available
                if (unclaimedForges.length > 0) {
                    const nearestForge = findNearest(board, currentNode, unclaimedForges);
                    if (nearestForge) return nearestForge.nodeId;
                }
                const nearest = findNearest(board, currentNode, unclaimedStandard);
                return nearest?.nodeId ?? null;
            }

            case 'arch_regent': {
                // Full heuristic: forge keep targeting + leader check
                const leader = this.identifyLeader(state);
                const isLeading = leader.index === player.index;

                if (!isLeading && unclaimedForges.length > 0) {
                    // Don't help leader consolidate — if leader holds the nearest forge, skip it
                    const sortedForges = unclaimedForges.slice().sort((a, b) => {
                        const da = findNearest(board, currentNode, [a])?.distance ?? Infinity;
                        const db = findNearest(board, currentNode, [b])?.distance ?? Infinity;
                        return da - db;
                    });
                    for (const forgeId of sortedForges) {
                        // Check whether claiming this forge would consolidate leader's position
                        const leaderNode = leader.fellowship.currentNode;
                        const leaderDist = findNearest(board, leaderNode, [forgeId])?.distance ?? Infinity;
                        const myDist = findNearest(board, currentNode, [forgeId])?.distance ?? 0;
                        // If leader is closer to this forge, skip it — let them fight for it
                        if (leaderDist <= myDist) continue;
                        return forgeId;
                    }
                }

                // Fall back to any unclaimed forge, then standard
                if (unclaimedForges.length > 0) {
                    const nearestForge = findNearest(board, currentNode, unclaimedForges);
                    if (nearestForge) return nearestForge.nodeId;
                }
                const nearest = findNearest(board, currentNode, unclaimedStandard);
                return nearest?.nodeId ?? null;
            }
        }
    }

    private identifyLeader(state: GameState): Player {
        // Leader = player with most strongholds claimed
        let leader = state.players[0];
        for (const p of state.players) {
            if (p.stats.strongholdsClaimed > leader.stats.strongholdsClaimed) {
                leader = p;
            }
        }
        return leader;
    }

    private isLeaderTargeted(_state: GameState, behavior: BehaviorCardType, _leader: Player): boolean {
        return behavior === 'assault' || behavior === 'move';
    }

    /** Expose seed for testing */
    public getSeed(): string {
        return this.seed;
    }
}
