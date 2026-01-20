import { create } from 'zustand';
import { Note, Folder, ViewMode, Workspace } from '../types';
import { arrayMove } from '@dnd-kit/sortable';
import { EditorView } from '@codemirror/view';
import { api, SearchResult } from '../utils/api';
import { toast } from 'sonner';

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
    hasUnsyncedChanges: boolean;

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
    checkUnsyncedChanges: () => void;

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
    workspaces: [],
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
    syncUrl: (() => {
        try {
            return localStorage.getItem('lumenote_syncUrl') || '';
        } catch {
            return '';
        }
    })(),
    syncKey: (() => {
        try {
            return localStorage.getItem('lumenote_syncKey') || '';
        } catch {
            return '';
        }
    })(),
    lastSyncedAt: (() => {
        try {
            const stored = localStorage.getItem('lumenote_lastSyncedAt');
            return stored ? parseInt(stored, 10) : null;
        } catch {
            return null;
        }
    })(),
    isSyncing: false,
    hasUnsyncedChanges: false,

    initialize: async () => {
        try {
            const [notesRecords, foldersRecords, workspacesRecords] = await Promise.all([
                api.getNotes(),
                api.getFolders(),
                api.getWorkspaces()
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

            const workspaces: Workspace[] = workspacesRecords.map(r => ({
                id: r.id,
                name: r.name,
                color: r.color,
                createdAt: r.created_at,
            }));

            // Set activeWorkspaceId to default if current one doesn't exist
            const currentState = get();
            const activeExists = workspaces.some(w => w.id === currentState.activeWorkspaceId);
            const activeWorkspaceId = activeExists ? currentState.activeWorkspaceId : (workspaces[0]?.id || 'default');

            set({ notes, folders, workspaces, activeWorkspaceId });
            
            // Check for unsynced changes after loading data
            get().checkUnsyncedChanges();
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
    setSyncConfig: (syncUrl, syncKey) => {
        try {
            localStorage.setItem('lumenote_syncUrl', syncUrl);
            localStorage.setItem('lumenote_syncKey', syncKey);
        } catch (error) {
            console.error('Failed to save sync config to localStorage:', error);
        }
        set({ syncUrl, syncKey });
        // Recheck unsynced changes after config update
        get().checkUnsyncedChanges();
    },
    setSyncing: (isSyncing) => set({ isSyncing }),
    performSync: async () => {
        const { syncUrl, syncKey, lastSyncedAt, setSyncing } = get();
        if (!syncUrl || !syncKey) {
            console.warn('Sync skipped: missing syncUrl or syncKey', { syncUrl: !!syncUrl, syncKey: !!syncKey });
            return;
        }

        console.log('Starting sync...', { syncUrl, syncKeyLength: syncKey.length, lastSyncedAt });
        setSyncing(true);
        try {
            // 1. Get local changes since last sync
            const since = lastSyncedAt || 0;
            console.log('Fetching local sync data since:', since);
            const localData = await api.getSyncData(since);
            console.log('Local sync data:', { notesCount: localData.notes.length, foldersCount: localData.folders.length, workspacesCount: localData.workspaces.length });

            // 2. Send to server and get remote updates
            const remoteData = await api.syncWithServer(syncUrl, syncKey, {
                last_sync_time: since,
                notes: localData.notes,
                folders: localData.folders,
                workspaces: localData.workspaces,
            });

            // 3. Apply remote updates locally
            console.log('Applying remote updates:', { notesCount: remoteData.notes.length, foldersCount: remoteData.folders.length, workspacesCount: remoteData.workspaces?.length || 0 });
            for (const note of remoteData.notes) {
                // Map server Note to NoteRecord format expected by backend
                // Server returns created_at as optional, but we need it for the backend
                const noteRecord = {
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    folder_id: note.folder_id,
                    workspace_id: note.workspace_id,
                    created_at: note.created_at || note.updated_at, // Use created_at or fallback to updated_at
                    updated_at: note.updated_at,
                    version: 1, // Default version for remote notes
                    is_deleted: note.is_deleted || false,
                };
                await api.applyRemoteUpdateNote(noteRecord);
            }
            for (const folder of remoteData.folders) {
                // Map server Folder to FolderRecord format expected by backend
                const folderRecord = {
                    id: folder.id,
                    name: folder.name,
                    parent_id: folder.parent_id,
                    workspace_id: folder.workspace_id,
                    created_at: folder.created_at || folder.updated_at, // Use created_at or fallback to updated_at
                    updated_at: folder.updated_at,
                    version: 1, // Default version for remote folders
                    is_deleted: folder.is_deleted || false,
                };
                await api.applyRemoteUpdateFolder(folderRecord);
            }
            if (remoteData.workspaces) {
                for (const workspace of remoteData.workspaces) {
                    // Map server Workspace to WorkspaceRecord format expected by backend
                    const workspaceRecord = {
                        id: workspace.id,
                        name: workspace.name,
                        color: workspace.color,
                        created_at: workspace.created_at || workspace.updated_at,
                        updated_at: workspace.updated_at,
                        version: 1, // Default version for remote workspaces
                        is_deleted: workspace.is_deleted || false,
                    };
                    await api.applyRemoteUpdateWorkspace(workspaceRecord);
                }
            }

            // 4. Refresh local state
            await get().initialize();

            const newLastSyncedAt = remoteData.server_time;
            try {
                localStorage.setItem('lumenote_lastSyncedAt', newLastSyncedAt.toString());
            } catch (error) {
                console.error('Failed to save lastSyncedAt to localStorage:', error);
            }
            set({ lastSyncedAt: newLastSyncedAt, hasUnsyncedChanges: false });
            console.log('Sync successful, server time:', newLastSyncedAt);
            
            // Show success toast
            toast.success(get().language === 'vi' ? 'Đồng bộ thành công!' : 'Sync successful!');
        } catch (error: any) {
            console.error('Sync failed:', error);
            const errorMessage = error?.message || String(error);
            console.error('Error details:', { errorMessage, syncUrl, syncKeyPresent: !!syncKey });
            
            // Show error toast
            toast.error(get().language === 'vi' 
                ? `Đồng bộ thất bại: ${errorMessage}` 
                : `Sync failed: ${errorMessage}`
            );
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
                note.id === id ? { ...note, content, updatedAt: Date.now() } : note
            ),
            unsavedNoteIds: new Set(state.unsavedNoteIds).add(id)
        }));
        
        // Check for unsynced changes after update
        setTimeout(() => get().checkUnsyncedChanges(), 100);

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
            // Check for unsynced changes after save
            get().checkUnsyncedChanges();
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
        }).then(() => {
            // Check for unsynced changes after adding note
            setTimeout(() => get().checkUnsyncedChanges(), 100);
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
            is_deleted: false,
        }).then(() => {
            // Check for unsynced changes after adding folder
            setTimeout(() => get().checkUnsyncedChanges(), 100);
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

        const now = Date.now();
        const newWorkspace: Workspace = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            color: randomColor,
            createdAt: now,
        };
        
        set((state) => ({
            workspaces: [...state.workspaces, newWorkspace],
            activeWorkspaceId: newWorkspace.id,
            activeNoteId: null,
        }));

        // Save to database
        api.upsertWorkspace({
            id: newWorkspace.id,
            name: newWorkspace.name,
            color: newWorkspace.color,
            created_at: now,
            updated_at: now,
            version: 1,
            is_deleted: false,
        }).then(() => {
            // Check for unsynced changes after adding workspace
            setTimeout(() => get().checkUnsyncedChanges(), 100);
        }).catch(console.error);

        return newWorkspace.id;
    },

    setWorkspaceColor: (id, color) => {
        set((state) => {
            const workspaces = state.workspaces.map(w =>
                w.id === id ? { ...w, color: color || '#4F7DF3' } : w
            );
            const updatedWorkspace = workspaces.find(w => w.id === id);
            
            if (updatedWorkspace) {
                // Save to database
                const now = Date.now();
                api.upsertWorkspace({
                    id: updatedWorkspace.id,
                    name: updatedWorkspace.name,
                    color: updatedWorkspace.color,
                    created_at: updatedWorkspace.createdAt,
                    updated_at: now,
                    version: 1, // Will be incremented by backend
                    is_deleted: false,
                }).then(() => {
                    setTimeout(() => get().checkUnsyncedChanges(), 100);
                }).catch(console.error);
            }
            
            return { workspaces };
        });
    },

    deleteWorkspace: (id) => {
        const state = get();
        if (state.workspaces.length <= 1) return;
        
        const newWorkspaces = state.workspaces.filter(w => w.id !== id);
        const isActiveDeleting = state.activeWorkspaceId === id;
        const newActiveId = isActiveDeleting ? newWorkspaces[0].id : state.activeWorkspaceId;

        set({
            workspaces: newWorkspaces,
            activeWorkspaceId: newActiveId,
            notes: state.notes.filter(n => n.workspaceId !== id),
            folders: state.folders.filter(f => f.workspaceId !== id),
            activeNoteId: isActiveDeleting ? null : state.activeNoteId,
        });

        // Delete from database
        api.deleteWorkspace(id).then(() => {
            setTimeout(() => get().checkUnsyncedChanges(), 100);
        }).catch(console.error);
    },

    renameWorkspace: (id, name) => {
        set((state) => {
            const workspaces = state.workspaces.map(w => w.id === id ? { ...w, name } : w);
            const updatedWorkspace = workspaces.find(w => w.id === id);
            
            if (updatedWorkspace) {
                // Save to database
                const now = Date.now();
                api.upsertWorkspace({
                    id: updatedWorkspace.id,
                    name: updatedWorkspace.name,
                    color: updatedWorkspace.color,
                    created_at: updatedWorkspace.createdAt,
                    updated_at: now,
                    version: 1, // Will be incremented by backend
                    is_deleted: false,
                }).then(() => {
                    setTimeout(() => get().checkUnsyncedChanges(), 100);
                }).catch(console.error);
            }
            
            return { workspaces };
        });
    },

    toggleFolder: (id, expanded) => set((state) => ({
        folders: state.folders.map(f =>
            f.id === id ? { ...f, isExpanded: expanded !== undefined ? expanded : !f.isExpanded } : f
        )
    })),

    renameNote: (id, title) => {
        set((state) => {
            const notes = state.notes.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n);
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
                }).then(() => {
                    // Refresh notes to get updated updatedAt from backend
                    api.getNotes().then(freshNotes => {
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
                            }))
                        });
                        get().checkUnsyncedChanges();
                    });
                });
            }
            return { notes };
        });
        // Check immediately for UI feedback
        setTimeout(() => get().checkUnsyncedChanges(), 100);
    },

    renameFolder: (id: string, name: string) => {
        set((state) => {
            const folders = state.folders.map(f => f.id === id ? { ...f, name, updatedAt: Date.now() } : f);
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
                    is_deleted: false,
                }).then(() => {
                    // Refresh folders to get updated updatedAt from backend
                    api.getFolders().then(freshFolders => {
                        set({
                            folders: freshFolders.map(r => ({
                                id: r.id,
                                name: r.name,
                                parentId: r.parent_id,
                                workspaceId: r.workspace_id,
                                createdAt: r.created_at,
                                updatedAt: r.updated_at,
                                version: r.version,
                                color: r.color || undefined,
                                isExpanded: state.folders.find(f => f.id === r.id)?.isExpanded ?? true,
                            }))
                        });
                        get().checkUnsyncedChanges();
                    });
                });
            }
            return { folders };
        });
        // Check immediately for UI feedback
        setTimeout(() => get().checkUnsyncedChanges(), 100);
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
                    is_deleted: false,
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
                is_deleted: false,
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
                // Check for unsynced changes after save
                get().checkUnsyncedChanges();
            } catch (error) {
                console.error("Manual save failed:", error);
            }
        }
    },

    setSearchResults: (results) => set({ searchResults: results }),

    checkUnsyncedChanges: () => {
        const { notes, folders, lastSyncedAt, syncUrl, syncKey } = get();
        
        // Only check if sync is configured
        if (!syncUrl || !syncKey || !lastSyncedAt) {
            set({ hasUnsyncedChanges: false });
            return;
        }

        // Check if any note or folder was updated after last sync
        // Workspace changes are detected during sync via getSyncData which queries the database
        const hasUnsynced = 
            notes.some(note => note.updatedAt > lastSyncedAt) ||
            folders.some(folder => folder.updatedAt > lastSyncedAt);

        set({ hasUnsyncedChanges: hasUnsynced });
    },
}));
