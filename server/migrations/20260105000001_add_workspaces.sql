CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    sync_key TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workspaces_sync_key ON workspaces(sync_key);
