import { motion } from 'framer-motion';
import { Pencil, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { t } from '../../utils/i18n';

export const ViewModeToggle = () => {
    const { viewMode, setViewMode, language } = useStore();

    const modes = [
        { id: 'edit', icon: <Pencil size={12} />, label: t('mode_edit', language) },
        { id: 'view', icon: <Eye size={12} />, label: t('mode_view', language) },
    ] as const;

    return (
        <div className="flex bg-app-hover/50 p-1 rounded-full border border-border-muted gap-1">
            {modes.map((mode) => (
                <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`relative flex items-center gap-1.5 pl-4 pr-3.5 py-1 rounded-full transition-all group ${
                        viewMode === mode.id 
                            ? 'text-accent' 
                            : 'text-text-muted hover:text-text-secondary'
                    }`}
                >
                    {viewMode === mode.id && (
                        <motion.div
                            layoutId="view-mode-pill"
                            className="absolute inset-0 bg-accent/10 border border-accent/20 rounded-full"
                            transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 35,
                            }}
                        />
                    )}
                    
                    <span className="relative z-10 text-[10px] font-bold uppercase tracking-wider">
                        {mode.label}
                    </span>
                    
                    <span className={`relative z-10 transition-colors ${
                        viewMode === mode.id ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'
                    }`}>
                        {mode.icon}
                    </span>
                </button>
            ))}
        </div>
    );
};
