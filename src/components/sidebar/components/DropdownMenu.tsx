import { useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FolderPlus } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { t } from "../../../utils/i18n";

interface DropdownMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNewFile: () => void;
    onNewFolder: () => void;
}

export const DropdownMenu = memo(({ isOpen, onClose, onNewFile, onNewFolder }: DropdownMenuProps) => {
    const { language } = useStore();
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
                    className="absolute right-0 top-full mt-1 w-40 bg-app-surface border border-border-subtle rounded-md shadow-md z-50 overflow-hidden">
                    <button onClick={() => { onNewFile(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-hover"><FileText size={14} /> {t('new_note', language)}</button>
                    <button onClick={() => { onNewFolder(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-app-hover"><FolderPlus size={14} /> {t('new_folder', language)}</button>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
