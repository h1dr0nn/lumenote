import { motion } from 'framer-motion';
import { Pencil, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const ViewModeToggle = () => {
    const { viewMode, setViewMode } = useStore();

    return (
        <div className="relative flex bg-app-hover p-1 rounded-md">
            {/* Sliding background indicator */}
            <motion.div
                className="absolute top-1 bottom-1 bg-app-surface shadow-sm rounded-sm"
                initial={false}
                animate={{
                    x: viewMode === 'edit' ? 0 : '100%',
                    width: 'calc(50% - 2px)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />

            <button
                onClick={() => setViewMode('edit')}
                className={`relative z-10 p-1.5 rounded-sm transition-colors ${viewMode === 'edit' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                    }`}
            >
                <Pencil size={14} />
            </button>
            <button
                onClick={() => setViewMode('view')}
                className={`relative z-10 p-1.5 rounded-sm transition-colors ${viewMode === 'view' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                    }`}
            >
                <Eye size={14} />
            </button>
        </div>
    );
};
