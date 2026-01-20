import { useStore } from "../../store/useStore";
import { Plus, Search, X, FileText } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useRef, useMemo, useEffect } from "react";
import { t } from "../../utils/i18n";
import { save, open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { api } from "../../utils/api";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";

import { Note, Folder } from "../../types";
import { ContextMenuType, DragTarget } from "./types";
import { isNote, isFolder, getItemDepth, getSubtreeMaxDepth } from "./utils";

// Components
import { NoteItem } from "./components/NoteItem";
import { FolderItem } from "./components/FolderItem";
import { SortableItem } from "./components/SortableItem";
import { DropdownMenu } from "./components/DropdownMenu";
import { ContextMenu } from "./components/ContextMenu";
import { FolderChildrenWrapper } from "./components/FolderChildrenWrapper";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";

export const Sidebar = () => {
    const {
        notes,
        folders,
        activeNoteId,
        activeWorkspaceId,
        workspaces,
        setActiveNoteId,
        setActiveWorkspaceId,
        addNote,
        addFolder,
        addWorkspace,
        toggleFolder,
        reorderNotes,
        reorderFolders,
        moveNoteToFolder,
        moveFolderToFolder,
        renameNote,
        renameFolder,
        renameWorkspace,
        searchResults,
        searchNotes,
        setSearchResults,
        initialize,
        language
    } = useStore();

    // Filter notes and folders by active workspace
    const workspaceNotes = useMemo(() => notes.filter(n => n.workspaceId === activeWorkspaceId), [notes, activeWorkspaceId]);
    const workspaceFolders = useMemo(() => folders.filter(f => f.workspaceId === activeWorkspaceId), [folders, activeWorkspaceId]);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenuType | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedWidth, setDraggedWidth] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<DragTarget>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const expandTimerRef = useRef<any>(null);

    // Debounced backend search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                searchNotes(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchNotes, setSearchResults]);

    // Filter notes by search query
    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return workspaceNotes;
        const query = searchQuery.toLowerCase();
        return workspaceNotes.filter(n =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query)
        );
    }, [workspaceNotes, searchQuery]);

    const filteredFolders = useMemo(() => {
        if (!searchQuery.trim()) return workspaceFolders;
        // Show folders that match OR contain matching notes
        const query = searchQuery.toLowerCase();
        const notesInFolders = new Set(filteredNotes.map(n => n.folderId).filter(Boolean));
        return workspaceFolders.filter(f =>
            f.name.toLowerCase().includes(query) ||
            notesInFolders.has(f.id)
        );
    }, [workspaceFolders, searchQuery, filteredNotes]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const allItemIds = useMemo(() => {
        const getVisualOrder = (parentId: string | null): string[] => {
            const result: string[] = [];
            workspaceFolders.filter((f: Folder) => f.parentId === parentId).forEach((folder: Folder) => {
                result.push(folder.id);
                if (folder.isExpanded) result.push(...getVisualOrder(folder.id));
            });
            workspaceNotes.filter((n: Note) => n.folderId === parentId).forEach((note: Note) => result.push(note.id));
            return result;
        };
        return getVisualOrder(null);
    }, [workspaceFolders, workspaceNotes]);

    const smartCollisionDetection = (args: any) => {
        const collisions = closestCorners(args);
        if (collisions.length > 0) return collisions;

        const { pointerCoordinates, droppableContainers } = args;
        if (!pointerCoordinates || allItemIds.length === 0) return [];

        const firstId = allItemIds[0];
        const firstContainer = droppableContainers.find((c: any) => c.id === firstId);
        if (firstContainer && pointerCoordinates.y < firstContainer.rect.top) {
            return [{ id: firstId }];
        }

        const lastId = allItemIds[allItemIds.length - 1];
        const lastContainer = droppableContainers.find((c: any) => c.id === lastId);
        if (lastContainer && pointerCoordinates.y > lastContainer.rect.bottom) {
            return [{ id: lastId }];
        }

        return [];
    };

    const onDragStart = (event: DragStartEvent) => {
        const id = event.active.id as string;
        setDraggedId(id);

        const width = event.active.rect.current.initial?.width;
        if (width) setDraggedWidth(width);

        if (isFolder(id, folders)) toggleFolder(id, false);
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }
            setDropTarget(null);
            return;
        }

        const overId = over.id as string;
        const activeId = active.id as string;
        if (activeId === overId) { setDropTarget(null); return; }

        const activeRect = active.rect.current.translated;
        const overRect = over.rect;
        if (!activeRect) { setDropTarget(null); return; }

        const activeTop = activeRect.top;
        const activeHeight = activeRect.height;
        const overTop = overRect.top;
        const overHeight = overRect.height;

        let position: 'above' | 'inside' | 'below';

        if (isFolder(overId, folders)) {
            const activeCenter = activeTop + activeHeight / 2;

            if (activeCenter < overTop + overHeight * 0.3) {
                position = 'above';
            } else {
                const targetDepth = getItemDepth(overId, folders, notes);
                const activeIsNote = isNote(activeId, notes);

                if (activeIsNote) {
                    if (targetDepth <= 1) position = 'inside';
                    else position = 'above';
                } else {
                    if (targetDepth <= 1) position = 'inside';
                    else position = 'above';
                }
            }
        } else {
            const activeCenter = activeTop + activeHeight / 2;
            const overCenter = overTop + overHeight / 2;
            position = activeCenter < overCenter ? 'above' : 'below';
        }

        const newTarget = { id: overId, position };
        if (JSON.stringify(newTarget) !== JSON.stringify(dropTarget)) {
            setDropTarget(newTarget);
        }

        if (isFolder(overId, folders) && position === 'inside') {
            const folder = folders.find(f => f.id === overId);
            if (folder && !folder.isExpanded && !expandTimerRef.current) {
                expandTimerRef.current = setTimeout(() => {
                    toggleFolder(overId, true);
                    expandTimerRef.current = null;
                }, 300);
            }
        } else {
            if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggedId(null);
        if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }

        if (!over || !dropTarget) { setDropTarget(null); return; }

        const activeId = active.id as string;
        const overId = over.id as string;
        const { position } = dropTarget;
        setDropTarget(null);
        if (activeId === overId) return;

        const activeIsNote = isNote(activeId, notes);
        const overIsNote = isNote(overId, notes);
        const overIsFolder = isFolder(overId, folders);

        if (overIsFolder && position === 'inside') {
            const targetDepth = getItemDepth(overId, folders, notes);
            if (activeIsNote) {
                if (targetDepth <= 1) moveNoteToFolder(activeId, overId);
            } else {
                const subtreeHeight = getSubtreeMaxDepth(activeId, folders);
                if (targetDepth + 1 + subtreeHeight <= 2) {
                    moveFolderToFolder(activeId, overId);
                }
            }
            return;
        }

        let newParentId: string | null = null;
        if (overIsNote) {
            const overNote = notes.find(n => n.id === overId);
            newParentId = overNote?.folderId || null;
        } else {
            const overFolder = folders.find(f => f.id === overId);
            newParentId = overFolder?.parentId || null;
        }

        if (activeIsNote) {
            const activeNote = notes.find(n => n.id === activeId);
            if (activeNote?.folderId !== newParentId) {
                const parentDepth = newParentId ? getItemDepth(newParentId, folders, notes) : -1;
                if (parentDepth + 1 <= 2) {
                    moveNoteToFolder(activeId, newParentId);
                }
            }
            if (overIsNote) reorderNotes(activeId, overId);
        } else {
            const activeFolder = folders.find(f => f.id === activeId);
            if (activeFolder?.parentId !== newParentId) {
                const parentDepth = newParentId ? getItemDepth(newParentId, folders, notes) : -1;
                const subtreeHeight = getSubtreeMaxDepth(activeId, folders);
                if (parentDepth + 1 + subtreeHeight <= 2) {
                    moveFolderToFolder(activeId, newParentId);
                }
            }
            if (overIsFolder) reorderFolders(activeId, overId);
        }
    };

    const onDragCancel = () => {
        setDraggedId(null);
        setDropTarget(null);
        if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }
    };

    const handleRenameStart = (id: string, initialValue: string) => {
        setEditingId(id);
        setEditValue(initialValue);
        setContextMenu(null);
    };

    const handleRenameSave = () => {
        if (!editingId) return;
        const trimmedValue = editValue.trim();
        if (trimmedValue) {
            const note = notes.find(n => n.id === editingId);
            const folder = folders.find(f => f.id === editingId);
            const ws = workspaces.find(w => w.id === editingId);

            if (note) renameNote(editingId, trimmedValue);
            else if (folder) renameFolder(editingId, trimmedValue);
            else if (ws) renameWorkspace(editingId, trimmedValue);
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleRenameCancel = () => {
        setEditingId(null);
    };

    const handleExportWorkspace = async (workspaceId: string) => {
        try {
            const workspace = workspaces.find(w => w.id === workspaceId);
            const workspaceName = workspace?.name || "LUMENOTE";
            const sanitizedName = workspaceName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || "LUMENOTE";
            const defaultFileName = `${sanitizedName}.zip`;

            const selected = await save({
                defaultPath: defaultFileName,
                filters: [{
                    name: 'ZIP Archive',
                    extensions: ['zip']
                }],
                title: t('export', language)
            });
            if (selected) {
                await api.exportWorkspace(workspaceId, selected);
                toast.success(t('export_success', language));
            }
        } catch (error) {
            console.error("Export failed:", error);
            toast.error(t('export_failed', language));
        }
    };

    const handleImportWorkspace = async () => {
        try {
            const selected = await open({
                filters: [{
                    name: 'ZIP Archive',
                    extensions: ['zip']
                }],
                title: t('import_workspace', language),
                multiple: false
            });

            if (!selected || typeof selected !== 'string') {
                return;
            }

            const zipPath = selected;
            
            // Extract workspace name from ZIP filename (without .zip extension)
            const zipFileName = zipPath.split(/[/\\]/).pop() || 'Imported Workspace';
            const workspaceName = zipFileName.replace(/\.zip$/i, '') || 'Imported Workspace';
            
            const workspaceId = await api.importWorkspace(zipPath, workspaceName);
            
            // Refresh data and switch to imported workspace
            await initialize();
            setActiveWorkspaceId(workspaceId);
            
            toast.success(t('import_success', language));
        } catch (error: any) {
            console.error("Import failed:", error);
            const errorMessage = error?.message || String(error);
            toast.error(t('import_failed', language) + ': ' + errorMessage);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, type: ContextMenuType['type'], itemId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, itemId });
    };

    const renderItems = (parentId: string | null, depth: number) => {
        // Use filtered data when search is active, otherwise use full workspace data
        const effectiveFolders = searchQuery.trim() ? filteredFolders : workspaceFolders;
        const effectiveNotes = searchQuery.trim() ? filteredNotes : workspaceNotes;

        const childFolders = effectiveFolders.filter(f => f.parentId === parentId);
        const childNotes = effectiveNotes.filter(n => n.folderId === parentId);
        // ... (rest of renderItems logic unchanged, except using workspaceFolders/workspaceNotes)
        const items: React.ReactNode[] = [];
        const isDropIntoFolder = dropTarget?.position === 'inside';

        childFolders.forEach((folder: Folder) => {
            const isDragging = draggedId === folder.id;
            const isEditing = editingId === folder.id;
            const isDropTargetFolder = dropTarget?.id === folder.id && dropTarget.position === 'inside';
            const folderChildren = renderItems(folder.id, depth + 1);

            items.push(
                <div key={folder.id} className="select-none">
                    <SortableItem id={folder.id} disableAnimation={isDropIntoFolder} disabled={isEditing}>
                        <FolderItem
                            folder={folder}
                            depth={depth}
                            isDragging={isDragging}
                            isDropTarget={isDropTargetFolder}
                            isEditing={isEditing}
                            editValue={editValue}
                            onEditChange={setEditValue}
                            onEditSave={handleRenameSave}
                            onEditCancel={handleRenameCancel}
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleFolder(folder.id); }}
                            onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'folder', folder.id)}
                        />
                    </SortableItem>
                    {!isDragging && folderChildren.length > 0 && (
                        <FolderChildrenWrapper isExpanded={folder.isExpanded ?? false}>
                            {folderChildren}
                        </FolderChildrenWrapper>
                    )}
                </div>
            );
        });

        childNotes.forEach((note: Note) => {
            const isDragging = draggedId === note.id;
            const isEditing = editingId === note.id;
            items.push(
                <SortableItem key={note.id} id={note.id} disableAnimation={isDropIntoFolder} disabled={isEditing}>
                    <NoteItem
                        note={note}
                        depth={depth}
                        isActive={activeNoteId === note.id}
                        isDragging={isDragging}
                        isEditing={isEditing}
                        editValue={editValue}
                        onEditChange={setEditValue}
                        onEditSave={handleRenameSave}
                        onEditCancel={handleRenameCancel}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveNoteId(note.id); }}
                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'note', note.id)}
                    />
                </SortableItem>
            );
        });

        return items;
    };

    return (
        <div className="w-64 h-screen bg-app-sidebar border-r border-border-subtle flex flex-col" onContextMenu={(e) => handleContextMenu(e, 'sidebar')}>
            <div className="p-4 flex items-center justify-between">
                <h1 className="font-semibold text-text-primary tracking-tight truncate">Lumenote</h1>
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="p-1.5 rounded-sm hover:bg-app-hover text-text-secondary transition-colors"><Plus size={18} /></button>
                    <DropdownMenu
                        isOpen={dropdownOpen}
                        onClose={() => setDropdownOpen(false)}
                        onNewFile={() => {
                            const newId = addNote();
                            if (newId) setTimeout(() => handleRenameStart(newId, 'New Note'), 0);
                        }}
                        onNewFolder={() => {
                            const defaultName = t('new_folder', language);
                            const newId = addFolder(defaultName);
                            if (newId) setTimeout(() => handleRenameStart(newId, defaultName), 0);
                        }}
                        onNewWorkspace={() => {
                            const defaultName = t('new_workspace', language);
                            addWorkspace(defaultName);
                            setTimeout(() => {
                                const newWs = workspaces[workspaces.length - 1];
                                if (newWs) handleRenameStart(newWs.id, newWs.name);
                            }, 50);
                        }}
                    />
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 pb-3">
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('search', language)}
                        className={`w-full bg-app-hover border border-transparent focus:border-accent rounded-md py-1.5 pl-8 text-sm text-text-primary placeholder:text-text-muted outline-none ${searchQuery ? 'pr-8' : 'pr-3'}`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-app-surface text-text-muted hover:text-text-primary transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {searchQuery.trim() ? (
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar">
                    {searchResults.length > 0 ? (
                        searchResults.map(result => (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={result.id}
                                onClick={() => setActiveNoteId(result.id)}
                                className={`p-2 rounded-md cursor-pointer transition-all ${activeNoteId === result.id ? 'bg-accent-soft border-accent/20' : 'hover:bg-app-hover border-transparent'} border`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText size={14} className="text-accent" />
                                    <span className="text-[13px] font-medium text-text-primary truncate">{result.title}</span>
                                </div>
                                <div
                                    className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed search-snippet"
                                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                                />
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-text-muted text-xs">
                            {t('no_results', language)}
                        </div>
                    )}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={smartCollisionDetection}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDragCancel={onDragCancel}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                >
                    <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                            {renderItems(null, 0)}
                        </div>
                    </SortableContext>

                    <DragOverlay dropAnimation={{
                        duration: 150,
                        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                    }}>
                        {draggedId ? (
                            (() => {
                                const depth = getItemDepth(draggedId, workspaceFolders, workspaceNotes);
                                const draggedNote = workspaceNotes.find(n => n.id === draggedId);
                                const draggedFolder = workspaceFolders.find(f => f.id === draggedId);

                                return (
                                    <div
                                        className="opacity-80 cursor-grabbing pointer-events-none shadow-lg ring-1 ring-black/5 rounded-sm overflow-hidden bg-app-surface scale-[1.02] transition-transform"
                                        style={{ width: draggedWidth ? `${draggedWidth}px` : 'auto' }}
                                    >
                                        {draggedNote ? (
                                            <NoteItem
                                                note={draggedNote}
                                                isActive={activeNoteId === draggedId}
                                                isDragging={false}
                                                depth={depth}
                                                onClick={() => { }}
                                                onContextMenu={() => { }}
                                            />
                                        ) : draggedFolder ? (
                                            <FolderItem
                                                folder={draggedFolder}
                                                isDragging={false}
                                                isDropTarget={false}
                                                depth={depth}
                                                onClick={() => { }}
                                                onContextMenu={() => { }}
                                            />
                                        ) : null}
                                    </div>
                                );
                            })()
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Footer switcher */}
            <div className="p-3 border-t border-border-muted flex flex-col gap-3 bg-app-sidebar">
                <WorkspaceSwitcher
                    onContextMenu={(e, wsId) => handleContextMenu(e, 'workspace', wsId)}
                    editingId={editingId}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onEditSave={handleRenameSave}
                    onEditCancel={handleRenameCancel}
                    onNewWorkspaceEdit={(id, name) => handleRenameStart(id, name)}
                />
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                        {workspaces.find(w => w.id === activeWorkspaceId)?.name || t('workspace', language)}
                    </span>
                    <span className="text-[10px] text-text-muted">
                        {t('all_item_count', language, { notes: workspaceNotes.length, folders: workspaceFolders.length })}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {contextMenu && (
                    <ContextMenu
                        {...contextMenu}
                        onClose={() => setContextMenu(null)}
                        onRename={(id: string, val: string) => handleRenameStart(id, val)}
                        onExport={handleExportWorkspace}
                        onImport={handleImportWorkspace}
                        onInlineCreate={(id: string, name: string) => setTimeout(() => handleRenameStart(id, name), 0)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
