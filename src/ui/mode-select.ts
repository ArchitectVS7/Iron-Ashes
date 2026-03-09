import type { GameMode } from '../models/game-state.js';
import type { AIDifficulty } from '../models/player.js';

export type { GameMode };

export interface GameSetup {
    mode: GameMode | 'tutorial';
    playerCount: number;
    aiPlayers: AIDifficulty[];
    network: 'local' | 'host' | 'join';
    joinSessionId?: string;
    joinPlayerId?: string;
}

export interface BloodPactDeliveryStub {
    deliverToPlayer(playerId: string, isTraitor: boolean): Promise<void>;
}

export class ModeSelectUI {
    private container: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'mode-select-screen';
        parent.appendChild(this.container);
    }

    public async showModeSelection(): Promise<GameSetup> {
        this.container.style.display = 'flex';

        return new Promise<GameSetup>((resolve) => {
            this.container.innerHTML = `
                <div class="mode-modal" style="max-width: 600px;">
                    <h2>GAME SETUP</h2>
                    <div class="setup-section">
                        <h3>1. Player Count</h3>
                        <div class="player-count-options">
                            <label><input type="radio" name="pcount" value="2"> 2 Players (Duel)</label>
                            <label><input type="radio" name="pcount" value="3"> 3 Players</label>
                            <label><input type="radio" name="pcount" value="4" checked> 4 Players (Full Court)</label>
                        </div>
                    </div>
                    
                    <div class="setup-section ai-section">
                        <h3>2. AI Opponents</h3>
                        <p class="ai-desc">Select AI difficulty for automated opponents. Bots will fill remaining slots up to the Player Count.</p>
                        <div id="ai-slots-container">
                            <!-- Populated via script -->
                        </div>
                    </div>

                    <div class="setup-section">
                        <h3>3. Networking Mode</h3>
                        <div class="network-options" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <label><input type="radio" name="network" value="local" checked> Local / Solo</label>
                            <label><input type="radio" name="network" value="host"> Host Multiplayer</label>
                            <label><input type="radio" name="network" value="join"> Join Session</label>
                        </div>
                        <div id="join-session-container" style="display: none; display: flex; gap: 10px;">
                            <input type="text" id="join-session-id" placeholder="Enter Session ID" style="padding: 5px;">
                            <input type="number" id="join-player-id" placeholder="Player ID (1-4)" min="1" max="4" style="padding: 5px; width: 120px;">
                        </div>
                    </div>

                    <div class="setup-section">
                        <h3>4. Game Mode</h3>
                        <div class="mode-options">
                            <button class="mode-btn btn-competitive" data-mode="competitive">
                                <h3>Competitive</h3>
                                <p>Standard free-for-all.</p>
                            </button>
                            <button class="mode-btn btn-bloodpact" data-mode="blood_pact">
                                <h3>Blood Pact</h3>
                                <p>One player is the Traitor. (3+ Players)</p>
                            </button>
                            <button class="mode-btn btn-coop" data-mode="cooperative">
                                <h3>Cooperative</h3>
                                <p>All against the Shadowking.</p>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const pcountInputs = this.container.querySelectorAll<HTMLInputElement>('input[name="pcount"]');
            const aiSlotsContainer = this.container.querySelector('#ai-slots-container') as HTMLElement;

            const renderAISlots = (maxSlots: number) => {
                aiSlotsContainer.innerHTML = '';
                for (let i = 0; i < maxSlots - 1; i++) {
                    aiSlotsContainer.innerHTML += `
                        <div class="ai-slot">
                            <span>Opponent ${i + 1}:</span>
                            <select class="ai-diff-select">
                                <option value="none">Human Player</option>
                                <option value="apprentice">AI: Apprentice</option>
                                <option value="knight_commander">AI: Knight-Commander</option>
                                <option value="arch_regent">AI: Arch-Regent</option>
                            </select>
                        </div>
                    `;
                }
            };

            renderAISlots(4);

            pcountInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const count = parseInt(input.value, 10);
                    renderAISlots(count);
                });
            });

            const networkInputs = this.container.querySelectorAll<HTMLInputElement>('input[name="network"]');
            const joinContainer = this.container.querySelector('#join-session-container') as HTMLElement;
            networkInputs.forEach(input => {
                input.addEventListener('change', () => {
                    if (input.value === 'join') {
                        joinContainer.style.display = 'flex';
                    } else {
                        joinContainer.style.display = 'none';
                    }
                });
            });

            const btns = this.container.querySelectorAll('.mode-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    const mode = target.getAttribute('data-mode') as GameMode;

                    const pcountInput = this.container.querySelector<HTMLInputElement>('input[name="pcount"]:checked');
                    const playerCount = pcountInput ? parseInt(pcountInput.value, 10) : 4;

                    const selects = this.container.querySelectorAll<HTMLSelectElement>('.ai-diff-select');
                    const aiPlayers: AIDifficulty[] = [];
                    selects.forEach(select => {
                        if (select.value !== 'none') {
                            aiPlayers.push(select.value as AIDifficulty);
                        }
                    });

                    const networkInput = this.container.querySelector<HTMLInputElement>('input[name="network"]:checked');
                    const network = (networkInput ? networkInput.value : 'local') as 'local' | 'host' | 'join';
                    const joinSessionId = (this.container.querySelector('#join-session-id') as HTMLInputElement).value;
                    const joinPlayerIdInput = (this.container.querySelector('#join-player-id') as HTMLInputElement).value;
                    // Player index is ID - 1 (e.g., UI accepts 1-4, mapped to 0-3)
                    const joinPlayerId = joinPlayerIdInput ? (parseInt(joinPlayerIdInput, 10) - 1).toString() : '0';

                    this.container.style.display = 'none';
                    resolve({ mode, playerCount, aiPlayers, network, joinSessionId, joinPlayerId });
                });
            });
        });
    }
}
