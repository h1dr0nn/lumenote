import { create } from 'zustand';
import { Note, Folder, ViewMode } from '../types';
import { arrayMove } from '@dnd-kit/sortable';
import { EditorView } from '@codemirror/view';

interface AppState {
    notes: Note[];
    folders: Folder[];
    activeNoteId: string | null;
    viewMode: ViewMode;
    editorView: EditorView | null;
    activePopup: 'share' | 'settings' | null;

    // Settings
    theme: 'light' | 'dark' | 'system';
    fontPreset: 'sans' | 'serif' | 'mono';
    fontSize: number;
    language: 'vi' | 'en';

    setNotes: (notes: Note[]) => void;
    setActiveNoteId: (id: string | null) => void;
    setViewMode: (mode: ViewMode) => void;
    setEditorView: (view: EditorView | null) => void;
    setActivePopup: (popup: 'share' | 'settings' | null) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setFontPreset: (preset: 'sans' | 'serif' | 'mono') => void;
    setFontSize: (size: number) => void;
    setLanguage: (lang: 'vi' | 'en') => void;
    updateNoteContent: (id: string, content: string) => void;
    addNote: (folderId?: string | null) => void;
    deleteNote: (id: string) => void;
    addFolder: (name: string, parentId?: string | null) => void;
    deleteFolder: (id: string) => void;
    toggleFolder: (id: string, expanded?: boolean) => void;
    renameNote: (id: string, title: string) => void;
    renameFolder: (id: string, name: string) => void;
    setNoteColor: (id: string, color: string | null) => void;
    setFolderColor: (id: string, color: string | null) => void;

    reorderNotes: (activeId: string, overId: string) => void;
    reorderFolders: (activeId: string, overId: string) => void;
    moveNoteToFolder: (noteId: string, folderId: string | null) => void;
    moveFolderToFolder: (folderId: string, targetFolderId: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
    notes: [
        {
            id: '1',
            title: 'Welcome to Lumenote',
            content: '# Welcome to Lumenote\n\nThis is your first note.',
            folderId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }
    ],
    folders: [],
    activeNoteId: '1',
    viewMode: 'view',
    editorView: null,
    activePopup: null,
    theme: 'system',
    fontPreset: 'sans',
    fontSize: 16,
    language: 'en',

    setNotes: (notes) => set({ notes }),
    setActiveNoteId: (id) => set({ activeNoteId: id }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setEditorView: (view) => set({ editorView: view }),
    setActivePopup: (popup) => set({ activePopup: popup }),
    setTheme: (theme) => set({ theme }),
    setFontPreset: (fontPreset) => set({ fontPreset }),
    setFontSize: (fontSize) => set({ fontSize }),
    setLanguage: (language) => set({ language }),

    updateNoteContent: (id, content) => set((state) => ({
        notes: state.notes.map((note) =>
            note.id === id ? { ...note, content, updatedAt: Date.now() } : note
        )
    })),

    addNote: (folderId = null) => {
        const newNote: Note = {
            id: Math.random().toString(36).substring(2, 9),
            title: 'New Note',
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

    toggleFolder: (id, expanded) => set((state) => ({
        folders: state.folders.map(f =>
            f.id === id ? { ...f, isExpanded: expanded !== undefined ? expanded : !f.isExpanded } : f
        )
    })),

    renameNote: (id, title) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, title } : n)
    })),

    renameFolder: (id: string, name: string) => set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
    })),
    setNoteColor: (id, color) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, color: color || undefined } : n)
    })),
    setFolderColor: (id, color) => set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, color: color || undefined } : f)
    })),

    reorderNotes: (activeId, overId) => set((state) => {
        const oldIndex = state.notes.findIndex((n) => n.id === activeId);
        const newIndex = state.notes.findIndex((n) => n.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return state;
        return { notes: arrayMove(state.notes, oldIndex, newIndex) };
    }),

    reorderFolders: (activeId, overId) => set((state) => {
        const oldIndex = state.folders.findIndex((f) => f.id === activeId);
        const newIndex = state.folders.findIndex((f) => f.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return state;
        return { folders: arrayMove(state.folders, oldIndex, newIndex) };
    }),

    moveNoteToFolder: (noteId, folderId) => set((state) => ({
        notes: state.notes.map((n) => n.id === noteId ? { ...n, folderId } : n)
    })),

    moveFolderToFolder: (folderId, targetFolderId) => set((state) => {
        // Prevent moving folder into itself or its children
        const isDescendant = (parentId: string, childId: string): boolean => {
            const child = state.folders.find(f => f.id === childId);
            if (!child || !child.parentId) return false;
            if (child.parentId === parentId) return true;
            return isDescendant(parentId, child.parentId);
        };
        if (folderId === targetFolderId) return state;
        if (targetFolderId && isDescendant(folderId, targetFolderId)) return state;
        return { folders: state.folders.map((f) => f.id === folderId ? { ...f, parentId: targetFolderId } : f) };
    }),
}));
