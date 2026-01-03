import { useStore } from "../../store/useStore";
import { Plus, Hash, Folder as FolderIcon, ChevronRight, FileText, FolderPlus, Trash2, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo, memo } from "react";
import {
    DndContext,
    closestCenter,
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
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";

// --- Types ---
type ContextMenuType = { x: number; y: number; type: 'sidebar' | 'note' | 'folder'; itemId?: string };
type DragTarget = { id: string; position: 'above' | 'inside' | 'below' } | null;

// --- Note Item ---
const NoteItem = memo(({ note, isActive, isDragging, onClick, onContextMenu, depth = 0 }: any) => (
    <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-sm cursor-pointer transition-colors select-none ${isDragging ? 'opacity-50' : isActive ? 'bg-accent-soft text-text-accent' : 'hover:bg-app-hover text-text-secondary'
            }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
        <Hash size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
        <span className="text-sm truncate font-medium">{note.title || "Ghi chú không tên"}</span>
    </div>
));

// --- Folder Item ---
const FolderItem = memo(({ folder, isDragging, isDropTarget, onClick, onContextMenu, depth = 0, children }: any) => (
    <div className="select-none">
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-sm cursor-pointer transition-all ${isDragging ? 'opacity-50' : isDropTarget ? 'bg-accent-soft ring-2 ring-accent' : 'hover:bg-app-hover text-text-secondary'
                }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
            <motion.div animate={{ rotate: folder.isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronRight size={14} className={isDropTarget ? 'text-accent' : 'text-text-muted'} />
            </motion.div>
            <FolderIcon size={14} className={isDropTarget ? 'text-accent' : 'text-text-muted'} />
            <span className="text-sm truncate font-medium flex-1">{folder.name}</span>
        </div>
        {folder.isExpanded && !isDragging && (
            <div className="border-l border-border-muted/30 ml-5">{children}</div>
        )}
    </div>
));

// --- Sortable Wrapper ---
const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 50 : 1, position: 'relative' }}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
};

// --- MAIN SIDEBAR ---
export const Sidebar = () => {
    const { notes, folders, activeNoteId, setActiveNoteId, addNote, addFolder, toggleFolder, reorderNotes, reorderFolders, moveNoteToFolder, moveFolderToFolder } = useStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenuType | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<DragTarget>(null);
    const expandTimerRef = useRef<any>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const isNote = (id: string) => notes.some(n => n.id === id);
    const isFolder = (id: string) => folders.some(f => f.id === id);

    const onDragStart = (event: DragStartEvent) => {
        const id = event.active.id as string;
        setDraggedId(id);
        if (isFolder(id)) toggleFolder(id, false);
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) { setDropTarget(null); return; }

        const overId = over.id as string;
        const activeId = active.id as string;
        if (activeId === overId) { setDropTarget(null); return; }

        // Tính vị trí tương đối
        const overRect = over.rect;
        const activeRect = active.rect.current.translated;
        if (!activeRect) { setDropTarget(null); return; }

        const yCenter = activeRect.top + activeRect.height / 2;
        const relativeY = yCenter - overRect.top;
        const height = overRect.height;

        let position: 'above' | 'inside' | 'below';
        if (isFolder(overId)) {
            // Folder: 25% trên = above, 50% giữa = inside, 25% dưới = below
            if (relativeY < height * 0.25) position = 'above';
            else if (relativeY > height * 0.75) position = 'below';
            else position = 'inside';
        } else {
            // Note: 50% trên = above, 50% dưới = below
            position = relativeY < height / 2 ? 'above' : 'below';
        }

        setDropTarget({ id: overId, position });

        // Auto-expand folder after 500ms
        if (isFolder(overId) && position === 'inside') {
            const folder = folders.find(f => f.id === overId);
            if (folder && !folder.isExpanded && !expandTimerRef.current) {
                expandTimerRef.current = setTimeout(() => toggleFolder(overId, true), 500);
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

        const activeIsNote = isNote(activeId);
        const overIsNote = isNote(overId);
        const overIsFolder = isFolder(overId);

        // 1. NHÉT VÀO FOLDER
        if (overIsFolder && position === 'inside') {
            if (activeIsNote) {
                moveNoteToFolder(activeId, overId);
            } else {
                moveFolderToFolder(activeId, overId);
            }
            return;
        }

        // 2. SẮP XẾP LẠI (REORDER)
        // Xác định parent mới
        let newParentId: string | null = null;
        if (overIsNote) {
            const overNote = notes.find(n => n.id === overId);
            newParentId = overNote?.folderId || null;
        } else {
            const overFolder = folders.find(f => f.id === overId);
            newParentId = overFolder?.parentId || null;
        }

        // Di chuyển item đến parent mới nếu khác
        if (activeIsNote) {
            const activeNote = notes.find(n => n.id === activeId);
            if (activeNote?.folderId !== newParentId) {
                moveNoteToFolder(activeId, newParentId);
            }
            // Reorder notes
            if (overIsNote) reorderNotes(activeId, overId);
        } else {
            const activeFolder = folders.find(f => f.id === activeId);
            if (activeFolder?.parentId !== newParentId) {
                moveFolderToFolder(activeId, newParentId);
            }
            // Reorder folders
            if (overIsFolder) reorderFolders(activeId, overId);
        }
    };

    const onDragCancel = () => {
        setDraggedId(null);
        setDropTarget(null);
        if (expandTimerRef.current) { clearTimeout(expandTimerRef.current); expandTimerRef.current = null; }
    };

    // Render tree recursively
    const renderItems = (parentId: string | null, depth: number): JSX.Element[] => {
        const childFolders = folders.filter(f => f.parentId === parentId);
        const childNotes = notes.filter(n => n.folderId === parentId);
        const items: JSX.Element[] = [];

        childFolders.forEach(folder => {
            const isDragging = draggedId === folder.id;
            const isDropTargetFolder = dropTarget?.id === folder.id && dropTarget.position === 'inside';
            items.push(
                <SortableItem key={folder.id} id={folder.id}>
                    <FolderItem
                        folder={folder}
                        depth={depth}
                        isDragging={isDragging}
                        isDropTarget={isDropTargetFolder}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleFolder(folder.id); }}
                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'folder', folder.id)}
                    >
                        {renderItems(folder.id, depth + 1)}
                    </FolderItem>
                </SortableItem>
            );
        });

        childNotes.forEach(note => {
            const isDragging = draggedId === note.id;
            items.push(
                <SortableItem key={note.id} id={note.id}>
                    <NoteItem
                        note={note}
                        depth={depth}
                        isActive={activeNoteId === note.id}
                        isDragging={isDragging}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveNoteId(note.id); }}
                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, 'note', note.id)}
                    />
                </SortableItem>
            );
        });

        return items;
    };

    const allItemIds = useMemo(() => [...folders.map(f => f.id), ...notes.map(n => n.id)], [folders, notes]);

    const handleContextMenu = (e: React.MouseEvent, type: 'sidebar' | 'note' | 'folder', itemId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, itemId });
    };

    return (
        <div className="w-64 h-screen bg-app-sidebar border-r border-border-subtle flex flex-col" onContextMenu={(e) => handleContextMenu(e, 'sidebar')}>
            <div className="p-4 flex items-center justify-between">
                <h1 className="font-semibold text-text-primary tracking-tight">Lumenote</h1>
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="p-1.5 rounded-sm hover:bg-app-hover text-text-secondary transition-colors"><Plus size={18} /></button>
                    <DropdownMenu isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} onNewFile={() => addNote()} onNewFolder={() => addFolder('Thư mục mới')} />
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
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
            </DndContext>

            <div className="p-4 border-t border-border-muted text-xs text-text-muted">
                {notes.length} ghi chú • {folders.length} thư mục
            </div>

            <AnimatePresence>
                {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
            </AnimatePresence>
        </div>
    );
};

// --- Helper Components ---
const DropdownMenu = memo(({ isOpen, onClose, onNewFile, onNewFolder }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div ref={ref} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-app-surface border border-border-subtle rounded-md shadow-md z-50">
                    <button onClick={() => { onNewFile(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-hover"><FileText size={14} /> Ghi chú mới</button>
                    <button onClick={() => { onNewFolder(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-hover"><FolderPlus size={14} /> Thư mục mới</button>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

const ContextMenu = memo(({ x, y, type, itemId, onClose }: ContextMenuType & { onClose: () => void }) => {
    const { deleteNote, deleteFolder, addNote, addFolder } = useStore();
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x, y });

    useEffect(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({ x: Math.min(x, window.innerWidth - rect.width - 8), y: Math.min(y, window.innerHeight - rect.height - 8) });
        }
    }, [x, y]);

    useEffect(() => { document.addEventListener('click', onClose); return () => document.removeEventListener('click', onClose); }, [onClose]);

    const items = type === 'note' ? [
        { icon: <Edit3 size={14} />, label: 'Đổi tên', action: () => { } },
        { icon: <Trash2 size={14} />, label: 'Xoá', action: () => itemId && deleteNote(itemId), danger: true },
    ] : type === 'folder' ? [
        { icon: <FileText size={14} />, label: 'Ghi chú mới', action: () => itemId && addNote(itemId) },
        { icon: <Edit3 size={14} />, label: 'Đổi tên', action: () => { } },
        { icon: <Trash2 size={14} />, label: 'Xoá', action: () => itemId && deleteFolder(itemId), danger: true },
    ] : [
        { icon: <FileText size={14} />, label: 'Ghi chú mới', action: () => addNote() },
        { icon: <FolderPlus size={14} />, label: 'Thư mục mới', action: () => addFolder('Thư mục mới') },
    ];

    return (
        <motion.div ref={ref} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ left: pos.x, top: pos.y }} className="fixed bg-app-surface border border-border-subtle rounded-md shadow-md z-[100] min-w-[140px]">
            {items.map((item, i) => (
                <button key={i} onClick={() => { item.action(); onClose(); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${item.danger ? 'text-red-500 hover:bg-red-50' : 'text-text-primary hover:bg-app-hover'}`}>
                    {item.icon} {item.label}
                </button>
            ))}
        </motion.div>
    );
});
