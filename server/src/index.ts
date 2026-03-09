import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';

// Types
import { GameState, VoteChoice } from '../../src/models/game-state.js';
import { AIDifficulty } from '../../src/models/player.js';
import { PlayerAction } from '../../src/systems/ai-player.js';
// Engine
import { createGameState, startRound, advancePhase, advanceActionTurn } from '../../src/engine/game-loop.js';
import { AIPlayer } from '../../src/systems/ai-player.js';
import { assignBloodPact } from '../../src/systems/game-modes.js';
import { spendBannersForMovement, canAffordMovement, spendBannersForClaim, canAffordClaim } from '../../src/systems/resources.js';
import { canPerformAction, checkBrokenStatus, enterBrokenCourt } from '../../src/systems/broken-court.js';
import { claimArtifact, isArtifactAvailable, checkVictoryConditions, isGameOver } from '../../src/systems/victory.js';
import { resolvePlayerCombat } from '../../src/systems/combat.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import { submitVote, resolveVotes, autoAbstainPlayers } from '../../src/systems/voting.js';
import { resolveBehaviorCard } from '../../src/systems/shadowking.js';
import { isInFinalPhase, performBlightAutoSpread } from '../../src/systems/doom-toll.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ─── Session Store ──────────────────────────────────────────────────
// For local dev, we store sessions in memory.
// PRD dictates Postgres, but we use this until DB connection logic is added.

interface Session {
    id: string;
    state: GameState;
    clients: Map<string, WebSocket>; // playerId -> socket
    disconnectTimers: Map<string, NodeJS.Timeout>;
    aiPlayers: Map<string, AIPlayer>;
}

const sessions = new Map<string, Session>();

// PRD F-014: 90 second reconnect window
const RECONNECT_WINDOW_MS = 90000;

// ─── Message Interfaces ─────────────────────────────────────────────

type ClientMessage =
    | { type: 'RECONNECT'; payload: { sessionId: string; playerId: string } }
    | { type: 'ACTION'; payload: PlayerAction; roundNumber: number }
    | { type: 'VOTE'; payload: { choice: VoteChoice }; roundNumber: number }
    | { type: 'PING'; payload: { timestamp: number } };

// ─── WebSocket Logic ────────────────────────────────────────────────

wss.on('connection', (ws: WebSocket) => {
    let activeSessionId: string | null = null;
    let activePlayerId: string | null = null;

    ws.on('message', (data: string) => {
        try {
            const msg = JSON.parse(data.toString()) as ClientMessage;

            switch (msg.type) {
                case 'PING':
                    ws.send(JSON.stringify({ type: 'PONG', payload: { serverTimestamp: Date.now(), clientTimestamp: msg.payload.timestamp } }));
                    break;

                case 'RECONNECT': {
                    const { sessionId, playerId } = msg.payload;
                    const session = sessions.get(sessionId);

                    if (!session) {
                        ws.send(JSON.stringify({ type: 'SESSION_ENDED', payload: { reason: 'Session not found' } }));
                        ws.close();
                        return;
                    }

                    // Clear any pending AI fill timer
                    const timer = session.disconnectTimers.get(playerId);
                    if (timer) {
                        clearTimeout(timer);
                        session.disconnectTimers.delete(playerId);
                    }

                    activeSessionId = sessionId;
                    activePlayerId = playerId;

                    // Re-register the socket for this player
                    session.clients.set(playerId, ws);

                    // If the game hasn't started yet (currentBehaviorCard is null and round=1), start it
                    if (session.state.phase === 'shadowking' && session.state.currentBehaviorCard === null) {
                        processTurn(session);
                    } else {
                        // Just send current state
                        const sanitizedState = getSanitizedStateForPlayer(session.state, playerId);
                        ws.send(JSON.stringify({ type: 'FULL_STATE', payload: sanitizedState }));
                    }

                    // Notify others
                    broadcast(session, { type: 'PLAYER_RECONNECTED', payload: { playerId } }, playerId);
                    break;
                }

                case 'ACTION': {
                    if (!activeSessionId || !activePlayerId) return;
                    const session = sessions.get(activeSessionId);
                    if (!session) return;

                    const action = msg.payload as PlayerAction;
                    applyAction(session, activePlayerId, action);

                    // After human action, process turn (to advance to next player or phase)
                    processTurn(session);
                    break;
                }

                case 'VOTE': {
                    if (!activeSessionId || !activePlayerId) return;
                    const session = sessions.get(activeSessionId);
                    if (!session) return;

                    const choice = msg.payload.choice;
                    const state = session.state;

                    // We allow voting if the player cast a vote and phase is voting
                    if (state.phase !== 'voting') return;

                    const playerIndex = parseInt(activePlayerId, 10);
                    if (state.votes[playerIndex] === null) {
                        submitVote(state, playerIndex, choice as VoteChoice);
                        broadcast(session, { type: 'STATE_UPDATE', payload: state });
                        processTurn(session); // See if everyone has voted, including AI
                    }
                    break;
                }
            }
        } catch (e) {
            console.error('Failed to parse message', e);
        }
    });

    ws.on('close', () => {
        if (activeSessionId && activePlayerId) {
            const session = sessions.get(activeSessionId);
            if (session) {
                // Only trigger disconnect if this exact socket is the one registered
                if (session.clients.get(activePlayerId) === ws) {
                    session.clients.delete(activePlayerId);

                    broadcast(session, { type: 'PLAYER_DISCONNECTED', payload: { playerId: activePlayerId, reconnectWindowMs: RECONNECT_WINDOW_MS } });

                    // Start the 90s disconnect timer to auto-fill with AI (PRD requirement)
                    const timerId = setTimeout(() => {
                        handlePlayerTimeout(session, activePlayerId!);
                    }, RECONNECT_WINDOW_MS);

                    session.disconnectTimers.set(activePlayerId, timerId);
                }
            }
        }
    });
});

function broadcast(session: Session, message: any, excludePlayerId?: string) {
    if (message.type === 'STATE_UPDATE' || message.type === 'FULL_STATE') {
        const state = message.payload as GameState;
        for (const [playerId, ws] of session.clients.entries()) {
            if (playerId !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
                const sanitizedState = getSanitizedStateForPlayer(state, playerId);
                ws.send(JSON.stringify({ ...message, payload: sanitizedState }));
            }
        }
    } else {
        const data = JSON.stringify(message);
        for (const [playerId, ws] of session.clients.entries()) {
            if (playerId !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
}

function getSanitizedStateForPlayer(state: GameState, playerId: string): GameState {
    if (state.mode !== 'blood_pact') return state;

    const players = state.players.map(p => {
        if (p.bloodPactRevealed) return p;
        if (p.index.toString() !== playerId) {
            return { ...p, hasBloodPact: false };
        }
        return p;
    });

    return { ...state, players };
}

function handlePlayerTimeout(session: Session, playerId: string) {
    session.disconnectTimers.delete(playerId);

    // PRD: Fill with Knight-Commander AI
    const playerState = session.state.players.find(p => p.index.toString() === playerId);
    if (playerState) {
        const mutablePlayer = playerState as any;
        mutablePlayer.type = 'ai';
        mutablePlayer.aiDifficulty = 'knight_commander';

        broadcast(session, {
            type: 'AI_FILLING_SLOT',
            payload: { playerId, difficulty: 'knight_commander' }
        });
        broadcast(session, { type: 'FULL_STATE', payload: session.state });
    }
}

// ─── REST Endpoints ─────────────────────────────────────────────────

app.use(express.json());

app.post('/api/host', (req, res) => {
    const { mode, playerCount, aiCount, seed } = req.body;
    const sessionId = "session-" + Math.random().toString(36).substring(2, 9);

    // We use our existing engine logic!
    const state = createGameState(playerCount, mode, parseInt(seed) || Date.now());

    if (mode === 'blood_pact') {
        const rng = new SeededRandom(state.seed);
        assignBloodPact(state, rng);
    }

    const aiPlayers = new Map<string, AIPlayer>();
    for (const p of state.players) {
        if (p.type === 'ai' && p.aiDifficulty) {
            // Give AI a distinct deterministic seed
            const aiSeed = state.seed ^ (p.index * 0x8a9b1c2d);
            aiPlayers.set(p.index.toString(), new AIPlayer(p.aiDifficulty, aiSeed));
        }
    }

    sessions.set(sessionId, {
        id: sessionId,
        state,
        clients: new Map(),
        disconnectTimers: new Map(),
        aiPlayers,
    });

    res.json({ sessionId });
});

// ─── Turn Processor ──────────────────────────────────────────────────

async function processTurn(session: Session) {
    const state = session.state;

    if (state.phase === 'shadowking') {
        startRound(state);
        broadcast(session, { type: 'STATE_UPDATE', payload: state });

        setTimeout(() => {
            advancePhase(state); // -> voting
            broadcast(session, { type: 'STATE_UPDATE', payload: state });
            // Immediately kick off voting AI logic or auto-abstains
            processTurn(session);
        }, 2000);
        return;
    }

    if (state.phase === 'voting') {
        const rng = new SeededRandom(state.seed);

        let aiVoted = false;
        // Let AI vote if they haven't
        for (const player of state.players) {
            if (player.type === 'ai' && state.votes[player.index] === null && state.currentBehaviorCard) {
                const ai = session.aiPlayers?.get(player.index.toString());
                if (ai) {
                    aiVoted = true;
                    // For AI vote, we don't await because AI logic doesn't strictly need await here, 
                    // but since getVote is async we will await it.
                    const choice = await ai.getVote(state, player, state.currentBehaviorCard.type);
                    submitVote(state, player.index, choice === 'COUNTER' ? 'counter' : 'abstain');
                }
            }
        }

        autoAbstainPlayers(state);

        const allVoted = state.players.every(p => state.votes[p.index] !== null);

        if (allVoted) {
            const voteResult = resolveVotes(state);

            if (state.currentBehaviorCard) {
                resolveBehaviorCard(state, rng, voteResult.blocked);
            }

            if (isInFinalPhase(state)) {
                performBlightAutoSpread(state, rng);
            }

            checkVictoryConditions(state, rng);

            if (!isGameOver(state)) {
                advancePhase(state); // -> action
                broadcast(session, { type: 'STATE_UPDATE', payload: state });
                processTurn(session); // Start first action turn
            } else {
                broadcast(session, { type: 'STATE_UPDATE', payload: state });
            }
        } else if (aiVoted) {
            broadcast(session, { type: 'STATE_UPDATE', payload: state });
        }
    } else if (state.phase === 'action') {
        if (isGameOver(state)) return;

        const player = state.players[state.activePlayerIndex];
        if (player.actionsRemaining <= 0) {
            const turnComplete = state.players.every(p => p.actionsRemaining <= 0);

            if (turnComplete) {
                advancePhase(state); // -> cleanup
                checkVictoryConditions(state, new SeededRandom(state.seed));
                if (!isGameOver(state)) {
                    advancePhase(state); // -> shadowking
                    broadcast(session, { type: 'STATE_UPDATE', payload: state });

                    setTimeout(() => {
                        processTurn(session); // kick off new round
                    }, 500);
                } else {
                    broadcast(session, { type: 'STATE_UPDATE', payload: state });
                }
            } else {
                advanceActionTurn(state);
                broadcast(session, { type: 'STATE_UPDATE', payload: state });
                processTurn(session);
            }
            return;
        }

        if (player.type === 'ai') {
            const ai = session.aiPlayers?.get(player.index.toString());
            if (ai) {
                const actions = await ai.getActions(state, player);
                if (actions.length > 0) {
                    const action = actions[0];
                    applyAction(session, player.index.toString(), action); // applies exactly 1 action, reduces remaining by 1
                    // Wait a bit before next AI action
                    setTimeout(() => processTurn(session), 800);
                } else {
                    player.actionsRemaining = 0;
                    applyAction(session, player.index.toString(), { type: 'PASS', payload: {} });
                    processTurn(session);
                }
            } else {
                // Fallback if AI somehow not initialized
                player.actionsRemaining = 0;
                processTurn(session);
            }
        }
    }
}

function applyAction(session: Session, playerId: string, action: PlayerAction) {
    const state = session.state;
    const player = state.players.find(p => p.index.toString() === playerId);

    if (!player || player.actionsRemaining <= 0 || state.phase !== 'action') return;

    const rng = new SeededRandom(state.seed);

    switch (action.type) {
        case 'MOVE': {
            const path = action.payload.path;
            if (path.length >= 2 && canPerformAction(player, 'move') && canAffordMovement(player, 1)) {
                const nextNode = path[1];
                spendBannersForMovement(player, 1);
                player.fellowship.currentNode = nextNode;
                player.actionsRemaining -= 1;

                if (state.artifactHolder === null && nextNode === state.artifactNode) {
                    if (isArtifactAvailable(state)) claimArtifact(state, player.index);
                }

                if (state.mode !== 'cooperative') {
                    for (const other of state.players) {
                        if (other.index === player.index) continue;
                        if (other.fellowship.currentNode !== nextNode) continue;
                        if (!canPerformAction(player, 'combat')) break;
                        resolvePlayerCombat(state, player.index, other.index, 0, 0, rng);
                    }
                }

                if (!player.isBroken && checkBrokenStatus(player)) {
                    enterBrokenCourt(state, player.index);
                }
            } else {
                player.actionsRemaining -= 1; // Force spend if illegal to prevent stuck AI
            }
            break;
        }
        case 'CLAIM': {
            const nodeId = action.payload.nodeId;
            const nodeState = state.boardState[nodeId];
            if (nodeState && nodeState.claimedBy === null && canPerformAction(player, 'claim') && canAffordClaim(player)) {
                spendBannersForClaim(player);
                nodeState.claimedBy = player.index;
                player.stats.strongholdsClaimed += 1;
                player.actionsRemaining -= 1;
            } else {
                player.actionsRemaining -= 1;
            }
            break;
        }
        case 'PASS': {
            player.actionsRemaining -= 1;
            break;
        }
    }

    checkVictoryConditions(state, rng);
    broadcast(session, { type: 'STATE_UPDATE', payload: state });
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Iron Ashes Multiplayer WebSocket Server running on port ${PORT}`);
});
