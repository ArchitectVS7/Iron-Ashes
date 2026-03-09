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

import type { VoteChoice } from '../models/game-state.js';
import { GameState, GameMode } from '../models/game-state.js';
import { TutorialState } from '../systems/tutorial-state.js';
import { getFellowshipPower } from '../systems/characters.js';
import type { AIDifficulty } from '../models/player.js';
import { TutorialScriptedOpponent } from '../systems/tutorial-script.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { AIPlayer } from '../systems/ai-player.js';

// Engine
import {
  createGameState,
  advancePhase,
  startRound,
} from '../engine/game-loop.js';

import { WebSocketMultiplayerSession } from '../systems/multiplayer.js';

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
import { StandingsPanel } from './standings-panel.js';
import { TutorialEngine } from './tutorial.js';
import { SettingsPanel } from './settings-panel.js';

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

  // Tutorial mode
  private isTutorialMode: boolean = false;
  private tutorialState: TutorialState = new TutorialState();
  private tutorialEngine: TutorialEngine | null = null;
  private scriptedOpponent: TutorialScriptedOpponent = new TutorialScriptedOpponent();

  // UI components (null in headless/test environments)
  private boardRenderer: BoardRenderer | null = null;
  private votingPanel: VotingPanel | null = null;
  private combatOverlay: CombatOverlay | null = null;
  private brokenCourtUI: BrokenCourtUI | null = null;
  private shadowkingDisplay: ShadowkingDisplay | null = null;
  private doomTollDisplay: DoomTollDisplay | null = null;
  private standingsPanel: StandingsPanel | null = null;
  private summary: SummaryEngine | null = null;
  private atmosphere: AtmosphereEngine | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private hudEl: HTMLElement | null = null;

  // Multiplayer properties
  private multiplayerSession: WebSocketMultiplayerSession | null = null;
  private localPlayerId: string = '0'; // Defaults to 0 (Host / Player 1)

  // AI mappings
  private aiPlayers: Map<number, AIPlayer> = new Map();

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

    const standingsContainer = document.createElement('div');
    standingsContainer.id = 'gc-standings';
    container.appendChild(standingsContainer);

    // Each component is optional. If the DOM environment is headless (tests),
    // constructors may fail silently — the controller keeps working.
    try { this.boardRenderer = new BoardRenderer(canvasId); } catch { /* headless */ }
    try { this.votingPanel = new VotingPanel(uiId); } catch { /* headless */ }
    try { this.combatOverlay = new CombatOverlay(uiId); } catch { /* headless */ }
    try { this.brokenCourtUI = new BrokenCourtUI(uiId); } catch { /* headless */ }
    try { this.shadowkingDisplay = new ShadowkingDisplay(uiId); } catch { /* headless */ }
    try { this.doomTollDisplay = new DoomTollDisplay(uiId); } catch { /* headless */ }
    try { this.standingsPanel = new StandingsPanel(standingsContainer); } catch { /* headless */ }
    try { this.settingsPanel = new SettingsPanel(hud); } catch { /* headless */ }
    try { this.atmosphere = new AtmosphereEngine(uiId); } catch { /* headless */ }
    try { this.summary = new SummaryEngine(); } catch { /* headless */ }
    try { this.tutorialEngine = new TutorialEngine(); } catch { /* headless */ }

    if (this.boardRenderer) {
      this.boardRenderer.onNodeClick = (nodeId) => this.handleNodeClick(nodeId);
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  /** Create the initial game state without starting the loop. */
  public init(playerCount: number, mode: GameMode, seed: number = Date.now(), aiDifficulties: AIDifficulty[] = []): void {
    this.state = createGameState(playerCount, mode, seed, aiDifficulties);
    this.rng = new SeededRandom(seed);

    // Initialize AI Controller instances
    this.aiPlayers.clear();
    for (const player of this.state.players) {
      if (player.type === 'ai' && player.aiDifficulty) {
        // Give each AI a distinct deterministic seed based on game seed + their index
        // We use explicit import of AIPlayer at top
        const aiSeed = seed ^ (player.index * 0x8a9b1c2d);
        this.aiPlayers.set(player.index, new AIPlayer(player.aiDifficulty, aiSeed));
      }
    }

    this.renderAll();
  }

  /** Read-only access to game state (primarily for tests). */
  public getState(): GameState {
    return this.state;
  }

  /** Initialize and run until game ends or maxRounds. */
  public async start(
    playerCount: number,
    mode: GameMode | 'tutorial',
    seed: number = Date.now(),
    maxRounds: number = 50,
    aiDifficulties: AIDifficulty[] = [],
    networkParams?: { type: 'local' | 'host' | 'join', joinSessionId?: string, joinPlayerId?: string }
  ): Promise<void> {

    // Tutorial overrides
    if (mode === 'tutorial') {
      this.isTutorialMode = true;
      this.tutorialState.startMandatoryTutorial();
      if (this.tutorialEngine) {
        try {
          this.tutorialEngine.startMandatoryTutorialFlow(this.tutorialState);
        } catch { /* headless */ }
      }
      this.init(playerCount, 'competitive', seed, aiDifficulties);
      await this.runGame(maxRounds);
      return;
    }

    if (networkParams && networkParams.type !== 'local') {
      this.multiplayerSession = new WebSocketMultiplayerSession();

      this.multiplayerSession.onStateUpdate((state) => {
        if (!this.state) {
          // Initial init logic for missing UI stuff
          this.state = state;
          this.rng = new SeededRandom(seed);
        } else {
          this.state = state;
        }

        // Sync AI mapping if ai players changed (e.g. Knight fallback)
        for (const p of state.players) {
          if (p.type === 'ai' && p.aiDifficulty && !this.aiPlayers.has(p.index)) {
            const aiSeed = state.seed ^ (p.index * 0x8a9b1c2d);
            this.aiPlayers.set(p.index, new AIPlayer(p.aiDifficulty, aiSeed));
          }
        }

        // Re-render UI upon ANY state change from server!
        this.renderAll();
      });

      if (networkParams.type === 'host') {
        const aiCount = aiDifficulties.length;
        this.localPlayerId = '0';
        const sessionId = await this.multiplayerSession.hostSession({
          mode: mode as GameMode,
          playerCount,
          aiCount,
          seed: seed.toString()
        });
        console.log("Hosted Session ID:", sessionId);
        // Show session ID to user in a basic way for now
        alert("Hosted Multiplayer Session. Share this ID with friends: " + sessionId);
        await this.multiplayerSession.joinSession(sessionId, this.localPlayerId);
      } else if (networkParams.type === 'join') {
        this.localPlayerId = networkParams.joinPlayerId || '0';
        const sessionId = networkParams.joinSessionId || '';
        const success = await this.multiplayerSession.joinSession(sessionId, this.localPlayerId);
        if (!success) {
          alert("Failed to join session " + sessionId);
          return;
        }
      }

      // Wait indefinitely, DO NOT run this.runGame() loop!
    } else {
      this.init(playerCount, mode, seed, aiDifficulties);
      await this.runGame(maxRounds);
    }
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
      } else if (player.type === 'ai') {
        const aiController = this.aiPlayers.get(player.index);
        if (aiController && this.state.currentBehaviorCard) {
          const aiChoice = await aiController.getVote(this.state, player, this.state.currentBehaviorCard.type);
          choice = aiChoice === 'COUNTER' ? 'counter' : 'abstain';
        } else {
          choice = 'abstain';
        }
      } else if (this.votingPanel) {
        if (this.multiplayerSession && player.index.toString() !== this.localPlayerId) {
          // Waiting for a remote player's vote...
          continue;
        } else {
          choice = await this.votingPanel.waitForVote(player, this.state);
        }
      } else {
        choice = 'abstain';
      }

      if (this.multiplayerSession) {
        // Send to server instead of resolving locally
        await this.multiplayerSession.submitVote(choice === 'counter' ? 'COUNTER' : 'ABSTAIN');
        return; // The server will push STATE_UPDATE later
      }

      submitVote(this.state, player.index, choice);

      // Tutorial Turn 4 (voting): after player 0 casts their vote, advance
      if (this.isTutorialMode && player.index === 0 && this.tutorialState.currentTurnIndex === 3) {
        this.advanceTutorialTurn();
      }
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

      if (this.autoPlay || (this.isTutorialMode && playerIndex !== 0)) {
        this.autoResolveActions(playerIndex);
      } else if (player.type === 'ai') {
        this.updateHUD(playerIndex);

        // Let runAITurn execute async while the main loop awaits actionResolve.
        // It will call this.resolveAction() when done.
        void this.runAITurn(playerIndex);

        while (player.actionsRemaining > 0 && !isGameOver(this.state)) {
          this.updateHighlights(playerIndex);

          await new Promise<void>((resolve) => {
            this.actionResolve = resolve;
          });
        }
      } else {
        if (this.multiplayerSession && playerIndex.toString() !== this.localPlayerId) {
          // Wait for remote human player to submit action
          return;
        }

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
  public async handleNodeClick(nodeId: string): Promise<void> {
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

      if (this.multiplayerSession) {
        void this.multiplayerSession.submitAction({ type: 'MOVE', payload: { path: [currentNode, nodeId] } });
        return; // Server will reply with STATE_UPDATE
      }

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

          if (this.combatOverlay) {
            const preCombatState = {
              attackerId: `Player ${player.index + 1}`,
              defenderId: `Player ${other.index + 1}`,
              baseStrengthAttacker: getFellowshipPower(player.fellowship) + player.warBanners,
              baseStrengthDefender: getFellowshipPower(other.fellowship) + other.warBanners,
              attackerCardIndex: null,
              defenderCardIndex: null,
              attackerFaceDown: true,
              defenderFaceUp: false,
              margin: null,
              reshuffleOccurred: false
            };
            await this.combatOverlay.showCombat(preCombatState);
          }

          const result = resolvePlayerCombat(
            this.state, player.index, other.index,
            0, 0, this.rng,
          );
          if (this.combatOverlay) {
            await this.combatOverlay.showCombatResult(
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
        if (this.multiplayerSession) {
          void this.multiplayerSession.submitAction({ type: 'CLAIM', payload: { nodeId } });
          return; // Server will reply with STATE_UPDATE
        }

        spendBannersForClaim(player);
        nodeState.claimedBy = player.index;
        player.stats.strongholdsClaimed += 1;
        player.actionsRemaining -= 1;

        // Tutorial Turn 1 (movement/claim): first successful claim advances tutorial
        if (this.isTutorialMode && player.index === 0 && this.tutorialState.currentTurnIndex === 0) {
          this.advanceTutorialTurn();
        }

        // Tutorial Turn 5 (forge_keep): claiming a forge node finalizes tutorial
        const claimedNodeDef = this.state.boardDefinition.nodes[nodeId];
        if (
          this.isTutorialMode &&
          player.index === 0 &&
          this.tutorialState.currentTurnIndex === 4 &&
          claimedNodeDef?.type === 'forge'
        ) {
          void this.tutorialState.finalizeMandatoryTutorial();
        }

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
      if (this.multiplayerSession) {
        void this.multiplayerSession.submitAction({ type: 'PASS', payload: {} });
        return; // Server will reply with STATE_UPDATE
      }
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

    // Tutorial mode: scripted opponent follows pre-defined paths
    if (this.isTutorialMode && playerIndex !== 0) {
      const turn = this.tutorialState.currentTurnIndex + 1;
      const path = this.scriptedOpponent.getMovesForTurn(turn);
      this.runScriptedOpponent(playerIndex, path);
      return;
    }

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

  // ─── AI Real-Time Play ────────────────────────────────────────

  /** Executes an AI player's turn visually using their logic controller. */
  private async runAITurn(playerIndex: number): Promise<void> {
    const ai = this.aiPlayers.get(playerIndex);
    const player = this.state.players[playerIndex];
    if (!ai || !player || player.actionsRemaining <= 0) {
      if (player) player.actionsRemaining = 0;
      return;
    }

    const actions = await ai.getActions(this.state, player);

    for (const action of actions) {
      if (isGameOver(this.state) || player.actionsRemaining <= 0) break;

      // Small delay so user can see what's happening
      await this.sleep(750);

      switch (action.type) {
        case 'MOVE': {
          const path = action.payload.path;
          if (path.length >= 2 && canPerformAction(player, 'move') && canAffordMovement(player, 1)) {
            const nextNode = path[1];
            spendBannersForMovement(player, 1);
            player.fellowship.currentNode = nextNode;
            player.actionsRemaining -= 1;

            // Artifact pickup
            if (this.state.artifactHolder === null && nextNode === this.state.artifactNode) {
              if (isArtifactAvailable(this.state)) claimArtifact(this.state, player.index);
            }

            // PvP Combat resolution
            if (this.state.mode !== 'cooperative') {
              for (const other of this.state.players) {
                if (other.index === player.index) continue;
                if (other.fellowship.currentNode !== nextNode) continue;
                if (!canPerformAction(player, 'combat')) break;

                const result = resolvePlayerCombat(this.state, player.index, other.index, 0, 0, this.rng);
                if (this.combatOverlay) {
                  await this.combatOverlay.showCombatResult(result, player, other, this.combatDelayMs);
                }
              }
            }
          }
          break;
        }
        case 'CLAIM': {
          const nodeId = action.payload.nodeId;
          const nodeState = this.state.boardState[nodeId];
          if (nodeState && nodeState.claimedBy === null && canPerformAction(player, 'claim') && canAffordClaim(player)) {
            spendBannersForClaim(player);
            nodeState.claimedBy = player.index;
            player.stats.strongholdsClaimed += 1;
            player.actionsRemaining -= 1;
          }
          break;
        }
        case 'PASS': {
          player.actionsRemaining -= 1;
          break;
        }
      }

      this.renderAll();
    }

    player.actionsRemaining = 0;
    this.resolveAction();
  }

  // ─── Tutorial Scripted Opponent ───────────────────────────────

  /**
   * Execute a scripted move path for a tutorial opponent.
   * Traverses the path nodes in order, spending banners per hop.
   * Triggers combat if the opponent lands on a player's node.
   */
  private runScriptedOpponent(playerIndex: number, path: readonly string[]): void {
    const player = this.state.players[playerIndex];
    if (!player || path.length < 2) {
      if (player) player.actionsRemaining = 0;
      return;
    }

    for (let i = 0; i < path.length - 1 && player.actionsRemaining > 0; i++) {
      const from = path[i];
      const to = path[i + 1];
      if (player.fellowship.currentNode !== from) continue;
      if (!canAffordMovement(player, 1) || !canPerformAction(player, 'move')) break;

      spendBannersForMovement(player, 1);
      player.fellowship.currentNode = to;
      player.actionsRemaining -= 1;

      // PvP combat if landing on another player
      if (this.state.mode !== 'cooperative') {
        for (const other of this.state.players) {
          if (other.index === playerIndex) continue;
          if (other.fellowship.currentNode !== to) continue;
          if (!canPerformAction(player, 'combat')) break;

          const result = resolvePlayerCombat(
            this.state, playerIndex, other.index, 0, 0, this.rng,
          );
          if (this.combatOverlay) {
            void this.combatOverlay.showCombatResult(
              result, player, other, this.combatDelayMs,
            );
          }

          // Turn 3 (index 2): combat with the player advances tutorial
          if (this.isTutorialMode && this.tutorialState.currentTurnIndex === 2) {
            this.advanceTutorialTurn();
          }
        }
      }
    }

    player.actionsRemaining = 0;
  }

  /** Advance to the next tutorial turn and refresh the overlay. */
  private advanceTutorialTurn(): void {
    const hasMore = this.tutorialState.advanceTurn();
    if (this.tutorialEngine && hasMore) {
      try {
        this.tutorialEngine.renderMandatoryStep(this.tutorialState);
      } catch { /* headless */ }
    }
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

    if (this.standingsPanel) {
      this.standingsPanel.update(this.state);
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
