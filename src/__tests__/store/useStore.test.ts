import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../../store/useStore';
import { api, NoteRecord, FolderRecord } from '../../utils/api';

vi.mock('../../utils/api', () => ({
    api: {
        getNotes: vi.fn(() => Promise.resolve([])),
        getFolders: vi.fn(() => Promise.resolve([])),
        upsertNote: vi.fn(() => Promise.resolve()),
        deleteNote: vi.fn(() => Promise.resolve()),
        upsertFolder: vi.fn(() => Promise.resolve()),
        deleteFolder: vi.fn(() => Promise.resolve()),
    }
}));

describe('useStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        // Reset store to initial state
        useStore.setState({
            notes: [
                {
                    id: '1',
                    title: 'Test Note',
                    content: '# Test\n\nContent',
                    workspaceId: 'default',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                }
            ],
            folders: [],
            activeNoteId: '1',
            activeWorkspaceId: 'default',
            viewMode: 'view',
        });
    });

    it('should initialize store from backend API', async () => {
        const mockNotes: NoteRecord[] = [
            { id: '2', title: 'Remote Note', content: 'Remote', folder_id: null, workspace_id: 'default', created_at: 100, updated_at: 100, version: 1 }
        ];
        const mockFolders: FolderRecord[] = [
            { id: 'f1', name: 'Remote Folder', parent_id: null, workspace_id: 'default', created_at: 100, updated_at: 100, version: 1 }
        ];

        (api.getNotes as any).mockResolvedValue(mockNotes);
        (api.getFolders as any).mockResolvedValue(mockFolders);

        const { initialize } = useStore.getState();
        await initialize();

        const state = useStore.getState();
        expect(state.notes.length).toBe(1);
        expect(state.notes[0].id).toBe('2');
        expect(state.folders.length).toBe(1);
        expect(state.folders[0].id).toBe('f1');
    });

    it('should call api.upsertNote when adding a note', () => {
        const { addNote } = useStore.getState();
        addNote();
        
        expect(api.upsertNote).toHaveBeenCalled();
    });

    it('should call api.upsertNote when updating note content', () => {
        const { updateNoteContent } = useStore.getState();
        updateNoteContent('1', '# Updated');
        
        vi.advanceTimersByTime(5000);

        expect(api.upsertNote).toHaveBeenCalledWith(expect.objectContaining({
            id: '1',
            content: '# Updated'
        }));
    });

    it('should call api.deleteNote when deleting a note', () => {
        const { deleteNote } = useStore.getState();
        deleteNote('1');
        
        expect(api.deleteNote).toHaveBeenCalledWith('1');
    });

    it('should call api.upsertFolder when adding a folder', () => {
        const { addFolder } = useStore.getState();
        addFolder('New Folder');
        
        expect(api.upsertFolder).toHaveBeenCalled();
    });

    it('should toggle view mode', () => {
        const { setViewMode } = useStore.getState();
        setViewMode('edit');
        expect(useStore.getState().viewMode).toBe('edit');
    });
});
