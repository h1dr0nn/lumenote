import { useStore } from "../../store/useStore";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Link, Code } from "lucide-react";

export const EditorToolbar = () => {
    const { activeNoteId, notes, updateNoteContent } = useStore();
    const activeNote = notes.find(n => n.id === activeNoteId);

    if (!activeNote) return null;

    const applyFormat = (wrapper: string, isBlock = false) => {
        const content = activeNote.content;
        // For now, append at end - full selection support will come with editor integration
        if (isBlock) {
            updateNoteContent(activeNote.id, content + (content ? '\n' : '') + wrapper);
        } else {
            updateNoteContent(activeNote.id, content + wrapper + 'text' + wrapper);
        }
    };

    const prependLine = (prefix: string) => {
        const content = activeNote.content;
        updateNoteContent(activeNote.id, content + (content ? '\n' : '') + prefix);
    };

    return (
        <div className="h-10 border-b border-border-muted flex items-center gap-1 px-4 bg-app-surface">
            <ToolbarButton icon={<Bold size={16} />} onClick={() => applyFormat('**')} title="Bold" />
            <ToolbarButton icon={<Italic size={16} />} onClick={() => applyFormat('_')} title="Italic" />

            <div className="w-px h-5 bg-border-subtle mx-2" />

            <ToolbarButton icon={<Heading1 size={16} />} onClick={() => prependLine('# ')} title="Heading 1" />
            <ToolbarButton icon={<Heading2 size={16} />} onClick={() => prependLine('## ')} title="Heading 2" />
            <ToolbarButton icon={<Heading3 size={16} />} onClick={() => prependLine('### ')} title="Heading 3" />

            <div className="w-px h-5 bg-border-subtle mx-2" />

            <ToolbarButton icon={<List size={16} />} onClick={() => prependLine('- ')} title="Bullet List" />
            <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => prependLine('1. ')} title="Numbered List" />
            <ToolbarButton icon={<CheckSquare size={16} />} onClick={() => prependLine('- [ ] ')} title="Checkbox" />

            <div className="w-px h-5 bg-border-subtle mx-2" />

            <ToolbarButton icon={<Link size={16} />} onClick={() => applyFormat('[', false)} title="Link" />
            <ToolbarButton icon={<Code size={16} />} onClick={() => applyFormat('`')} title="Inline Code" />
        </div>
    );
};

interface ToolbarButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    title: string;
}

const ToolbarButton = ({ icon, onClick, title }: ToolbarButtonProps) => (
    <button
        onClick={onClick}
        title={title}
        className="p-1.5 rounded-sm text-text-secondary hover:text-text-primary hover:bg-app-hover transition-colors"
    >
        {icon}
    </button>
);
