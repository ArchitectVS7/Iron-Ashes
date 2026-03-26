import { describe, it, expect } from 'vitest';
import { REQUIRED_GLL_KEYS } from '../../src/gll/types.js';

// Snapshot of the complete key set — changes here are breaking contract changes
const EXPECTED_KEYS = [
  'faction',
  'faction_leader',
  'char_leader',
  'char_warrior',
  'char_diplomat',
  'char_producer',
  'char_wanderer',
  'loc_board',
  'loc_stronghold',
  'loc_forge',
  'loc_antagonist_base',
  'loc_neutral_center',
  'loc_starting_keep',
  'res_primary',
  'res_fate_card',
  'res_penalty_card',
  'force_antagonist',
  'force_lieutenant',
  'force_minion',
  'artifact_core',
  'mech_doom_track',
  'mech_combat',
  'mech_broken_state',
  'mech_rescue',
  'mech_vote',
  'mech_diplomatic_action',
  'mech_traitor_card',
  'event_spawn',
  'event_move',
  'event_claim',
  'event_assault',
  'event_escalate',
] as const;

describe('REQUIRED_GLL_KEYS — contract', () => {
  it('is an array', () => {
    expect(Array.isArray(REQUIRED_GLL_KEYS)).toBe(true);
  });

  it('has exactly 32 keys', () => {
    expect(REQUIRED_GLL_KEYS).toHaveLength(32);
  });

  it('contains no duplicate keys', () => {
    const unique = new Set(REQUIRED_GLL_KEYS);
    expect(unique.size).toBe(REQUIRED_GLL_KEYS.length);
  });

  it('every key is a non-empty string', () => {
    for (const key of REQUIRED_GLL_KEYS) {
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('matches the expected key set exactly (order-independent)', () => {
    const actual = new Set(REQUIRED_GLL_KEYS);
    const expected = new Set(EXPECTED_KEYS);
    for (const key of expected) {
      expect(actual).toContain(key);
    }
    expect(actual.size).toBe(expected.size);
  });
});

describe('REQUIRED_GLL_KEYS — faction tokens', () => {
  it('includes faction', () => expect(REQUIRED_GLL_KEYS).toContain('faction'));
  it('includes faction_leader', () => expect(REQUIRED_GLL_KEYS).toContain('faction_leader'));

  it('has exactly 2 faction tokens', () => {
    const factionKeys = REQUIRED_GLL_KEYS.filter((k) => k === 'faction' || k.startsWith('faction_'));
    expect(factionKeys).toHaveLength(2);
  });
});

describe('REQUIRED_GLL_KEYS — character tokens', () => {
  it('includes char_leader', () => expect(REQUIRED_GLL_KEYS).toContain('char_leader'));
  it('includes char_warrior', () => expect(REQUIRED_GLL_KEYS).toContain('char_warrior'));
  it('includes char_diplomat', () => expect(REQUIRED_GLL_KEYS).toContain('char_diplomat'));
  it('includes char_producer', () => expect(REQUIRED_GLL_KEYS).toContain('char_producer'));
  it('includes char_wanderer', () => expect(REQUIRED_GLL_KEYS).toContain('char_wanderer'));

  it('has exactly 5 char_ tokens', () => {
    const charKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('char_'));
    expect(charKeys).toHaveLength(5);
  });
});

describe('REQUIRED_GLL_KEYS — location tokens', () => {
  it('includes loc_board', () => expect(REQUIRED_GLL_KEYS).toContain('loc_board'));
  it('includes loc_stronghold', () => expect(REQUIRED_GLL_KEYS).toContain('loc_stronghold'));
  it('includes loc_forge', () => expect(REQUIRED_GLL_KEYS).toContain('loc_forge'));
  it('includes loc_antagonist_base', () => expect(REQUIRED_GLL_KEYS).toContain('loc_antagonist_base'));
  it('includes loc_neutral_center', () => expect(REQUIRED_GLL_KEYS).toContain('loc_neutral_center'));
  it('includes loc_starting_keep', () => expect(REQUIRED_GLL_KEYS).toContain('loc_starting_keep'));

  it('has exactly 6 loc_ tokens', () => {
    const locKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('loc_'));
    expect(locKeys).toHaveLength(6);
  });
});

describe('REQUIRED_GLL_KEYS — resource tokens', () => {
  it('includes res_primary', () => expect(REQUIRED_GLL_KEYS).toContain('res_primary'));
  it('includes res_fate_card', () => expect(REQUIRED_GLL_KEYS).toContain('res_fate_card'));
  it('includes res_penalty_card', () => expect(REQUIRED_GLL_KEYS).toContain('res_penalty_card'));

  it('has exactly 3 res_ tokens', () => {
    const resKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('res_'));
    expect(resKeys).toHaveLength(3);
  });
});

describe('REQUIRED_GLL_KEYS — antagonist force tokens', () => {
  it('includes force_antagonist', () => expect(REQUIRED_GLL_KEYS).toContain('force_antagonist'));
  it('includes force_lieutenant', () => expect(REQUIRED_GLL_KEYS).toContain('force_lieutenant'));
  it('includes force_minion', () => expect(REQUIRED_GLL_KEYS).toContain('force_minion'));

  it('has exactly 3 force_ tokens', () => {
    const forceKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('force_'));
    expect(forceKeys).toHaveLength(3);
  });
});

describe('REQUIRED_GLL_KEYS — artifact tokens', () => {
  it('includes artifact_core', () => expect(REQUIRED_GLL_KEYS).toContain('artifact_core'));

  it('has exactly 1 artifact_ token', () => {
    const artifactKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('artifact_'));
    expect(artifactKeys).toHaveLength(1);
  });
});

describe('REQUIRED_GLL_KEYS — mechanic tokens', () => {
  it('includes mech_doom_track', () => expect(REQUIRED_GLL_KEYS).toContain('mech_doom_track'));
  it('includes mech_combat', () => expect(REQUIRED_GLL_KEYS).toContain('mech_combat'));
  it('includes mech_broken_state', () => expect(REQUIRED_GLL_KEYS).toContain('mech_broken_state'));
  it('includes mech_rescue', () => expect(REQUIRED_GLL_KEYS).toContain('mech_rescue'));
  it('includes mech_vote', () => expect(REQUIRED_GLL_KEYS).toContain('mech_vote'));
  it('includes mech_diplomatic_action', () => expect(REQUIRED_GLL_KEYS).toContain('mech_diplomatic_action'));
  it('includes mech_traitor_card', () => expect(REQUIRED_GLL_KEYS).toContain('mech_traitor_card'));

  it('has exactly 7 mech_ tokens', () => {
    const mechKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('mech_'));
    expect(mechKeys).toHaveLength(7);
  });
});

describe('REQUIRED_GLL_KEYS — event tokens', () => {
  it('includes event_spawn', () => expect(REQUIRED_GLL_KEYS).toContain('event_spawn'));
  it('includes event_move', () => expect(REQUIRED_GLL_KEYS).toContain('event_move'));
  it('includes event_claim', () => expect(REQUIRED_GLL_KEYS).toContain('event_claim'));
  it('includes event_assault', () => expect(REQUIRED_GLL_KEYS).toContain('event_assault'));
  it('includes event_escalate', () => expect(REQUIRED_GLL_KEYS).toContain('event_escalate'));

  it('has exactly 5 event_ tokens', () => {
    const eventKeys = REQUIRED_GLL_KEYS.filter((k) => k.startsWith('event_'));
    expect(eventKeys).toHaveLength(5);
  });
});

describe('REQUIRED_GLL_KEYS — prefix coverage', () => {
  const prefixes = ['faction', 'char_', 'loc_', 'res_', 'force_', 'artifact_', 'mech_', 'event_'];

  it('every key starts with a known prefix', () => {
    for (const key of REQUIRED_GLL_KEYS) {
      const hasKnownPrefix = prefixes.some((p) => key === p || key.startsWith(p));
      expect(hasKnownPrefix, `key "${key}" has unrecognised prefix`).toBe(true);
    }
  });

  it('prefix groups account for all 32 keys', () => {
    const counted =
      2 + // faction (2)
      5 + // char_ (5)
      6 + // loc_ (6)
      3 + // res_ (3)
      3 + // force_ (3)
      1 + // artifact_ (1)
      7 + // mech_ (7)
      5; // event_ (5)
    expect(counted).toBe(32);
    expect(REQUIRED_GLL_KEYS).toHaveLength(counted);
  });
});
