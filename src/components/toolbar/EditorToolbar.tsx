import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../../store/useStore";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Link, Code, Terminal, Table } from "lucide-react";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { t } from "../../utils/i18n";

export const EditorToolbar = () => {
    const { editorView, language } = useStore();
    const [showGrid, setShowGrid] = useState(false);
    const [hoveredSize, setHoveredSize] = useState({ rows: 3, cols: 3 });
    const timerRef = useRef<number | null>(null);

    if (!editorView) return null;

    const wrapSelection = (before: string, after: string, placeholder = "text") => {
        const { state, dispatch } = editorView;
        const changes = state.changeByRange((range: SelectionRange) => {
            const selectedText = state.doc.sliceString(range.from, range.to);
            if (selectedText) {
                return {
                    changes: [
                        { from: range.from, insert: before },
                        { from: range.to, insert: after }
                    ],
                    range: EditorSelection.range(range.from + before.length, range.to + before.length)
                };
            } else {
                const insert = before + placeholder + after;
                return {
                    changes: { from: range.from, insert },
                    range: EditorSelection.range(range.from + before.length, range.from + before.length + placeholder.length)
                };
            }
        });
        dispatch(state.update(changes, { scrollIntoView: true }));
        editorView.focus();
    };

    const applyLineFormat = (prefix: string) => {
        const { state, dispatch } = editorView;
        const changes = state.changeByRange((range: SelectionRange) => {
            const line = state.doc.lineAt(range.from);
            const lineText = line.text;
            
            if (lineText.startsWith(prefix)) return { range };

            return {
                changes: { from: line.from, insert: prefix },
                range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length)
            };
        });
        dispatch(state.update(changes, { scrollIntoView: true }));
        editorView.focus();
    };

    const applyNumberedList = () => {
        const { state, dispatch } = editorView;
        const changes = state.changeByRange((range: SelectionRange) => {
            const line = state.doc.lineAt(range.from);
            const lineText = line.text;
            
            let nextNumber = 1;
            if (line.number > 1) {
                const prevLine = state.doc.line(line.number - 1);
                const match = prevLine.text.match(/^(\d+)\.\s/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            const prefix = `${nextNumber}. `;
            if (lineText.startsWith(prefix)) return { range };

            return {
                changes: { from: line.from, insert: prefix },
                range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length)
            };
        });
        dispatch(state.update(changes, { scrollIntoView: true }));
        editorView.focus();
    };

    const insertLink = () => {
        const { state, dispatch } = editorView;
        const changes = state.changeByRange((range: SelectionRange) => {
            const selectedText = state.doc.sliceString(range.from, range.to);
            const text = selectedText || "link text";
            const insert = `[${text}](https://example.com)`;
            return {
                changes: { from: range.from, to: range.to, insert },
                range: EditorSelection.range(range.from + 1, range.from + 1 + text.length)
            };
        });
        dispatch(state.update(changes, { scrollIntoView: true }));
        editorView.focus();
    };

    const insertCodeBlock = () => {
        const { state, dispatch } = editorView;
        const changes = state.changeByRange((range: SelectionRange) => {
            const selectedText = state.doc.sliceString(range.from, range.to);
            const before = "```\n";
            const after = "\n```";
            if (selectedText) {
                return {
                    changes: [
                        { from: range.from, insert: before },
                        { from: range.to, insert: after }
                    ],
                    range: EditorSelection.range(range.from + before.length, range.to + before.length)
                };
            } else {
                const insert = before + "code here" + after;
                return {
                    changes: { from: range.from, insert },
                    range: EditorSelection.range(range.from + before.length, range.from + before.length + 9)
                };
            }
        });
        dispatch(state.update(changes, { scrollIntoView: true }));
        editorView.focus();
    };

    const insertTable = (rows: number, cols: number) => {
        const { state, dispatch } = editorView;
        const changes = state.changeByRange((range: SelectionRange) => {
            const line = state.doc.lineAt(range.from);
            
            let header = "|";
            let separator = "|";
            for (let i = 0; i < cols; i++) {
                header += " Header |";
                separator += " :--- |";
            }
            header += "\n";
            separator += "\n";

            let body = "";
            for (let r = 0; r < rows; r++) {
                body += "|";
                for (let c = 0; c < cols; c++) {
                    body += " Cell |";
                }
                body += "\n";
            }

            const tableTemplate = `\n${header}${separator}${body}`;
            return {
                changes: { from: line.to, insert: tableTemplate },
                range: EditorSelection.range(line.to + 3, line.to + 9)
            };
        });
        dispatch(state.update(changes, { scrollIntoView: true }));
        editorView.focus();
        setShowGrid(false);
    };

    const handleMouseEnter = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setShowGrid(true);
    };

    const handleMouseLeave = () => {
        timerRef.current = setTimeout(() => {
            setShowGrid(false);
        }, 300) as unknown as number;
    };

    return (
        <div className="h-10 flex items-center gap-1 px-4 bg-app-surface relative">
            <ToolbarButton icon={<Bold size={16} />} onClick={() => wrapSelection('**', '**')} title={t('bold', language)} />
            <ToolbarButton icon={<Italic size={16} />} onClick={() => wrapSelection('_', '_')} title={t('italic', language)} />

            <div className="w-px h-5 bg-border-subtle mx-2" />

            <ToolbarButton icon={<Heading1 size={16} />} onClick={() => applyLineFormat('# ')} title={t('h1', language)} />
            <ToolbarButton icon={<Heading2 size={16} />} onClick={() => applyLineFormat('## ')} title={t('h2', language)} />
            <ToolbarButton icon={<Heading3 size={16} />} onClick={() => applyLineFormat('### ')} title={t('h3', language)} />

            <div className="w-px h-5 bg-border-subtle mx-2" />

            <ToolbarButton icon={<List size={16} />} onClick={() => applyLineFormat('- ')} title={t('bullet_list', language)} />
            <ToolbarButton icon={<ListOrdered size={16} />} onClick={applyNumberedList} title={t('numbered_list', language)} />
            <ToolbarButton icon={<CheckSquare size={16} />} onClick={() => applyLineFormat('- [ ] ')} title={t('checkbox', language)} />
            
            <div 
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <ToolbarButton icon={<Table size={16} />} onClick={() => insertTable(2, 2)} title={t('table', language)} />
                
                <AnimatePresence>
                    {showGrid && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-1 z-50 bg-app-surface border border-border-subtle shadow-md p-2.5 rounded-md origin-top-left w-max"
                        >
                            <div className="text-[10px] text-text-muted mb-2 font-medium uppercase tracking-wider">
                                {hoveredSize.cols} x {hoveredSize.rows} {t('table', language)}
                            </div>
                            <div className="grid grid-cols-8 gap-1">
                                {Array.from({ length: 8 * 8 }).map((_, i) => {
                                    const r = Math.floor(i / 8) + 1;
                                    const c = (i % 8) + 1;
                                    const isActive = r <= hoveredSize.rows && c <= hoveredSize.cols;
                                    return (
                                        <div
                                            key={i}
                                            onMouseEnter={() => setHoveredSize({ rows: r, cols: c })}
                                            onClick={() => insertTable(r, c)}
                                            className={`w-5 h-5 rounded-sm border transition-colors cursor-pointer ${
                                                isActive 
                                                    ? "bg-accent border-accent shadow-sm" 
                                                    : "bg-app-bg border-border-subtle hover:border-text-muted"
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="w-px h-5 bg-border-subtle mx-2" />

            <ToolbarButton icon={<Link size={16} />} onClick={insertLink} title={t('link', language)} />
            <ToolbarButton icon={<Code size={16} />} onClick={() => wrapSelection('`', '`')} title={t('inline_code', language)} />
            <ToolbarButton icon={<Terminal size={16} />} onClick={insertCodeBlock} title={t('code_block', language)} />
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
