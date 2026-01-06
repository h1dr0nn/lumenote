import { create } from 'zustand';
import { Note, Folder, ViewMode, Workspace } from '../types';
import { arrayMove } from '@dnd-kit/sortable';
import { EditorView } from '@codemirror/view';
import { api, SearchResult } from '../utils/api';

interface AppState {
    notes: Note[];
    folders: Folder[];
    workspaces: Workspace[];
    activeNoteId: string | null;
    activeWorkspaceId: string;
    viewMode: ViewMode;
    editorView: EditorView | null;
    activePopup: 'share' | 'settings' | 'sync' | 'workspace_create' | null;
    searchResults: SearchResult[];
    unsavedNoteIds: Set<string>;

    // Settings
    theme: 'light' | 'dark' | 'system';
    fontPreset: 'sans' | 'serif' | 'mono';
    fontSize: number;
    language: 'vi' | 'en';
    syncUrl: string;
    syncKey: string;
    lastSyncedAt: number | null;
    isSyncing: boolean;

    setNotes: (notes: Note[]) => void;
    setActiveNoteId: (id: string | null) => void;
    setActiveWorkspaceId: (id: string) => void;
    setViewMode: (mode: ViewMode) => void;
    setEditorView: (view: EditorView | null) => void;
    setActivePopup: (popup: 'share' | 'settings' | 'sync' | 'workspace_create' | null) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setFontPreset: (preset: 'sans' | 'serif' | 'mono') => void;
    setFontSize: (size: number) => void;
    setLanguage: (lang: 'vi' | 'en') => void;
    updateNoteContent: (id: string, content: string) => void;
    addNote: (folderId?: string | null) => string;
    deleteNote: (id: string) => void;
    addFolder: (name: string, parentId?: string | null) => string;
    deleteFolder: (id: string) => void;
    addWorkspace: (name: string, color?: string) => void;
    deleteWorkspace: (id: string) => void;
    renameWorkspace: (id: string, name: string) => void;
    setWorkspaceColor: (id: string, color: string | null) => void;
    toggleFolder: (id: string, expanded?: boolean) => void;
    renameNote: (id: string, title: string) => void;
    renameFolder: (id: string, name: string) => void;
    setNoteColor: (id: string, color: string | null) => void;
    setFolderColor: (id: string, color: string | null) => void;
    setSyncConfig: (url: string, key: string) => void;
    setSyncing: (syncing: boolean) => void;
    performSync: () => Promise<void>;

    reorderNotes: (activeId: string, overId: string) => void;
    reorderFolders: (activeId: string, overId: string) => void;
    moveNoteToFolder: (noteId: string, folderId: string | null) => void;
    moveFolderToFolder: (folderId: string, targetFolderId: string | null) => void;

    searchNotes: (query: string) => Promise<void>;
    setSearchResults: (results: SearchResult[]) => void;

    saveNote: (id: string) => Promise<void>;
    initialize: () => Promise<void>;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<AppState>((set, get) => ({
    notes: [],
    folders: [],
    workspaces: [
        {
            id: 'default',
            name: 'Lumenote',
            color: '#4F7DF3',
            createdAt: Date.now(),
        }
    ],
    activeNoteId: null,
    activeWorkspaceId: 'default',
    viewMode: 'view',
    editorView: null,
    activePopup: null,
    searchResults: [],
    unsavedNoteIds: new Set(),
    theme: 'system',
    fontPreset: 'sans',
    fontSize: 16,
    language: 'en',
    syncUrl: '',
    syncKey: '',
    lastSyncedAt: null,
    isSyncing: false,

    initialize: async () => {
        try {
            const [notesRecords, foldersRecords] = await Promise.all([
                api.getNotes(),
                api.getFolders()
            ]);

            const folders: Folder[] = foldersRecords.map(r => ({
                id: r.id,
                name: r.name,
                parentId: r.parent_id,
                workspaceId: r.workspace_id,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                version: r.version,
                color: r.color || undefined,
                isExpanded: true,
            }));

            // Fix notes mappings too to include all fields if needed
            const notes: Note[] = notesRecords.map(r => ({
                id: r.id,
                title: r.title,
                content: r.content,
                folderId: r.folder_id,
                workspaceId: r.workspace_id,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                version: r.version,
                is_deleted: r.is_deleted, // although they shouldn't be here
            }));

            set({ notes, folders });
        } catch (error) {
            console.error("Failed to initialize store from backend:", error);
        }
    },

    setNotes: (notes) => set({ notes }),
    setActiveNoteId: (id) => {
        // Flush pending save if exists
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            // We could just execute the save logic here, but to avoid duplication
            // let's define a helper or just trigger the logic if we have an active ID.
            const currentId = get().activeNoteId;
            if (currentId && get().unsavedNoteIds.has(currentId)) {
                const note = get().notes.find(n => n.id === currentId);
                if (note) {
                    api.upsertNote({
                        id: note.id,
                        title: note.title,
                        content: note.content,
                        folder_id: note.folderId || null,
                        workspace_id: note.workspaceId,
                        created_at: note.createdAt,
                        updated_at: note.updatedAt,
                        version: note.version,
                        is_deleted: false,
                    }).catch(console.error);
                }
            }
            saveTimeout = null;
        }
        set({ activeNoteId: id });
    },
    setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setEditorView: (view) => set({ editorView: view }),
    setActivePopup: (popup) => set({ activePopup: popup }),
    setTheme: (theme) => set({ theme }),
    setFontPreset: (fontPreset) => set({ fontPreset }),
    setFontSize: (fontSize) => set({ fontSize }),
    setLanguage: (language) => set({ language }),
    setSyncConfig: (syncUrl, syncKey) => set({ syncUrl, syncKey }),
    setSyncing: (isSyncing) => set({ isSyncing }),
    performSync: async () => {
        const { syncUrl, syncKey, lastSyncedAt, setSyncing } = get();
        if (!syncUrl || !syncKey) return;

        setSyncing(true);
        try {
            // 1. Get local changes since last sync
            const since = lastSyncedAt || 0;
            const localData = await api.getSyncData(since);

            // 2. Send to server and get remote updates
            const remoteData = await api.syncWithServer(syncUrl, syncKey, {
                last_sync_time: since,
                notes: localData.notes,
                folders: localData.folders,
            });

            // 3. Apply remote updates locally
            for (const note of remoteData.notes) {
                await api.applyRemoteUpdateNote(note);
            }
            for (const folder of remoteData.folders) {
                await api.applyRemoteUpdateFolder(folder);
            }

            // 4. Refresh local state
            await get().initialize();

            set({ lastSyncedAt: remoteData.server_time });
            console.log('Sync successful, server time:', remoteData.server_time);
        } catch (error) {
            console.error('Sync failed:', error);
            // Optionally show toast or update UI state
        } finally {
            setSyncing(false);
        }
    },

    updateNoteContent: async (id, content) => {
        // Clear any existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }

        set((state) => ({
            notes: state.notes.map((note) =>
                note.id === id ? { ...note, content } : note
            ),
            unsavedNoteIds: new Set(state.unsavedNoteIds).add(id)
        }));

        // Set new debounced timeout (5 seconds)
        saveTimeout = setTimeout(async () => {
            const updatedNote = get().notes.find(n => n.id === id);
            if (updatedNote) {
                try {
                    await api.upsertNote({
                        id: updatedNote.id,
                        title: updatedNote.title,
                        content: updatedNote.content,
                        folder_id: updatedNote.folderId || null,
                        workspace_id: updatedNote.workspaceId,
                        created_at: updatedNote.createdAt,
                        updated_at: updatedNote.updatedAt,
                        version: updatedNote.version,
                        is_deleted: false,
                    });

                    // Refresh notes to get new version from backend after save
                    const freshNotes = await api.getNotes();
                    set({
                        notes: freshNotes.map(r => ({
                            id: r.id,
                            title: r.title,
                            content: r.content,
                            folderId: r.folder_id,
                            workspaceId: r.workspace_id,
                            createdAt: r.created_at,
                            updatedAt: r.updated_at,
                            version: r.version,
                        })),
                        unsavedNoteIds: new Set([...get().unsavedNoteIds].filter(nodeId => nodeId !== id))
                    });
                    saveTimeout = null;
                } catch (error) {
                    console.error("Failed to save note:", error);
                }
            }
        }, 5000);
    },

    addNote: (folderId = null) => {
        const state = get();
        const newNote: Note = {
            id: Math.random().toString(36).substring(2, 9),
            title: 'New Note',
            content: '',
            folderId,
            workspaceId: state.activeWorkspaceId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
        };

        get().setActiveNoteId(newNote.id);

        set((state) => ({
            notes: [...state.notes, newNote],
            viewMode: 'edit'
        }));

        api.upsertNote({
            id: newNote.id,
            title: newNote.title,
            content: newNote.content,
            folder_id: newNote.folderId || null,
            workspace_id: newNote.workspaceId,
            created_at: newNote.createdAt,
            updated_at: newNote.updatedAt,
            version: newNote.version,
            is_deleted: false,
        });

        return newNote.id;
    },

    deleteNote: (id) => {
        set((state) => ({
            notes: state.notes.filter(n => n.id !== id),
            activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));
        api.deleteNote(id);
    },

    addFolder: (name, parentId = null) => {
        const state = get();
        const newFolder: Folder = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            parentId,
            workspaceId: state.activeWorkspaceId,
            isExpanded: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
        };

        set((state) => ({ folders: [...state.folders, newFolder] }));

        api.upsertFolder({
            id: newFolder.id,
            name: newFolder.name,
            parent_id: newFolder.parentId || null,
            workspace_id: newFolder.workspaceId,
            created_at: newFolder.createdAt,
            updated_at: newFolder.updatedAt,
            version: newFolder.version,
            color: newFolder.color || null,
        });

        return newFolder.id;
    },

    deleteFolder: (id) => {
        set((state) => ({
            folders: state.folders.filter(f => f.id !== id),
            notes: state.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
        }));
        api.deleteFolder(id);
    },

    addWorkspace: (name, color) => {
        const WORKSPACE_COLORS = ['#4F7DF3', '#E94F37', '#3CB371', '#FFA500', '#9370DB', '#FF69B4', '#20B2AA', '#778899'];
        const usedColors = get().workspaces.map(w => w.color);
        const availableColors = WORKSPACE_COLORS.filter(c => !usedColors.includes(c));
        const randomColor = color || (availableColors.length > 0
            ? availableColors[Math.floor(Math.random() * availableColors.length)]
            : WORKSPACE_COLORS[Math.floor(Math.random() * WORKSPACE_COLORS.length)]);

        const newWorkspace: Workspace = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            color: randomColor,
            createdAt: Date.now(),
        };
        set((state) => ({
            workspaces: [...state.workspaces, newWorkspace],
            activeWorkspaceId: newWorkspace.id,
            activeNoteId: null,
        }));
        return newWorkspace.id;
    },

    setWorkspaceColor: (id, color) => set((state) => ({
        workspaces: state.workspaces.map(w =>
            w.id === id ? { ...w, color: color || '#4F7DF3' } : w
        ),
    })),

    deleteWorkspace: (id) => set((state) => {
        if (state.workspaces.length <= 1) return state;
        const newWorkspaces = state.workspaces.filter(w => w.id !== id);
        const isActiveDeleting = state.activeWorkspaceId === id;
        const newActiveId = isActiveDeleting ? newWorkspaces[0].id : state.activeWorkspaceId;

        return {
            workspaces: newWorkspaces,
            activeWorkspaceId: newActiveId,
            notes: state.notes.filter(n => n.workspaceId !== id),
            folders: state.folders.filter(f => f.workspaceId !== id),
            activeNoteId: isActiveDeleting ? null : state.activeNoteId,
        };
    }),

    renameWorkspace: (id, name) => set((state) => ({
        workspaces: state.workspaces.map(w => w.id === id ? { ...w, name } : w)
    })),

    toggleFolder: (id, expanded) => set((state) => ({
        folders: state.folders.map(f =>
            f.id === id ? { ...f, isExpanded: expanded !== undefined ? expanded : !f.isExpanded } : f
        )
    })),

    renameNote: (id, title) => {
        set((state) => {
            const notes = state.notes.map(n => n.id === id ? { ...n, title } : n);
            const updatedNote = notes.find(n => n.id === id);
            if (updatedNote) {
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                    saveTimeout = null;
                }
                api.upsertNote({
                    id: updatedNote.id,
                    title: updatedNote.title,
                    content: updatedNote.content,
                    folder_id: updatedNote.folderId || null,
                    workspace_id: updatedNote.workspaceId,
                    created_at: updatedNote.createdAt,
                    updated_at: updatedNote.updatedAt,
                    version: updatedNote.version,
                    is_deleted: false,
                });
            }
            return { notes };
        });
    },

    renameFolder: (id: string, name: string) => {
        set((state) => {
            const folders = state.folders.map(f => f.id === id ? { ...f, name } : f);
            const updatedFolder = folders.find(f => f.id === id);
            if (updatedFolder) {
                api.upsertFolder({
                    id: updatedFolder.id,
                    name: updatedFolder.name,
                    parent_id: updatedFolder.parentId || null,
                    workspace_id: updatedFolder.workspaceId,
                    created_at: updatedFolder.createdAt,
                    updated_at: updatedFolder.updatedAt,
                    version: updatedFolder.version,
                    color: updatedFolder.color || null,
                });
            }
            return { folders };
        });
    },

    setNoteColor: (id, color) => {
        set((state) => {
            const notes = state.notes.map(n => n.id === id ? { ...n, color: color || undefined } : n);
            const updatedNote = notes.find(n => n.id === id);
            if (updatedNote) {
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                    saveTimeout = null;
                }
                api.upsertNote({
                    id: updatedNote.id,
                    title: updatedNote.title,
                    content: updatedNote.content,
                    folder_id: updatedNote.folderId || null,
                    workspace_id: updatedNote.workspaceId,
                    created_at: updatedNote.createdAt,
                    updated_at: updatedNote.updatedAt,
                    version: updatedNote.version,
                    is_deleted: false,
                });
            }
            return { notes };
        });
    },

    setFolderColor: (id, color) => {
        set((state) => {
            const folders = state.folders.map(f => f.id === id ? { ...f, color: color || undefined } : f);
            const updatedFolder = folders.find(f => f.id === id);
            if (updatedFolder) {
                api.upsertFolder({
                    id: updatedFolder.id,
                    name: updatedFolder.name,
                    parent_id: updatedFolder.parentId || null,
                    workspace_id: updatedFolder.workspaceId,
                    created_at: updatedFolder.createdAt,
                    updated_at: updatedFolder.updatedAt,
                    version: updatedFolder.version,
                    color: updatedFolder.color || null,
                });
            }
            return { folders };
        });
    },

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

    moveNoteToFolder: (noteId, folderId) => {
        set((state) => {
            const notes = state.notes.map((n) => n.id === noteId ? { ...n, folderId } : n);
            const updatedNote = notes.find(n => n.id === noteId);
            if (updatedNote) {
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                    saveTimeout = null;
                }
                api.upsertNote({
                    id: updatedNote.id,
                    title: updatedNote.title,
                    content: updatedNote.content,
                    folder_id: updatedNote.folderId || null,
                    workspace_id: updatedNote.workspaceId,
                    created_at: updatedNote.createdAt,
                    updated_at: updatedNote.updatedAt,
                    version: updatedNote.version,
                    is_deleted: false,
                });
            }
            return { notes };
        });
    },

    moveFolderToFolder: (folderId, targetFolderId) => set((state) => {
        const isDescendant = (parentId: string, childId: string): boolean => {
            const child = state.folders.find(f => f.id === childId);
            if (!child || !child.parentId) return false;
            if (child.parentId === parentId) return true;
            return isDescendant(parentId, child.parentId);
        };
        if (folderId === targetFolderId) return state;
        if (targetFolderId && isDescendant(folderId, targetFolderId)) return state;

        const folders = state.folders.map((f) => f.id === folderId ? { ...f, parentId: targetFolderId } : f);
        const updatedFolder = folders.find(f => f.id === folderId);
        if (updatedFolder) {
            api.upsertFolder({
                id: updatedFolder.id,
                name: updatedFolder.name,
                parent_id: updatedFolder.parentId || null,
                workspace_id: updatedFolder.workspaceId,
                created_at: updatedFolder.createdAt,
                updated_at: updatedFolder.updatedAt,
                version: updatedFolder.version,
                color: updatedFolder.color || null,
            });
        }
        return { folders };
    }),

    searchNotes: async (query) => {
        if (!query.trim()) {
            set({ searchResults: [] });
            return;
        }
        try {
            const results = await api.searchNotes(query);
            set({ searchResults: results });
        } catch (error) {
            console.error('Search failed:', error);
            set({ searchResults: [] });
        }
    },

    saveNote: async (id) => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }

        const note = get().notes.find(n => n.id === id);
        const hasUnsaved = get().unsavedNoteIds.has(id);

        if (note && hasUnsaved) {
            try {
                await api.upsertNote({
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    folder_id: note.folderId || null,
                    workspace_id: note.workspaceId,
                    created_at: note.createdAt,
                    updated_at: note.updatedAt,
                    version: note.version,
                    is_deleted: false,
                });

                const freshNotes = await api.getNotes();
                set({
                    notes: freshNotes.map(r => ({
                        id: r.id,
                        title: r.title,
                        content: r.content,
                        folderId: r.folder_id,
                        workspaceId: r.workspace_id,
                        createdAt: r.created_at,
                        updatedAt: r.updated_at,
                        version: r.version,
                    })),
                    unsavedNoteIds: new Set([...get().unsavedNoteIds].filter(nodeId => nodeId !== id))
                });
            } catch (error) {
                console.error("Manual save failed:", error);
            }
        }
    },

    setSearchResults: (results) => set({ searchResults: results }),
}));
