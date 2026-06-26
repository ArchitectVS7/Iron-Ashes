// GENERATED — DO NOT EDIT. Source: data/board.json. Run: npm run gen:data
export const BOARD_DATA = {
  "approachIds": [
    "approach-nw",
    "approach-ne",
    "approach-se",
    "approach-sw"
  ],
  "blightEntrySeams": [
    "holding-ne",
    "holding-se",
    "holding-sw",
    "holding-nw"
  ],
  "forgeIds": [
    "forge-nw",
    "forge-ne",
    "forge-se",
    "forge-sw"
  ],
  "holdingIds": [
    "holding-ne",
    "holding-se",
    "holding-sw",
    "holding-nw"
  ],
  "keepIds": [
    "keep-n",
    "keep-e",
    "keep-s",
    "keep-w"
  ],
  "keystoneId": "keystone",
  "nodes": [
    {
      "connections": [
        "approach-nw",
        "approach-ne",
        "approach-se",
        "approach-sw"
      ],
      "id": "keystone",
      "income": 0,
      "quadrant": null,
      "tier": "keystone"
    },
    {
      "connections": [
        "keystone",
        "forge-nw",
        "approach-ne",
        "approach-sw"
      ],
      "id": "approach-nw",
      "income": 0,
      "quadrant": 0,
      "tier": "approach"
    },
    {
      "connections": [
        "keystone",
        "forge-ne",
        "approach-nw",
        "approach-se"
      ],
      "id": "approach-ne",
      "income": 0,
      "quadrant": 1,
      "tier": "approach"
    },
    {
      "connections": [
        "keystone",
        "forge-se",
        "approach-ne",
        "approach-sw"
      ],
      "id": "approach-se",
      "income": 0,
      "quadrant": 2,
      "tier": "approach"
    },
    {
      "connections": [
        "keystone",
        "forge-sw",
        "approach-nw",
        "approach-se"
      ],
      "id": "approach-sw",
      "income": 0,
      "quadrant": 3,
      "tier": "approach"
    },
    {
      "connections": [
        "approach-nw",
        "keep-n",
        "forge-ne",
        "forge-sw"
      ],
      "id": "forge-nw",
      "income": 3,
      "quadrant": 0,
      "tier": "forge"
    },
    {
      "connections": [
        "approach-ne",
        "keep-e",
        "forge-nw",
        "forge-se"
      ],
      "id": "forge-ne",
      "income": 3,
      "quadrant": 1,
      "tier": "forge"
    },
    {
      "connections": [
        "approach-se",
        "keep-s",
        "forge-ne",
        "forge-sw"
      ],
      "id": "forge-se",
      "income": 3,
      "quadrant": 2,
      "tier": "forge"
    },
    {
      "connections": [
        "approach-sw",
        "keep-w",
        "forge-se",
        "forge-nw"
      ],
      "id": "forge-sw",
      "income": 3,
      "quadrant": 3,
      "tier": "forge"
    },
    {
      "connections": [
        "forge-nw",
        "holding-ne",
        "holding-nw"
      ],
      "id": "keep-n",
      "income": 1,
      "quadrant": 0,
      "tier": "keep"
    },
    {
      "connections": [
        "forge-ne",
        "holding-ne",
        "holding-se"
      ],
      "id": "keep-e",
      "income": 1,
      "quadrant": 1,
      "tier": "keep"
    },
    {
      "connections": [
        "forge-se",
        "holding-se",
        "holding-sw"
      ],
      "id": "keep-s",
      "income": 1,
      "quadrant": 2,
      "tier": "keep"
    },
    {
      "connections": [
        "forge-sw",
        "holding-sw",
        "holding-nw"
      ],
      "id": "keep-w",
      "income": 1,
      "quadrant": 3,
      "tier": "keep"
    },
    {
      "connections": [
        "keep-n",
        "keep-e"
      ],
      "id": "holding-ne",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "keep-e",
        "keep-s"
      ],
      "id": "holding-se",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "keep-s",
        "keep-w"
      ],
      "id": "holding-sw",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "keep-w",
        "keep-n"
      ],
      "id": "holding-nw",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    }
  ]
} as const;
