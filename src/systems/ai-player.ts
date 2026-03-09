import { GameState, BehaviorCardType, DOOM_TOLL_FINAL_PHASE_THRESHOLD } from '../models/game-state.js';
import { Player, AIDifficulty } from '../models/player.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { findShortestPath, findNearest } from '../utils/pathfinding.js';
import { getNodesByType } from '../models/board.js';
import { getFellowshipPower } from './characters.js';
import { calculateRescueCost } from './rescue.js';

/** Discriminated union for all player actions. */
export type PlayerAction =
    | { type: 'MOVE'; payload: { path: string[] } }
    | { type: 'CLAIM'; payload: { nodeId: string } }
    | { type: 'PASS'; payload: Record<string, never> };

export class AIPlayer {
    private readonly difficulty: AIDifficulty;
    private readonly seed: string;
    private readonly rng: SeededRandom;

    constructor(difficulty: AIDifficulty, seed: string | number) {
        this.difficulty = difficulty;
        this.seed = seed.toString();
        this.rng = new SeededRandom(typeof seed === 'number' ? seed : this.hashString(seed.toString()));
    }

    /**
     * Simple string hash to produce a deterministic numeric seed from a string.
     * Replaces the old fallback to Math.random().
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash + char) | 0;
        }
        return hash >>> 0; // Ensure unsigned 32-bit
    }

    public async getVote(state: GameState, player: Player, activeBehavior: BehaviorCardType): Promise<'COUNTER' | 'ABSTAIN'> {
        if (player.fateCards.length === 0) return 'ABSTAIN';

        switch (this.difficulty) {
            case 'apprentice':
                return this.rng.float() > 0.1 ? 'COUNTER' : 'ABSTAIN';

            case 'knight_commander':
                if (activeBehavior === 'escalate' && this.rng.float() < 0.3) return 'ABSTAIN';
                return this.rng.float() > 0.12 ? 'COUNTER' : 'ABSTAIN';

            case 'arch_regent': {
                const leader = this.identifyLeader(state);
                if (leader.index !== player.index && this.isLeaderTargeted(state, activeBehavior, leader)) {
                    return 'ABSTAIN';
                }
                return this.rng.float() > 0.05 ? 'COUNTER' : 'ABSTAIN';
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

        // Knight-Commander: check for opportunistic combat before normal targeting
        if (this.difficulty === 'knight_commander' && !player.isBroken && actionsLeft > 0) {
            const combatTarget = this.findOpportunisticCombatTarget(state, player, currentNode);
            if (combatTarget !== null) {
                // Move toward the enemy if adjacent — the MOVE gets us there
                const enemyNode = state.players[combatTarget].fellowship.currentNode;
                if (enemyNode !== currentNode) {
                    const path = findShortestPath(board, currentNode, enemyNode);
                    if (path && path.length === 2 && bannersLeft >= 1) {
                        actions.push({ type: 'MOVE', payload: { path: [currentNode, path[1]] } });
                        bannersLeft--;
                        actionsLeft--;
                        currentNode = path[1];
                    }
                }
            }
        }

        // Arch-Regent: consider rescue mission or threat avoidance before normal targeting
        if (this.difficulty === 'arch_regent' && !player.isBroken && actionsLeft > 0) {
            const rescueTarget = this.findRescueTarget(state, player, currentNode);
            if (rescueTarget !== null) {
                // Move toward the broken ally
                const allyNode = state.players[rescueTarget].fellowship.currentNode;
                if (allyNode !== currentNode) {
                    const path = findShortestPath(board, currentNode, allyNode);
                    if (path && path.length >= 2 && bannersLeft >= 1) {
                        actions.push({ type: 'MOVE', payload: { path: [currentNode, path[1]] } });
                        bannersLeft--;
                        actionsLeft--;
                        currentNode = path[1];
                    }
                }
                // If we still have actions and more steps to go, continue toward ally
                if (actionsLeft > 0 && currentNode !== allyNode) {
                    const path2 = findShortestPath(board, currentNode, allyNode);
                    if (path2 && path2.length >= 2 && bannersLeft >= 1) {
                        actions.push({ type: 'MOVE', payload: { path: [currentNode, path2[1]] } });
                        actionsLeft--;
                    }
                }
                // Fill remaining with PASS if rescue consumed all actions
                while (actionsLeft > 0) {
                    actions.push({ type: 'PASS', payload: {} });
                    actionsLeft--;
                }
                return actions;
            }
        }

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
                // Arch-Regent threat avoidance: before moving, check if the next node
                // has a stronger enemy fellowship
                if (this.difficulty === 'arch_regent') {
                    const path = findShortestPath(board, currentNode, targetNode);
                    if (path && path.length >= 2) {
                        const nextNode = path[1];
                        if (this.hasStrongerEnemy(state, player, nextNode)) {
                            // Avoid moving into danger — pass instead
                            actions.push({ type: 'PASS', payload: {} });
                            actionsLeft--;
                            continue;
                        }
                    }
                }

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
                // Doom Toll pressure: when doom is high, rush nearest unclaimed node
                // regardless of type to claim as fast as possible
                if (this.isDoomHigh(state)) {
                    const allUnclaimed = [...unclaimedForges, ...unclaimedStandard];
                    const nearest = findNearest(board, currentNode, allUnclaimed);
                    return nearest?.nodeId ?? null;
                }

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

    /**
     * Knight-Commander: find an adjacent enemy with lower power for opportunistic combat.
     * Returns the enemy player index or null.
     */
    private findOpportunisticCombatTarget(
        state: GameState,
        player: Player,
        currentNode: string,
    ): number | null {
        const board = state.boardDefinition;
        const myPower = getFellowshipPower(player.fellowship) + player.warBanners;
        const adjacentNodes = board.nodes[currentNode]?.connections ?? [];

        for (const other of state.players) {
            if (other.index === player.index) continue;
            if (other.isBroken) continue; // No point attacking broken players

            const otherNode = other.fellowship.currentNode;
            // Check if enemy is on current node or adjacent
            if (otherNode !== currentNode && !adjacentNodes.includes(otherNode)) continue;

            const enemyPower = getFellowshipPower(other.fellowship) + other.warBanners;
            // Only attack when we have a meaningful power advantage (at least 20% stronger)
            if (myPower > enemyPower * 1.2) {
                return other.index;
            }
        }
        return null;
    }

    /**
     * Arch-Regent: find a broken ally worth rescuing.
     * Returns the broken ally's player index, or null if rescue is not favorable.
     *
     * Favorable conditions:
     * - There is a broken ally within reachable distance (3 steps)
     * - We have enough banners to cover rescue cost + travel
     * - We are not broken ourselves
     */
    private findRescueTarget(
        state: GameState,
        player: Player,
        currentNode: string,
    ): number | null {
        const board = state.boardDefinition;

        const brokenAllies: Array<{ index: number; distance: number; cost: number }> = [];

        for (const other of state.players) {
            if (other.index === player.index) continue;
            if (!other.isBroken) continue;

            const allyNode = other.fellowship.currentNode;
            const nearest = findNearest(board, currentNode, [allyNode]);
            if (!nearest) continue;

            const rescueCost = calculateRescueCost(other);
            const totalCost = nearest.distance + rescueCost; // movement + rescue banners

            // Only consider rescue if within practical reach (3 steps) and affordable
            if (nearest.distance <= 3 && player.warBanners >= totalCost) {
                brokenAllies.push({
                    index: other.index,
                    distance: nearest.distance,
                    cost: totalCost,
                });
            }
        }

        if (brokenAllies.length === 0) return null;

        // Pick the closest broken ally (cheapest total cost)
        brokenAllies.sort((a, b) => a.cost - b.cost);
        return brokenAllies[0].index;
    }

    /**
     * Arch-Regent threat modelling: check if a node has a stronger enemy fellowship.
     * Returns true if any enemy at the given node is stronger than this player.
     */
    private hasStrongerEnemy(state: GameState, player: Player, nodeId: string): boolean {
        const myPower = getFellowshipPower(player.fellowship) + player.warBanners;

        for (const other of state.players) {
            if (other.index === player.index) continue;
            if (other.fellowship.currentNode !== nodeId) continue;

            const enemyPower = getFellowshipPower(other.fellowship) + other.warBanners;
            if (enemyPower > myPower) return true;
        }

        // Also check for antagonist forces on this node
        for (const force of state.antagonistForces) {
            if (force.currentNode === nodeId && force.powerLevel > myPower) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if Doom Toll is high enough to trigger rush-claim behavior.
     * Arch-Regent switches to "claim anything fast" when doom is near the
     * Final Phase threshold or already in Final Phase.
     */
    private isDoomHigh(state: GameState): boolean {
        return state.doomToll >= DOOM_TOLL_FINAL_PHASE_THRESHOLD - 2 ||
            state.isFinalPhase;
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
