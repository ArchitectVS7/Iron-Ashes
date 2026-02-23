export interface CharacterUI {
    id: string;
    role: 'leader' | 'warrior' | 'diplomat' | 'producer';
    powerLevel: number;
}

export interface CharacterPanelState {
    characters: CharacterUI[];
    hasHerald: boolean;
    canRecruit: boolean;
}

export class CharacterPanel {
    private container: HTMLElement;

    constructor(parentElement: HTMLElement) {
        this.container = document.createElement('div');
        this.container.className = 'character-panel';
        parentElement.appendChild(this.container);
    }

    public update(state: CharacterPanelState) {
        const charsHtml = state.characters.map(c => `
      <div class="character-token role-${c.role}" title="${c.role.toUpperCase()} (Power: ${c.powerLevel})">
        ${this.getIconForRole(c.role)}
      </div>
    `).join('');

        this.container.innerHTML = `
      <div class="fellowship-group">
        ${charsHtml}
      </div>
      <div class="character-actions">
        <!-- Recruit action greyed out if no Herald -->
        <button class="action-btn btn-recruit ${!state.hasHerald ? 'action-disabled' : ''}" 
          ${!state.hasHerald ? 'disabled' : ''}>
          Recruit Wanderer
        </button>
      </div>
    `;
    }

    private getIconForRole(role: string): string {
        switch (role) {
            case 'leader': return '👑';
            case 'warrior': return '⚔️';
            case 'diplomat': return '📜';
            case 'producer': return '⚒️';
            default: return '?';
        }
    }
}
