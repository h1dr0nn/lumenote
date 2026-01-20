import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Folder as FolderIcon } from "lucide-react";
import { Folder } from "../../../types";

interface FolderItemProps {
    folder: Folder;
    isDragging: boolean;
    isDropTarget: boolean;
    onClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    depth?: number;
    isEditing?: boolean;
    editValue?: string;
    onEditChange?: (val: string) => void;
    onEditSave?: () => void;
    onEditCancel?: () => void;
}

export const FolderItem = memo(({ 
    folder, 
    isDragging, 
    isDropTarget, 
    onClick, 
    onContextMenu, 
    depth = 0, 
    isEditing, 
    editValue, 
    onEditChange, 
    onEditSave, 
    onEditCancel 
}: FolderItemProps) => (
    <motion.div
        onClick={onClick}
        onContextMenu={onContextMenu}
        animate={{ 
            scale: isDropTarget ? 1.02 : 1,
            backgroundColor: isDropTarget ? 'var(--color-accent-soft)' : 'rgba(0,0,0,0)',
            paddingLeft: `${depth * 2 + 8}px`
        }}
        transition={{ duration: 0.2 }}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
            isDragging ? 'opacity-50' : 
            isDropTarget ? 'ring-2 ring-accent shadow-sm' : 
            'hover:bg-app-hover text-text-secondary'
        }`}
    >
        <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
            <motion.div animate={{ rotate: folder.isExpanded || isDropTarget ? 90 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronRight size={14} style={{ color: folder.color }} className={!folder.color ? (isDropTarget ? 'text-accent' : 'text-text-muted') : ''} />
            </motion.div>
        </div>
        <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
            <FolderIcon size={14} style={{ color: folder.color }} className={!folder.color ? (isDropTarget ? 'text-accent' : 'text-text-muted') : ''} />
        </div>
        {isEditing ? (
            <input
                autoFocus
                className="bg-transparent text-sm font-medium flex-1 outline-none"
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
            <span className={`text-sm truncate font-medium flex-1 ${isDropTarget ? 'text-accent' : ''}`}>{folder.name}</span>
        )}
    </motion.div>
));
