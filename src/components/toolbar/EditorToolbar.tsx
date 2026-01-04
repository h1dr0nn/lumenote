import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../../store/useStore";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Link, Code, Terminal, Table, Zap, Info, Lightbulb, AlertTriangle, AlertCircle } from "lucide-react";
import { EditorSelection, SelectionRange } from "@codemirror/state";
import { t } from "../../utils/i18n";

export const EditorToolbar = () => {
    const { editorView, language } = useStore();
    const [showGrid, setShowGrid] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [hoveredSize, setHoveredSize] = useState({ rows: 3, cols: 3 });
    const timerRef = useRef<number | null>(null);
    const alertTimerRef = useRef<number | null>(null);

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
        setHoveredSize({ rows: 1, cols: 1 }); // Start from 1x1 for better feedback
        setShowGrid(true);
    };

    const handleMouseLeave = () => {
        timerRef.current = setTimeout(() => {
            setShowGrid(false);
        }, 300) as unknown as number;
    };

    const handleAlertMouseEnter = () => {
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        setShowAlerts(true);
    };

    const handleAlertMouseLeave = () => {
        alertTimerRef.current = setTimeout(() => {
            setShowAlerts(false);
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
                className="relative h-full flex items-center px-1"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <ToolbarButton icon={<Table size={16} />} onClick={() => insertTable(2, 2)} />
                
                {showGrid && (
                    <div 
                        className="absolute top-full left-0 z-100 pt-1 origin-top-left"
                    >
                        <div 
                            className="bg-app-surface border border-border-subtle shadow-2xl p-3 rounded-md w-max overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                            style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)' }}
                        >
                            <div className="flex items-center justify-between mb-2.5 px-0.5">
                                <span className="text-[11px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-sm">
                                    {hoveredSize.cols} x {hoveredSize.rows}
                                </span>
                                <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                                    {t('table', language)}
                                </span>
                            </div>
                            <div className="grid grid-cols-8 gap-1.5 p-0.5">
                                {Array.from({ length: 8 * 8 }).map((_, i) => {
                                    const r = Math.floor(i / 8) + 1;
                                    const c = (i % 8) + 1;
                                    const isActive = r <= hoveredSize.rows && c <= hoveredSize.cols;
                                    return (
                                        <div
                                            key={i}
                                            onMouseEnter={(e) => { e.stopPropagation(); setHoveredSize({ rows: r, cols: c }); }}
                                            onClick={(e) => { e.stopPropagation(); insertTable(r, c); }}
                                            style={{
                                                backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-app-hover)',
                                                borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border-subtle)'
                                            }}
                                            className={`w-[18px] h-[18px] rounded-[3px] border transition-all cursor-pointer ${
                                                isActive ? "shadow-[0_0_8px_rgba(79,125,243,0.4)] scale-105 z-10" : "hover:border-text-muted"
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-border-subtle mx-1" />

            <ToolbarButton icon={<Link size={16} />} onClick={insertLink} title={t('link', language)} />
            <ToolbarButton icon={<Code size={16} />} onClick={() => wrapSelection('`', '`')} title={t('inline_code', language)} />
            <ToolbarButton icon={<Terminal size={16} />} onClick={insertCodeBlock} title={t('code_block', language)} />
            
            <div className="w-px h-5 bg-border-subtle mx-1" />

            <div 
                className="relative h-full flex items-center px-1"
                onMouseEnter={handleAlertMouseEnter}
                onMouseLeave={handleAlertMouseLeave}
            >
                <ToolbarButton icon={<Zap size={16} />} onClick={() => applyLineFormat('> [!NOTE]\n> ')} />
                
                <AnimatePresence>
                    {showAlerts && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full right-0 mt-1 z-50 bg-app-surface border border-border-subtle shadow-md p-1 rounded-md origin-top-right w-48"
                        >
                            <AlertOption 
                                icon={<Info size={14} className="text-blue-500" />} 
                                label={t('alert_note', language)} 
                                onClick={() => { applyLineFormat('> [!NOTE]\n> '); setShowAlerts(false); }} 
                            />
                            <AlertOption 
                                icon={<Lightbulb size={14} className="text-green-500" />} 
                                label={t('alert_tip', language)} 
                                onClick={() => { applyLineFormat('> [!TIP]\n> '); setShowAlerts(false); }} 
                            />
                            <AlertOption 
                                icon={<Zap size={14} className="text-purple-500" />} 
                                label={t('alert_important', language)} 
                                onClick={() => { applyLineFormat('> [!IMPORTANT]\n> '); setShowAlerts(false); }} 
                            />
                            <AlertOption 
                                icon={<AlertTriangle size={14} className="text-yellow-500" />} 
                                label={t('alert_warning', language)} 
                                onClick={() => { applyLineFormat('> [!WARNING]\n> '); setShowAlerts(false); }} 
                            />
                            <AlertOption 
                                icon={<AlertCircle size={14} className="text-red-500" />} 
                                label={t('alert_caution', language)} 
                                onClick={() => { applyLineFormat('> [!CAUTION]\n> '); setShowAlerts(false); }} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const AlertOption = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-app-hover rounded-sm transition-colors"
    >
        {icon}
        <span>{label}</span>
    </button>
);

interface ToolbarButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    title?: string;
    [key: string]: any;
}

const ToolbarButton = ({ icon, onClick, title, ...props }: ToolbarButtonProps) => (
    <button
        onClick={onClick}
        title={title}
        {...props}
        className="p-1.5 rounded-sm text-text-secondary hover:text-text-primary hover:bg-app-hover transition-colors"
    >
        {icon}
    </button>
);
