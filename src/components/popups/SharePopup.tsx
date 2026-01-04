import { Modal } from '../ui/Modal';
import { useStore } from '../../store/useStore';
import { Copy, FileText, Download, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { t } from '../../utils/i18n';

export const SharePopup = () => {
    const { activePopup, setActivePopup, notes, activeNoteId, language } = useStore();
    const [copiedMd, setCopiedMd] = useState(false);
    const [copiedText, setCopiedText] = useState(false);

    const activeNote = notes.find(n => n.id === activeNoteId);

    const handleCopyMarkdown = async () => {
        if (!activeNote) return;
        await navigator.clipboard.writeText(activeNote.content);
        setCopiedMd(true);
        toast.success(t('copy_md_success', language));
        setTimeout(() => setCopiedMd(false), 2000);
    };

    const handleCopyPlainText = async () => {
        if (!activeNote) return;
        // Simple MD to Text (remove common markers)
        const plainText = activeNote.content
            .replace(/[#*`_~]/g, '')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1');
        
        await navigator.clipboard.writeText(plainText);
        setCopiedText(true);
        toast.success(t('copy_text_success', language));
        setTimeout(() => setCopiedText(false), 2000);
    };

    const handleDownload = () => {
        if (!activeNote) return;
        const element = document.createElement("a");
        const file = new Blob([activeNote.content], {type: 'text/markdown'});
        element.href = URL.createObjectURL(file);
        element.download = `${activeNote.title || 'note'}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        toast.success(t('download_success', language));
    };

    return (
        <Modal 
            isOpen={activePopup === 'share'} 
            onClose={() => setActivePopup(null)} 
            title={t('share', language)}
            maxWidth="400px"
        >
            {activeNote ? (
                <div className="space-y-4">
                    <p className="text-xs text-text-muted mb-4 uppercase font-medium tracking-wider">
                        {t('export_md_desc', language)}
                    </p>

                    <button 
                        onClick={handleCopyMarkdown}
                        className="w-full flex items-center justify-between p-4 bg-app-hover hover:bg-app-active rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                <Copy size={18} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-text-primary">{t('copy_markdown', language)}</div>
                                <div className="text-[11px] text-text-muted">{t('copy_full_desc', language)}</div>
                            </div>
                        </div>
                        {copiedMd ? <Check size={16} className="text-accent" /> : null}
                    </button>

                    <button 
                        onClick={handleCopyPlainText}
                        className="w-full flex items-center justify-between p-4 bg-app-hover hover:bg-app-active rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-text-muted/10 rounded-lg text-text-muted">
                                <FileText size={18} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-text-primary">{t('copy_text', language)}</div>
                                <div className="text-[11px] text-text-muted">{t('copy_plain_desc', language)}</div>
                            </div>
                        </div>
                        {copiedText ? <Check size={16} className="text-accent" /> : null}
                    </button>

                    <div className="pt-2 border-t border-border-muted/50 mt-4">
                        <button 
                            onClick={handleDownload}
                            className="w-full flex items-center justify-between p-4 hover:bg-app-hover rounded-xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                    <Download size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-text-primary">{t('download', language)}</div>
                                    <div className="text-[11px] text-text-muted">{t('download_desc', language)}</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-text-muted py-8 italic text-sm">
                    {t('no_note_selected', language)}
                </div>
            )}
        </Modal>
    );
};
