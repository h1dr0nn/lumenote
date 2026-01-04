import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
import { t } from '../../utils/i18n';
import { Check } from 'lucide-react';

export const WorkspaceModal = () => {
    const { activePopup, setActivePopup, addWorkspace, language } = useStore();
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#4F7DF3');

    const isOpen = activePopup === 'workspace_create';
    const colors = ['#4F7DF3', '#E94F37', '#3CB371', '#FFA500', '#9370DB', '#FF69B4', '#20B2AA', '#778899'];

    const handleCreate = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName) {
            addWorkspace(trimmedName, selectedColor);
            setActivePopup(null);
            setName('');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => setActivePopup(null)}
            title={t('new_workspace', language)}
            footer={
                <>
                    <button
                        onClick={() => setActivePopup(null)}
                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                        {t('cancel', language) || 'Cancel'}
                    </button>
                    <button
                        onClick={() => handleCreate()}
                        disabled={!name.trim()}
                        className="px-6 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                    >
                        {t('create', language) || 'Create'}
                    </button>
                </>
            }
            maxWidth="400px"
        >
            <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">
                        {t('workspace_name', language)}
                    </label>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('new_workspace', language)}
                        className="w-full bg-app-sidebar/50 border border-border-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none rounded-xl px-4 py-3 text-sm text-text-primary transition-all"
                    />
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">
                        {t('workspace_color', language) || 'Theme Color'}
                    </label>
                    <div className="flex flex-wrap gap-3 px-1">
                        {colors.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
                                    selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-app-surface ring-accent scale-110' : ''
                                }`}
                                style={{ backgroundColor: color }}
                            >
                                {selectedColor === color && <Check size={14} className="text-white" />}
                            </button>
                        ))}
                    </div>
                </div>
            </form>
        </Modal>
    );
};
