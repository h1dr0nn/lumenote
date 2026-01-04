import { Modal } from '../ui/Modal';
import { useStore } from '../../store/useStore';
import { Sun, Moon, Monitor, Type, Minus, Plus, Languages } from 'lucide-react';
import { motion } from 'framer-motion';
import { t } from '../../utils/i18n';

import { getName, getVersion } from '@tauri-apps/api/app';
import { useState, useEffect } from 'react';

export const SettingsPopup = () => {
    const { 
        activePopup, setActivePopup,
        theme, setTheme,
        fontPreset, setFontPreset,
        fontSize, setFontSize,
        language, setLanguage
    } = useStore();

    const [appVersion, setAppVersion] = useState<string>('');
    const [appName, setAppName] = useState<string>('Lumenote');

    useEffect(() => {
        const fetchAppInfo = async () => {
            try {
                const v = await getVersion();
                setAppVersion(v);
                const n = await getName();
                // Capitalize first letter if it defaults to lowercase 'lumenote'
                setAppName(n.charAt(0).toUpperCase() + n.slice(1)); 
            } catch (e) {
                console.error('Failed to get app info', e);
                setAppVersion('0.1.0'); // Fallback
            }
        };
        fetchAppInfo();
    }, []);

    const segmentedControl = (
        options: { id: string, label: string, icon?: any }[],
        currentValue: string,
        onChange: (val: any) => void,
        layoutId: string
    ) => (
        <div className="flex p-1 bg-app-hover rounded-xl relative overflow-hidden">
            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-medium transition-colors relative z-10 ${
                        currentValue === option.id 
                            ? 'text-text-primary' 
                            : 'text-text-muted hover:text-text-secondary'
                    }`}
                >
                    {option.icon && <option.icon size={14} />}
                    {option.label}
                    
                    {currentValue === option.id && (
                        <motion.div
                            layoutId={layoutId}
                            className="absolute inset-0 bg-app-surface shadow-sm rounded-lg -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        />
                    )}
                </button>
            ))}
        </div>
    );

    return (
        <Modal 
            isOpen={activePopup === 'settings'} 
            onClose={() => setActivePopup(null)} 
            title={t('settings', language)}
            maxWidth="450px"
        >
            <div className="space-y-8">
                {/* Theme Section */}
                <section>
                    <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">{t('theme', language)}</h4>
                    {segmentedControl([
                        { id: 'light', label: t('theme_light', language), icon: Sun },
                        { id: 'dark', label: t('theme_dark', language), icon: Moon },
                        { id: 'system', label: t('theme_system', language), icon: Monitor },
                    ], theme, setTheme, 'theme-slider')}
                </section>

                {/* Typography Section */}
                <section>
                    <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">{t('typography', language)}</h4>
                    <div className="space-y-6">
                        {/* Font Presets */}
                        <div>
                            <div className="text-[10px] text-text-muted mb-2 font-medium">{t('font_set', language)}</div>
                            {segmentedControl([
                                { id: 'sans', label: t('font_set_system', language) },
                                { id: 'serif', label: t('font_set_classic', language) },
                                { id: 'mono', label: t('font_set_modern', language) },
                            ], fontPreset, setFontPreset, 'font-slider')}
                        </div>

                        {/* Font Size */}
                        <div className="flex items-center justify-between p-4 bg-app-hover rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-app-surface rounded-lg text-text-secondary shadow-sm">
                                    <Type size={18} />
                                </div>
                                <span className="text-sm font-medium text-text-primary">{t('font_size', language)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                                    className="p-1.5 hover:bg-app-active rounded-lg text-text-muted transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="text-sm font-mono font-medium w-8 text-center text-text-primary">{fontSize}px</span>
                                <button 
                                    onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                                    className="p-1.5 hover:bg-app-active rounded-lg text-text-muted transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Language Section */}
                <section>
                    <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">{t('language', language)}</h4>
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-app-hover rounded-lg text-text-muted">
                            <Languages size={18} />
                        </div>
                        <div className="flex-1">
                            {segmentedControl([
                                { id: 'vi', label: t('lang_vi', language) },
                                { id: 'en', label: t('lang_en', language) },
                            ], language, setLanguage, 'lang-slider')}
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section className="pt-4 border-t border-border-muted">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-text-muted opacity-50">{appName} v{appVersion || '...'}</span>
                            <div className="w-px h-3 bg-border-muted/30" />
                            <button 
                                className="text-[10px] font-medium text-text-muted hover:text-accent transition-colors underline-offset-2 hover:underline"
                                onClick={() => console.log('Check for update clicked')}
                            >
                                {t('check_update', language)}
                            </button>
                        </div>
                        <span className="text-[10px] font-medium text-text-muted opacity-50">h1dr0n</span>
                    </div>
                </section>
            </div>
        </Modal>
    );
};
