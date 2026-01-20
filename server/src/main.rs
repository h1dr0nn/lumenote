mod models;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use models::{SyncRequest, SyncResponse, Note, Folder, Workspace, NoteRow, FolderRow, WorkspaceRow};
use sqlx::sqlite::SqlitePoolOptions;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    pool: sqlx::SqlitePool,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "server=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:sync.db?mode=rwc".into());
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let state = AppState { pool };

    // Get sync key from environment or use default
    let default_sync_key = std::env::var("DEFAULT_SYNC_KEY")
        .unwrap_or_else(|_| "ln_opt_password".to_string());
    
    eprintln!("\n");
    eprintln!("========================================");
    eprintln!("SYNC KEY (Save this securely!):");
    eprintln!("   {}", default_sync_key);
    eprintln!("========================================");
    eprintln!("Use this key in your Lumenote app to sync");
    eprintln!("This key will NOT be shown again in logs");
    eprintln!("========================================");
    eprintln!("\n");
    
    if std::env::var("DEFAULT_SYNC_KEY").is_err() {
        tracing::warn!("Using default sync key: ln_opt_password");
        tracing::warn!("Set DEFAULT_SYNC_KEY in docker-compose.yml to use a custom key");
    } else {
        tracing::info!("Using custom sync key from environment");
    }

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/sync", post(sync_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::debug!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ok" })))
}


async fn sync_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SyncRequest>,
) -> Result<Json<SyncResponse>, (StatusCode, String)> {
    // Try both lowercase and camelCase header names (HTTP headers are case-insensitive but some libraries normalize them)
    let sync_key = headers
        .get("x-sync-key")
        .or_else(|| headers.get("X-Sync-Key"))
        .and_then(|h: &axum::http::HeaderValue| h.to_str().ok())
        .ok_or_else(|| {
            tracing::warn!("Missing x-sync-key header. Available headers: {:?}", headers.keys().map(|k| k.as_str()).collect::<Vec<_>>());
            (StatusCode::UNAUTHORIZED, "Missing x-sync-key header".to_string())
        })?;
    
    let sync_key = sync_key.to_string();
    tracing::info!("Sync request received with sync_key length: {}", sync_key.len());
    tracing::debug!("Sync payload: {} notes, {} folders, {} workspaces, last_sync_time: {}", payload.notes.len(), payload.folders.len(), payload.workspaces.len(), payload.last_sync_time);

    let now = chrono::Utc::now().timestamp_millis();

    // 1. Process received notes
    for note in payload.notes {
        // Use created_at from note if provided, otherwise use updated_at as fallback
        let created_at = note.created_at.unwrap_or(note.updated_at);
        
        sqlx::query(
            "INSERT INTO notes (id, sync_key, title, content, folder_id, workspace_id, created_at, updated_at, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                 title = excluded.title,
                 content = excluded.content,
                 folder_id = excluded.folder_id,
                 workspace_id = excluded.workspace_id,
                 updated_at = excluded.updated_at,
                 is_deleted = excluded.is_deleted
             WHERE excluded.updated_at > notes.updated_at"
        )
        .bind(&note.id)
        .bind(&sync_key)
        .bind(&note.title)
        .bind(&note.content)
        .bind(&note.folder_id)
        .bind(&note.workspace_id)
        .bind(created_at)
        .bind(note.updated_at)
        .bind(note.is_deleted)
        .execute(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 2. Process received folders
    for folder in payload.folders {
        // Use created_at from folder if provided, otherwise use updated_at as fallback
        let created_at = folder.created_at.unwrap_or(folder.updated_at);
        
        sqlx::query(
            "INSERT INTO folders (id, sync_key, name, parent_id, workspace_id, created_at, updated_at, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                 name = excluded.name,
                 parent_id = excluded.parent_id,
                 workspace_id = excluded.workspace_id,
                 updated_at = excluded.updated_at,
                 is_deleted = excluded.is_deleted
             WHERE excluded.updated_at > folders.updated_at"
        )
        .bind(&folder.id)
        .bind(&sync_key)
        .bind(&folder.name)
        .bind(&folder.parent_id)
        .bind(&folder.workspace_id)
        .bind(created_at)
        .bind(folder.updated_at)
        .bind(folder.is_deleted)
        .execute(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 3. Process received workspaces
    for workspace in payload.workspaces {
        // Use created_at from workspace if provided, otherwise use updated_at as fallback
        let created_at = workspace.created_at.unwrap_or(workspace.updated_at);
        
        sqlx::query(
            "INSERT INTO workspaces (id, sync_key, name, color, created_at, updated_at, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                 name = excluded.name,
                 color = excluded.color,
                 updated_at = excluded.updated_at,
                 is_deleted = excluded.is_deleted
             WHERE excluded.updated_at > workspaces.updated_at"
        )
        .bind(&workspace.id)
        .bind(&sync_key)
        .bind(&workspace.name)
        .bind(&workspace.color)
        .bind(created_at)
        .bind(workspace.updated_at)
        .bind(workspace.is_deleted)
        .execute(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 4. Fetch remote updates for client
    let remote_note_rows = sqlx::query_as::<_, NoteRow>(
        "SELECT id, title, content, folder_id, workspace_id, created_at, updated_at, is_deleted
         FROM notes
         WHERE sync_key = ? AND updated_at > ? AND updated_at < ?"
    )
    .bind(&sync_key)
    .bind(payload.last_sync_time)
    .bind(now)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    // Convert NoteRow to Note (with required created_at)
    let remote_notes: Vec<Note> = remote_note_rows.into_iter().map(|row| Note {
        id: row.id,
        title: row.title,
        content: row.content,
        folder_id: row.folder_id,
        workspace_id: row.workspace_id,
        created_at: Some(row.created_at),
        updated_at: row.updated_at,
        is_deleted: row.is_deleted,
    }).collect();

    let remote_folder_rows = sqlx::query_as::<_, FolderRow>(
        "SELECT id, name, parent_id, workspace_id, created_at, updated_at, is_deleted
         FROM folders
         WHERE sync_key = ? AND updated_at > ? AND updated_at < ?"
    )
    .bind(&sync_key)
    .bind(payload.last_sync_time)
    .bind(now)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    // Convert FolderRow to Folder (with required created_at)
    let remote_folders: Vec<Folder> = remote_folder_rows.into_iter().map(|row| Folder {
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        workspace_id: row.workspace_id,
        created_at: Some(row.created_at),
        updated_at: row.updated_at,
        is_deleted: row.is_deleted,
    }).collect();

    let remote_workspace_rows = sqlx::query_as::<_, WorkspaceRow>(
        "SELECT id, name, color, created_at, updated_at, is_deleted
         FROM workspaces
         WHERE sync_key = ? AND updated_at > ? AND updated_at < ?"
    )
    .bind(&sync_key)
    .bind(payload.last_sync_time)
    .bind(now)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    // Convert WorkspaceRow to Workspace (with required created_at)
    let remote_workspaces: Vec<Workspace> = remote_workspace_rows.into_iter().map(|row| Workspace {
        id: row.id,
        name: row.name,
        color: row.color,
        created_at: Some(row.created_at),
        updated_at: row.updated_at,
        is_deleted: row.is_deleted,
    }).collect();

    Ok(Json(SyncResponse {
        server_time: now,
        notes: remote_notes,
        folders: remote_folders,
        workspaces: remote_workspaces,
    }))
}
