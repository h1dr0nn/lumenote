import { create } from 'zustand';
import { Note, Folder, ViewMode } from '../types';

interface AppState {
    notes: Note[];
    folders: Folder[];
    activeNoteId: string | null;
    viewMode: ViewMode;

    // Actions
    setNotes: (notes: Note[]) => void;
    setActiveNoteId: (id: string | null) => void;
    setViewMode: (mode: ViewMode) => void;
    updateNoteContent: (id: string, content: string) => void;
    addNote: (folderId?: string | null) => void;
    deleteNote: (id: string) => void;
    addFolder: (name: string, parentId?: string | null) => void;
    deleteFolder: (id: string) => void;
    toggleFolder: (id: string) => void;
    renameNote: (id: string, title: string) => void;
    renameFolder: (id: string, name: string) => void;
}

export const useStore = create<AppState>((set) => ({
    notes: [
        {
            id: '1',
            title: 'Chào mừng bạn đến với Lumenote',
            content: '# Chào mừng bạn đến với Lumenote\n\nĐây là ghi chú đầu tiên của bạn. Hãy thử viết gì đó nhé!\n\n- **Calm**: Giao diện tối giản giúp bạn tập trung.\n- **Modern**: Sử dụng công nghệ mới nhất.\n- **Markdown**: Định dạng văn bản nhanh chóng.',
            folderId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }
    ],
    folders: [],
    activeNoteId: '1',
    viewMode: 'view',

    setNotes: (notes) => set({ notes }),
    setActiveNoteId: (id) => set({ activeNoteId: id }),
    setViewMode: (mode) => set({ viewMode: mode }),

    updateNoteContent: (id, content) => set((state) => ({
        notes: state.notes.map((note) =>
            note.id === id ? { ...note, content, updatedAt: Date.now() } : note
        )
    })),

    addNote: (folderId = null) => {
        const newNote: Note = {
            id: Math.random().toString(36).substring(2, 9),
            title: 'Ghi chú mới',
            content: '',
            folderId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        set((state) => ({
            notes: [...state.notes, newNote],
            activeNoteId: newNote.id,
            viewMode: 'edit'
        }));
    },

    deleteNote: (id) => set((state) => ({
        notes: state.notes.filter(n => n.id !== id),
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
    })),

    addFolder: (name, parentId = null) => {
        const newFolder: Folder = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            parentId,
            isExpanded: true,
            createdAt: Date.now(),
        };
        set((state) => ({ folders: [...state.folders, newFolder] }));
    },

    deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter(f => f.id !== id),
        notes: state.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
    })),

    toggleFolder: (id) => set((state) => ({
        folders: state.folders.map(f =>
            f.id === id ? { ...f, isExpanded: !f.isExpanded } : f
        )
    })),

    renameNote: (id, title) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, title } : n)
    })),

    renameFolder: (id, name) => set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
    })),
}));
