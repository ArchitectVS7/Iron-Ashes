import { Player } from '../models/player.js';

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

  /**
   * Prompt the rescuer to choose a donation amount (2–5 Fate Cards).
   * Only amounts the rescuer can actually afford are offered.
   * Returns the chosen amount, or null if the rescuer declines.
   */
  public waitForRescueDecision(rescuer: Player, target: Player): Promise<number | null> {
    const maxDonation = Math.min(5, rescuer.fateCards.length);

    return new Promise<number | null>((resolve) => {
      let resolved = false;
      const finish = (value: number | null) => {
        if (resolved) return;
        resolved = true;
        this.container.style.display = 'none';
        resolve(value);
      };

      this.container.style.display = 'flex';

      const amountButtons = [2, 3, 4, 5]
        .filter(n => n <= maxDonation)
        .map(n => `<button class="rescue-amount-btn" data-amount="${n}">${n} Cards</button>`)
        .join('');

      this.container.innerHTML = `
        <div class="rescue-modal">
          <h2>Rescue Player ${target.index + 1}</h2>
          <p>Player ${rescuer.index + 1}: Donate Fate Cards to restore their War Banners.</p>
          <p class="rescue-card-count">You have ${rescuer.fateCards.length} Fate Card(s).</p>
          <div class="rescue-amount-selector">${amountButtons}</div>
          <div class="rescue-actions">
             <button class="rescue-btn cancel">Decline</button>
          </div>
        </div>
      `;

      this.container.querySelectorAll('.rescue-amount-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const amount = parseInt((e.currentTarget as HTMLElement).dataset['amount'] ?? '0', 10);
          finish(amount);
        });
      });

      this.container.querySelector('.rescue-btn.cancel')?.addEventListener('click', () => {
        finish(null);
      });
    });
  }
}
