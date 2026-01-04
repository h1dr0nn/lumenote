use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct NoteRecord {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct FolderRecord {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub color: Option<String>,
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
        sqlx::query_as::<_, NoteRecord>("SELECT * FROM notes")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn upsert_note(&self, note: NoteRecord) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO notes (id, title, content, folder_id, workspace_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                folder_id = excluded.folder_id,
                workspace_id = excluded.workspace_id,
                updated_at = excluded.updated_at",
        )
        .bind(&note.id)
        .bind(&note.title)
        .bind(&note.content)
        .bind(&note.folder_id)
        .bind(&note.workspace_id)
        .bind(note.created_at)
        .bind(note.updated_at)
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub async fn delete_note(&self, id: String) -> Result<(), String> {
        sqlx::query("DELETE FROM notes WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub async fn get_folders(&self) -> Result<Vec<FolderRecord>, String> {
        sqlx::query_as::<_, FolderRecord>("SELECT * FROM folders")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn upsert_folder(&self, folder: FolderRecord) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO folders (id, name, parent_id, workspace_id, created_at, color)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                parent_id = excluded.parent_id,
                workspace_id = excluded.workspace_id,
                color = excluded.color",
        )
        .bind(&folder.id)
        .bind(&folder.name)
        .bind(&folder.parent_id)
        .bind(&folder.workspace_id)
        .bind(folder.created_at)
        .bind(&folder.color)
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub async fn delete_folder(&self, id: String) -> Result<(), String> {
        sqlx::query("DELETE FROM folders WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
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
            FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
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
                FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
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
            color: None,
        };

        db.upsert_folder(folder).await.unwrap();

        let folders = db.get_folders().await.unwrap();
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].name, "Test Folder");
    }
}
