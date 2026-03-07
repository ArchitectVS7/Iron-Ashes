/**
 * Game Controller — Binds Engine to UI
 *
 * Owns GameState, drives phase transitions, routes UI events to engine
 * calls, and re-renders after each mutation. In autoPlay mode (used by
 * tests and balance simulations), all decisions are auto-resolved.
 *
 * Phase flow follows simulation.ts (the verified reference):
 *   1. startRound           → draw behavior card, phase = shadowking
 *   2. advancePhase         → shadowking → voting
 *   3. autoAbstain + votes  → submitVote per player
 *   4. resolveVotes         → determine blocked status
 *   5. resolveBehaviorCard  → apply card effect using vote result
 *   6. (Final Phase?)       → performBlightAutoSpread
 *   7. checkVictoryConditions
 *   8. advancePhase         → voting → action
 *   9. per-player actions   → move, claim, combat, rescue, diplomacy
 *  10. advancePhase         → action → cleanup
 *  11. checkVictoryConditions (territory victory only fires at cleanup)
 *  12. advancePhase         → cleanup → shadowking (increments round)
 */

import type {
  GameState,
  GameMode,
  VoteChoice,
} from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';

// Engine
import {
  createGameState,
  advancePhase,
  startRound,
} from '../engine/game-loop.js';

// Systems
import {
  submitVote,
  resolveVotes,
  autoAbstainPlayers,
  canVote,
} from '../systems/voting.js';
import { resolveBehaviorCard } from '../systems/shadowking.js';
import { resolvePlayerCombat } from '../systems/combat.js';
import {
  checkVictoryConditions,
  isGameOver,
  claimArtifact,
  isArtifactAvailable,
} from '../systems/victory.js';
import {
  spendBannersForMovement,
  canAffordMovement,
  spendBannersForClaim,
  canAffordClaim,
} from '../systems/resources.js';
import {
  checkBrokenStatus,
  enterBrokenCourt,
  canRescue,
  performRescue,
  canPerformAction,
} from '../systems/broken-court.js';
import {
  canPerformDiplomaticAction,
  performDiplomaticAction,
  getEligibleDiplomats,
} from '../systems/herald-diplomacy.js';
import {
  isInFinalPhase,
  performBlightAutoSpread,
  getPlayerStrongholdCount,
} from '../systems/doom-toll.js';
import {
  findShortestPath,
  findNearest,
} from '../utils/pathfinding.js';
import { getStandardNodes } from '../models/board.js';

// UI (all optional — controller works headless)
import { BoardRenderer } from './board-renderer.js';
import { VotingPanel } from './voting-panel.js';
import { CombatOverlay } from './combat-overlay.js';
import { BrokenCourtUI } from './broken-court-ui.js';
import { ShadowkingDisplay } from './shadowking-display.js';
import { DoomTollDisplay } from './doom-toll-display.js';
import { SummaryEngine } from './summary.js';
import { AtmosphereEngine } from './atmosphere.js';

// ─── Options ──────────────────────────────────────────────────────

export interface GameControllerOptions {
  /** When true, all player decisions are auto-resolved without UI. */
  autoPlay?: boolean;
  /** Combat overlay delay in ms (default 2000, 0 for tests). */
  combatDelayMs?: number;
  /** Shadowking card display delay in ms (default 2000, 0 for tests). */
  shadowkingDelayMs?: number;
}

// ─── Behaviour Card Descriptions ──────────────────────────────────

const BEHAVIOR_DESCRIPTIONS: Record<string, string> = {
  spawn: 'Blight Wraiths emerge near the Dark Fortress.',
  move: 'A Death Knight advances toward the leading Arch-Regent.',
  claim: 'The Shadowking claims an unguarded stronghold.',
  assault: 'A Death Knight assaults the weakest Arch-Regent!',
  escalate: 'The Doom Toll advances. Darkness grows.',
};

// ─── Controller ───────────────────────────────────────────────────

export class GameController {
  private state!: GameState;
  private rng!: SeededRandom;
  private autoPlay: boolean;
  private combatDelayMs: number;
  private shadowkingDelayMs: number;

  // Action-phase turn tracking: resolved by handleNodeClick / handleEndTurn
  private actionResolve: (() => void) | null = null;

  // UI components (null in headless/test environments)
  private boardRenderer: BoardRenderer | null = null;
  private votingPanel: VotingPanel | null = null;
  private combatOverlay: CombatOverlay | null = null;
  private brokenCourtUI: BrokenCourtUI | null = null;
  private shadowkingDisplay: ShadowkingDisplay | null = null;
  private doomTollDisplay: DoomTollDisplay | null = null;
  private summary: SummaryEngine | null = null;
  private atmosphere: AtmosphereEngine | null = null;
  private hudEl: HTMLElement | null = null;

  constructor(container: HTMLElement, options: GameControllerOptions = {}) {
    this.autoPlay = options.autoPlay ?? false;
    this.combatDelayMs = options.combatDelayMs ?? 2000;
    this.shadowkingDelayMs = options.shadowkingDelayMs ?? 2000;
    this.setupDOM(container);
  }

  // ─── DOM & UI Init ────────────────────────────────────────────

  private setupDOM(container: HTMLElement): void {
    const canvasId = 'gc-canvas';
    const uiId = 'gc-ui';

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    container.appendChild(canvas);

    const uiLayer = document.createElement('div');
    uiLayer.id = uiId;
    container.appendChild(uiLayer);

    const hud = document.createElement('div');
    hud.id = 'gc-hud';
    container.appendChild(hud);
    this.hudEl = hud;

    // Each component is optional. If the DOM environment is headless (tests),
    // constructors may fail silently — the controller keeps working.
    try { this.boardRenderer = new BoardRenderer(canvasId); } catch { /* headless */ }
    try { this.votingPanel = new VotingPanel(uiId); } catch { /* headless */ }
    try { this.combatOverlay = new CombatOverlay(uiId); } catch { /* headless */ }
    try { this.brokenCourtUI = new BrokenCourtUI(uiId); } catch { /* headless */ }
    try { this.shadowkingDisplay = new ShadowkingDisplay(uiId); } catch { /* headless */ }
    try { this.doomTollDisplay = new DoomTollDisplay(uiId); } catch { /* headless */ }
    try { this.atmosphere = new AtmosphereEngine(uiId); } catch { /* headless */ }
    try { this.summary = new SummaryEngine(); } catch { /* headless */ }

    if (this.boardRenderer) {
      this.boardRenderer.onNodeClick = (nodeId) => this.handleNodeClick(nodeId);
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  /** Create the initial game state without starting the loop. */
  public init(playerCount: number, mode: GameMode, seed: number = Date.now()): void {
    this.state = createGameState(playerCount, mode, seed);
    this.rng = new SeededRandom(seed);
    this.renderAll();
  }

  /** Read-only access to game state (primarily for tests). */
  public getState(): GameState {
    return this.state;
  }

  /** Initialize and run until game ends or maxRounds. */
  public async start(
    playerCount: number,
    mode: GameMode,
    seed: number = Date.now(),
    maxRounds: number = 50,
  ): Promise<void> {
    this.init(playerCount, mode, seed);
    await this.runGame(maxRounds);
  }

  /** Run the full game loop until termination. */
  public async runGame(maxRounds: number = 50): Promise<void> {
    while (!isGameOver(this.state) && this.state.round <= maxRounds) {
      await this.runRound();
    }
    this.showGameSummary();
  }

  /** Execute one complete round (shadowking → voting → action → cleanup). */
  public async runRound(): Promise<void> {
    if (isGameOver(this.state)) return;
    await this.runShadowkingPhase();
    if (isGameOver(this.state)) return;
    await this.runVotingPhase();
    if (isGameOver(this.state)) return;
    await this.runActionPhase();
    if (isGameOver(this.state)) return;
    await this.runCleanupPhase();
  }

  // ─── Phase Implementations ────────────────────────────────────

  /**
   * Shadowking Phase: draw a behavior card and reveal it.
   * The card is NOT resolved here — resolution waits for the vote outcome.
   */
  public async runShadowkingPhase(): Promise<void> {
    startRound(this.state);

    const card = this.state.currentBehaviorCard;
    if (card && this.shadowkingDisplay) {
      const label = card.type.toUpperCase() as 'SPAWN' | 'MOVE' | 'CLAIM' | 'ASSAULT' | 'ESCALATE';
      this.shadowkingDisplay.showBehaviorCard(label, BEHAVIOR_DESCRIPTIONS[card.type] ?? '');
    }

    this.renderAll();

    if (!this.autoPlay && this.shadowkingDelayMs > 0) {
      await this.sleep(this.shadowkingDelayMs);
    }
  }

  /**
   * Voting Phase: collect votes, resolve, THEN apply the behavior card.
   * This is the correct ordering — the vote determines whether the card
   * is blocked before it resolves.
   */
  public async runVotingPhase(): Promise<void> {
    advancePhase(this.state); // shadowking → voting

    autoAbstainPlayers(this.state);

    for (const player of this.state.players) {
      if (this.state.votes[player.index] !== null) continue; // already auto-abstained

      let choice: VoteChoice;

      if (this.autoPlay) {
        // Mirror simulation.ts: ~15% strategic abstention to let doom advance
        const { canCounter } = canVote(player, this.state);
        const willAbstainStrategically = this.rng.chance(0.15);
        choice = (canCounter && !willAbstainStrategically) ? 'counter' : 'abstain';
      } else if (this.votingPanel) {
        choice = await this.votingPanel.waitForVote(player, this.state);
      } else {
        choice = 'abstain';
      }

      submitVote(this.state, player.index, choice);
    }

    const voteResult = resolveVotes(this.state);

    // Resolve the behavior card NOW, using the voting outcome
    if (this.state.currentBehaviorCard) {
      resolveBehaviorCard(this.state, this.rng, voteResult.blocked);
    }

    // Final Phase blight auto-spread
    if (isInFinalPhase(this.state)) {
      performBlightAutoSpread(this.state, this.rng);
    }

    // Immediate victory checks (doom_complete, all_broken)
    checkVictoryConditions(this.state, this.rng);
    this.renderAll();
  }

  /**
   * Action Phase: each player takes turns spending actions.
   */
  public async runActionPhase(): Promise<void> {
    if (isGameOver(this.state)) return;
    advancePhase(this.state); // voting → action

    for (const playerIndex of this.state.turnOrder) {
      if (isGameOver(this.state)) break;

      const player = this.state.players[playerIndex];
      this.state.activePlayerIndex = playerIndex;
      this.renderAll();

      if (this.autoPlay) {
        this.autoResolveActions(playerIndex);
      } else {
        while (player.actionsRemaining > 0 && !isGameOver(this.state)) {
          this.updateHighlights(playerIndex);
          this.updateHUD(playerIndex);

          await new Promise<void>((resolve) => {
            this.actionResolve = resolve;
          });
        }
      }

      // Post-turn broken check
      if (!player.isBroken && checkBrokenStatus(player)) {
        enterBrokenCourt(this.state, playerIndex);
      }

      // Mid-phase victory check (all_broken, doom_complete)
      checkVictoryConditions(this.state, this.rng);
      this.renderAll();
    }
  }

  /**
   * Cleanup Phase: territory victory check, then advance to next round.
   */
  public async runCleanupPhase(): Promise<void> {
    if (isGameOver(this.state)) return;
    advancePhase(this.state); // action → cleanup

    // Territory victory only fires when phase === 'cleanup'
    checkVictoryConditions(this.state, this.rng);

    if (!isGameOver(this.state)) {
      // cleanup → shadowking (increments round, discards/generates banners)
      advancePhase(this.state);
    }

    this.renderAll();
  }

  // ─── Player Action Handlers ───────────────────────────────────

  /**
   * Handle a board node click during the action phase.
   * Routes to movement, claiming, or combat based on game rules.
   */
  public handleNodeClick(nodeId: string): void {
    if (!this.state || this.state.phase !== 'action') return;
    if (isGameOver(this.state)) return;

    const player = this.state.players[this.state.activePlayerIndex];
    if (!player || player.actionsRemaining <= 0) return;

    const currentNode = player.fellowship.currentNode;
    const definition = this.state.boardDefinition;

    // ── Movement: clicked an adjacent node ──
    if (nodeId !== currentNode) {
      if (!canPerformAction(player, 'move')) return;

      const nodeInfo = definition.nodes[currentNode];
      if (!nodeInfo || !nodeInfo.connections.includes(nodeId)) return;
      if (!canAffordMovement(player, 1)) return;

      spendBannersForMovement(player, 1);
      player.fellowship.currentNode = nodeId;
      player.actionsRemaining -= 1;

      // Artifact pickup on arrival
      if (this.state.artifactHolder === null && nodeId === this.state.artifactNode) {
        if (isArtifactAvailable(this.state)) {
          claimArtifact(this.state, player.index);
        }
      }

      // PvP combat: auto-resolve if another fellowship is co-located
      if (this.state.mode !== 'cooperative') {
        for (const other of this.state.players) {
          if (other.index === player.index) continue;
          if (other.fellowship.currentNode !== nodeId) continue;
          if (!canPerformAction(player, 'combat')) break;

          const result = resolvePlayerCombat(
            this.state, player.index, other.index,
            0, 0, this.rng,
          );
          if (this.combatOverlay) {
            void this.combatOverlay.showCombatResult(
              result, player, other, this.combatDelayMs,
            );
          }
        }
      }

      // Post-move broken check
      if (!player.isBroken && checkBrokenStatus(player)) {
        enterBrokenCourt(this.state, player.index);
      }

      this.renderAll();
      this.resolveAction();
      return;
    }

    // ── Claim: clicked current node (unclaimed, claimable type) ──
    if (nodeId === currentNode) {
      const nodeState = this.state.boardState[nodeId];
      const nodeDef = definition.nodes[nodeId];
      const isClaimableType = nodeDef && (nodeDef.type === 'standard' || nodeDef.type === 'forge');

      if (
        nodeState &&
        nodeState.claimedBy === null &&
        isClaimableType &&
        canPerformAction(player, 'claim') &&
        canAffordClaim(player)
      ) {
        spendBannersForClaim(player);
        nodeState.claimedBy = player.index;
        player.stats.strongholdsClaimed += 1;
        player.actionsRemaining -= 1;

        this.renderAll();
        this.resolveAction();
        return;
      }

      // Herald diplomatic action at Dark Fortress
      if (canPerformDiplomaticAction(player, this.state)) {
        const diplomats = getEligibleDiplomats(player);
        if (diplomats.length > 0) {
          performDiplomaticAction(this.state, player.index, diplomats[0].id);
          this.renderAll();
          this.resolveAction();
          return;
        }
      }
    }
  }

  /** End the current player's turn early (sets actionsRemaining to 0). */
  public handleEndTurn(): void {
    if (!this.state || this.state.phase !== 'action') return;
    const player = this.state.players[this.state.activePlayerIndex];
    if (player) {
      player.actionsRemaining = 0;
    }
    this.resolveAction();
  }

  // ─── Auto-Play AI ─────────────────────────────────────────────

  /**
   * Simple AI mirrors simulation.ts: pathfind toward unclaimed strongholds,
   * claim on arrival, rescue broken allies, perform diplomacy.
   */
  private autoResolveActions(playerIndex: number): void {
    const player = this.state.players[playerIndex];
    if (!player || player.actionsRemaining <= 0) return;

    const definition = this.state.boardDefinition;
    let currentNode = player.fellowship.currentNode;

    // Artifact claim if standing on it
    if (this.state.artifactHolder === null && currentNode === this.state.artifactNode) {
      if (isArtifactAvailable(this.state)) {
        claimArtifact(this.state, playerIndex);
      }
    }

    // Herald diplomatic action
    if (canPerformDiplomaticAction(player, this.state)) {
      const diplomats = getEligibleDiplomats(player);
      if (diplomats.length > 0) {
        performDiplomaticAction(this.state, playerIndex, diplomats[0].id);
      }
    }

    // Rescue broken allies
    for (const other of this.state.players) {
      if (player.actionsRemaining <= 0) break;
      if (canRescue(player, other, this.state) && player.fateCards.length >= 2) {
        performRescue(this.state, playerIndex, other.index, 2);
      }
    }

    // Pathfind to unclaimed strongholds
    const unclaimed = getStandardNodes(definition).filter(
      id => this.state.boardState[id].claimedBy === null,
    );

    if (unclaimed.length > 0) {
      const nearest = findNearest(definition, currentNode, unclaimed);

      if (nearest && nearest.distance === 0 && canAffordClaim(player) && canPerformAction(player, 'claim')) {
        spendBannersForClaim(player);
        this.state.boardState[nearest.nodeId].claimedBy = playerIndex;
        player.stats.strongholdsClaimed += 1;
        player.actionsRemaining -= 1;
      } else if (nearest && nearest.distance > 0 && player.warBanners > 0 && canPerformAction(player, 'move')) {
        const path = findShortestPath(definition, currentNode, nearest.nodeId);
        if (path && path.length >= 2 && canAffordMovement(player, 1)) {
          spendBannersForMovement(player, 1);
          player.fellowship.currentNode = path[1];
          currentNode = path[1];
          player.actionsRemaining -= 1;

          if (
            currentNode === nearest.nodeId &&
            this.state.boardState[currentNode].claimedBy === null &&
            canAffordClaim(player) &&
            canPerformAction(player, 'claim')
          ) {
            spendBannersForClaim(player);
            this.state.boardState[currentNode].claimedBy = playerIndex;
            player.stats.strongholdsClaimed += 1;
            player.actionsRemaining -= 1;
          }
        }
      }
    }

    player.actionsRemaining = 0;
  }

  // ─── Rendering ────────────────────────────────────────────────

  private renderAll(): void {
    if (!this.state) return;

    if (this.boardRenderer) {
      this.boardRenderer.updateState(this.state.boardState);
    }

    if (this.doomTollDisplay) {
      this.doomTollDisplay.updateToll(this.state.doomToll);
    }
  }

  private updateHighlights(playerIndex: number): void {
    if (!this.boardRenderer) return;
    const player = this.state.players[playerIndex];
    if (!player) return;

    const currentNode = player.fellowship.currentNode;
    const reachable = canPerformAction(player, 'move') && canAffordMovement(player, 1)
      ? this.state.boardDefinition.nodes[currentNode]?.connections.slice() ?? []
      : [];

    const claimable = canPerformAction(player, 'claim') && canAffordClaim(player)
      && this.state.boardState[currentNode]?.claimedBy === null
      ? [currentNode]
      : [];

    this.boardRenderer.setHighlightedNodes(reachable as string[], claimable);
  }

  private updateHUD(playerIndex: number): void {
    if (!this.hudEl) return;
    const player = this.state.players[playerIndex];
    if (!player) return;

    this.hudEl.innerHTML = `
      <div class="action-hud">
        <span class="hud-player">Player ${playerIndex + 1}</span>
        <span class="hud-actions">Actions: ${player.actionsRemaining}</span>
        <span class="hud-banners">Banners: ${player.warBanners}</span>
        <span class="hud-round">Round ${this.state.round}</span>
        <button class="hud-end-turn" id="gc-end-turn">End Turn</button>
      </div>
    `;

    const endBtn = document.getElementById('gc-end-turn');
    endBtn?.addEventListener('click', () => this.handleEndTurn());
  }

  // ─── Game Over Summary ────────────────────────────────────────

  private showGameSummary(): void {
    if (!isGameOver(this.state)) return;

    const reason = this.state.gameEndReason;
    let title = 'GAME OVER';
    let titleClass = 'victory-default';
    let condition = '';

    if (reason === 'doom_complete') {
      title = 'THE SHADOWKING REIGNS';
      titleClass = 'victory-shadowking';
      condition = 'The Doom Toll reached 13 — darkness consumes the Known Lands';
    } else if (reason === 'territory_victory') {
      title = `PLAYER ${(this.state.winner ?? 0) + 1} CLAIMS THE THRONE`;
      titleClass = 'victory-territory';
      condition = 'Territory victory — the Heartstone holder controls the most strongholds';
    } else if (reason === 'all_broken') {
      title = 'THE COURTS LIE IN RUIN';
      titleClass = 'victory-draw';
      condition = 'All Arch-Regents fell to Broken Court — the throne sits empty';
    }

    if (this.summary) {
      try {
        const stats = this.state.players.map((p, i) => ({
          name: `Player ${i + 1}`,
          strongholds: getPlayerStrongholdCount(this.state, i),
          fellowships: p.stats.fellowsRecruited,
          bannersSpent: p.stats.warBannersSpent,
          combats: `${p.stats.combatsWon}W / ${p.stats.combatsLost}L`,
          timesBroken: p.stats.timesBroken,
          rescues: p.stats.rescuesGiven,
          votes: `${p.stats.votesCast}C / ${p.stats.votesAbstained}A`,
        }));

        this.summary.showPostGameSummary(title, titleClass, condition, stats, this.state.doomToll);
      } catch {
        // Summary rendering failed (headless environment) — non-fatal
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private resolveAction(): void {
    if (this.actionResolve) {
      const resolve = this.actionResolve;
      this.actionResolve = null;
      resolve();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
