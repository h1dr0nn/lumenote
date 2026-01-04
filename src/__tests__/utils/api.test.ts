import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, NoteRecord, FolderRecord } from '../../utils/api';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('api utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call get_notes command', async () => {
        (invoke as any).mockResolvedValue([]);
        await api.getNotes();
        expect(invoke).toHaveBeenCalledWith('get_notes');
    });

    it('should call upsert_note command with correct args', async () => {
        const note: NoteRecord = {
            id: '1',
            title: 'Test',
            content: 'Content',
            folder_id: null,
            workspace_id: 'default',
            created_at: 100,
            updated_at: 100,
        };
        await api.upsertNote(note);
        expect(invoke).toHaveBeenCalledWith('upsert_note', { note });
    });

    it('should call delete_note command', async () => {
        await api.deleteNote('1');
        expect(invoke).toHaveBeenCalledWith('delete_note', { id: '1' });
    });

    it('should call get_folders command', async () => {
        (invoke as any).mockResolvedValue([]);
        await api.getFolders();
        expect(invoke).toHaveBeenCalledWith('get_folders');
    });

    it('should call upsert_folder command', async () => {
        const folder: FolderRecord = {
            id: 'f1',
            name: 'Folder',
            parent_id: null,
            workspace_id: 'default',
            created_at: 100,
        };
        await api.upsertFolder(folder);
        expect(invoke).toHaveBeenCalledWith('upsert_folder', { folder });
    });

    it('should call delete_folder command', async () => {
        await api.deleteFolder('f1');
        expect(invoke).toHaveBeenCalledWith('delete_folder', { id: 'f1' });
    });
});
