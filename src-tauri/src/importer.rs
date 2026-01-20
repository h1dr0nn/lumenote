use crate::db::{Db, FolderRecord, NoteRecord, WorkspaceRecord};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use zip::ZipArchive;

#[derive(Debug)]
struct ZipEntry {
    name: String,
    path: String,
    is_dir: bool,
    content: Option<String>,
}

pub async fn import_workspace_logic(
    db: &Db,
    zip_path: PathBuf,
    workspace_name: Option<String>,
) -> Result<String, String> {
    // Open and validate ZIP file
    let file = File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;
    
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;

    // Extract all entries from ZIP
    let mut entries: Vec<ZipEntry> = Vec::new();
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file at index {}: {}", i, e))?;
        
        let name = file.name().to_string();
        let path = name.trim_end_matches('/').to_string();
        let is_dir = file.is_dir() || name.ends_with('/');
        
        let content = if !is_dir && name.ends_with(".md") {
            let mut content = String::new();
            file.read_to_string(&mut content)
                .map_err(|e| format!("Failed to read file content {}: {}", name, e))?;
            Some(content)
        } else if !is_dir {
            // Skip non-MD files
            continue;
        } else {
            None
        };
        
        entries.push(ZipEntry {
            name: Path::new(&name)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(&name)
                .to_string(),
            path,
            is_dir,
            content,
        });
    }

    // Validate ZIP structure: must have at least one .md file or folder
    let has_md_files = entries.iter().any(|e| !e.is_dir && e.content.is_some());
    let has_folders = entries.iter().any(|e| e.is_dir);
    
    if !has_md_files && !has_folders {
        return Err("ZIP file không hợp lệ: Phải chứa ít nhất một file .md hoặc folder".to_string());
    }

    // Check if all non-directory entries are .md files
    for entry in &entries {
        if !entry.is_dir && entry.content.is_none() {
            return Err(format!("ZIP file không hợp lệ: File '{}' không phải là file .md", entry.name));
        }
    }

    // Create workspace
    let workspace_id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    
    let workspace = WorkspaceRecord {
        id: workspace_id.clone(),
        name: workspace_name.unwrap_or_else(|| {
            zip_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Imported Workspace")
                .to_string()
        }),
        color: "#4F7DF3".to_string(),
        created_at: now,
        updated_at: now,
        version: 1,
        is_deleted: false,
    };
    
    db.upsert_workspace(workspace).await?;

    // Build folder structure
    let mut folder_map: HashMap<String, String> = HashMap::new(); // path -> folder_id
    
    // Sort entries: directories first, then files
    let mut dir_entries: Vec<_> = entries.iter().filter(|e| e.is_dir).collect();
    let file_entries: Vec<_> = entries.iter().filter(|e| !e.is_dir).collect();
    
    dir_entries.sort_by(|a, b| {
        let depth_a = a.path.matches('/').count();
        let depth_b = b.path.matches('/').count();
        depth_a.cmp(&depth_b)
    });

    // Create folders recursively
    for entry in dir_entries {
        let path_parts: Vec<&str> = entry.path.split('/').filter(|s| !s.is_empty()).collect();
        if path_parts.is_empty() {
            continue;
        }
        
        let mut current_path = String::new();
        let mut parent_id: Option<String> = None;
        
        for part in path_parts.iter() {
            if !current_path.is_empty() {
                current_path.push('/');
            }
            current_path.push_str(part);
            
            if let Some(existing_id) = folder_map.get(&current_path) {
                parent_id = Some(existing_id.clone());
                continue;
            }
            
            let folder_id = uuid::Uuid::new_v4().to_string();
            folder_map.insert(current_path.clone(), folder_id.clone());
            
            // Create folder record
            let folder = FolderRecord {
                id: folder_id.clone(),
                name: part.to_string(),
                parent_id: parent_id.clone(),
                workspace_id: workspace_id.clone(),
                created_at: now,
                updated_at: now,
                version: 1,
                color: None,
                is_deleted: false,
            };
            
            db.upsert_folder(folder).await?;
            parent_id = Some(folder_id);
        }
    }

    // Create notes
    for entry in file_entries {
        if let Some(ref content) = entry.content {
            let path_parts: Vec<&str> = entry.path.split('/').filter(|s| !s.is_empty()).collect();
            
            // Get note title from filename (remove .md extension)
            let filename = entry.name.trim_end_matches(".md");
            let note_title = if filename.is_empty() { "Untitled" } else { filename };
            
            // Determine parent folder
            let folder_id = if path_parts.len() > 1 {
                // Note is in a folder
                let folder_path = path_parts[..path_parts.len() - 1].join("/");
                folder_map.get(&folder_path).cloned()
            } else {
                // Note is in root
                None
            };
            
            let note = NoteRecord {
                id: uuid::Uuid::new_v4().to_string(),
                title: note_title.to_string(),
                content: content.clone(),
                folder_id,
                workspace_id: workspace_id.clone(),
                created_at: now,
                updated_at: now,
                version: 1,
                is_deleted: false,
            };
            
            db.upsert_note(note).await?;
        }
    }

    Ok(workspace_id)
}

#[tauri::command]
pub async fn import_workspace(
    state: tauri::State<'_, crate::DbState>,
    zip_path: String,
    workspace_name: Option<String>,
) -> Result<String, String> {
    let path = PathBuf::from(zip_path);
    import_workspace_logic(&state.db, path, workspace_name).await
}
