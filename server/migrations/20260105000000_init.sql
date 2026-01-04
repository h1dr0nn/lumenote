CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    sync_key TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    folder_id TEXT,
    workspace_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    sync_key TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    workspace_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notes_sync_key ON notes(sync_key);
CREATE INDEX IF NOT EXISTS idx_folders_sync_key ON folders(sync_key);
