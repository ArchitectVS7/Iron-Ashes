-- server/src/db/schema.sql
-- Persistent server-side game state storage schema for Iron Ashes.

-- Sessions table stores the authoritative game state and metadata
CREATE TABLE IF NOT EXISTS game_sessions (
    id VARCHAR(255) PRIMARY KEY,
    mode VARCHAR(50) NOT NULL,
    seed VARCHAR(255) NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Players table tracks physical connections and AI substitutions
CREATE TABLE IF NOT EXISTS session_players (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_index INTEGER NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    ai_difficulty VARCHAR(50),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, player_index)
);

-- Indices for rapid lookup during reconnection
CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
