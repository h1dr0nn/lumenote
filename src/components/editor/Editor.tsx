import { useStore } from "../../store/useStore";

export const Editor = () => {
    const { activeNoteId, notes, updateNoteContent } = useStore();
    const activeNote = notes.find(n => n.id === activeNoteId);

    if (!activeNote) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-app-surface">
            <textarea
                value={activeNote.content}
                onChange={(e) => updateNoteContent(activeNote.id, e.target.value)}
                placeholder="Bắt đầu viết điều gì đó tuyệt vời..."
                className="flex-1 w-full h-full p-8 resize-none focus:outline-none bg-transparent font-editor text-md leading-normal text-text-primary placeholder:text-text-muted"
                autoFocus
            />
        </div>
    );
};
