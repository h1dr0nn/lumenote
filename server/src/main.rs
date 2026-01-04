mod models;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use models::{SyncRequest, SyncResponse, Note, Folder};
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
    let sync_key = headers
        .get("x-sync-key")
        .and_then(|h: &axum::http::HeaderValue| h.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Missing x-sync-key".to_string()))?
        .to_string();

    let now = chrono::Utc::now().timestamp_millis();

    // 1. Process received notes
    for note in payload.notes {
        sqlx::query(
            "INSERT INTO notes (id, sync_key, title, content, folder_id, workspace_id, updated_at, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        .bind(note.updated_at)
        .bind(note.is_deleted)
        .execute(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 2. Process received folders
    for folder in payload.folders {
        sqlx::query(
            "INSERT INTO folders (id, sync_key, name, parent_id, workspace_id, updated_at, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?)
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
        .bind(folder.updated_at)
        .bind(folder.is_deleted)
        .execute(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // 3. Fetch remote updates for client
    let remote_notes = sqlx::query_as::<_, Note>(
        "SELECT id, title, content, folder_id, workspace_id, updated_at, is_deleted
         FROM notes
         WHERE sync_key = ? AND updated_at > ? AND updated_at < ?"
    )
    .bind(&sync_key)
    .bind(payload.last_sync_time)
    .bind(now)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let remote_folders = sqlx::query_as::<_, Folder>(
        "SELECT id, name, parent_id, workspace_id, updated_at, is_deleted
         FROM folders
         WHERE sync_key = ? AND updated_at > ? AND updated_at < ?"
    )
    .bind(&sync_key)
    .bind(payload.last_sync_time)
    .bind(now)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SyncResponse {
        server_time: now,
        notes: remote_notes,
        folders: remote_folders,
    }))
}
