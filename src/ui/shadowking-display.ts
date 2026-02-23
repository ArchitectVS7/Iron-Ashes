export class ShadowkingDisplay {
    private container: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'shadowking-display';
        this.container.style.display = 'none';
        parent.appendChild(this.container);
    }

    public showBehaviorCard(cardType: 'SPAWN' | 'MOVE' | 'CLAIM' | 'ASSAULT' | 'ESCALATE', description: string) {
        this.container.style.display = 'flex';

        let icon = '💀';
        if (cardType === 'SPAWN') icon = '🧟';
        if (cardType === 'CLAIM') icon = '🏰';
        if (cardType === 'ASSAULT') icon = '⚔️';
        if (cardType === 'ESCALATE') icon = '🔔';

        this.container.innerHTML = `
            <div class="behavior-card active-card">
                <div class="card-header">SHADOWKING BEHAVIOR</div>
                <div class="card-icon">${icon}</div>
                <div class="card-title">${cardType}</div>
                <div class="card-desc">${description}</div>
            </div>
        `;

        setTimeout(() => {
            if (this.container) this.container.style.display = 'none';
        }, 5000); // Auto hide after 5 seconds simulation
    }
}
