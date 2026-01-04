mod db;

use db::{
    delete_folder, delete_note, get_folders, get_notes, init_db, upsert_folder, upsert_note,
    DbState,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            // Ensure app directory exists
            if !app_dir.exists() {
                std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            }

            tauri::async_runtime::block_on(async move {
                let pool = init_db(app_dir).await.expect("failed to init db");
                app_handle.manage(DbState {
                    db: db::Db::new(pool),
                });
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_notes,
            upsert_note,
            delete_note,
            get_folders,
            upsert_folder,
            delete_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
