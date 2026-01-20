mod db;
mod exporter;
mod importer;

use db::{
    apply_remote_update_folder, apply_remote_update_note, apply_remote_update_workspace,
    delete_folder, delete_note, delete_workspace, get_folders,
    get_notes, get_sync_data, get_workspaces, init_db, search_notes, upsert_folder, upsert_note,
    upsert_workspace, DbState,
};
use exporter::{export_workspace, write_text_file};
use importer::import_workspace;
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_notes,
            upsert_note,
            delete_note,
            get_folders,
            upsert_folder,
            delete_folder,
            get_workspaces,
            upsert_workspace,
            delete_workspace,
            search_notes,
            export_workspace,
            import_workspace,
            write_text_file,
            get_sync_data,
            apply_remote_update_note,
            apply_remote_update_folder,
            apply_remote_update_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
