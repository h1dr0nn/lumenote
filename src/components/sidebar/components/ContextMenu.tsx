import { useState, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FolderPlus, Trash2, Edit3, Palette, LayoutGrid } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useStore } from "../../../store/useStore";
import { t } from "../../../utils/i18n";
import { getItemDepth } from "../utils";
import { ContextMenuType } from "../types";

interface ContextMenuProps extends ContextMenuType {
    onClose: () => void;
    onRename: (id: string, val: string) => void;
    onExport?: (id: string) => void;
    onInlineCreate?: (id: string, name: string) => void;
}

export const ContextMenu = memo(({ x, y, type, itemId, onClose, onRename, onExport, onInlineCreate }: ContextMenuProps) => {
    const {
        folders, notes, workspaces, deleteNote, deleteFolder, deleteWorkspace,
        addNote, addFolder, addWorkspace, setNoteColor, setFolderColor, setWorkspaceColor, language
    } = useStore();
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x, y });
    const [showColorPicker, setShowColorPicker] = useState(false);

    const PRESET_COLORS = [
        { label: t('color_default', language), value: null },
        { label: t('color_blue', language), value: '#4F7DF3' },
        { label: t('color_green', language), value: '#10B981' },
        { label: t('color_red', language), value: '#EF4444' },
        { label: t('color_yellow', language), value: '#F59E0B' },
        { label: t('color_purple', language), value: '#8B5CF6' },
    ];

    useEffect(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            let nx = x;
            let ny = y;
            if (x + rect.width > window.innerWidth) nx = window.innerWidth - rect.width - 8;
            if (y + rect.height > window.innerHeight) ny = window.innerHeight - rect.height - 8;
            setPos({ x: nx, y: ny });
        }
    }, [x, y, showColorPicker]);

    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleGlobalClick);
        return () => document.removeEventListener('mousedown', handleGlobalClick);
    }, [onClose]);

    const handleRename = () => {
        if (!itemId) return;
        if (type === 'note') {
            const note = notes.find(n => n.id === itemId);
            if (note) onRename(itemId, note.title);
        } else if (type === 'folder') {
            const folder = folders.find(f => f.id === itemId);
            if (folder) onRename(itemId, folder.name);
        } else if (type === 'workspace') {
            const ws = workspaces.find(w => w.id === itemId);
            if (ws) onRename(itemId, ws.name);
        }
        onClose();
    };

    const handleSetColor = (color: string | null) => {
        if (!itemId) return;
        if (type === 'note') setNoteColor(itemId, color);
        else if (type === 'folder') setFolderColor(itemId, color);
        else if (type === 'workspace') setWorkspaceColor(itemId, color);
        onClose();
    };

    const items = type === 'note' ? [
        { icon: <Edit3 size={14} />, label: t('rename', language), action: handleRename },
        { icon: <Palette size={14} />, label: t('appearance', language), action: () => setShowColorPicker(!showColorPicker) },
        { icon: <Trash2 size={14} />, label: t('delete', language), action: () => { if (itemId) deleteNote(itemId); onClose(); }, danger: true },
    ] : type === 'folder' ? [
        {
            icon: <FileText size={14} />, label: t('new_note', language), action: () => {
                const newId = itemId ? addNote(itemId) : addNote();
                if (newId) onInlineCreate?.(newId, 'New Note');
                onClose();
            }
        },
        {
            icon: <FolderPlus size={14} />,
            label: t('new_folder', language),
            action: () => {
                const defaultName = t('new_folder', language);
                const newId = itemId ? addFolder(defaultName, itemId) : addFolder(defaultName);
                if (newId) onInlineCreate?.(newId, defaultName);
                onClose();
            },
            disabled: !(itemId && getItemDepth(itemId, folders, notes) < 2)
        },
        { icon: <Palette size={14} />, label: t('appearance', language), action: () => setShowColorPicker(!showColorPicker) },
        { icon: <Edit3 size={14} />, label: t('rename', language), action: handleRename },
        { icon: <Trash2 size={14} />, label: t('delete', language), action: () => { if (itemId) deleteFolder(itemId); onClose(); }, danger: true },
    ] : type === 'workspace' ? [
        { icon: <Edit3 size={14} />, label: t('rename', language), action: handleRename },
        { icon: <Palette size={14} />, label: t('appearance', language), action: () => setShowColorPicker(!showColorPicker) },
        { icon: <FileText size={14} />, label: t('export_markdown', language), action: () => { if (itemId) onExport?.(itemId); onClose(); } },
        { icon: <Trash2 size={14} />, label: t('delete', language), action: () => { if (itemId) deleteWorkspace(itemId); onClose(); }, danger: true },
    ] : [
        {
            icon: <FileText size={14} />, label: t('new_note', language), action: () => {
                const newId = addNote();
                if (newId) onInlineCreate?.(newId, 'New Note');
                onClose();
            }
        },
        {
            icon: <FolderPlus size={14} />, label: t('new_folder', language), action: () => {
                const defaultName = t('new_folder', language);
                const newId = addFolder(defaultName);
                if (newId) onInlineCreate?.(newId, defaultName);
                onClose();
            }
        },
        { type: 'separator' },
        { icon: <LayoutGrid size={14} />, label: t('new_workspace', language), action: () => { addWorkspace(t('new_workspace', language)); onClose(); } },
    ];

    const currentColor = itemId ? (
        type === 'note' ? notes.find(n => n.id === itemId)?.color :
            type === 'folder' ? folders.find(f => f.id === itemId)?.color :
                type === 'workspace' ? workspaces.find(w => w.id === itemId)?.color : null
    ) : null;

    return (
        <motion.div ref={ref}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
                layout: { duration: 0.2, ease: "easeOut" },
                opacity: { duration: 0.15 },
                scale: { duration: 0.15 }
            }}
            style={{ left: pos.x, top: pos.y }}
            className="fixed bg-app-surface border border-border-subtle rounded-md shadow-md z-100 min-w-[220px] py-1 overflow-hidden"
        >
            {items.map((item: any, i) => item.type === 'separator' ? (
                <div key={i} className="h-px bg-border-subtle my-1" />
            ) : (
                <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); if (!item.disabled) item.action(); }}
                    disabled={item.disabled}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors
                        ${item.danger ? 'text-red-500 hover:bg-red-50/10' :
                            item.disabled ? 'text-text-muted cursor-not-allowed opacity-50' :
                                'text-text-primary hover:bg-app-hover'}`}
                >
                    <span className="flex items-center gap-2">{item.icon} {item.label}</span>
                    {item.label === t('appearance', language) && <div className="w-3.5 h-3.5 rounded-full border border-black/5 shadow-inner" style={{ backgroundColor: currentColor || 'transparent' }} />}
                </button>
            ))}

            <AnimatePresence>
                {showColorPicker && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="border-t border-border-subtle bg-app-surface overflow-hidden"
                    >
                        <div className="px-3 py-3">
                            <style>{`
                                .custom-picker .react-colorful { width: 100%; height: 100px; }
                                .custom-picker .react-colorful__saturation { border-radius: 4px; border-bottom: none; }
                                .custom-picker .react-colorful__hue { height: 12px; border-radius: 4px; margin-top: 8px; }
                                .custom-picker .react-colorful__interactive:focus .react-colorful__pointer { transform: translate(-50%, -50%) scale(1.1); }
                            `}</style>
                            <div className="grid grid-cols-6 gap-2 mb-3">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.label}
                                        onClick={() => handleSetColor(c.value)}
                                        title={c.label}
                                        className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.value || 'white' }}
                                    >
                                        {!c.value && <div className="w-full h-px bg-red-400 rotate-45" />}
                                    </button>
                                ))}
                            </div>
                            <div className="custom-picker">
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">{t('custom_color', language)}</p>
                                <HexColorPicker
                                    color={currentColor || '#4F7DF3'}
                                    onChange={(color) => {
                                        if (!itemId) return;
                                        if (type === 'note') setNoteColor(itemId, color);
                                        else setFolderColor(itemId, color);
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
