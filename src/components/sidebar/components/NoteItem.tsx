import { memo } from "react";
import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { Note } from "../../../types";

interface NoteItemProps {
    note: Note;
    isActive: boolean;
    isDragging: boolean;
    onClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    depth?: number;
    isEditing?: boolean;
    editValue?: string;
    onEditChange?: (val: string) => void;
    onEditSave?: () => void;
    onEditCancel?: () => void;
}

export const NoteItem = memo(({ 
    note, 
    isActive, 
    isDragging, 
    onClick, 
    onContextMenu, 
    depth = 0, 
    isEditing, 
    editValue, 
    onEditChange, 
    onEditSave, 
    onEditCancel 
}: NoteItemProps) => (
    <motion.div
        onClick={onClick}
        onContextMenu={onContextMenu}
        layout
        animate={{ paddingLeft: `${depth * 2 + 8}px` }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-sm cursor-pointer transition-colors select-none ${isDragging ? 'opacity-50' : isActive ? 'bg-accent-soft text-text-accent' : 'hover:bg-app-hover text-text-secondary'
            }`}
    >
        <div className="w-[14px] shrink-0" />
        <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
            <Hash size={14} style={{ color: note.color }} className={!note.color ? (isActive ? 'text-accent' : 'text-text-muted') : ''} />
        </div>
        {isEditing ? (
            <input
                autoFocus
                className="bg-transparent text-sm font-medium w-full outline-none"
                value={editValue}
                onChange={(e) => onEditChange?.(e.target.value)}
                onBlur={onEditSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onEditSave?.();
                    if (e.key === 'Escape') onEditCancel?.();
                }}
                onClick={(e) => e.stopPropagation()}
            />
        ) : (
            <span className="text-sm truncate font-medium">{note.title || "Ghi chú không tên"}</span>
        )}
    </motion.div>
));
