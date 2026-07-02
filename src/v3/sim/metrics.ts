/**
 * Game metrics (Stage 4d) — what one finished game tells us about balance.
 *
 * `computeMetrics` is pure and derives EVERYTHING from the final `GameState` +
 * its `actionLog` event stream — never a parallel re-implementation of the rules
 * (the fidelity lesson from docs/design-history/ML-SYSTEM-ANALYSIS.md). These feed the §9
 * PASS/FAIL report and the win-rate-by-archetype / free-rider analysis.
 */

import type { Act, GameEndReason, GameState, TokenKind } from '../types.js';
import { FORGE_WEIGHT } from '../tunables.js';

/** Distribution of Discovery-flip reveals across a game (§5.1 outcome mix). */
export type DiscoveryFlipMix = Readonly<Record<TokenKind, number>>;

export interface GameMetrics {
  readonly gameEndReason: GameEndReason;
  readonly winner: number | null;
  readonly rounds: number;
  readonly actReached: Act;

  /** A Shadowking win — the dark ate the Keystone (doom_complete) OR deposed the whole
   *  table (attrition, the all_broken successor §6/§12 #2). The §9 rate counts both. */
  readonly shadowkingWin: boolean;
  readonly territoryWin: boolean;
  readonly gambitWin: boolean;
  /** A player won by being the last Warlord standing (the new elimination win, §6). */
  readonly lastStandingWin: boolean;
  /** Sub-type flag: this Shadowking win came via attrition (zero living Warlords) rather
   *  than the Keystone assault. A diagnostic, NOT mutually exclusive with shadowkingWin. */
  readonly attritionWin: boolean;

  /** A Crown's Gambit was seized at least once this game. */
  readonly gambitSeized: boolean;
  /** Stage 5f split of `gambitSeized`: a DELIBERATE seize fired this game — the Warlord marched
   *  onto the Keystone via the Gambit path (gambitAmbition claim or a gambitContest displace,
   *  tagged `gambitIntent` on the move). The honest "a player went for the throne" fire signal. */
  readonly gambitSeizeDeliberate: boolean;
  /** Stage 5f split of `gambitSeized`: an INCIDENTAL seize fired this game — a Warlord sat the
   *  Keystone pursuing some OTHER goal (heart hunt, capture, defence) with no deliberate claim. */
  readonly gambitSeizeIncidental: boolean;
  /** Stage 5f: this game's Gambit WIN came from a deliberate claim (the winner's initiating seize
   *  was 'ambition'|'contest'). False when there was no Gambit win. A win implies a held claim, so
   *  an unattributed gambit_victory is treated as deliberate. */
  readonly gambitWinDeliberate: boolean;
  /** Number of Warlords eliminated (deposed at Dawn) this game (§6). */
  readonly eliminations: number;

  /** Final living owned production per seat (Forges weighted FORGE_WEIGHT). */
  readonly territoryPerSeat: readonly number[];
  /** Mean pledged card amount per seat across the game (from pledgeHistory). */
  readonly meanPledgePerSeat: readonly number[];
  /** Final cumulative anti-dark engagement tally per seat (T2-2 §13 P0-5: pledged + STRIKE +
   *  heart-commit cards + PARLEYs) — feeds the passivity metric (passiveSeatWinRate). */
  readonly engagementPerSeat: readonly number[];

  // ── Blood Pact (§10) — false/0 in competitive ──
  readonly isBloodPact: boolean;
  /** The traitor won by reaching doom (Keystone ashed, not exposed). */
  readonly traitorWin: boolean;
  /** The traitor was correctly accused and exposed. */
  readonly traitorExposed: boolean;
  readonly accusationsResolved: number;
  readonly accusationsCorrect: number;

  // ── Stage 5 diagnostics (so tuning isn't blind) ──
  /** Death Knights killed (STRIKE wins) — combat lethality vs the dark + pushback supply. */
  readonly dkKills: number;
  /** Oaths sworn this game (§ Oaths — the social-density signal). */
  readonly oathsSworn: number;
  /** Oaths broken this game (betrayal — the drama signal). */
  readonly oathsBroken: number;
  /** Oaths matured honored to the end. */
  readonly oathsMatured: number;
  /** Forge tolls paid this game (§ tolls — positional-leverage signal). */
  readonly tollsPaid: number;
  /** Heralds recruited this game (§ Herald — political-build uptake). */
  readonly heraldsRecruited: number;
  /** Parley actions this game (the non-card anti-dark verb). */
  readonly parleyCount: number;
  /** Heralds captured this game (§HL — the lone runner caught by a rival or the dark). */
  readonly heraldCaptures: number;
  /** Each seat's final stance ('martial' | 'political') — for build-parity analysis. */
  readonly stancePerSeat: readonly ('martial' | 'political')[];
  /** Nodes ashed by game end — the doom-progress proxy. */
  readonly ashedNodes: number;
  /** Rounds whose Pledge was resolved (denominator for the full-block rate). */
  readonly pledgeRounds: number;
  /** Rounds the table FULLY blocked the strike (averted) — pledge health. */
  readonly pledgeFullBlocks: number;
  /** Total ACTION decisions players took this game (incl. PASS) — the session-length /
   *  decision-density proxy for the 30–45 min scope target (C2; no balance role). */
  readonly playerActions: number;

  // ── Stage V3-4b diagnostics (the new-verb fire rates + the v3 defeat/snowball signals) ──
  /** Retainers CAPTURED via a winning RAID this game (§5.2 — the capture-economy fire rate). */
  readonly captures: number;
  /** RANSOMs paid this game (§5.3 — feeds the capture→ransom-back attachment proxy). */
  readonly ransoms: number;
  /** ASSAULT_HEART actions this game (§5.6 — the kill-the-dark commit fire rate). */
  readonly heartAssaults: number;
  /** The dark's heart was broken (darkDefeated) — the Kill-the-Dark fire signal (§5.6). */
  readonly heartKilled: boolean;
  /** WHICH dark-win path this game took, else null (the §6 by-path split): the Keystone assault
   *  (doom_complete) vs the deposed-table successor (attrition). */
  readonly darkWinPath: 'doom_complete' | 'attrition' | null;
  /** The round each Warlord was eliminated, in chronological order (elimination-timing). */
  readonly eliminationRounds: readonly number[];
  /** The Act in force at each elimination (parallel to eliminationRounds) — the timing distribution. */
  readonly eliminationActs: readonly Act[];
  /** Earliest seat-elimination round, or null if nobody was deposed — the spectator dead-time proxy
   *  numerator (dead-time = earliest / ROUND_CAP; flagged below DEAD_TIME_FLOOR in the report). */
  readonly earliestEliminationRound: number | null;
  /** Discovery-flip outcome mix this game (§5.1): recruit / blight_seed / death_knight counts. */
  readonly discoveryFlips: DiscoveryFlipMix;
}

/** Living owned production (Holdings + weighted Forges) for one seat. Exported so the headless
 *  driver can snapshot the mid-game territory leader (the snowball↔turtle signal) consistently. */
export function territoryOf(state: GameState, seat: number): number {
  let t = 0;
  for (const [id, ns] of Object.entries(state.board.state.nodes)) {
    if (ns.owner !== seat || ns.ashed) continue;
    const tier = state.board.definition.nodes[id].tier;
    if (tier === 'forge') t += FORGE_WEIGHT;
    else if (tier === 'keep' || tier === 'holding') t += 1;
  }
  return t;
}

/** Mean pledge amount per seat across all recorded rounds (0 if none). */
function meanPledges(state: GameState, playerCount: number): number[] {
  const totals = new Array<number>(playerCount).fill(0);
  const counts = new Array<number>(playerCount).fill(0);
  for (const round of state.pledgeHistory) {
    for (const entry of round) {
      if (entry.playerIndex < playerCount) {
        totals[entry.playerIndex] += entry.amount;
        counts[entry.playerIndex] += 1;
      }
    }
  }
  return totals.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
}

export function computeMetrics(state: GameState): GameMetrics {
  const playerCount = state.players.length;

  let eliminations = 0;
  let gambitSeized = false;
  let gambitSeizeDeliberate = false;
  let gambitSeizeIncidental = false;
  // Latest seize intent per claimant (Stage 5f) — used to attribute a Gambit WIN to a deliberate
  // claim vs an incidental occupation that held long enough to be named.
  const seizeIntentByPlayer = new Map<number, string>();
  let accusationsResolved = 0;
  let accusationsCorrect = 0;
  let dkKills = 0;
  let pledgeRounds = 0;
  let pledgeFullBlocks = 0;
  let oathsSworn = 0;
  let oathsBroken = 0;
  let oathsMatured = 0;
  let tollsPaid = 0;
  let heraldsRecruited = 0;
  let parleyCount = 0;
  let heraldCaptures = 0;
  let playerActions = 0;
  let captures = 0;
  let ransoms = 0;
  let heartAssaults = 0;
  const eliminationRounds: number[] = [];
  const eliminationActs: Act[] = [];
  const discoveryFlips: Record<TokenKind, number> = { recruit: 0, blight_seed: 0, death_knight: 0 };
  // Track the Act in force as we scan the chronological log, so each elimination records the Act it
  // fell in (the log carries no Act field — ACT_ESCALATED is the only signal). Starts at WHISPER.
  let currentAct: Act = 'WHISPER';
  for (const e of state.actionLog) {
    if (e.type === 'PLAYER_ELIMINATED') {
      eliminations++;
      eliminationRounds.push(e.round);
      eliminationActs.push(currentAct);
    } else if (e.type === 'ACT_ESCALATED') {
      currentAct = e.newAct;
    } else if (e.type === 'DISCOVERY_FLIPPED') {
      discoveryFlips[e.kind] += 1;
    } else if (e.type === 'PLAYER_ACTED') {
      playerActions++;
      if (e.action === 'SWEAR_OATH') oathsSworn++;
      if (e.action === 'BREAK_OATH') oathsBroken++;
      if (e.action === 'RECRUIT' && e.details?.stance === 'political') heraldsRecruited++;
      if (e.action === 'RECRUIT' && e.details?.heraldCaptured === true) heraldCaptures++;
      if (e.action === 'PARLEY') parleyCount++;
      if (e.action === 'RANSOM') ransoms++;
      if (e.action === 'ASSAULT_HEART') heartAssaults++;
      if (e.action === 'RAID' && e.details?.capture !== undefined) captures++;
      if (e.action === 'MARCH' && typeof e.details?.toll === 'number' && e.details.toll > 0) tollsPaid++;
      if (e.details?.oathMatured === true) oathsMatured++;
      if (e.details?.gambitSeized === true) {
        gambitSeized = true;
        const intent = e.details?.gambitIntent;
        if (intent === 'ambition' || intent === 'contest') {
          gambitSeizeDeliberate = true;
          seizeIntentByPlayer.set(e.playerIndex, intent);
        } else {
          gambitSeizeIncidental = true;
          seizeIntentByPlayer.set(e.playerIndex, 'incidental');
        }
      }
    } else if (e.type === 'ACCUSATION_RESOLVED') {
      accusationsResolved++;
      if (e.outcome === 'correct') accusationsCorrect++;
    } else if (e.type === 'SK_VOICE_LINE' && e.trigger === 'dk_killed') {
      dkKills++;
    } else if (e.type === 'PLEDGE_RESOLVED') {
      pledgeRounds++;
      if (e.averted) pledgeFullBlocks++;
    }
  }

  let ashedNodes = 0;
  for (const ns of Object.values(state.board.state.nodes)) if (ns.ashed) ashedNodes++;

  const isBloodPact = state.mode === 'blood_pact';

  return {
    gameEndReason: state.gameEndReason,
    winner: state.winner,
    rounds: state.round,
    actReached: state.act,
    shadowkingWin: state.gameEndReason === 'doom_complete' || state.gameEndReason === 'attrition',
    territoryWin: state.gameEndReason === 'territory_victory',
    gambitWin: state.gameEndReason === 'gambit_victory',
    lastStandingWin: state.gameEndReason === 'last_standing',
    attritionWin: state.gameEndReason === 'attrition',
    gambitSeized: gambitSeized || state.gameEndReason === 'gambit_victory',
    gambitSeizeDeliberate,
    gambitSeizeIncidental,
    // A Gambit win implies the claimant HELD the Keystone through a declaration, so attribute it to
    // a deliberate claim unless the winner's recorded seize intent was explicitly 'incidental'.
    gambitWinDeliberate: state.gameEndReason === 'gambit_victory'
      && state.winner !== null
      && seizeIntentByPlayer.get(state.winner) !== 'incidental',
    eliminations,
    territoryPerSeat: state.players.map(p => territoryOf(state, p.index)),
    meanPledgePerSeat: meanPledges(state, playerCount),
    engagementPerSeat: state.players.map(p => p.engagement),

    isBloodPact,
    // §12 #5: an eliminated traitor still wins on a later doom/attrition.
    traitorWin: isBloodPact
      && (state.gameEndReason === 'doom_complete' || state.gameEndReason === 'attrition')
      && state.winner !== null && state.winner === state.bloodPactHolder,
    traitorExposed: isBloodPact && state.bloodPactExposed === true,
    accusationsResolved,
    accusationsCorrect,
    dkKills,
    oathsSworn,
    oathsBroken,
    oathsMatured,
    tollsPaid,
    heraldsRecruited,
    parleyCount,
    heraldCaptures,
    stancePerSeat: state.players.map(p => p.stance),
    ashedNodes,
    pledgeRounds,
    pledgeFullBlocks,
    playerActions,

    captures,
    ransoms,
    heartAssaults,
    heartKilled: state.shadowking.darkDefeated === true,
    darkWinPath: state.gameEndReason === 'doom_complete' ? 'doom_complete'
      : state.gameEndReason === 'attrition' ? 'attrition' : null,
    eliminationRounds,
    eliminationActs,
    earliestEliminationRound: eliminationRounds.length ? Math.min(...eliminationRounds) : null,
    discoveryFlips,
  };
}
