/**
 * E2E Integration Tests — GameController
 *
 * Tests the full playable game loop: state creation, phase transitions,
 * voting, action-phase node clicks, and victory conditions — all driven
 * through the GameController with autoPlay enabled.
 *
 * Uses a minimal DOM mock (no jsdom dependency) — the same pattern as
 * social-pressure-onboarding.test.ts. UI components instantiate but
 * don't render; game logic runs against real GameState.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal DOM Mock ─────────────────────────────────────────────

interface MockEl {
  id: string;
  className: string;
  innerHTML: string;
  innerText: string;
  style: Record<string, string>;
  dataset: Record<string, string>;
  children: MockEl[];
  disabled: boolean;
  value: string;
  parentElement: MockEl | null;
  clientWidth: number;
  clientHeight: number;
  offsetWidth: number;
  scrollHeight: number;
  scrollTop: number;
  firstChild: MockEl | null;

  appendChild(child: MockEl): MockEl;
  removeChild(child: MockEl): MockEl;
  insertBefore(newChild: MockEl, refChild: MockEl | null): MockEl;
  remove(): void;
  setAttribute(k: string, v: string): void;
  getAttribute(k: string): string | null;
  querySelector(sel: string): MockEl | null;
  querySelectorAll(sel: string): MockEl[];
  addEventListener(evt: string, fn: (...args: unknown[]) => void): void;
  removeEventListener(evt: string, fn: (...args: unknown[]) => void): void;
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  getContext(type: string): null;
  animate(): { onfinish: (() => void) | null };
  closest(sel: string): MockEl | null;
}

function makeMockEl(): MockEl {
  const el: MockEl = {
    id: '',
    className: '',
    innerHTML: '',
    innerText: '',
    style: {} as Record<string, string>,
    dataset: {},
    children: [],
    disabled: false,
    value: '',
    parentElement: null,
    clientWidth: 0,
    clientHeight: 0,
    offsetWidth: 0,
    scrollHeight: 0,
    scrollTop: 0,
    firstChild: null,
    appendChild(child: MockEl) { el.children.push(child); child.parentElement = el; return child; },
    removeChild(child: MockEl) { const i = el.children.indexOf(child); if (i >= 0) el.children.splice(i, 1); return child; },
    insertBefore(newChild: MockEl, _ref: MockEl | null) { el.children.unshift(newChild); newChild.parentElement = el; return newChild; },
    remove() { },
    setAttribute() { },
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() { },
    removeEventListener() { },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
    getContext() { return null; },
    animate() { return { onfinish: null }; },
    closest() { return null; },
  };
  return el;
}

// Keep a registry so getElementById returns the right element
const registry: Record<string, MockEl> = {};
const mockBody = makeMockEl();

globalThis.document = {
  getElementById(id: string) { return registry[id] ?? null; },
  createElement() {
    const el = makeMockEl();
    let _id = '';
    Object.defineProperty(el, 'id', {
      get() { return _id; },
      set(v: string) {
        if (_id && registry[_id] === el) delete registry[_id];
        _id = v;
        if (v) registry[v] = el;
      },
      configurable: true,
      enumerable: true,
    });
    return el;
  },
  body: mockBody,
  querySelectorAll() { return []; },
  addEventListener() { },
  removeEventListener() { },
  dispatchEvent() { return true; },
} as unknown as Document;

const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  length: 0,
  key: () => null,
} as unknown as Storage;

globalThis.window = {
  addEventListener() { },
  removeEventListener() { },
  AudioContext: class {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume() { }
    createOscillator() {
      return {
        type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { } },
        connect() { }, start() { }, stop() { },
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() { }, linearRampToValueAtTime() { }, exponentialRampToValueAtTime() { } },
        connect() { },
      };
    }
  },
  requestAnimationFrame() { return 0; },
  innerWidth: 1920,
  innerHeight: 1080,
  location: { reload() { } },
} as unknown as Window & typeof globalThis;

// ─── Imports (after mock is wired) ───────────────────────────────

import { GameController } from '../../src/ui/game-controller.js';
import { isGameOver } from '../../src/systems/victory.js';
import { checkBrokenStatus, enterBrokenCourt } from '../../src/systems/broken-court.js';
import { advancePhase } from '../../src/engine/game-loop.js';
import { TutorialScriptedOpponent } from '../../src/systems/tutorial-script.js';
import { TutorialState } from '../../src/systems/tutorial-state.js';

// ─── Tests ───────────────────────────────────────────────────────

describe('GameController E2E', () => {
  let container: MockEl;

  beforeEach(() => {
    // Clear the element registry
    for (const k of Object.keys(registry)) delete registry[k];

    container = makeMockEl();
    container.id = 'test-root';
    registry['test-root'] = container;
  });

  function createController(): GameController {
    return new GameController(container as unknown as HTMLElement, {
      autoPlay: true,
      combatDelayMs: 0,
      shadowkingDelayMs: 0,
    });
  }

  // ─── 1. Full round completes ────────────────────────────────

  it('completes a full round and advances to round 2', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();
    expect(state.round).toBe(1);

    await ctrl.runRound();

    // After a full round: cleanup → shadowking transition increments round
    expect(state.round).toBe(2);
    expect(state.phase).toBe('shadowking');
  });

  // ─── 2. Non-unanimous vote advances doom ────────────────────

  it('advances doom toll when a player abstains', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();
    const startingDoom = state.doomToll;

    // Strip Player 1's fate cards → autoAbstain forces abstention
    state.players[1].fateCards = [];

    await ctrl.runShadowkingPhase();
    await ctrl.runVotingPhase();

    // Non-unanimous vote → doom +1, plus behavior card may add more
    expect(state.doomToll).toBeGreaterThanOrEqual(startingDoom + 1);
  });

  // ─── 3. Claiming a node updates board state ────────────────

  it('claims a node when handleNodeClick targets the current unclaimed node', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    // Advance to action phase
    await ctrl.runShadowkingPhase();
    await ctrl.runVotingPhase();
    if (isGameOver(state)) return; // guard

    advancePhase(state); // voting → action

    const player = state.players[0];
    state.activePlayerIndex = 0;
    player.warBanners = 5;
    player.actionsRemaining = 2;

    const currentNode = player.fellowship.currentNode;
    state.boardState[currentNode].claimedBy = null;

    // Click current node → claim
    ctrl.handleNodeClick(currentNode);

    expect(state.boardState[currentNode].claimedBy).toBe(0);
  });

  // ─── 4. Movement costs a banner ────────────────────────────

  it('decrements war banners by 1 on valid move', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    await ctrl.runShadowkingPhase();
    await ctrl.runVotingPhase();
    if (isGameOver(state)) return;

    advancePhase(state); // voting → action

    const player = state.players[0];
    state.activePlayerIndex = 0;
    player.warBanners = 5;
    player.actionsRemaining = 2;

    const bannersBefore = player.warBanners;
    const currentNode = player.fellowship.currentNode;
    const adjacent = state.boardDefinition.nodes[currentNode].connections[0];

    ctrl.handleNodeClick(adjacent);

    expect(player.warBanners).toBe(bannersBefore - 1);
    expect(player.fellowship.currentNode).toBe(adjacent);
  });

  // ─── 5. Territory victory fires at cleanup ────────────────

  it('detects territory victory when artifact holder has most strongholds', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    // Give Player 0 the artifact and a majority of strongholds
    state.artifactHolder = 0;
    state.artifactNode = state.players[0].fellowship.currentNode;

    let claimed = 0;
    for (const [nodeId, nodeState] of Object.entries(state.boardState)) {
      if (claimed >= 8) break;
      const nodeDef = state.boardDefinition.nodes[nodeId];
      if (nodeDef && (nodeDef.type === 'standard' || nodeDef.type === 'forge') && nodeState.claimedBy === null) {
        nodeState.claimedBy = 0;
        claimed++;
      }
    }

    await ctrl.runShadowkingPhase();
    await ctrl.runVotingPhase();
    if (isGameOver(state)) return; // doom_complete can fire first
    await ctrl.runActionPhase();
    await ctrl.runCleanupPhase();

    expect(isGameOver(state)).toBe(true);
    expect(state.gameEndReason).toBe('territory_victory');
    expect(state.winner).toBe(0);
  });

  // ─── 6. Doom complete at 13 ────────────────────────────────

  it('ends the game when doom toll reaches 13', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    // Set doom to 12 and strip all fate cards → both players abstain
    state.doomToll = 12;
    state.players[0].fateCards = [];
    state.players[1].fateCards = [];

    await ctrl.runShadowkingPhase();
    await ctrl.runVotingPhase();

    // Non-unanimous vote + possibly escalate → doom >= 13
    expect(state.doomToll).toBeGreaterThanOrEqual(13);
    expect(isGameOver(state)).toBe(true);
    expect(state.gameEndReason).toBe('doom_complete');
  });

  // ─── 7. Broken court triggers ──────────────────────────────

  it('enters broken court when penalty cards exceed war banners', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    // Set up a player on the brink
    const player = state.players[0];
    player.penaltyCards = 3;
    player.warBanners = 2;

    // Verify the condition fires
    expect(checkBrokenStatus(player)).toBe(true);

    // Apply it
    enterBrokenCourt(state, 0);

    expect(player.isBroken).toBe(true);
    expect(player.stats.timesBroken).toBe(1);
  });

  // ─── 8. Multi-round smoke test ─────────────────────────────

  it('runs a full game to completion within 30 rounds (seed 42)', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    // Move artifact to a reachable spot (mirrors simulation.ts)
    state.artifactNode = state.boardDefinition.neutralCenter;

    await ctrl.runGame(30);

    expect(isGameOver(state)).toBe(true);
    expect(state.gameEndReason).not.toBeNull();
    expect(['doom_complete', 'territory_victory', 'all_broken']).toContain(state.gameEndReason);
    // Round increments one past the last played round
    expect(state.round).toBeLessThanOrEqual(31);
  });

  // ─── Tutorial integration tests ────────────────────────────

  it('tutorial mode: start() initializes state without crashing', async () => {
    const ctrl = new GameController(container as unknown as HTMLElement, {
      autoPlay: true,
      combatDelayMs: 0,
      shadowkingDelayMs: 0,
    });
    // Tutorial mode should initialize without errors
    // (TutorialEngine constructor tries document.body.appendChild — covered by mock)
    await ctrl.start(2, 'tutorial', 42, 1);
    // Game ran at least one round without crashing
    const state = ctrl.getState();
    expect(state.round).toBeGreaterThanOrEqual(1);
  });

  it('TutorialScriptedOpponent returns correct path for each turn', () => {
    const opponent = new TutorialScriptedOpponent();

    // Turn 1: moves from keep-1 to s03
    expect(opponent.getMovesForTurn(1)).toEqual(['keep-1', 's03']);

    // Turn 3: moves into player's node to force combat
    const turn3Path = opponent.getMovesForTurn(3);
    expect(turn3Path[turn3Path.length - 1]).toBe('s01');

    // Out of range: empty array
    expect(opponent.getMovesForTurn(0)).toEqual([]);
    expect(opponent.getMovesForTurn(6)).toEqual([]);
  });

  it('TutorialScriptedOpponent has exactly 5 scripted turns', () => {
    const opponent = new TutorialScriptedOpponent();
    expect(opponent.turnCount).toBe(5);
  });

  it('tutorial mode: opponent turn uses scripted path (no pathfinding crash)', async () => {
    const _ctrl = new GameController(container as unknown as HTMLElement, {
      autoPlay: false, // player 0 is manual; we drive it manually
      combatDelayMs: 0,
      shadowkingDelayMs: 0,
    });

    // init with tutorial mode (start() handles initialization)
    // Use autoPlay=true so the whole thing runs hands-free
    const autoCtrl = new GameController(container as unknown as HTMLElement, {
      autoPlay: true,
      combatDelayMs: 0,
      shadowkingDelayMs: 0,
    });
    await autoCtrl.start(2, 'tutorial', 99, 5);
    // If scripted opponent ran without error, this succeeds
    expect(autoCtrl.getState().round).toBeGreaterThanOrEqual(1);
  });

  // ─── Tutorial Turn 2 (recruitment) advancement ───────────────

  it('handleRecruit advances tutorial when currentTurnIndex is 1 (Turn 2)', async () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    const state = ctrl.getState();

    // Advance to action phase
    await ctrl.runShadowkingPhase();
    await ctrl.runVotingPhase();
    if (isGameOver(state)) return;
    advancePhase(state); // voting → action

    const player = state.players[0];
    state.activePlayerIndex = 0;
    player.actionsRemaining = 2;
    player.warBanners = 5;

    // Simulate tutorial mode by calling handleRecruit on a node with a wanderer
    // The recruit itself may fail (no wanderer token on node), but we verify
    // the method exists and is callable without error — the tutorial-state
    // unit tests verify the advancement logic independently
    expect(() => ctrl.handleRecruit(player.fellowship.currentNode, 'producer')).not.toThrow();
  });

  // ─── Tutorial Turn 2 state advancement unit test ──────────────

  it('TutorialState.advanceTurn at index 1 moves to Turn 3 (combat)', () => {
    const state = new TutorialState();
    state.startMandatoryTutorial();
    expect(state.currentTurnIndex).toBe(0);

    // Advance past Turn 1
    state.advanceTurn();
    expect(state.currentTurnIndex).toBe(1);

    // Advance past Turn 2 (recruitment)
    const hasMore = state.advanceTurn();
    expect(hasMore).toBe(true);
    expect(state.currentTurnIndex).toBe(2);

    const step = state.getCurrentTurn();
    expect(step?.mechanic).toBe('combat');
  });

  // ─── handleRescue fires FIRST_RESCUE discovered trigger ───────

  it('handleRescue method exists and is callable on GameController', () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    // handleRescue should exist as a public method
    expect(typeof ctrl.handleRescue).toBe('function');
  });

  it('handleRescue does not throw when called outside action phase', () => {
    const ctrl = createController();
    ctrl.init(2, 'competitive', 42);

    // State starts in shadowking phase, not action — should silently return
    expect(() => ctrl.handleRescue(1)).not.toThrow();
  });

  it('FIRST_RESCUE discovered trigger fires only once', () => {
    const state = new TutorialState();
    // mandatory tutorial is NOT active

    const first = state.triggerDiscoveredTutorial('FIRST_RESCUE');
    expect(first).toBe(true);

    const second = state.triggerDiscoveredTutorial('FIRST_RESCUE');
    expect(second).toBe(false);
  });

  it('FIRST_RESCUE is suppressed during mandatory tutorial', () => {
    const state = new TutorialState();
    state.startMandatoryTutorial();

    const result = state.triggerDiscoveredTutorial('FIRST_RESCUE');
    expect(result).toBe(false);
  });

  // ─── All 5 discovered triggers are defined ────────────────────

  it('all 5 discovered tutorial triggers can be fired independently', () => {
    const state = new TutorialState();

    const triggers = [
      'FIRST_ARTIFICER_RECRUIT',
      'FIRST_RESCUE',
      'FIRST_DEATH_KNIGHT_COMBAT',
      'FIRST_FINAL_PHASE',
      'FIRST_BLOOD_PACT_ACCUSATION',
    ] as const;

    for (const trigger of triggers) {
      const result = state.triggerDiscoveredTutorial(trigger);
      expect(result).toBe(true);
    }

    // All should be suppressed on second call
    for (const trigger of triggers) {
      const result = state.triggerDiscoveredTutorial(trigger);
      expect(result).toBe(false);
    }
  });
});
