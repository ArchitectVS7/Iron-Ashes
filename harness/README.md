# UGT Harness — Iron Throne of Ashes (v3)

A headless, deterministic JSON-lines interface to the real v3 engine, for the
UGT ladder / trial. It is a **zero-logic transport**: every op routes to an
engine seam the UI session already uses (`createGame`, `applyCommand`,
`runAIPledge`/`runAITurn`, `observableState`). The harness adds no game rules
and no validation the engine does not perform itself.

## Run

```bash
npm run harness        # tsc && node harness/ugt-harness.mjs
```

The pure request→response core lives in `src/v3/harness/harness-core.ts`
(typechecked + vitest-covered); `harness/ugt-harness.mjs` is the thin Node
stdio shell that imports the **compiled** core from `dist/`. `npm run harness`
builds first.

## Protocol

- **One JSON request per stdin line → one JSON response per stdout line**,
  strictly in order.
- **Blank lines are skipped** (no response emitted).
- **Exit 0 on stdin close.**
- A malformed line (bad JSON, or a JSON value that is not an object with a
  string `op`) yields a structured `BAD_REQUEST` error — it never crashes the
  shell.

### Common response fields

Every response echoes the request `op` and `id` (or `null` if none was given)
and carries `ok`.

- On success: `ok: true`, plus a `stateHash` — the **sha-256 of
  `JSON.stringify(state)`** for the game's current state. Same seed →
  identical `stateHash`; there are no nondeterministic fields (`seed` is part
  of game identity), so no normalization is applied.
- On failure: `ok: false` and `error: { kind, reason }`. Error kinds:
  `BAD_REQUEST | UNKNOWN_GAME | CREATE_FAILED | LOAD_FAILED | ILLEGAL_COMMAND |
  INTERNAL`.

### `summary` fields

Most ops include a `summary` (pure scalar reads, no rules):
`round, phase, act, mode, difficulty, heraldEnabled, humanSeat,
activePlayerIndex, playerCount, crownHolder, gameEndReason, winner,
pendingLastStand`.

### Game identity

`create` and `load` mint a new `gameId` (`g1`, `g2`, … assigned per registry,
in call order). The human always occupies **seat 0** (`humanSeat: 0`).

## Ops

### `create`

Starts a new game. `config`:

- `seed` — **required**, a finite number. A missing seed fails loud (a
  silently-defaulted seed is a *different* game).
- `playerCount` — integer 2–4.
- `mode` — `'competitive' | 'blood_pact'`.
- `difficulty` — optional `'warlord' | 'knight' | 'squire'`
  (default: the locked reference `DEFAULT_DIFFICULTY`).
- `heraldEnabled` — optional boolean (default `false`).

Response: `{ gameId, summary, stateHash }`.

```json
{"op":"create","id":1,"config":{"seed":20260716,"playerCount":3,"mode":"competitive"}}
```

### `command`

Passes a **raw v3 `Command` verbatim** to `applyCommand`. The engine's own
acceptance/rejection is the whole point; a rejection surfaces as
`ILLEGAL_COMMAND`. Response: `{ events, summary, stateHash }`.

```json
{"op":"command","id":10,"gameId":"g1","command":{"type":"ADVANCE_PHASE"}}
{"op":"command","id":11,"gameId":"g1","command":{"type":"SUBMIT_PLEDGE","playerIndex":0,"amount":0}}
```

### `run_ai`

Drives every AI seat to the next genuine human decision point (or terminal),
sequencing the same drivers `session.pump()` uses. It chooses no moves.
Response: `{ waitingFor, events, summary, stateHash }`, where `waitingFor` is
one of:
`threat | human_pledge | human_action | bequest | last_stand | terminal`.

```json
{"op":"run_ai","id":20,"gameId":"g1"}
```

### `state`

Returns the current view. By default returns a **fog-respecting `observable`
projection** (seed `'REDACTED'`, unflipped tokens fogged to their sigil) for
`viewerSeat` (default: the human seat, 0). `full: true` is the explicit
omniscient debug opt-in and returns the raw `state` (real seed + hidden
content). Response: `{ summary, stateHash, observable | state }`.

```json
{"op":"state","id":30,"gameId":"g1"}
{"op":"state","id":31,"gameId":"g1","full":true}
{"op":"state","id":32,"gameId":"g1","viewerSeat":1}
```

### `save`

Serializes the game to a resumable payload. Response:
`{ payload, stateHash }` where
`payload = { version: 1, state, difficulty, heraldEnabled, humanSeat }`. The
session context (`difficulty`, `heraldEnabled`, `humanSeat`) is persisted
alongside the state because it scopes every engine step.

```json
{"op":"save","id":40,"gameId":"g1"}
```

### `load`

Restores a saved payload into a **new** game. Response:
`{ gameId, summary, stateHash }`. The `stateHash` equals the saved hash — a
save→load round-trip is byte-identical.

```json
{"op":"load","id":50,"payload":{"version":1,"state":{ /* … */ },"difficulty":"knight","heraldEnabled":false,"humanSeat":0}}
```

## Example session

Requests (stdin) and the resulting responses (stdout). The `load` payload is
the `save` response's `payload`, so this session is driven one request at a
time (send, await response, send next).

```
→ {"op":"create","id":1,"config":{"seed":20260716,"playerCount":3,"mode":"competitive"}}
← {"op":"create","id":1,"ok":true,"gameId":"g1","summary":{...},"stateHash":"<H0>"}

→ {"op":"state","id":2,"gameId":"g1"}
← {"op":"state","id":2,"ok":true,"summary":{...},"stateHash":"<H0>","observable":{"seed":"REDACTED",...}}

→ {"op":"run_ai","id":3,"gameId":"g1"}
← {"op":"run_ai","id":3,"ok":true,"waitingFor":"threat","events":[...],"summary":{...},"stateHash":"<H1>"}

→ {"op":"save","id":4,"gameId":"g1"}
← {"op":"save","id":4,"ok":true,"payload":{"version":1,"state":{...},"difficulty":"...","heraldEnabled":false,"humanSeat":0},"stateHash":"<H1>"}

→ {"op":"load","id":5,"payload":{...the save payload...}}
← {"op":"load","id":5,"ok":true,"gameId":"g2","summary":{...},"stateHash":"<H1>"}   # load hash == save hash

→ {nope
← {"op":"parse","id":null,"ok":false,"error":{"kind":"BAD_REQUEST","reason":"not valid JSON: ..."}}
```

Blank lines between requests are skipped and produce no response line.

## Determinism (§7)

Same `(seed, playerCount, mode, difficulty, heraldEnabled)` → identical
`stateHash` at every step. No `Math.random`/`Date.now` anywhere; all
randomness flows through `SeededRandom`. `GameState` is JSON-serializable, and
the default `state` projection redacts the seed and fogs unflipped tokens so
no hidden information leaks to a client.
