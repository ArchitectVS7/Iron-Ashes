/**
 * Observable projection (§7 D2, amended by §13 P0-12) — the ONLY view deciders may read.
 *
 * `observableState(state, viewerSeat)` returns a deep, decoupled projection of `GameState`
 * with the fog applied:
 *   - Unflipped Discovery tokens are reduced to their `sigil` (the sole content-derived
 *     observable). The hidden `kind` / recruit archetype+name / pre-bound bonus are stripped.
 *   - `seed` is redacted to a non-numeric sentinel — and with it any input "sufficient to
 *     recompute hidden content" (§13 P0-12): without the seed a decider cannot re-derive
 *     `deriveToken(seed, nodeId)`, so it cannot peek under the fog.
 *
 * The engine itself resolves flips from the FULL `GameState`; deciders (AI / wraith / human)
 * read only this projection — preserving fairness and the pure-policy contract.
 */

import type {
  BackSigil,
  GameState,
  HiddenToken,
  V2BoardDef,
  V2NodeState,
} from './types.js';

/** The redaction sentinel that replaces `seed` in the observable projection (§13 P0-12). */
export const SEED_REDACTED = 'REDACTED' as const;
/** Type of the redacted seed — non-numeric, so it cannot be fed back into `SeededRandom`. */
export type RedactedSeed = typeof SEED_REDACTED;

/** An unflipped token as seen under the fog: the sigil only — never the content (§7 D2). */
export interface RedactedToken {
  readonly sigil: BackSigil;
  readonly flipped: false;
}

/** A token as a decider sees it: redacted while face-down, full content once flipped. */
export type ObservableToken = RedactedToken | (HiddenToken & { flipped: true });

/** A node's state under the fog — identical to `V2NodeState` save the projected token. */
export type ObservableNodeState =
  & Omit<V2NodeState, 'hiddenToken'>
  & { hiddenToken: ObservableToken | null };

/** The board under the fog. */
export interface ObservableBoardState {
  readonly nodes: Record<string, ObservableNodeState>;
}

/**
 * The full observable projection — structurally `GameState` with `seed` redacted and the
 * board's hidden tokens fogged. Deciders read this type; they cannot reach `seed` or
 * unflipped content through it.
 */
export type ObservableState =
  & Omit<GameState, 'seed' | 'board'>
  & {
    readonly seed: RedactedSeed;
    readonly board: { readonly definition: V2BoardDef; readonly state: ObservableBoardState };
  };

/**
 * Project full `GameState` to the observable view for `viewerSeat` (§7 D2). Deep-clones via
 * JSON round-trip (GameState is JSON-serializable by contract, §7), then redacts. `viewerSeat`
 * is validated (the per-seat hook for future asymmetric redaction). Pure.
 */
export function observableState(state: GameState, viewerSeat: number): ObservableState {
  if (viewerSeat < 0 || viewerSeat >= state.players.length) {
    throw new Error(`observableState: invalid viewerSeat ${viewerSeat}`);
  }

  const clone = JSON.parse(JSON.stringify(state)) as GameState;

  // Fog the board: reduce every UNFLIPPED token to its sigil; leave flipped tokens whole.
  const nodes = clone.board.state.nodes;
  const projectedNodes: Record<string, ObservableNodeState> = {};
  for (const id of Object.keys(nodes)) {
    const node = nodes[id];
    const tok = node.hiddenToken;
    let projectedToken: ObservableToken | null;
    if (tok === null) {
      projectedToken = null;
    } else if (tok.flipped) {
      projectedToken = tok as HiddenToken & { flipped: true };
    } else {
      projectedToken = { sigil: tok.sigil, flipped: false };
    }
    projectedNodes[id] = { ...node, hiddenToken: projectedToken };
  }

  // Strip the seed off the clone, then re-attach the redaction sentinel.
  const { seed: _redactedAway, board: _boardAway, ...rest } = clone;
  void _redactedAway;
  void _boardAway;

  return {
    ...(rest as Omit<GameState, 'seed' | 'board'>),
    seed: SEED_REDACTED,
    board: {
      definition: clone.board.definition,
      state: { nodes: projectedNodes },
    },
  };
}
