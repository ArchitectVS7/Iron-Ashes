import { createGameState, advancePhase, startRound } from '../src/engine/game-loop.js';
import { simulatePlayerAction } from '../src/engine/simulation.js';
import { SeededRandom } from '../src/utils/seeded-random.js';
import { isGameOver, checkVictoryConditions } from '../src/systems/victory.js';
import { submitVote, resolveVotes, autoAbstainPlayers, canVote } from '../src/systems/voting.js';
import { resolveBehaviorCard } from '../src/systems/shadowking.js';
import { performBlightAutoSpread, isInFinalPhase } from '../src/systems/doom-toll.js';
import { checkBrokenStatus, enterBrokenCourt } from '../src/systems/broken-court.js';
import { spendBannersForMovement, spendBannersForClaim, canAffordMovement, canAffordClaim } from '../src/systems/resources.js';
import { findNearest, findShortestPath } from '../src/utils/pathfinding.js';
import { getStandardNodes } from '../src/models/board.js';
import { claimArtifact, isArtifactAvailable } from '../src/systems/victory.js';
import { resolvePlayerCombat, resolveShadowkingCombat } from '../src/systems/combat.js';
import * as fs from 'fs';

let state: any = null;
let rng: SeededRandom = new SeededRandom(1);
const AGENT_INDEX = 0; // We train Player 0 to win
let ALL_NODES: string[] = [];

function getNodeId(nodeIdStr: string | null) {
  if (!nodeIdStr) return 0;
  const idx = ALL_NODES.indexOf(nodeIdStr);
  return idx >= 0 ? idx : 0;
}

function getDistance(from: string, to: string): number {
  if (from === to) return 0;
  const path = findShortestPath(state.boardDefinition, from, to);
  return path ? path.length - 1 : 20;
}

function getNearestUnclaimedDistance(from: string): number {
  const unclaimed = getStandardNodes(state.boardDefinition).filter(n => state.boardState[n].claimedBy === null);
  if (unclaimed.length === 0) return 20;
  const nearest = findNearest(state.boardDefinition, from, unclaimed);
  return nearest ? nearest.distance : 20;
}

function advanceToAgentTurn() {
  if (isGameOver(state)) return;
  
  while ((state.phase !== 'action' || state.activePlayerIndex !== AGENT_INDEX) && !isGameOver(state)) {
    if (state.phase === 'shadowking') {
      startRound(state);
      advancePhase(state); // shadowking -> voting
      autoAbstainPlayers(state);
      for (const player of state.players) {
        if (state.votes[player.index] === null) {
          const voteInfo = canVote(player, state);
          const willAbstainStrategically = rng.chance(0.04);
          const choice = (voteInfo.canCounter && !willAbstainStrategically) ? 'counter' : 'abstain';
          submitVote(state, player.index, choice as 'counter' | 'abstain');
        }
      }
      const voteResult = resolveVotes(state);
      if (state.currentBehaviorCard) {
        resolveBehaviorCard(state, rng, voteResult.blocked);
      }
      if (isInFinalPhase(state)) {
        performBlightAutoSpread(state, rng);
      }
      checkVictoryConditions(state, rng);
      if (isGameOver(state)) return;
      advancePhase(state); // voting -> action
    } else if (state.phase === 'action') {
      // It's another player's turn, simulate them
      simulatePlayerAction(state, state.activePlayerIndex, rng);
      const player = state.players[state.activePlayerIndex];
      if (!player.isBroken && checkBrokenStatus(player)) {
        enterBrokenCourt(state, state.activePlayerIndex);
      }
      checkVictoryConditions(state, rng);
      if (isGameOver(state)) return;
      
      // Manually advance activePlayerIndex based on turnOrder
      const currentOrderIndex = state.turnOrder.indexOf(state.activePlayerIndex);
      if (currentOrderIndex + 1 < state.turnOrder.length) {
        state.activePlayerIndex = state.turnOrder[currentOrderIndex + 1];
      } else {
        advancePhase(state); // action -> cleanup
      }
    } else if (state.phase === 'cleanup') {
      checkVictoryConditions(state, rng);
      if (isGameOver(state)) return;
      advancePhase(state); // cleanup -> shadowking
    }
  }
}

function processAction(actionId: number) {
  const player = state.players[AGENT_INDEX];
  let currentNode = player.fellowship.currentNode;
  const definition = state.boardDefinition;

  const prevDistance = getDistance(currentNode, state.artifactNode);
  const prevUnclaimedDist = getNearestUnclaimedDistance(currentNode);
  const prevStrongholds = player.stats.strongholdsClaimed;
  const bannersBefore = player.warBanners;
  let invalidAction = false;

  // ACTION MAP:
  // 0 = Wait / Pass
  // 1 = Move to artifact
  // 2 = Claim artifact
  // 3 = Move to nearest unclaimed node
  // 4 = Claim current node

  if (actionId === 0) {
    player.actionsRemaining = 0; // End turn
  } else if (actionId === 1) {
    if (currentNode !== state.artifactNode && canAffordMovement(player, 1)) {
      const path = findShortestPath(definition, currentNode, state.artifactNode);
      if (path && path.length >= 2) {
        spendBannersForMovement(player, 1);
        const nextNode = path[1];
        player.fellowship.currentNode = nextNode;
        player.actionsRemaining -= 1;
        
        // Resolve Combat
        for (const other of state.players) {
          if (other.index !== AGENT_INDEX && other.fellowship.currentNode === nextNode) {
             resolvePlayerCombat(state, AGENT_INDEX, other.index, 0, 0, rng);
          }
        }
        const forcesAtNode = state.antagonistForces.filter(f => f.currentNode === nextNode);
        for (const force of forcesAtNode) {
          const stillExists = state.antagonistForces.some(f => f.id === force.id);
          if (stillExists && !player.isBroken) {
             resolveShadowkingCombat(state, AGENT_INDEX, force.id, 0, rng);
          }
        }
      } else { invalidAction = true; player.actionsRemaining -= 1; }
    } else { invalidAction = true; player.actionsRemaining -= 1; }
  } else if (actionId === 2) {
    if (isArtifactAvailable(state) && currentNode === state.artifactNode) {
      claimArtifact(state, AGENT_INDEX);
      player.actionsRemaining -= 1;
    } else { invalidAction = true; player.actionsRemaining -= 1; }
  } else if (actionId === 3) {
    const unclaimedNodes = getStandardNodes(definition).filter(n => state.boardState[n].claimedBy === null);
    if (unclaimedNodes.length > 0 && canAffordMovement(player, 1)) {
      const nearest = findNearest(definition, currentNode, unclaimedNodes);
      if (nearest && nearest.distance > 0) {
        const path = findShortestPath(definition, currentNode, nearest.nodeId);
        if (path && path.length >= 2) {
          spendBannersForMovement(player, 1);
          const nextNode = path[1];
          player.fellowship.currentNode = nextNode;
          player.actionsRemaining -= 1;
          
          // Resolve Combat
          for (const other of state.players) {
            if (other.index !== AGENT_INDEX && other.fellowship.currentNode === nextNode) {
               resolvePlayerCombat(state, AGENT_INDEX, other.index, 0, 0, rng);
            }
          }
          for (const force of state.antagonistForces) {
            if (force.currentNode === nextNode) {
               resolveShadowkingCombat(state, AGENT_INDEX, force.id, 0, rng);
            }
          }
        } else { invalidAction = true; player.actionsRemaining -= 1; }
      } else { invalidAction = true; player.actionsRemaining -= 1; }
    } else { invalidAction = true; player.actionsRemaining -= 1; }
  } else if (actionId === 4) {
    if (state.boardState[currentNode].claimedBy === null && canAffordClaim(player)) {
      spendBannersForClaim(player);
      state.boardState[currentNode].claimedBy = AGENT_INDEX;
      player.stats.strongholdsClaimed += 1;
      player.actionsRemaining -= 1;
    } else { invalidAction = true; player.actionsRemaining -= 1; }
  }

  const currentDistance = getDistance(player.fellowship.currentNode, state.artifactNode);
  const currentUnclaimedDist = getNearestUnclaimedDistance(player.fellowship.currentNode);
  const currentStrongholds = player.stats.strongholdsClaimed;
  const deltaStrongholds = player.stats.strongholdsClaimed - prevStrongholds;
  
  let stepReward = -0.1; // Default penalty for taking time
  stepReward += deltaStrongholds * 10.0;

  if (prevArtifactHolder === null && state.artifactHolder === AGENT_INDEX) {
    stepReward += 50.0;
  }

  // Anti-cowardice penalty for taking time
  if (invalidAction) stepReward -= 0.5; // Reduced from 1.0 so it isn't paralyzed by fear
  
  // Anti-cowardice: penalize passing if we still had banners to spend
  if (actionId === 0 && bannersBefore > 0) stepReward -= 1.0;
  
  // Phase 1: Expand Territory
  if (currentStrongholds < 4) {
    if (currentUnclaimedDist < prevUnclaimedDist) stepReward += 1.0;
  } 
  // Phase 2: Claim the Throne
  else {
    if (currentDistance < prevDistance) stepReward += 2.0;
  }
  
  if (currentStrongholds > prevStrongholds) stepReward += 10.0;
  
  if (state.winner === AGENT_INDEX) stepReward += 100.0;
  
  state.ml_reward = stepReward;

  // If actions exhausted, advance phase for player 0
  if (player.actionsRemaining <= 0) {
    const currentOrderIndex = state.turnOrder.indexOf(state.activePlayerIndex);
    if (currentOrderIndex + 1 < state.turnOrder.length) {
      state.activePlayerIndex = state.turnOrder[currentOrderIndex + 1];
    } else {
      advancePhase(state); // action -> cleanup
    }
    advanceToAgentTurn();
  }
}

// Subprocess standard I/O listener
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  const commands = chunk.trim().split('\n');
  for (const cmdStr of commands) {
    if (!cmdStr) continue;
    try {
      const cmd = JSON.parse(cmdStr);
      if (cmd.command === 'reset') {
        const seed = Math.floor(Math.random() * 1000000);
        rng = new SeededRandom(seed);
        state = createGameState(4, 'competitive', seed);
        ALL_NODES = Object.keys(state.boardDefinition.nodes).sort();
        state.artifactNode = state.boardDefinition.neutralCenter; // Simulation artifact placement
        advanceToAgentTurn();
        
        state.agent = state.players[AGENT_INDEX];
        state.ml_agent_node_id = getNodeId(state.agent.fellowship.currentNode);
        state.ml_artifact_node_id = getNodeId(state.artifactNode);
        state.ml_distance_to_artifact = getDistance(state.agent.fellowship.currentNode, state.artifactNode);
        state.ml_distance_to_nearest_unclaimed = getNearestUnclaimedDistance(state.agent.fellowship.currentNode);
        state.ml_reward = 0;
        
        process.stdout.write(JSON.stringify({ state, done: false, info: {} }) + '\n');
      } else if (cmd.command === 'step') {
        processAction(cmd.action_id);
        
        const terminated = isGameOver(state);
        const truncated = state.round > 50;
        
        state.agent = state.players[AGENT_INDEX];
        state.ml_agent_node_id = getNodeId(state.agent.fellowship.currentNode);
        state.ml_artifact_node_id = getNodeId(state.artifactNode);
        state.ml_distance_to_artifact = getDistance(state.agent.fellowship.currentNode, state.artifactNode);
        state.ml_distance_to_nearest_unclaimed = getNearestUnclaimedDistance(state.agent.fellowship.currentNode);
        
        // Reward mapping (UGT parses from state, but bridge passes it back just in case)
        process.stdout.write(JSON.stringify({ 
          state, 
          terminated,
          truncated,
          info: { winner: state.winner, reason: state.gameEndReason } 
        }) + '\n');
      } else if (cmd.command === 'close') {
        process.exit(0);
      }
    } catch (err) {
      console.error("UGT Bridge Error parsing command:", err);
    }
  }
});
