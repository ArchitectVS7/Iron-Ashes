// src/systems/tutorial-script.ts
// F-012 — Tutorial 5-Turn Script and Scripted Opponent

export interface TutorialTurnStep {
    turn: number;
    title: string;
    objective: string;
    mechanic: string;
    content: string;
}

/** The five mandatory tutorial turns, one mechanic each. */
export const TUTORIAL_TURNS: readonly TutorialTurnStep[] = [
    {
        turn: 1,
        title: 'Turn 1 — March from Your Keep',
        objective: 'Move your Fellowship to the first unclaimed Stronghold and claim it.',
        mechanic: 'movement',
        content: 'Spending War Banners lets your Fellowship traverse the board. Each edge costs 1 Banner. When you reach an unclaimed Stronghold, spend 1 Banner to claim it.',
    },
    {
        turn: 2,
        title: 'Turn 2 — Send the Herald Ahead',
        objective: 'Deploy your Herald solo to reveal an Unknown Wanderer.',
        mechanic: 'recruitment',
        content: 'When your Herald travels alone, they gain Diplomatic Protection — rivals cannot attack a solo Herald. Use Recruit to reveal a face-down Wanderer token and add them to your Fellowship.',
    },
    {
        turn: 3,
        title: 'Turn 3 — Your First Battle',
        objective: 'Engage in War Field resolution with a rival Arch-Regent.',
        mechanic: 'combat',
        content: 'When two Fellowships share a node, combat is mandatory. Both sides add Power + War Banners. The attacker draws 2 Fate Cards (keeps one face-down), the defender draws 1 (face-up). Higher total wins. Ties favor the defender. The loser receives Penalty Cards equal to the margin.',
    },
    {
        turn: 4,
        title: 'Turn 4 — The Toll Strikes',
        objective: 'Cast your vote in the Voting Phase to block the Shadowking\'s Behavior Card.',
        mechanic: 'voting',
        content: 'Each round, the Shadowking draws a Behavior Card. If ALL active Arch-Regents vote COUNTER and pay 1 Fate Card each, the effect is blocked. If anyone abstains — or can\'t afford the cost — the card resolves at full power and the Doom Toll advances by 1.',
    },
    {
        turn: 5,
        title: 'Turn 5 — Claim the Forge Keep',
        objective: 'Reach and claim a Forge Keep Stronghold.',
        mechanic: 'forge_keep',
        content: 'Forge Keeps generate 3 War Banners per Artificer (vs 1 at standard nodes). Controlling a Forge Keep accelerates your entire economy. The production loop — claim nodes, generate banners, take more actions — is the core engine of the game.',
    },
] as const;

/**
 * Scripted opponent for tutorial mode.
 *
 * Each turn's moves are pre-defined as a readonly sequence of node IDs.
 * No RNG is used — the opponent always makes the same moves regardless of seed,
 * ensuring Turn 3 (combat) fires deterministically.
 */
export class TutorialScriptedOpponent {
    /** Opponent moves per turn (0-indexed). Each entry is an ordered path of node IDs to traverse. */
    private static readonly SCRIPTED_MOVES: readonly (readonly string[])[] = [
        // Turn 1: opponent moves from keep-1 to s03
        ['keep-1', 's03'],
        // Turn 2: opponent moves from s03 to forge-ne
        ['s03', 'forge-ne'],
        // Turn 3: opponent moves into player's starting node to force combat
        ['forge-ne', 's01'],
        // Turn 4: opponent stays put (voting phase focus)
        ['s01'],
        // Turn 5: opponent moves toward forge-nw
        ['s01', 'forge-nw'],
    ];

    /**
     * Get the scripted move path for the given tutorial turn (1-based).
     * Returns an empty array if turn is out of range.
     */
    public getMovesForTurn(turn: number): readonly string[] {
        const index = turn - 1;
        if (index < 0 || index >= TutorialScriptedOpponent.SCRIPTED_MOVES.length) {
            return [];
        }
        return TutorialScriptedOpponent.SCRIPTED_MOVES[index];
    }

    /** Total number of scripted turns. */
    public get turnCount(): number {
        return TutorialScriptedOpponent.SCRIPTED_MOVES.length;
    }
}
