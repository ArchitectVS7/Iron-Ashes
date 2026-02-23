export interface CombatState {
    attackerId: string;
    defenderId: string;
    baseStrengthAttacker: number;
    baseStrengthDefender: number;
    attackerCardIndex: number | null; // index of played card
    defenderCardIndex: number | null;
    attackerFaceDown: boolean;
    defenderFaceUp: boolean;
    margin: number | null;
    reshuffleOccurred: boolean;
}

export class CombatOverlay {
    private container: HTMLElement;

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error("Parent not found");

        this.container = document.createElement('div');
        this.container.className = 'combat-overlay';
        this.container.style.display = 'none';
        parent.appendChild(this.container);
    }

    public showCombat(state: CombatState) {
        this.container.style.display = 'flex';

        // Simulate simultaneous reveal structure
        this.container.innerHTML = `
      <div class="combat-modal">
        <h2 class="combat-title">THE WAR FIELD</h2>
        
        <div class="combat-participants">
          <div class="combat-side attacker">
             <h3>Attacker (${state.attackerId})</h3>
             <div class="base-strength">Base: ${state.baseStrengthAttacker}</div>
             <div class="card-slot ${state.attackerFaceDown ? 'face-down' : 'revealed'}" title="Attacker plays Face-Down">
                ${state.attackerCardIndex !== null ? 'Card Value' : '?'}
             </div>
          </div>
          
          <div class="combat-vs">VS</div>
          
          <div class="combat-side defender">
             <h3>Defender (${state.defenderId})</h3>
             <div class="base-strength">Base: ${state.baseStrengthDefender}</div>
             <div class="card-slot ${state.defenderFaceUp ? 'face-up' : 'revealed'}" title="Defender plays Face-Up (Defender Tie-Break)">
                ${state.defenderCardIndex !== null ? 'Card Value' : '?'}
             </div>
          </div>
        </div>

        ${state.margin !== null ? `
           <div class="combat-margin">Margin: ${state.margin}</div>
           <p class="penalty-text">Loser draws ${state.margin} Penalty Cards.</p>
        ` : ''}

        ${state.reshuffleOccurred ? `
           <div class="reshuffle-notification">
             FATE DECK RESHUFFLED — DOOM TOLL ADVANCES!
           </div>
        ` : ''}
        
        <div class="card-asymmetry-tooltip">
          ℹ️ Defender sees Attacker's base strength and plays face-up. Attacker plays face-down but leads.
        </div>
        
        <button class="combat-close-btn" onclick="this.closest('.combat-overlay').style.display='none'">Resolve</button>
      </div>
    `;
    }
}
