import { invoke } from '@tauri-apps/api/core';
import { Note, Folder } from '../types';

export interface NoteRecord {
    id: string;
    title: string;
    content: string;
    folder_id: string | null;
    workspace_id: string;
    created_at: number;
    updated_at: number;
}

export interface FolderRecord {
    id: string;
    name: string;
    parent_id: string | null;
    workspace_id: string;
    created_at: number;
    color?: string | null;
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

    searchNotes: (query: string) => invoke<SearchResult[]>('search_notes', { query }),
};
