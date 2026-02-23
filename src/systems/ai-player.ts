import { GameState, BehaviorCardType } from '../models/game-state.js';
import { Player, AIDifficulty } from '../models/player.js';
import { SeededRandom } from '../utils/seeded-random.js';

export interface PlayerAction {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
}

export class AIPlayer {
    private difficulty: AIDifficulty;
    private seed: string;
    private rng: SeededRandom;

    constructor(difficulty: AIDifficulty, seed: string | number) {
        this.difficulty = difficulty;
        this.seed = seed.toString();
        // Fallback to numeric seed if available
        this.rng = new SeededRandom(typeof seed === 'number' ? seed : 12345);
    }

    private nextFloat(): number {
        // Expose a next generator because SeededRandom.next() is usually private in this codebase
        // This is a workaround since SeededRandom usually returns random ints or floats natively
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rngAny = this.rng as any;
        return rngAny._s ? rngAny._s() : Math.random();
    }

    public async getVote(state: GameState, player: Player, activeBehavior: BehaviorCardType): Promise<'COUNTER' | 'ABSTAIN'> {
        // AI never abstains if they have 0 cards, they just auto-fail in core logic.
        // We ensure we don't cheat by attempting it here.
        if (player.fateCards.length === 0) return 'ABSTAIN';

        switch (this.difficulty) {
            case 'apprentice':
                // Rarely abstains (10%), prioritizes blocking everything
                return this.nextFloat() > 0.1 ? 'COUNTER' : 'ABSTAIN';

            case 'knight_commander':
                // Balanced play, leader targeting. 
                // Abstain ~12% overall, but higher if it's ESCALATE (to save cards)
                if (activeBehavior === 'escalate' && this.nextFloat() < 0.3) return 'ABSTAIN';
                return this.nextFloat() > 0.12 ? 'COUNTER' : 'ABSTAIN';

            case 'arch_regent': {
                // Check-the-leader voting: if the leader is targeted, abstain and let them suffer
                const leader = this.identifyLeader(state);
                if (leader.index !== player.index && this.isLeaderTargeted(state, activeBehavior, leader)) {
                    // Let the leader take the hit! (Save our cards)
                    return 'ABSTAIN';
                }
                // Otherwise play smart, mostly counter
                return this.nextFloat() > 0.05 ? 'COUNTER' : 'ABSTAIN';
            }
        }
    }

    public async getActions(state: GameState, player: Player): Promise<PlayerAction[]> {
        const actions: PlayerAction[] = [];
        const actionPoints = player.isBroken ? 1 : 2;

        // Very basic stub logic for now so tests can run
        for (let i = 0; i < actionPoints; i++) {
            actions.push({ type: 'MOVE', payload: { targetNode: 's01' } });
        }

        return actions;
    }

    private identifyLeader(state: GameState): Player {
        // TBD full leader logic
        return state.players[0];
    }

    private isLeaderTargeted(state: GameState, behavior: BehaviorCardType, _leader: Player): boolean {
        // Stub
        return behavior === 'assault' || behavior === 'move';
    }
}
