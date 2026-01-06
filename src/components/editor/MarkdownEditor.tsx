import { useEffect, useRef, useMemo } from 'react';
import { EditorState, EditorSelection, SelectionRange } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownKeymap } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { useStore } from '../../store/useStore';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSelectionChange?: (selection: { from: number; to: number }) => void;
}

// Custom commands for shortcuts
const toggleBold = (view: EditorView) => {
    const { state, dispatch } = view;
    const changes = state.changeByRange((range: SelectionRange) => {
        const before = '**', after = '**';
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
            const placeholder = "text";
            const insert = before + placeholder + after;
            return {
                changes: { from: range.from, insert },
                range: EditorSelection.range(range.from + before.length, range.from + before.length + placeholder.length)
            };
        }
    });
    dispatch(state.update(changes, { scrollIntoView: true }));
    return true;
};

const toggleItalic = (view: EditorView) => {
    const { state, dispatch } = view;
    const changes = state.changeByRange((range: SelectionRange) => {
        const before = '_', after = '_';
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
            const placeholder = "text";
            const insert = before + placeholder + after;
            return {
                changes: { from: range.from, insert },
                range: EditorSelection.range(range.from + before.length, range.from + before.length + placeholder.length)
            };
        }
    });
    dispatch(state.update(changes, { scrollIntoView: true }));
    return true;
};

const toggleHeading = (level: number) => (view: EditorView) => {
    const { state, dispatch } = view;
    const prefix = '#'.repeat(level) + ' ';
    const changes = state.changeByRange((range: SelectionRange) => {
        const line = state.doc.lineAt(range.from);
        const lineText = line.text;

        if (lineText.startsWith(prefix)) return { range };

        // If it starts with a different heading level, we might want to replace it, 
        // but for now let's just prepend like the toolbar does.
        return {
            changes: { from: line.from, insert: prefix },
            range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length)
        };
    });
    dispatch(state.update(changes, { scrollIntoView: true }));
    return true;
};

// Comprehensive modern highlighting style using theme variables
const modernHighlightStyle = HighlightStyle.define([
    { tag: tags.heading, color: 'var(--syntax-h1-h6)', fontWeight: 'bold' },
    { tag: tags.keyword, color: 'var(--syntax-keyword)' },
    { tag: tags.string, color: 'var(--syntax-string)' },
    { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },

    // Link text stands out as primary blue
    { tag: [tags.link, tags.labelName], color: 'var(--syntax-link)' },

    // Metadata like URLs, brackets, and punctuation are dimmed for clarity
    { tag: [tags.url, tags.punctuation, tags.separator, tags.bracket, tags.meta], color: 'var(--syntax-meta)' },

    { tag: [tags.strong, tags.emphasis, tags.strikethrough], color: 'var(--syntax-markup)' },
    { tag: [tags.literal, tags.className, tags.tagName], color: 'var(--syntax-special)' },
    { tag: tags.contentSeparator, color: 'var(--syntax-hr)' },

    // Reset formatting for a clean "plain text editor" feel where appropriate
    { tag: tags.strong, fontWeight: 'normal' },
    { tag: tags.emphasis, fontStyle: 'normal' },
]);

// ... (lumenoteTheme remains unchanged)
const lumenoteTheme = EditorView.theme({
    "&": {
        fontSize: "var(--text-md)",
        fontFamily: "var(--font-editor)",
        fontWeight: "var(--cm-font-weight, 400)",
        height: "100%",
    },
    ".cm-scroller": {
        overflow: "auto",
        fontFamily: "inherit",
    },
    ".cm-content": {
        caretColor: "var(--color-text-primary) !important",
        padding: "32px 12px",
        minHeight: "100%",
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--color-text-primary) !important",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: "var(--color-accent-soft)",
    },
    ".cm-activeLine": {
        backgroundColor: "transparent",
    },
    ".cm-activeLineGutter": {
        backgroundColor: "transparent",
    },
    ".cm-gutters": {
        backgroundColor: "transparent",
        border: "none",
        color: "var(--color-text-muted)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 8px 0 16px",
        minWidth: "60px", // Fixed width to accommodate up to 4 digits without jumping
        textAlign: "right",
    },
    // Aggressively force all editor text to be plain
    ".cm-content *": {
        fontWeight: "400 !important",
        fontStyle: "normal !important",
        textDecoration: "none !important",
        fontSize: "var(--text-md) !important",
    },
});

export const MarkdownEditor = ({ value, onChange, onSelectionChange }: MarkdownEditorProps) => {
    const { setEditorView } = useStore();
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isExternalUpdate = useRef(false);

    // Update listener for content changes
    const updateListener = useMemo(
        () => EditorView.updateListener.of((update) => {
            if (update.docChanged && !isExternalUpdate.current) {
                onChange(update.state.doc.toString());
            }
            if (update.selectionSet && onSelectionChange) {
                const { from, to } = update.state.selection.main;
                onSelectionChange({ from, to });
            }
        }),
        [onChange, onSelectionChange]
    );

    // Initialize editor
    useEffect(() => {
        if (!editorRef.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                history(),
                keymap.of([
                    { key: "Mod-b", run: toggleBold },
                    { key: "Mod-i", run: toggleItalic },
                    {
                        key: "Mod-s", run: () => {
                            const state = useStore.getState();
                            if (state.activeNoteId) {
                                state.saveNote(state.activeNoteId);
                            }
                            return true;
                        }
                    },
                    { key: "Mod-1", run: toggleHeading(1) },
                    { key: "Mod-2", run: toggleHeading(2) },
                    { key: "Mod-3", run: toggleHeading(3) },
                    ...defaultKeymap,
                    ...historyKeymap
                ]),
                markdown(),
                syntaxHighlighting(modernHighlightStyle),
                lumenoteTheme,
                updateListener,
                EditorView.lineWrapping,
                keymap.of(markdownKeymap),
            ],
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;
        setEditorView(view);

        return () => {
            view.destroy();
            setEditorView(null);
        };
    }, []);

    // Sync external value changes
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;

        const currentContent = view.state.doc.toString();
        if (value !== currentContent) {
            isExternalUpdate.current = true;
            view.dispatch({
                changes: {
                    from: 0,
                    to: currentContent.length,
                    insert: value,
                },
            });
            isExternalUpdate.current = false;
        }
    }, [value]);

    return (
        <div
            ref={editorRef}
            className="h-full w-full bg-app-surface text-text-primary overflow-hidden"
        />
    );
};
