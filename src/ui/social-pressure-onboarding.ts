// src/ui/social-pressure-onboarding.ts
// F-006b — Social Pressure Onboarding Screen

const ONBOARDING_STORAGE_KEY = 'iron_ashes_onboarding_seen';

const ONBOARDING_CONTENT = `
<h2 class="onboarding-title">The Voting Phase — How This Game Works</h2>
<p class="onboarding-body">
  This game is a negotiation about who pays for collective survival.
  The player leading in Strongholds has the most to lose if the Doom Toll advances.
  The players trailing have the least.
  Abstaining in the Voting Phase is a legal form of political taxation on the frontrunner —
  and the designed check on Forge Keep dominance.
  If you are winning and the table is not cooperating, that is not betrayal.
  It is the game working as designed.
</p>
<h3 class="onboarding-subtitle">Key Rules</h3>
<ul class="onboarding-list">
  <li>Each round, the Shadowking draws a Behavior Card.</li>
  <li>If ALL active Arch-Regents vote COUNTER and pay 1 Fate Card each, the effect is blocked.</li>
  <li>If anyone abstains — or cannot afford the cost — the card resolves and the Doom Toll advances by 1.</li>
  <li>In the Final Phase (Doom Toll ≥ 10), blocking costs 2 Fate Cards per player.</li>
  <li>Abstaining is never punished directly. It is a choice, not a failure.</li>
</ul>
<p class="onboarding-note">
  <em>You can revisit this screen at any time from Settings → About the Voting Phase.</em>
</p>
`;

export class SocialPressureOnboarding {
    private modal: HTMLElement | null = null;

    /**
     * Show the onboarding modal if this is the player's first session.
     * Checks localStorage; resolves immediately if already seen.
     */
    public showIfFirstSession(): Promise<void> {
        if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1') {
            return Promise.resolve();
        }
        return this.showModal();
    }

    /**
     * Always show the modal — used from Settings → "About the Voting Phase".
     */
    public showFromSettings(): Promise<void> {
        return this.showModal();
    }

    private showModal(): Promise<void> {
        return new Promise((resolve) => {
            // Remove any existing modal
            this.dismiss();

            const overlay = document.createElement('div');
            overlay.className = 'onboarding-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Voting Phase Onboarding');

            const box = document.createElement('div');
            box.className = 'onboarding-box';

            const scrollArea = document.createElement('div');
            scrollArea.className = 'onboarding-scroll';
            scrollArea.innerHTML = ONBOARDING_CONTENT;

            const dismissBtn = document.createElement('button');
            dismissBtn.className = 'onboarding-dismiss';
            dismissBtn.textContent = 'I Understand';
            dismissBtn.disabled = true;

            box.appendChild(scrollArea);
            box.appendChild(dismissBtn);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            this.modal = overlay;

            // Enable dismiss button only after user has scrolled to the bottom
            const enableOnScroll = () => {
                const atBottom = scrollArea.scrollHeight - scrollArea.scrollTop <= scrollArea.clientHeight + 4;
                if (atBottom) {
                    dismissBtn.disabled = false;
                    scrollArea.removeEventListener('scroll', enableOnScroll);
                }
            };
            scrollArea.addEventListener('scroll', enableOnScroll);

            // If content is short enough that no scroll is needed, enable immediately
            if (scrollArea.scrollHeight <= scrollArea.clientHeight) {
                dismissBtn.disabled = false;
            }

            dismissBtn.addEventListener('click', () => {
                localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
                this.dismiss();
                resolve();
            });
        });
    }

    private dismiss() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}
