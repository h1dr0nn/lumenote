import { invoke } from '@tauri-apps/api/core';

export interface NoteRecord {
    id: string;
    title: string;
    content: string;
    folder_id: string | null;
    workspace_id: string;
    created_at: number;
    updated_at: number;
    version: number;
    is_deleted?: boolean;
}

export interface FolderRecord {
    id: string;
    name: string;
    parent_id: string | null;
    workspace_id: string;
    created_at: number;
    updated_at: number;
    version: number;
    color?: string | null;
    is_deleted?: boolean;
}

export interface SyncDataResponse {
    notes: NoteRecord[];
    folders: FolderRecord[];
}

export interface SearchResult {
    id: string;
    title: string;
    snippet: string;
}

export const api = {
    getNotes: () => invoke<NoteRecord[]>('get_notes'),
    upsertNote: (note: NoteRecord) => invoke<void>('upsert_note', { note }),
    deleteNote: (id: string) => invoke<void>('delete_note', { id }),
    
    getFolders: () => invoke<FolderRecord[]>('get_folders'),
    upsertFolder: (folder: FolderRecord) => invoke<void>('upsert_folder', { folder }),
    deleteFolder: (id: string) => invoke<void>('delete_folder', { id }),

    getSyncData: (since: number) => invoke<SyncDataResponse>('get_sync_data', { since }),
    applyRemoteUpdateNote: (note: NoteRecord) => invoke<void>('apply_remote_update_note', { note }),
    applyRemoteUpdateFolder: (folder: FolderRecord) => invoke<void>('apply_remote_update_folder', { folder }),

    searchNotes: (query: string) => invoke<SearchResult[]>('search_notes', { query }),
    exportWorkspace: (workspaceId: string, basePath: string) => invoke<void>('export_workspace', { workspaceId, basePath }),

    // Sync Server API
    syncWithServer: async (url: string, syncKey: string, payload: any) => {
        const response = await fetch(`${url}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Key': syncKey,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
        }
        return response.json();
    }
};
