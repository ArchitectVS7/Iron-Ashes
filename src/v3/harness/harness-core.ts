/* ══════════════════════════════════════════════════════════════
   Iron Throne of Ashes (v3) — UGT harness core

   The pure request→response core of the JSON-lines test harness. The
   Node stdio shell (readline over stdin/stdout) lives in a sibling
   `.mjs` — NOT here — so this module stays free of Node globals and is
   typechecked + vitest-covered like the rest of src/.

   Doctrine (UGT, portfolio-standard): a ZERO-LOGIC TRANSPORT over the
   real engine — "a harness that reimplements the game is testing
   itself, not the game." Every op routes to an engine seam that the UI
   session (src/ui-v3/session.ts) already uses; the harness adds no game
   rules and no validation the engine does not perform itself:
     • `command` passes a raw v3 Command VERBATIM to applyCommand — the
       engine's own rejection is exactly what a real client observes.
     • `run_ai` only SEQUENCES the real drivers (runAIPledge/runAITurn/
       ADVANCE_PHASE) with the SAME stop points session.pump() uses; it
       chooses no moves and computes no outcomes.

   Every engine step is scoped in `withSessionTunables(difficulty,
   heraldEnabled, …)` — the identical seam session.ts wraps around
   create/applyCommand/runAIPledge/runAITurn — so a harness-driven game
   is byte-identical to a session-driven one (§7).

   Ops: create | command | run_ai | state | save | load
   Every response carries `stateHash` = sha-256 of `JSON.stringify(state)`.
   Unlike nexus-dominion (which normalized nondeterministic id/timestamp
   fields), v3 GameState has NO nondeterministic fields — `seed` is
   deterministic and part of game identity — so the serialized state is
   hashed directly with no normalization.

   Determinism / fog (§7 D2): the default `state` op returns
   `observableState` (seed redacted, unflipped tokens fogged to their
   sigil); the omniscient view is an explicit `{full:true}` debug opt-in.
   ══════════════════════════════════════════════════════════════ */

import { createGame } from '../setup.js';
import { applyCommand } from '../reducer.js';
import { runAIPledge, runAITurn } from '../ai-player.js';
import { observableState } from '../observable.js';
import { withSessionTunables, DEFAULT_DIFFICULTY } from '../difficulty.js';
import { sha256 } from './sha256.js';
import type { Command } from '../commands.js';
import type { GameEvent } from '../events.js';
import type { Difficulty, GameMode, GameState } from '../types.js';

/* ── Protocol types ── */

export type RequestId = number | string;

/** The two difficulty tiers a caller may name explicitly (default is the locked reference). */
const DIFFICULTIES: readonly Difficulty[] = ['warlord', 'knight', 'squire'];
const MODES: readonly GameMode[] = ['competitive', 'blood_pact'];

export interface CreateRequest {
  op: 'create';
  id?: RequestId;
  config: {
    seed: number;
    playerCount: number;
    mode: GameMode;
    difficulty?: Difficulty;
    heraldEnabled?: boolean;
  };
}

export interface CommandRequest {
  op: 'command';
  id?: RequestId;
  gameId: string;
  /** A raw v3 Command, passed VERBATIM to applyCommand (no added validation). */
  command: Command;
}

export interface RunAiRequest {
  op: 'run_ai';
  id?: RequestId;
  gameId: string;
}

export interface StateRequest {
  op: 'state';
  id?: RequestId;
  gameId: string;
  /** Omniscient debug view (the raw GameState). Default is the fog-respecting observable view. */
  full?: boolean;
  /** Viewer seat for the observable projection. Defaults to the entry's human seat (0). */
  viewerSeat?: number;
}

export interface SaveRequest {
  op: 'save';
  id?: RequestId;
  gameId: string;
}

export interface LoadRequest {
  op: 'load';
  id?: RequestId;
  payload: SavePayload;
}

export type Request =
  | CreateRequest
  | CommandRequest
  | RunAiRequest
  | StateRequest
  | SaveRequest
  | LoadRequest;

/**
 * A save payload. The session seam (difficulty + heraldEnabled + humanSeat) is persisted ALONGSIDE
 * the state: those three are the caller-owned context that scopes every engine step, and losing
 * them across a resume would change the game (the nexus-dominion accumulator lesson, adapted).
 */
export interface SavePayload {
  version: 1;
  state: GameState;
  difficulty: Difficulty;
  heraldEnabled: boolean;
  humanSeat: number;
}

export interface ErrorInfo {
  kind:
    | 'BAD_REQUEST'
    | 'UNKNOWN_GAME'
    | 'CREATE_FAILED'
    | 'LOAD_FAILED'
    | 'ILLEGAL_COMMAND'
    | 'INTERNAL';
  reason: string;
}

/* ── Game registry ── */

interface GameEntry {
  state: GameState;
  difficulty: Difficulty;
  heraldEnabled: boolean;
  humanSeat: number;
}

export interface HarnessRegistry {
  entries: Map<string, GameEntry>;
  nextId: number;
}

export function createRegistry(): HarnessRegistry {
  return { entries: new Map(), nextId: 1 };
}

/* ── State hash ── sha-256 over the serialized state.
   No field normalization: v3 GameState has no nondeterministic fields
   (`seed` is deterministic and part of game identity), so two same-seed
   games serialize to byte-identical strings and hash identically. */

export function stateHash(state: GameState): string {
  return sha256(JSON.stringify(state));
}

/* ── Summary projection (pure scalar reads; no game rules) ── */

function summarize(entry: GameEntry): Record<string, unknown> {
  const s = entry.state;
  return {
    round: s.round,
    phase: s.phase,
    act: s.act,
    mode: s.mode,
    difficulty: entry.difficulty,
    heraldEnabled: entry.heraldEnabled,
    humanSeat: entry.humanSeat,
    activePlayerIndex: s.activePlayerIndex,
    playerCount: s.players.length,
    crownHolder: s.crownHolder,
    gameEndReason: s.gameEndReason,
    winner: s.winner,
    pendingLastStand: s.pendingLastStand !== undefined,
  };
}

/* ── Dispatch ── */

type Json = Record<string, unknown>;

export function dispatch(request: Request, registry: HarnessRegistry): Json {
  try {
    switch (request.op) {
      case 'create':
        return handleCreate(request, registry);
      case 'command':
        return handleCommand(request, registry);
      case 'run_ai':
        return handleRunAi(request, registry);
      case 'state':
        return handleState(request, registry);
      case 'save':
        return handleSave(request, registry);
      case 'load':
        return handleLoad(request, registry);
      default:
        return errorResponse((request as { op?: string }).op ?? 'unknown', idOf(request), {
          kind: 'BAD_REQUEST',
          reason: `unknown op ${JSON.stringify((request as { op?: string }).op)}`,
        });
    }
  } catch (err) {
    return errorResponse(request.op, idOf(request), {
      kind: 'INTERNAL',
      reason: reasonOf(err),
    });
  }
}

function handleCreate(req: CreateRequest, registry: HarnessRegistry): Json {
  const id = idOf(req);
  const cfg = req.config;
  if (!cfg || typeof cfg.seed !== 'number' || !Number.isFinite(cfg.seed)) {
    // Fail LOUD on a missing seed — a silently-defaulted seed is a DIFFERENT game, not a default.
    return errorResponse('create', id, {
      kind: 'BAD_REQUEST',
      reason: 'config.seed (finite number) is required',
    });
  }
  if (typeof cfg.playerCount !== 'number' || !Number.isInteger(cfg.playerCount) ||
      cfg.playerCount < 2 || cfg.playerCount > 4) {
    return errorResponse('create', id, {
      kind: 'BAD_REQUEST',
      reason: 'config.playerCount must be an integer 2–4',
    });
  }
  if (!MODES.includes(cfg.mode)) {
    return errorResponse('create', id, {
      kind: 'BAD_REQUEST',
      reason: `config.mode must be one of ${JSON.stringify(MODES)}`,
    });
  }
  if (cfg.difficulty !== undefined && !DIFFICULTIES.includes(cfg.difficulty)) {
    return errorResponse('create', id, {
      kind: 'BAD_REQUEST',
      reason: `config.difficulty must be one of ${JSON.stringify(DIFFICULTIES)} when given`,
    });
  }
  if (cfg.heraldEnabled !== undefined && typeof cfg.heraldEnabled !== 'boolean') {
    return errorResponse('create', id, {
      kind: 'BAD_REQUEST',
      reason: 'config.heraldEnabled must be a boolean when given',
    });
  }

  const difficulty = cfg.difficulty ?? DEFAULT_DIFFICULTY;
  const heraldEnabled = cfg.heraldEnabled ?? false;

  let state: GameState;
  try {
    // Mirror session.ts EXACTLY: humanCount 1 (seat 0), difficulty + herald scoped around setup.
    state = withSessionTunables(difficulty, heraldEnabled, () =>
      createGame(cfg.playerCount, cfg.mode, cfg.seed, 1, difficulty, heraldEnabled),
    );
  } catch (err) {
    return errorResponse('create', id, {
      kind: 'CREATE_FAILED',
      reason: reasonOf(err),
    });
  }

  const gameId = `g${registry.nextId++}`;
  const entry: GameEntry = { state, difficulty, heraldEnabled, humanSeat: 0 };
  registry.entries.set(gameId, entry);
  return {
    op: 'create',
    id,
    ok: true,
    gameId,
    summary: summarize(entry),
    stateHash: stateHash(state),
  };
}

function handleCommand(req: CommandRequest, registry: HarnessRegistry): Json {
  const id = idOf(req);
  const entry = registry.entries.get(req.gameId);
  if (!entry) return unknownGame('command', id, req.gameId);

  // The command is passed VERBATIM — the engine's own acceptance/rejection is the whole point.
  let events: GameEvent[];
  try {
    const result = withSessionTunables(entry.difficulty, entry.heraldEnabled, () =>
      applyCommand(entry.state, req.command),
    );
    entry.state = result.state;
    events = result.events;
  } catch (err) {
    // Any engine throw (InvalidCommandError or a malformed-command TypeError) → a typed error,
    // never an escaped exception.
    return errorResponse('command', id, {
      kind: 'ILLEGAL_COMMAND',
      reason: reasonOf(err),
    });
  }

  return {
    op: 'command',
    id,
    ok: true,
    events,
    summary: summarize(entry),
    stateHash: stateHash(entry.state),
  };
}

/**
 * Advance every AI seat exactly as session.pump() does — a headless replica of the same loop,
 * each engine call scoped in withSessionTunables. It SEQUENCES the real drivers only; it adds no
 * rules. Stops at the first genuine human decision point (or terminal), reporting `waitingFor`.
 */
function handleRunAi(req: RunAiRequest, registry: HarnessRegistry): Json {
  const id = idOf(req);
  const entry = registry.entries.get(req.gameId);
  if (!entry) return unknownGame('run_ai', id, req.gameId);

  const human = entry.humanSeat;
  const events: GameEvent[] = [];
  const step = (fn: () => { state: GameState; events: GameEvent[] }): void => {
    const result = withSessionTunables(entry.difficulty, entry.heraldEnabled, fn);
    entry.state = result.state;
    for (const e of result.events) events.push(e);
  };

  let waitingFor = 'terminal';
  let guard = 0;
  while (guard < 512) {
    guard++;
    const s = entry.state;
    if (s.gameEndReason !== null) {
      waitingFor = 'terminal';
      break;
    }
    // A HALTED combat (§5.3, T1-4): a rival's winning RAID on the human's stronghold has paused
    // for the human's Last Stand — a BLOCKING decision point (every other command is rejected).
    if (s.pendingLastStand !== undefined) {
      waitingFor = 'last_stand';
      break;
    }
    if (s.phase === 'THREAT') {
      // Always human-gated: the human clicks to face the dark.
      waitingFor = 'threat';
      break;
    }
    if (s.phase === 'PLEDGE') {
      // Mirror session: a LIVING human must pledge FIRST (via a `command`), so run_ai stops until
      // the human's pledge is in the buffer. Once the human has pledged (or is eliminated), it
      // auto-pledges the remaining AI seats then resolves — the exact order + seed session uses in
      // `submitHumanPledge`/`pump`, so the harness stays byte-identical to a session run (§7).
      const humanAlive = !s.players[human].isEliminated;
      const humanPledged = s.pledgeBuffer.some((e) => e.playerIndex === human);
      if (humanAlive && !humanPledged) {
        waitingFor = 'human_pledge';
        break;
      }
      for (const p of s.players) {
        if (p.index === human || p.isEliminated) continue;
        if (s.pledgeBuffer.some((e) => e.playerIndex === p.index)) continue;
        step(() => runAIPledge(entry.state, p.index, entry.state.seed));
      }
      step(() => applyCommand(entry.state, { type: 'ADVANCE_PHASE' }));
      continue;
    }
    if (s.phase === 'ACTION') {
      const active = s.activePlayerIndex;
      const p = s.players[active];
      if (active === human && !p.isEliminated && p.actionsRemaining > 0) {
        waitingFor = 'human_action';
        break;
      }
      if (active !== human && !p.isEliminated && p.actionsRemaining > 0) {
        step(() => runAITurn(entry.state, active, entry.state.seed));
        continue;
      }
      // Active seat is exhausted or eliminated.
      if (s.turnOrderPosition >= s.turnOrder.length) {
        const me = s.players[human];
        if (me.deposed && !me.isEliminated && s.pendingBequests?.[human] === undefined) {
          waitingFor = 'bequest';
          break;
        }
        step(() => applyCommand(entry.state, { type: 'ADVANCE_PHASE' }));
        continue;
      }
      // Defensive nudge (a 0-action/eliminated non-terminal seat): PASS to advance the pointer.
      step(() =>
        applyCommand(entry.state, {
          type: 'PLAYER_ACTION',
          playerIndex: active,
          action: { type: 'PASS' },
        }),
      );
      continue;
    }
    if (s.phase === 'DAWN') {
      step(() => applyCommand(entry.state, { type: 'ADVANCE_PHASE' }));
      continue;
    }
    // Unreachable — every GamePhase is handled above.
    break;
  }
  if (guard >= 512) {
    // A non-terminating pump is a real bug, not a silent stall — surface it.
    throw new Error('run_ai exceeded 512 steps without reaching a stop point');
  }

  return {
    op: 'run_ai',
    id,
    ok: true,
    waitingFor,
    events,
    summary: summarize(entry),
    stateHash: stateHash(entry.state),
  };
}

function handleState(req: StateRequest, registry: HarnessRegistry): Json {
  const id = idOf(req);
  const entry = registry.entries.get(req.gameId);
  if (!entry) return unknownGame('state', id, req.gameId);
  const viewerSeat = req.viewerSeat ?? entry.humanSeat;
  return {
    op: 'state',
    id,
    ok: true,
    summary: summarize(entry),
    stateHash: stateHash(entry.state),
    // Default: the fog-respecting projection (seed redacted, unflipped tokens fogged) — §7 D2.
    // `full:true` is the explicit omniscient debug opt-in (exposes the real seed + hidden content).
    ...(req.full === true
      ? { state: JSON.parse(JSON.stringify(entry.state)) as unknown }
      : { observable: observableState(entry.state, viewerSeat) as unknown }),
  };
}

function handleSave(req: SaveRequest, registry: HarnessRegistry): Json {
  const id = idOf(req);
  const entry = registry.entries.get(req.gameId);
  if (!entry) return unknownGame('save', id, req.gameId);
  const payload: SavePayload = {
    version: 1,
    // GameState is JSON-serializable by invariant (§7) — a deep clone is the save form.
    state: JSON.parse(JSON.stringify(entry.state)) as GameState,
    difficulty: entry.difficulty,
    heraldEnabled: entry.heraldEnabled,
    humanSeat: entry.humanSeat,
  };
  return {
    op: 'save',
    id,
    ok: true,
    payload,
    stateHash: stateHash(entry.state),
  };
}

function handleLoad(req: LoadRequest, registry: HarnessRegistry): Json {
  const id = idOf(req);
  const p = req.payload;
  if (
    !p ||
    p.version !== 1 ||
    p.state === null ||
    typeof p.state !== 'object' ||
    !DIFFICULTIES.includes(p.difficulty) ||
    typeof p.heraldEnabled !== 'boolean' ||
    typeof p.humanSeat !== 'number'
  ) {
    return errorResponse('load', id, {
      kind: 'BAD_REQUEST',
      reason:
        'payload must be {version:1, state:object, difficulty:tier, heraldEnabled:boolean, humanSeat:number}',
    });
  }
  const state = JSON.parse(JSON.stringify(p.state)) as GameState;
  // Sanity-check the deserialized shape looks like a GameState (fail LOUD otherwise).
  if (!Array.isArray(state.players) || typeof state.phase !== 'string') {
    return errorResponse('load', id, {
      kind: 'LOAD_FAILED',
      reason: 'payload.state did not deserialize to a GameState',
    });
  }
  const gameId = `g${registry.nextId++}`;
  const entry: GameEntry = {
    state,
    difficulty: p.difficulty,
    heraldEnabled: p.heraldEnabled,
    humanSeat: p.humanSeat,
  };
  registry.entries.set(gameId, entry);
  return {
    op: 'load',
    id,
    ok: true,
    gameId,
    summary: summarize(entry),
    stateHash: stateHash(state),
  };
}

/* ── Line parsing (used by the stdio shell) ── */

export function parseRequestLine(
  line: string,
): { ok: true; request: Request } | { ok: false; response: Json } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (err) {
    return {
      ok: false,
      response: errorResponse('parse', null, {
        kind: 'BAD_REQUEST',
        reason: `not valid JSON: ${reasonOf(err)}`,
      }),
    };
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    typeof (parsed as { op?: unknown }).op !== 'string'
  ) {
    return {
      ok: false,
      response: errorResponse('parse', null, {
        kind: 'BAD_REQUEST',
        reason: 'request must be a JSON object with a string `op`',
      }),
    };
  }
  return { ok: true, request: parsed as Request };
}

/* ── Helpers ── */

function idOf(req: { id?: RequestId }): RequestId | null {
  return req.id ?? null;
}

function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function unknownGame(op: string, id: RequestId | null, gameId: string): Json {
  return errorResponse(op, id, {
    kind: 'UNKNOWN_GAME',
    reason: `no game ${JSON.stringify(gameId)}`,
  });
}

function errorResponse(op: string, id: RequestId | null, error: ErrorInfo): Json {
  return { op, id, ok: false, error };
}
