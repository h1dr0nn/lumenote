use crate::db::{Db, FolderRecord, NoteRecord};
use std::fs;
use std::path::{Path, PathBuf};

pub async fn export_workspace_logic(
    db: &Db,
    workspace_id: String,
    base_path: PathBuf,
) -> Result<(), String> {
    let notes = db.get_notes().await?;
    let folders = db.get_folders().await?;

    let ws_notes: Vec<NoteRecord> = notes
        .into_iter()
        .filter(|n| n.workspace_id == workspace_id)
        .collect();
    let ws_folders: Vec<FolderRecord> = folders
        .into_iter()
        .filter(|f| f.workspace_id == workspace_id)
        .collect();

    // Export logic
    export_folder_recursive(None, &ws_notes, &ws_folders, &base_path)?;

    Ok(())
}

fn export_folder_recursive(
    parent_id: Option<String>,
    notes: &[NoteRecord],
    folders: &[FolderRecord],
    current_path: &Path,
) -> Result<(), String> {
    if !current_path.exists() {
        fs::create_dir_all(current_path)
            .map_err(|e| format!("Failed to create directory {:?}: {}", current_path, e))?;
    }

    // Export notes in this folder
    for note in notes.iter().filter(|n| n.folder_id == parent_id) {
        let safe_title = sanitize_filename(&note.title);
        let mut filename = if safe_title.is_empty() {
            "Untitled".to_string()
        } else {
            safe_title
        };
        filename.push_str(".md");

        let file_path = current_path.join(filename);
        fs::write(&file_path, &note.content)
            .map_err(|e| format!("Failed to write file {:?}: {}", file_path, e))?;
    }

    // Recurse into subfolders
    for folder in folders.iter().filter(|f| f.parent_id == parent_id) {
        let subfolder_name = sanitize_filename(&folder.name);
        let subfolder_path = current_path.join(if subfolder_name.is_empty() {
            "Untitled Folder".to_string()
        } else {
            subfolder_name
        });
        export_folder_recursive(Some(folder.id.clone()), notes, folders, &subfolder_path)?;
    }

    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[tauri::command]
pub async fn export_workspace(
    state: tauri::State<'_, crate::DbState>,
    workspace_id: String,
    base_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(base_path);
    export_workspace_logic(&state.db, workspace_id, path).await
}

#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file at {}: {}", path, e))
}
