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

export interface WorkspaceRecord {
    id: string;
    name: string;
    color: string;
    created_at: number;
    updated_at: number;
    version: number;
    is_deleted?: boolean;
}

export interface SyncDataResponse {
    notes: NoteRecord[];
    folders: FolderRecord[];
    workspaces: WorkspaceRecord[];
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

    getWorkspaces: () => invoke<WorkspaceRecord[]>('get_workspaces'),
    upsertWorkspace: (workspace: WorkspaceRecord) => invoke<void>('upsert_workspace', { workspace }),
    deleteWorkspace: (id: string) => invoke<void>('delete_workspace', { id }),

    getSyncData: (since: number) => invoke<SyncDataResponse>('get_sync_data', { since }),
    applyRemoteUpdateNote: (note: NoteRecord) => invoke<void>('apply_remote_update_note', { note }),
    applyRemoteUpdateFolder: (folder: FolderRecord) => invoke<void>('apply_remote_update_folder', { folder }),
    applyRemoteUpdateWorkspace: (workspace: WorkspaceRecord) => invoke<void>('apply_remote_update_workspace', { workspace }),

    searchNotes: (query: string) => invoke<SearchResult[]>('search_notes', { query }),
    exportWorkspace: (workspaceId: string, basePath: string) => invoke<void>('export_workspace', { workspaceId, basePath }),
    importWorkspace: (zipPath: string, workspaceName?: string) => invoke<string>('import_workspace', { zipPath, workspaceName }),

    // Sync Server API
    syncWithServer: async (url: string, syncKey: string, payload: any) => {
        console.log('Syncing with server:', { url, syncKeyLength: syncKey?.length, payloadSize: JSON.stringify(payload).length });
        
        const response = await fetch(`${url}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Key': syncKey,
            },
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            console.error('Sync failed:', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                url,
                syncKeyPresent: !!syncKey,
            });
            throw new Error(`Sync failed (${response.status}): ${errorText || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Sync response received:', { serverTime: data.server_time, notesCount: data.notes?.length, foldersCount: data.folders?.length });
        return data;
    }
};
