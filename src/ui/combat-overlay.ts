import { CombatResult } from '../systems/combat.js';
import { Player } from '../models/player.js';

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

   public showCombat(state: CombatState): Promise<void> {
      return new Promise<void>((resolve) => {
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
        
        <button class="combat-close-btn" id="combat-resolve-btn">Resolve</button>
      </div>
    `;

         const btn = this.container.querySelector('#combat-resolve-btn');
         if (btn) {
            btn.addEventListener('click', () => {
               resolve();
            });
         }
      });
   }

   /**
    * Show the resolved combat outcome with a dramatic reveal.
    *
    * The overlay auto-dismisses after `delayMs` (default 2000ms).
    * In tests, pass delayMs=0 for instant resolution.
    */
   public showCombatResult(
      result: CombatResult,
      attacker: Player,
      defender: Player,
      delayMs: number = 2000,
   ): Promise<void> {
      return new Promise<void>((resolve) => {
         this.container.style.display = 'flex';

         const winnerLabel = result.winner === 'attacker'
            ? `Player ${attacker.index + 1} triumphs!`
            : `Player ${defender.index + 1} holds the line!`;

         this.container.innerHTML = `
      <div class="combat-modal">
        <h2 class="combat-title">THE WAR FIELD</h2>

        <div class="combat-participants">
          <div class="combat-side attacker ${result.winner === 'attacker' ? 'winner' : ''}">
             <h3>Player ${attacker.index + 1}</h3>
             <div class="base-strength">Base: ${result.attackerStrength - result.attackerCardValue}</div>
             <div class="card-slot revealed" title="Attacker's Fate Card">
                ${result.attackerCardValue >= 0 ? '+' : ''}${result.attackerCardValue}
             </div>
             <div class="total-strength">Total: ${result.attackerStrength}</div>
          </div>

          <div class="combat-vs">VS</div>

          <div class="combat-side defender ${result.winner === 'defender' ? 'winner' : ''}">
             <h3>Player ${defender.index + 1}</h3>
             <div class="base-strength">Base: ${result.defenderStrength - result.defenderCardValue}</div>
             <div class="card-slot revealed" title="Defender's Fate Card">
                ${result.defenderCardValue >= 0 ? '+' : ''}${result.defenderCardValue}
             </div>
             <div class="total-strength">Total: ${result.defenderStrength}</div>
          </div>
        </div>

        <div class="combat-outcome">${winnerLabel}</div>
        ${result.margin > 0 ? `
           <div class="combat-margin">Margin: ${result.margin}</div>
           <p class="penalty-text">Loser gains ${result.penaltyCards} Penalty Card(s).</p>
        ` : '<div class="combat-tie">TIE — Defender holds.</div>'}
      </div>
    `;

         setTimeout(() => {
            this.container.style.display = 'none';
            resolve();
         }, delayMs);
      });
   }
}
