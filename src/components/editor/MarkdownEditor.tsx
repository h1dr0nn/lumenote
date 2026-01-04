import { useEffect, useRef, useMemo } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownKeymap } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { useStore } from '../../store/useStore';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSelectionChange?: (selection: { from: number; to: number }) => void;
}

// Custom style to keep editor text plain (no bold/italic rendering)
const plainTextStyle = HighlightStyle.define([
    { tag: tags.strong, fontWeight: 'normal' },
    { tag: tags.emphasis, fontStyle: 'normal' },
]);

// Custom theme matching Lumenote Design Tokens
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
    // ... (rest of logic)
    // Actually I need to wrap the return in motion.div if I want it to be internally smooth? 
    // Wait, I already wrapped it in App.tsx. I should just fix the gutter here.
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
                keymap.of([...defaultKeymap, ...historyKeymap]),
                markdown(),
                syntaxHighlighting(defaultHighlightStyle),
                syntaxHighlighting(plainTextStyle),
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
