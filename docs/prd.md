# Iron Throne of Ashes — Product Requirements Document

> **Status:** Pre-production
> **Version:** 1.0
> **Last Updated:** YYYY-MM-DD
> **Author:** [Your name]

---

## Executive Summary

Iron Throne of Ashes is a digital board game of dynastic rivalry and cooperative threat management built on the Alliance Engine. Four Arch-Regents compete for territory control while collectively managing the Doom Toll — a shared loss condition driven by an autonomous AI antagonist (the Shadowking). The game ships for PC (Steam) primary and Mobile (iOS/Android) secondary, targeting 2–4 players (human + AI fill) with 60–90 minute sessions. The Alliance Engine uses GLL tokenization, meaning all in-world nouns are swappable content wrappers, enabling future reskins without engine changes.

---

## Overview

Iron Throne of Ashes is built on the Alliance Engine — a system designed so that no in-world noun is hardcoded in game logic. All nouns function as GLL tokens (swappable content wrappers), enabling future reskins such as Sea of Knives and Verdant Collapse without requiring engine changes.

The game features three play modes — Competitive, Cooperative, and Blood Pact (Traitor) — all of which use the same board, the same rules, and the same Behavior Card system. Mode selection changes only the win/loss conditions and whether the Blood Pact card is in circulation.

No player is eliminated during play. The Broken Court state replaces elimination entirely, and players in Broken Court must always be able to participate in the Voting Phase. This is a core design commitment, not an edge case.

---

## Goals

> *No content yet — see template instructions in docs/other/prd-pre-migration.md*

---

## Non-Goals

> *No content yet — see template instructions in docs/other/prd-pre-migration.md*

---

## User Stories

> *No content yet — see template instructions in docs/other/prd-pre-migration.md*

---

## Technical Constraints

- The Alliance Engine must treat all in-world nouns as GLL tokens. No noun may be hardcoded in game logic. This enables future reskins (Sea of Knives, Verdant Collapse) without engine changes.
- Behavior Card execution must be fully deterministic from a given seed. Simulation reproducibility is required for balance testing.
- The voting phase must resolve before any player's action phase in a given round. Order cannot be player-configurable.
- Broken Court state must never prevent a player from participating in the Voting Phase. This is a core design commitment, not an edge case.

---

## Feature Specifications

**Build priority notation:** P0 = launch blocker · P1 = launch required · P2 = post-launch v1.1 · P3 = roadmap

---

### F-001 — Board: The Known Lands

**Priority:** P0

**Description:** A point-to-point graph of 28 Stronghold nodes representing the Known Lands. Connections between nodes define legal movement paths. The board is fixed per game session — no procedural generation.

**Node types:**

- Standard Stronghold (22 nodes) — claimable, no production bonus
- Forge Keep Stronghold (4 nodes) — claimable, grants +3 War Banners/turn to controlling Court (vs. +1 elsewhere)
- Dark Fortress (1 node) — Shadowking home position, not claimable by players, target for Herald diplomatic action
- Hall of Neutrality (1 node) — Heartstone starting position, neutral territory

**Constraints:**

- Forge Keep nodes must be positioned so each Court's starting position has equal path distance to the nearest Forge Keep (±1 node)
- Dark Fortress must not be adjacent to any Court's starting Keep
- Each Court's starting Keep is pre-claimed at game start (not available to other Courts in round 1)

**Acceptance criteria:**

- Board renders correctly at 1080p and 2560×1440
- All 28 nodes are individually selectable with hit area ≥ 44×44px
- Connection paths render as distinct lines, not overlapping
- Forge Keep nodes are visually distinct from Standard Strongholds at a glance (no label required)

---

### F-002 — Resource: War Banners

**Priority:** P0

**Description:** The single unified resource. War Banners pay for all player actions: movement between nodes (1 Banner per node traversed), Stronghold claiming (1 Banner), combat vessel strength (additive to character power in War Field), and Fate Card draws (via Arch-Regent level, not direct spend).

**Generation:**

- Each Artificer in a Fellowship generates 1 War Banner per turn
- An Artificer at a Forge Keep Stronghold generates 3 War Banners per turn instead
- War Banners do not persist between rounds — unspent Banners are discarded at round end

**Constraints:**

- War Banner count is always visible to all players (open information)
- A player with 0 War Banners may still participate in the Voting Phase (costs Fate Cards, not Banners)
- War Banner count contributes additively to combat strength in the War Field

**Acceptance criteria:**

- War Banner count updates immediately on production, spend, or discard
- The UI clearly distinguishes between current Banners and Banners generated this turn before spend
- Zero-Banner state is visually distinct (cannot be confused with a full hand)

---

### F-003 — Characters: Fellowship Composition

**Priority:** P0

**Description:** Each player controls a Fellowship — a set of character pieces with distinct mechanical roles. Fellows are recruited during the game; the starting Fellowship is fixed.

**Starting Fellowship (all Courts):**

- 1× Arch-Regent (Power Level 8, always present, cannot be lost)
- 1× Knight (Power Level 6)
- 1× Herald (Power Level 0)
- 1× Artificer (Power Level 3)

**Character roles:**

| Character | Power Level | Special Rule |
|-----------|-------------|--------------|
> *Table content from existing PRD was truncated at source — remaining rows not available.*
