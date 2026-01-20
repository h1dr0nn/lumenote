use crate::db::{Db, FolderRecord, NoteRecord};
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use zip::write::{FileOptions, ZipWriter};
use zip::CompressionMethod;

pub async fn export_workspace_logic(
    db: &Db,
    workspace_id: String,
    zip_path: PathBuf,
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

    // Create zip file
    let file = File::create(&zip_path)
        .map_err(|e| format!("Failed to create zip file {:?}: {}", zip_path, e))?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o755);

    // Export logic - add files to zip
    export_folder_recursive(None, &ws_notes, &ws_folders, &mut zip, &options, "")?;

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip file: {}", e))?;

    Ok(())
}

fn export_folder_recursive(
    parent_id: Option<String>,
    notes: &[NoteRecord],
    folders: &[FolderRecord],
    zip: &mut ZipWriter<File>,
    options: &FileOptions,
    current_path: &str,
) -> Result<(), String> {
    // Export notes in this folder
    for note in notes.iter().filter(|n| n.folder_id == parent_id) {
        let safe_title = sanitize_filename(&note.title);
        let filename = if safe_title.is_empty() {
            "Untitled.md".to_string()
        } else {
            format!("{}.md", safe_title)
        };

        let zip_path = if current_path.is_empty() {
            filename.clone()
        } else {
            format!("{}/{}", current_path, filename)
        };

        zip.start_file(&zip_path, *options)
            .map_err(|e| format!("Failed to add file to zip: {}", e))?;
        zip.write_all(note.content.as_bytes())
            .map_err(|e| format!("Failed to write content to zip: {}", e))?;
    }

    // Recurse into subfolders
    for folder in folders.iter().filter(|f| f.parent_id == parent_id) {
        let subfolder_name = sanitize_filename(&folder.name);
        let folder_name = if subfolder_name.is_empty() {
            "Untitled Folder"
        } else {
            &subfolder_name
        };

        let subfolder_path = if current_path.is_empty() {
            folder_name.to_string()
        } else {
            format!("{}/{}", current_path, folder_name)
        };

        export_folder_recursive(
            Some(folder.id.clone()),
            notes,
            folders,
            zip,
            options,
            &subfolder_path,
        )?;
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
