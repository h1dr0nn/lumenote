import { useStore } from "../../store/useStore";
import { Plus, Hash, Folder, ChevronRight, FileText, FolderPlus, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

// Dropdown Menu Component
const DropdownMenu = ({ isOpen, onClose, onNewFile, onNewFolder }: {
    isOpen: boolean;
    onClose: () => void;
    onNewFile: () => void;
    onNewFolder: () => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-app-surface border border-border-subtle rounded-md shadow-md z-50 overflow-hidden"
                >
                    <button
                        onClick={() => { onNewFile(); onClose(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-hover transition-colors"
                    >
                        <FileText size={14} /> Ghi chú mới
                    </button>
                    <button
                        onClick={() => { onNewFolder(); onClose(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-hover transition-colors"
                    >
                        <FolderPlus size={14} /> Thư mục mới
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Context Menu Component
const ContextMenu = ({ x, y, type, itemId, onClose }: {
    x: number;
    y: number;
    type: 'sidebar' | 'note' | 'folder';
    itemId?: string;
    onClose: () => void;
}) => {
    const { deleteNote, deleteFolder, addNote, addFolder } = useStore();
    const ref = useRef<HTMLDivElement>(null);

    // Smart positioning to stay within viewport
    const [position, setPosition] = useState({ x, y });

    useEffect(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            let newX = x, newY = y;
            if (x + rect.width > window.innerWidth) newX = window.innerWidth - rect.width - 8;
            if (y + rect.height > window.innerHeight) newY = window.innerHeight - rect.height - 8;
            if (newX < 0) newX = 8;
            if (newY < 0) newY = 8;
            setPosition({ x: newX, y: newY });
        }
    }, [x, y]);

    useEffect(() => {
        const handleClick = () => onClose();
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [onClose]);

    const menuItems = type === 'note' ? [
        { icon: <Edit3 size={14} />, label: 'Đổi tên', action: () => { } },
        { icon: <Trash2 size={14} />, label: 'Xoá ghi chú', action: () => itemId && deleteNote(itemId), danger: true },
    ] : type === 'folder' ? [
        { icon: <FileText size={14} />, label: 'Ghi chú mới', action: () => itemId && addNote(itemId) },
        { icon: <Edit3 size={14} />, label: 'Đổi tên', action: () => { } },
        { icon: <Trash2 size={14} />, label: 'Xoá thư mục', action: () => itemId && deleteFolder(itemId), danger: true },
    ] : [
        { icon: <FileText size={14} />, label: 'Ghi chú mới', action: () => addNote() },
        { icon: <FolderPlus size={14} />, label: 'Thư mục mới', action: () => addFolder('Thư mục mới') },
    ];

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ left: position.x, top: position.y }}
            className="fixed bg-app-surface border border-border-subtle rounded-md shadow-md z-[100] overflow-hidden min-w-[140px]"
        >
            {menuItems.map((item, i) => (
                <button
                    key={i}
                    onClick={() => { item.action(); onClose(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${item.danger ? 'text-red-500 hover:bg-red-50' : 'text-text-primary hover:bg-app-hover'
                        }`}
                >
                    {item.icon} {item.label}
                </button>
            ))}
        </motion.div>
    );
};

export const Sidebar = () => {
    const { notes, folders, activeNoteId, setActiveNoteId, addNote, addFolder, toggleFolder } = useStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'sidebar' | 'note' | 'folder'; itemId?: string } | null>(null);

    // Disable default context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    const handleSidebarContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'sidebar' });
    };

    const handleNoteContextMenu = (e: React.MouseEvent, noteId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'note', itemId: noteId });
    };

    const handleFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', itemId: folderId });
    };

    // Notes without folder
    const rootNotes = notes.filter(n => !n.folderId);

    return (
        <div
            className="w-64 h-screen bg-app-sidebar backdrop-blur-md border-r border-border-subtle flex flex-col"
            onContextMenu={handleSidebarContextMenu}
        >
            <div className="p-4 flex items-center justify-between">
                <h1 className="font-semibold text-text-primary tracking-tight">Lumenote</h1>
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="p-1.5 rounded-sm hover:bg-app-hover text-text-secondary transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                    <DropdownMenu
                        isOpen={dropdownOpen}
                        onClose={() => setDropdownOpen(false)}
                        onNewFile={() => addNote()}
                        onNewFolder={() => addFolder('Thư mục mới')}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {/* Folders */}
                {folders.map((folder) => (
                    <div key={folder.id}>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => toggleFolder(folder.id)}
                            onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                            className="group flex items-center gap-2 px-3 py-2 rounded-sm cursor-pointer hover:bg-app-hover text-text-secondary"
                        >
                            <motion.div animate={{ rotate: folder.isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                                <ChevronRight size={14} className="text-text-muted" />
                            </motion.div>
                            <Folder size={14} className="text-text-muted" />
                            <span className="text-sm truncate font-medium flex-1">{folder.name}</span>
                        </motion.div>

                        <AnimatePresence>
                            {folder.isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="ml-4 overflow-hidden"
                                >
                                    {notes.filter(n => n.folderId === folder.id).map((note) => (
                                        <NoteItem
                                            key={note.id}
                                            note={note}
                                            isActive={activeNoteId === note.id}
                                            onClick={() => setActiveNoteId(note.id)}
                                            onContextMenu={(e) => handleNoteContextMenu(e, note.id)}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}

                {/* Root notes */}
                {rootNotes.map((note) => (
                    <NoteItem
                        key={note.id}
                        note={note}
                        isActive={activeNoteId === note.id}
                        onClick={() => setActiveNoteId(note.id)}
                        onContextMenu={(e) => handleNoteContextMenu(e, note.id)}
                    />
                ))}
            </div>

            <div className="p-4 border-t border-border-muted text-xs text-text-muted">
                {notes.length} ghi chú • {folders.length} thư mục
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

// Note Item Component
const NoteItem = ({ note, isActive, onClick, onContextMenu }: {
    note: { id: string; title: string };
    isActive: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={`group flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer transition-all ${isActive ? 'bg-accent-soft text-text-accent' : 'hover:bg-app-hover text-text-secondary'
            }`}
    >
        <Hash size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
        <span className="text-sm truncate font-medium">{note.title || "Ghi chú không tên"}</span>
    </motion.div>
);
