export class HeraldActionUI {
    private container: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'herald-action-prompt';
        this.container.style.display = 'none';
        parent.appendChild(this.container);
    }

    public showInteraction(onConfirm: () => void) {
        this.container.style.display = 'flex';
        this.container.innerHTML = `
            <div class="interaction-modal">
                <h3 class="diplomatic-title">Dark Fortress Approach</h3>
                <p>Your Herald stands alone before the Dark Fortress.</p>
                <p>Play Diplomatic Action? (Reduces Doom Toll by 1. Once per game.)</p>
                <div class="interaction-btns">
                    <button id="btn-herald-confirm" class="btn herald-confirm">Perform Diplomacy</button>
                    <button id="btn-herald-cancel" class="btn herald-cancel">Cancel</button>
                </div>
            </div>
        `;

        document.getElementById('btn-herald-confirm')?.addEventListener('click', () => {
            this.container.style.display = 'none';
            this.playReductionAnimation();
            onConfirm();
        });

        document.getElementById('btn-herald-cancel')?.addEventListener('click', () => {
            this.container.style.display = 'none';
        });
    }

    private playReductionAnimation() {
        // Simple distinct screen effect
        const flash = document.createElement('div');
        flash.className = 'doom-reduction-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 2000);
    }
}
