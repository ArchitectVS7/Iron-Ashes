// GENERATED — DO NOT EDIT. Source: data/board-v3.json. Run: npm run gen:data
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
        "approach-ne",
        "approach-sw",
        "mid-n",
        "mid-w"
      ],
      "id": "approach-nw",
      "income": 0,
      "quadrant": 0,
      "tier": "approach"
    },
    {
      "connections": [
        "keystone",
        "approach-nw",
        "approach-se",
        "mid-n",
        "mid-e"
      ],
      "id": "approach-ne",
      "income": 0,
      "quadrant": 1,
      "tier": "approach"
    },
    {
      "connections": [
        "keystone",
        "approach-ne",
        "approach-sw",
        "mid-e",
        "mid-s"
      ],
      "id": "approach-se",
      "income": 0,
      "quadrant": 2,
      "tier": "approach"
    },
    {
      "connections": [
        "keystone",
        "approach-nw",
        "approach-se",
        "mid-s",
        "mid-w"
      ],
      "id": "approach-sw",
      "income": 0,
      "quadrant": 3,
      "tier": "approach"
    },
    {
      "connections": [
        "keep-n",
        "keep-w",
        "mid-n",
        "mid-w"
      ],
      "id": "forge-nw",
      "income": 3,
      "quadrant": 0,
      "tier": "forge"
    },
    {
      "connections": [
        "keep-e",
        "keep-n",
        "mid-n",
        "mid-e"
      ],
      "id": "forge-ne",
      "income": 3,
      "quadrant": 1,
      "tier": "forge"
    },
    {
      "connections": [
        "keep-s",
        "keep-e",
        "mid-e",
        "mid-s"
      ],
      "id": "forge-se",
      "income": 3,
      "quadrant": 2,
      "tier": "forge"
    },
    {
      "connections": [
        "keep-w",
        "keep-s",
        "mid-s",
        "mid-w"
      ],
      "id": "forge-sw",
      "income": 3,
      "quadrant": 3,
      "tier": "forge"
    },
    {
      "connections": [
        "forge-nw",
        "forge-ne",
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
        "forge-se",
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
        "forge-sw",
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
        "forge-nw",
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
        "keep-e",
        "mid-n",
        "mid-e"
      ],
      "id": "holding-ne",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "keep-e",
        "keep-s",
        "mid-e",
        "mid-s"
      ],
      "id": "holding-se",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "keep-s",
        "keep-w",
        "mid-s",
        "mid-w"
      ],
      "id": "holding-sw",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "keep-w",
        "keep-n",
        "mid-w",
        "mid-n"
      ],
      "id": "holding-nw",
      "income": 1,
      "quadrant": null,
      "tier": "holding"
    },
    {
      "connections": [
        "approach-nw",
        "approach-ne",
        "holding-ne",
        "holding-nw",
        "forge-nw",
        "forge-ne"
      ],
      "id": "mid-n",
      "income": 0,
      "quadrant": 0,
      "tier": "mid"
    },
    {
      "connections": [
        "approach-ne",
        "approach-se",
        "holding-ne",
        "holding-se",
        "forge-ne",
        "forge-se"
      ],
      "id": "mid-e",
      "income": 0,
      "quadrant": 1,
      "tier": "mid"
    },
    {
      "connections": [
        "approach-se",
        "approach-sw",
        "holding-se",
        "holding-sw",
        "forge-se",
        "forge-sw"
      ],
      "id": "mid-s",
      "income": 0,
      "quadrant": 2,
      "tier": "mid"
    },
    {
      "connections": [
        "approach-sw",
        "approach-nw",
        "holding-sw",
        "holding-nw",
        "forge-sw",
        "forge-nw"
      ],
      "id": "mid-w",
      "income": 0,
      "quadrant": 3,
      "tier": "mid"
    }
  ]
} as const;
