export type GameMode = 'competitive' | 'blood_pact' | 'cooperative';

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

    public async showModeSelection(): Promise<GameMode> {
        this.container.style.display = 'flex';

        return new Promise<GameMode>((resolve) => {
            this.container.innerHTML = `
                <div class="mode-modal">
                    <h2>SELECT GAME MODE</h2>
                    <div class="mode-options">
                        <button class="mode-btn btn-competitive" data-mode="competitive">
                            <h3>Competitive</h3>
                            <p>Standard 2-4 player free-for-all.</p>
                        </button>
                        <button class="mode-btn btn-bloodpact" data-mode="blood_pact">
                            <h3>Blood Pact</h3>
                            <p>One player is the Traitor. Revealed only at the end.</p>
                        </button>
                        <button class="mode-btn btn-coop" data-mode="cooperative">
                            <h3>Cooperative</h3>
                            <p>All against the Shadowking. No PvP War Field.</p>
                        </button>
                    </div>
                </div>
            `;

            const btns = this.container.querySelectorAll('.mode-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    const mode = target.getAttribute('data-mode') as GameMode;
                    this.container.style.display = 'none';
                    resolve(mode);
                });
            });
        });
    }
}
