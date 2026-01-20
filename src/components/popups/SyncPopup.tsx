import { Modal } from '../ui/Modal';
import { useStore } from '../../store/useStore';
import { Cloud, Globe, Key, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../utils/i18n';
import { useState, useEffect } from 'react';

export const SyncPopup = () => {
    const { 
        activePopup, setActivePopup,
        syncUrl, syncKey, setSyncConfig,
        isSyncing, performSync,
        lastSyncedAt, hasUnsyncedChanges, language
    } = useStore();

    const [url, setUrl] = useState(syncUrl);
    const [key, setKey] = useState(syncKey);

    // Update local state when store values change (e.g., after loading from localStorage)
    useEffect(() => {
        setUrl(syncUrl);
        setKey(syncKey);
    }, [syncUrl, syncKey]);

    const handleSave = () => {
        setSyncConfig(url, key);
    };

    const handleSync = async () => {
        handleSave();
        await performSync();
    };

    return (
        <Modal 
            isOpen={activePopup === 'sync'} 
            onClose={() => setActivePopup(null)} 
            title={t('sync', language)}
            maxWidth="450px"
        >
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center space-y-3 pb-2">
                    <div className="p-4 bg-accent-soft rounded-full text-accent shadow-sm ring-1 ring-accent/10">
                        <Cloud size={32} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-text-primary">{t('sync_desc', language)}</h3>
                        <p className="text-xs text-text-muted mt-1 max-w-[280px]">
                            {language === 'vi' 
                                ? "Kết nối với server Rust riêng để đồng bộ ghi chú trên nhiều thiết bị." 
                                : "Connect to your private Rust server to sync notes across multiple devices."}
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">
                            {t('server_url', language)}
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                                <Globe size={16} />
                            </div>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://sync.lumenote.com"
                                className="w-full bg-app-hover border border-transparent focus:border-accent/30 focus:bg-app-surface rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">
                            {t('sync_key', language)}
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                                <Key size={16} />
                            </div>
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="ln_opt_xxxxxxxxxxxx"
                                className="w-full bg-app-hover border border-transparent focus:border-accent/30 focus:bg-app-surface rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary font-mono outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Status Section */}
                <div className="p-4 bg-app-hover rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted font-medium">{t('sync_status', language)}</span>
                        <div className="flex items-center gap-1.5 font-semibold">
                            {isSyncing ? (
                                <span className="text-accent flex items-center gap-1">
                                    <RefreshCw size={12} className="animate-spin" />
                                    {language === 'vi' ? 'Đang đồng bộ...' : 'Syncing...'}
                                </span>
                            ) : lastSyncedAt ? (
                                <span className={`flex items-center gap-1 ${hasUnsyncedChanges ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {hasUnsyncedChanges ? (
                                        <>
                                            <Clock size={12} />
                                            {language === 'vi' ? 'Có thay đổi chưa sync' : 'Unsynced changes'}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={12} />
                                            {t('sync_success', language)}
                                        </>
                                    )}
                                </span>
                            ) : (
                                <span className="text-text-muted flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    {language === 'vi' ? 'Chưa kết nối' : 'Not connected'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">{t('last_sync', language)}</span>
                        <span className="text-text-secondary font-medium italic">
                            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : t('never', language)}
                        </span>
                    </div>
                    {hasUnsyncedChanges && lastSyncedAt && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-500 bg-amber-500/10 px-2 py-1.5 rounded-lg">
                            <Clock size={12} />
                            <span>{language === 'vi' ? 'Có thay đổi chưa được đồng bộ' : 'You have unsynced changes'}</span>
                        </div>
                    )}
                </div>

                {/* Action Section */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => setActivePopup(null)}
                        className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-text-secondary hover:bg-app-hover transition-colors"
                    >
                        {t('cancel', language)}
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing || !url || !key}
                        className="flex-2 py-3 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                    >
                        <AnimatePresence mode="wait">
                            {isSyncing ? (
                                <motion.div
                                    key="syncing"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <RefreshCw size={18} className="animate-spin" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2"
                                >
                                    <Cloud size={18} />
                                    {t('sync_now', language)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </div>
        </Modal>
    );
};
