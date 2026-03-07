import { describe, it, expect } from 'vitest';
import { TUTORIAL_TURNS, TutorialScriptedOpponent } from '../../src/systems/tutorial-script.js';

describe('Tutorial Script (F-012)', () => {

    describe('TUTORIAL_TURNS', () => {
        it('has exactly 5 turns', () => {
            expect(TUTORIAL_TURNS.length).toBe(5);
        });

        it('each turn has a unique mechanic', () => {
            const mechanics = TUTORIAL_TURNS.map(t => t.mechanic);
            const unique = new Set(mechanics);
            expect(unique.size).toBe(5);
        });

        it('turns are numbered 1 through 5', () => {
            for (let i = 0; i < TUTORIAL_TURNS.length; i++) {
                expect(TUTORIAL_TURNS[i].turn).toBe(i + 1);
            }
        });

        it('each turn has non-empty title, objective, and content', () => {
            for (const turn of TUTORIAL_TURNS) {
                expect(turn.title.length).toBeGreaterThan(0);
                expect(turn.objective.length).toBeGreaterThan(0);
                expect(turn.content.length).toBeGreaterThan(0);
            }
        });

        it('covers movement, recruitment, combat, voting, and forge_keep mechanics', () => {
            const mechanics = TUTORIAL_TURNS.map(t => t.mechanic);
            expect(mechanics).toContain('movement');
            expect(mechanics).toContain('recruitment');
            expect(mechanics).toContain('combat');
            expect(mechanics).toContain('voting');
            expect(mechanics).toContain('forge_keep');
        });
    });

    describe('TutorialScriptedOpponent', () => {
        it('has moves for all 5 turns', () => {
            const opponent = new TutorialScriptedOpponent();
            expect(opponent.turnCount).toBe(5);
        });

        it('produces deterministic moves for each turn', () => {
            const o1 = new TutorialScriptedOpponent();
            const o2 = new TutorialScriptedOpponent();

            for (let turn = 1; turn <= 5; turn++) {
                expect(o1.getMovesForTurn(turn)).toEqual(o2.getMovesForTurn(turn));
            }
        });

        it('returns empty array for out-of-range turns', () => {
            const opponent = new TutorialScriptedOpponent();
            expect(opponent.getMovesForTurn(0)).toEqual([]);
            expect(opponent.getMovesForTurn(6)).toEqual([]);
        });

        it('turn 3 forces combat by entering player starting node s01', () => {
            const opponent = new TutorialScriptedOpponent();
            const moves = opponent.getMovesForTurn(3);
            expect(moves).toContain('s01');
        });

        it('each turn produces at least one node in its move path', () => {
            const opponent = new TutorialScriptedOpponent();
            for (let turn = 1; turn <= 5; turn++) {
                expect(opponent.getMovesForTurn(turn).length).toBeGreaterThan(0);
            }
        });
    });
});
