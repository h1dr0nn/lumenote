use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub workspace_id: String,
    pub created_at: Option<i64>,  // Optional in request, required in response
    pub updated_at: i64,
    pub is_deleted: bool,
}

// Separate struct for database rows (with required created_at)
#[derive(Debug, FromRow)]
pub struct NoteRow {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub workspace_id: String,
    pub created_at: Option<i64>,  // Optional in request, required in response
    pub updated_at: i64,
    pub is_deleted: bool,
}

// Separate struct for database rows (with required created_at)
#[derive(Debug, FromRow)]
pub struct FolderRow {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: Option<i64>,  // Optional in request, required in response
    pub updated_at: i64,
    pub is_deleted: bool,
}

// Separate struct for database rows (with required created_at)
#[derive(Debug, FromRow)]
pub struct WorkspaceRow {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncRequest {
    pub last_sync_time: i64,
    pub notes: Vec<Note>,
    pub folders: Vec<Folder>,
    pub workspaces: Vec<Workspace>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResponse {
    pub server_time: i64,
    pub notes: Vec<Note>,
    pub folders: Vec<Folder>,
    pub workspaces: Vec<Workspace>,
}
