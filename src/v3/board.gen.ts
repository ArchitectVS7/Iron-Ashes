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
        "forge-nw",
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
        "forge-ne",
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
        "forge-se",
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
        "forge-sw",
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
        "approach-nw",
        "keep-n",
        "keep-w"
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
        "keep-n"
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
        "keep-e"
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
        "keep-s"
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
        "holding-nw",
        "mid-n"
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
        "holding-se",
        "mid-e"
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
        "holding-sw",
        "mid-s"
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
        "holding-nw",
        "mid-w"
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
        "keep-n",
        "holding-ne",
        "holding-nw",
        "mid-e",
        "mid-w"
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
        "keep-e",
        "holding-ne",
        "holding-se",
        "mid-n",
        "mid-s"
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
        "keep-s",
        "holding-se",
        "holding-sw",
        "mid-e",
        "mid-w"
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
        "keep-w",
        "holding-sw",
        "holding-nw",
        "mid-n",
        "mid-s"
      ],
      "id": "mid-w",
      "income": 0,
      "quadrant": 3,
      "tier": "mid"
    }
  ]
} as const;
