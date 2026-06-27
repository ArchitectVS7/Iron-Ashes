// GENERATED — DO NOT EDIT. Source: data/archetypes.json. Run: npm run gen:data
export const ARCHETYPE_DATA = {
  "aggressor": {
    "label": "Aggressor (raids, hunts the leader)",
    "policy": {
      "aggression": 0.9,
      "bailoutTrust": 0.2,
      "claimVsRaidPref": 0.3,
      "darkHuntBias": 0.7,
      "defensiveness": 0.1,
      "forgeValuation": 0.7,
      "gambitAmbition": 0.2,
      "gambitContest": 0.9,
      "handReserve": 1,
      "heraldAffinity": 0.05,
      "oathLoyalty": 0.45,
      "oathWillingness": 0.2,
      "parleyBias": 0.2,
      "pledgeGenerosity": 0.6,
      "raidLeaderBias": 0.7,
      "rescueWillingness": 0.2,
      "selfishness": 0.6,
      "targetCover": 0.4
    }
  },
  "cooperator": {
    "label": "Cooperator (high pledge, rescues, no raiding)",
    "policy": {
      "aggression": 0,
      "bailoutTrust": 0.85,
      "claimVsRaidPref": 0.8,
      "darkHuntBias": 0.6,
      "defensiveness": 0.4,
      "forgeValuation": 0.2,
      "gambitAmbition": 0,
      "gambitContest": 0.4,
      "handReserve": 1,
      "heraldAffinity": 0.6,
      "oathLoyalty": 0.95,
      "oathWillingness": 0.8,
      "parleyBias": 0.7,
      "pledgeGenerosity": 1.6,
      "raidLeaderBias": 0,
      "rescueWillingness": 0.9,
      "selfishness": 0,
      "targetCover": 0.6
    }
  },
  "gambler": {
    "label": "Gambler (pursues the Crown's Gambit)",
    "policy": {
      "aggression": 0.4,
      "claimVsRaidPref": 0.4,
      "darkHuntBias": 0.1,
      "defensiveness": 0.1,
      "forgeValuation": 0.8,
      "gambitAmbition": 0.9,
      "handReserve": 1,
      "heraldAffinity": 0,
      "oathLoyalty": 0.5,
      "oathWillingness": 0.2,
      "parleyBias": 0,
      "pledgeGenerosity": 0.7,
      "raidLeaderBias": 0.3,
      "rescueWillingness": 0,
      "selfishness": 0.5,
      "targetCover": 0.5
    }
  },
  "opportunist": {
    "label": "Opportunist (situational, steers the dark)",
    "policy": {
      "aggression": 0.5,
      "bailoutTrust": 0.4,
      "claimVsRaidPref": 0.5,
      "darkHuntBias": 0.5,
      "defensiveness": 0.3,
      "forgeValuation": 0.6,
      "gambitAmbition": 0.3,
      "gambitContest": 0.8,
      "handReserve": 1,
      "heraldAffinity": 0.4,
      "oathLoyalty": 0.5,
      "oathWillingness": 0.5,
      "parleyBias": 0.5,
      "pledgeGenerosity": 0.9,
      "raidLeaderBias": 0.9,
      "rescueWillingness": 0.5,
      "selfishness": 0.4,
      "targetCover": 0.5
    }
  },
  "saboteur": {
    "label": "Saboteur (Blood Pact traitor — suppresses pledges, feeds the dark)",
    "policy": {
      "aggression": 0.4,
      "claimVsRaidPref": 0.5,
      "darkHuntBias": 0.3,
      "defensiveness": 0.2,
      "forgeValuation": 0.4,
      "gambitAmbition": 0,
      "gambitContest": 0.6,
      "handReserve": 1,
      "heraldAffinity": 0.2,
      "oathLoyalty": 0.45,
      "oathWillingness": 0.4,
      "parleyBias": 0.3,
      "pledgeGenerosity": 0.8,
      "raidLeaderBias": 0.4,
      "rescueWillingness": 0.3,
      "saboteurPledgeSuppression": 0.8,
      "selfishness": 0.6,
      "targetCover": 0.4
    }
  },
  "turtle": {
    "label": "Turtle (defensive, holds & pledges)",
    "policy": {
      "aggression": 0.05,
      "bailoutTrust": 0.7,
      "claimVsRaidPref": 0.9,
      "darkHuntBias": 0.5,
      "defensiveness": 0.9,
      "forgeValuation": 0.3,
      "gambitAmbition": 0,
      "gambitContest": 0.5,
      "handReserve": 1,
      "heraldAffinity": 0.7,
      "oathLoyalty": 0.9,
      "oathWillingness": 0.6,
      "parleyBias": 0.8,
      "pledgeGenerosity": 0.8,
      "raidLeaderBias": 0,
      "rescueWillingness": 0.6,
      "selfishness": 0.2,
      "targetCover": 0.7
    }
  }
} as const;
