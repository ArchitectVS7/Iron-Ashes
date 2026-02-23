export class BrokenCourtUI {
    private container: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'broken-court-action-menu';
        this.container.style.display = 'none';
        parent.appendChild(this.container);
    }

    public showRescueMenu(targetPlayerId: string) {
        this.container.style.display = 'flex';
        this.container.innerHTML = `
      <div class="rescue-modal">
        <h2>Rescue ${targetPlayerId}</h2>
        <p>Donate 2-5 Fate Cards to clear their Penalty Cards and restore their War Banners.</p>
        <div class="rescue-actions">
           <button class="rescue-btn confirm">Confirm Rescue</button>
           <button class="rescue-btn cancel" onclick="this.closest('.broken-court-action-menu').style.display='none'">Cancel</button>
        </div>
      </div>
    `;
    }

    public playRecoveryAnimation(playerId: string) {
        // A distinct recovery animation visible to all players
        const anim = document.createElement('div');
        anim.className = 'recovery-animation';
        anim.innerText = `${playerId} RECOVERED!`;
        document.body.appendChild(anim);
        setTimeout(() => anim.remove(), 3000);
    }
}
