use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct NoteRecord {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub version: i32,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct FolderRecord {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub version: i32,
    pub color: Option<String>,
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub snippet: String,
}

pub struct Db {
    pub pool: Pool<Sqlite>,
}

impl Db {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn get_notes(&self) -> Result<Vec<NoteRecord>, String> {
        sqlx::query_as::<_, NoteRecord>("SELECT * FROM notes WHERE is_deleted = 0")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn upsert_note(&self, note: NoteRecord) -> Result<(), String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis() as i64;

        // Get old content and created_at if exists
        let old_note: Option<(String, i64, i32)> =
            sqlx::query_as("SELECT content, created_at, version FROM notes WHERE id = ?1")
                .bind(&note.id)
                .fetch_optional(&self.pool)
                .await
                .unwrap_or(None);

        let (new_version, created_at) = match old_note {
            Some((_, ca, v)) => (v + 1, ca),
            None => (1, now),
        };

        sqlx::query(
            "INSERT INTO notes (id, title, content, folder_id, workspace_id, created_at, updated_at, version)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                folder_id = excluded.folder_id,
                workspace_id = excluded.workspace_id,
                updated_at = excluded.updated_at,
                version = excluded.version,
                is_deleted = excluded.is_deleted",
        )
        .bind(&note.id)
        .bind(&note.title)
        .bind(&note.content)
        .bind(&note.folder_id)
        .bind(&note.workspace_id)
        .bind(created_at)
        .bind(now)
        .bind(new_version)
        .bind(note.is_deleted)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        // Log change if content actually changed or if it's new
        let content_changed = match old_note {
            Some((ref old_content, _, _)) => old_content != &note.content,
            None => true,
        };

        if content_changed {
            let change_id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO changes (id, note_id, old_content, new_content, timestamp, version)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .bind(change_id)
            .bind(&note.id)
            .bind(old_note.map(|(c, _, _)| c))
            .bind(&note.content)
            .bind(now)
            .bind(new_version)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub async fn apply_remote_update_note(&self, note: NoteRecord) -> Result<(), String> {
        // LWW: Only update if remote updated_at > local updated_at
        sqlx::query(
            "INSERT INTO notes (id, title, content, folder_id, workspace_id, created_at, updated_at, version, is_deleted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                folder_id = excluded.folder_id,
                workspace_id = excluded.workspace_id,
                updated_at = excluded.updated_at,
                version = excluded.version,
                is_deleted = excluded.is_deleted
             WHERE excluded.updated_at > notes.updated_at",
        )
        .bind(&note.id)
        .bind(&note.title)
        .bind(&note.content)
        .bind(&note.folder_id)
        .bind(&note.workspace_id)
        .bind(note.created_at)
        .bind(note.updated_at)
        .bind(note.version)
        .bind(note.is_deleted)
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub async fn delete_note(&self, id: String) -> Result<(), String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        sqlx::query("UPDATE notes SET is_deleted = 1, updated_at = ?1 WHERE id = ?2")
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub async fn get_folders(&self) -> Result<Vec<FolderRecord>, String> {
        sqlx::query_as::<_, FolderRecord>("SELECT * FROM folders WHERE is_deleted = 0")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn upsert_folder(&self, folder: FolderRecord) -> Result<(), String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis() as i64;

        // Get old created_at and version if exists
        let old_folder: Option<(i64, i32)> =
            sqlx::query_as("SELECT created_at, version FROM folders WHERE id = ?1")
                .bind(&folder.id)
                .fetch_optional(&self.pool)
                .await
                .unwrap_or(None);

        let (created_at, new_version) = match old_folder {
            Some((ca, v)) => (ca, v + 1),
            None => (now, 1),
        };

        sqlx::query(
            "INSERT INTO folders (id, name, parent_id, workspace_id, created_at, updated_at, version, color, is_deleted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                parent_id = excluded.parent_id,
                workspace_id = excluded.workspace_id,
                updated_at = excluded.updated_at,
                version = excluded.version,
                is_deleted = excluded.is_deleted,
                color = excluded.color",
        )
        .bind(&folder.id)
        .bind(&folder.name)
        .bind(&folder.parent_id)
        .bind(&folder.workspace_id)
        .bind(created_at)
        .bind(now)
        .bind(new_version)
        .bind(&folder.color)
        .bind(folder.is_deleted)
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub async fn apply_remote_update_folder(&self, folder: FolderRecord) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO folders (id, name, parent_id, workspace_id, created_at, updated_at, version, color, is_deleted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                parent_id = excluded.parent_id,
                workspace_id = excluded.workspace_id,
                updated_at = excluded.updated_at,
                version = excluded.version,
                is_deleted = excluded.is_deleted,
                color = excluded.color
             WHERE excluded.updated_at > folders.updated_at",
        )
        .bind(&folder.id)
        .bind(&folder.name)
        .bind(&folder.parent_id)
        .bind(&folder.workspace_id)
        .bind(folder.created_at)
        .bind(folder.updated_at)
        .bind(folder.version)
        .bind(&folder.color)
        .bind(folder.is_deleted)
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub async fn delete_folder(&self, id: String) -> Result<(), String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        sqlx::query("UPDATE folders SET is_deleted = 1, updated_at = ?1 WHERE id = ?2")
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub async fn get_sync_data(
        &self,
        since: i64,
    ) -> Result<(Vec<NoteRecord>, Vec<FolderRecord>), String> {
        let notes = sqlx::query_as::<_, NoteRecord>("SELECT * FROM notes WHERE updated_at > ?1")
            .bind(since)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let folders =
            sqlx::query_as::<_, FolderRecord>("SELECT * FROM folders WHERE updated_at > ?1")
                .bind(since)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| e.to_string())?;

        Ok((notes, folders))
    }

    pub async fn search_notes(&self, query: String) -> Result<Vec<SearchResult>, String> {
        // Prepare FTS query (add * for prefix matching)
        let fts_query = format!("{}*", query.replace("\"", "\"\""));

        sqlx::query_as::<_, SearchResult>(
            "SELECT id, title, snippet(notes_fts, 2, '<mark>', '</mark>', '...', 20) as snippet
             FROM notes_fts
             WHERE notes_fts MATCH ?1
             ORDER BY rank
             LIMIT 20",
        )
        .bind(fts_query)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())
    }
}

pub struct DbState {
    pub db: Db,
}

pub async fn init_db(app_dir: std::path::PathBuf) -> Result<Pool<Sqlite>, sqlx::Error> {
    let db_path = app_dir.join("lumenote.db");
    let db_url = format!("sqlite:{}", db_path.to_str().unwrap());

    if !db_path.exists() {
        std::fs::File::create(&db_path).unwrap();
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            workspace_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL DEFAULT 0,
            version INTEGER NOT NULL DEFAULT 1,
            is_deleted BOOLEAN NOT NULL DEFAULT 0,
            color TEXT,
            FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            folder_id TEXT,
            workspace_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            is_deleted BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
        )",
    )
    .execute(&pool)
    .await?;

    // Migration: Add columns to notes if they don't exist
    let note_info: Vec<(i64, String, String, i64, Option<String>, i64)> =
        sqlx::query_as("PRAGMA table_info(notes)")
            .fetch_all(&pool)
            .await?;

    if !note_info.iter().any(|c| c.1 == "version") {
        sqlx::query("ALTER TABLE notes ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
            .execute(&pool)
            .await?;
    }
    if !note_info.iter().any(|c| c.1 == "is_deleted") {
        sqlx::query("ALTER TABLE notes ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0")
            .execute(&pool)
            .await?;
    }

    // Migration: Add columns to folders if they don't exist
    let folder_info: Vec<(i64, String, String, i64, Option<String>, i64)> =
        sqlx::query_as("PRAGMA table_info(folders)")
            .fetch_all(&pool)
            .await?;

    if !folder_info.iter().any(|c| c.1 == "updated_at") {
        sqlx::query("ALTER TABLE folders ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0")
            .execute(&pool)
            .await?;
        // Initialize updated_at with created_at for existing folders
        sqlx::query("UPDATE folders SET updated_at = created_at WHERE updated_at = 0")
            .execute(&pool)
            .await?;
    }
    if !folder_info.iter().any(|c| c.1 == "is_deleted") {
        sqlx::query("ALTER TABLE folders ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0")
            .execute(&pool)
            .await?;
    }
    if !folder_info.iter().any(|c| c.1 == "version") {
        sqlx::query("ALTER TABLE folders ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
            .execute(&pool)
            .await?;
    }

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS changes (
            id TEXT PRIMARY KEY,
            note_id TEXT NOT NULL,
            old_content TEXT,
            new_content TEXT,
            timestamp INTEGER NOT NULL,
            version INTEGER NOT NULL,
            FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
        )",
    )
    .execute(&pool)
    .await?;

    // FTS5 Table for search
    sqlx::query(
        "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            id UNINDEXED,
            title,
            content,
            tokenize='unicode61'
        )",
    )
    .execute(&pool)
    .await?;

    // Triggers to keep FTS in sync
    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(id, title, content) VALUES (new.id, new.title, new.content);
        END;",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            DELETE FROM notes_fts WHERE id = old.id;
        END;",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            UPDATE notes_fts SET title = new.title, content = new.content WHERE id = new.id;
        END;",
    )
    .execute(&pool)
    .await?;

    // Sync existing data if FTS is empty
    let count: (i64,) = sqlx::query_as("SELECT count(*) FROM notes_fts")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    if count.0 == 0 {
        sqlx::query(
            "INSERT INTO notes_fts(id, title, content) SELECT id, title, content FROM notes",
        )
        .execute(&pool)
        .await?;
    }

    Ok(pool)
}

#[tauri::command]
pub async fn get_notes(state: tauri::State<'_, DbState>) -> Result<Vec<NoteRecord>, String> {
    state.db.get_notes().await
}

#[tauri::command]
pub async fn upsert_note(state: tauri::State<'_, DbState>, note: NoteRecord) -> Result<(), String> {
    state.db.upsert_note(note).await
}

#[tauri::command]
pub async fn delete_note(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    state.db.delete_note(id).await
}

#[tauri::command]
pub async fn get_folders(state: tauri::State<'_, DbState>) -> Result<Vec<FolderRecord>, String> {
    state.db.get_folders().await
}

#[tauri::command]
pub async fn upsert_folder(
    state: tauri::State<'_, DbState>,
    folder: FolderRecord,
) -> Result<(), String> {
    state.db.upsert_folder(folder).await
}

#[tauri::command]
pub async fn delete_folder(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    state.db.delete_folder(id).await
}

#[tauri::command]
pub async fn search_notes(
    state: tauri::State<'_, DbState>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    state.db.search_notes(query).await
}

#[tauri::command]
pub async fn apply_remote_update_note(
    state: tauri::State<'_, DbState>,
    note: NoteRecord,
) -> Result<(), String> {
    state.db.apply_remote_update_note(note).await
}

#[tauri::command]
pub async fn apply_remote_update_folder(
    state: tauri::State<'_, DbState>,
    folder: FolderRecord,
) -> Result<(), String> {
    state.db.apply_remote_update_folder(folder).await
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncDataResponse {
    pub notes: Vec<NoteRecord>,
    pub folders: Vec<FolderRecord>,
}

#[tauri::command]
pub async fn get_sync_data(
    state: tauri::State<'_, DbState>,
    since: i64,
) -> Result<SyncDataResponse, String> {
    let (notes, folders) = state.db.get_sync_data(since).await?;
    Ok(SyncDataResponse { notes, folders })
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> Db {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                workspace_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_deleted BOOLEAN NOT NULL DEFAULT 0,
                color TEXT,
                FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                folder_id TEXT,
                workspace_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                is_deleted BOOLEAN NOT NULL DEFAULT 0,
                FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS changes (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                old_content TEXT,
                new_content TEXT,
                timestamp INTEGER NOT NULL,
                version INTEGER NOT NULL,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        Db::new(pool)
    }

    #[tokio::test]
    async fn test_upsert_and_get_notes() {
        let db = setup_test_db().await;

        let note = NoteRecord {
            id: "test-note".to_string(),
            title: "Test Title".to_string(),
            content: "Test Content".to_string(),
            folder_id: None,
            workspace_id: "default".to_string(),
            created_at: 1000,
            updated_at: 1000,
            version: 1,
            is_deleted: false,
        };

        db.upsert_note(note).await.unwrap();

        let notes = db.get_notes().await.unwrap();
        assert_eq!(notes.len(), 1);
        assert_eq!(notes[0].title, "Test Title");
    }

    #[tokio::test]
    async fn test_delete_note() {
        let db = setup_test_db().await;

        let note = NoteRecord {
            id: "test-note".to_string(),
            title: "Test".to_string(),
            content: "Test".to_string(),
            folder_id: None,
            workspace_id: "default".to_string(),
            created_at: 1000,
            updated_at: 1000,
            version: 1,
            is_deleted: false,
        };

        db.upsert_note(note).await.unwrap();
        db.delete_note("test-note".to_string()).await.unwrap();

        let notes = db.get_notes().await.unwrap();
        assert_eq!(notes.len(), 0);
    }

    #[tokio::test]
    async fn test_upsert_and_get_folders() {
        let db = setup_test_db().await;

        let folder = FolderRecord {
            id: "test-folder".to_string(),
            name: "Test Folder".to_string(),
            parent_id: None,
            workspace_id: "default".to_string(),
            created_at: 1000,
            updated_at: 1000,
            version: 1,
            color: None,
            is_deleted: false,
        };

        db.upsert_folder(folder).await.unwrap();

        let folders = db.get_folders().await.unwrap();
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].name, "Test Folder");
    }

    #[tokio::test]
    async fn test_note_versioning() {
        let db = setup_test_db().await;

        let mut note = NoteRecord {
            id: "version-note".to_string(),
            title: "V1".to_string(),
            content: "Content V1".to_string(),
            folder_id: None,
            workspace_id: "default".to_string(),
            created_at: 1000,
            updated_at: 1000,
            version: 1,
            is_deleted: false,
        };

        // First insert
        db.upsert_note(note.clone()).await.unwrap();
        let notes = db.get_notes().await.unwrap();
        assert_eq!(notes[0].version, 1);

        // Update
        note.content = "Content V2".to_string();
        note.updated_at = 2000;
        db.upsert_note(note).await.unwrap();

        let notes = db.get_notes().await.unwrap();
        assert_eq!(notes[0].version, 2);
        assert_eq!(notes[0].content, "Content V2");

        // Check history
        // We use a query to check the changes table
        let changes: Vec<(Option<String>, String, i32)> =
            sqlx::query_as::<_, (Option<String>, String, i32)>(
                "SELECT old_content, new_content, version FROM changes ORDER BY version ASC",
            )
            .fetch_all(&db.pool)
            .await
            .unwrap();

        assert_eq!(changes.len(), 2);
        assert_eq!(changes[0].1, "Content V1");
        assert_eq!(changes[0].2, 1);
        assert_eq!(changes[1].0, Some("Content V1".to_string()));
        assert_eq!(changes[1].1, "Content V2");
        assert_eq!(changes[1].2, 2);
    }
}
