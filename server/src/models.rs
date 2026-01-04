use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub workspace_id: String,
    pub updated_at: i64,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub workspace_id: String,
    pub updated_at: i64,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncRequest {
    pub last_sync_time: i64,
    pub notes: Vec<Note>,
    pub folders: Vec<Folder>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResponse {
    pub server_time: i64,
    pub notes: Vec<Note>,
    pub folders: Vec<Folder>,
}
