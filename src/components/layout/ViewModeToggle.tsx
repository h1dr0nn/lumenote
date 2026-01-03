import { motion } from 'framer-motion';
import { Pencil, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const ViewModeToggle = () => {
    const { viewMode, setViewMode } = useStore();

    const modes = [
        { id: 'edit', icon: <Pencil size={14} /> },
        { id: 'view', icon: <Eye size={14} /> },
    ] as const;

    return (
        <div className="relative flex bg-app-hover p-1 rounded-md gap-1">
            {modes.map((mode) => (
                <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`relative p-1.5 rounded-sm transition-colors flex items-center justify-center min-w-[32px] ${viewMode === mode.id ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                        }`}
                >
                    {viewMode === mode.id && (
                        <motion.div
                            layoutId="view-mode-indicator"
                            className="absolute inset-0 bg-app-surface shadow-sm rounded-sm"
                            transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 35,
                            }}
                        />
                    )}
                    <span className="relative z-10">{mode.icon}</span>
                </button>
            ))}
        </div>
    );
};
