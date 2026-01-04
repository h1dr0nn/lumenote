import { useStore } from "../../store/useStore";
import { t } from "../../utils/i18n";

export const Editor = () => {
    const { activeNoteId, notes, updateNoteContent, language } = useStore();
    const activeNote = notes.find(n => n.id === activeNoteId);

    if (!activeNote) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-app-surface">
            <textarea
                value={activeNote.content}
                onChange={(e) => updateNoteContent(activeNote.id, e.target.value)}
                placeholder={t('editor_placeholder', language)}
                className="flex-1 w-full h-full p-8 resize-none focus:outline-none bg-transparent font-editor text-md leading-normal text-text-primary placeholder:text-text-muted"
                autoFocus
            />
        </div>
    );
};
