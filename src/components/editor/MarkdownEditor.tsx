import { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSelectionChange?: (selection: { from: number; to: number }) => void;
}

// Custom theme matching Lumenote Design Tokens
const lumenoteTheme = EditorView.theme({
    "&": {
        fontSize: "var(--text-md)",
        fontFamily: "var(--font-editor)",
        height: "100%",
    },
    ".cm-scroller": {
        overflow: "auto",
        fontFamily: "inherit",
    },
    ".cm-content": {
        caretColor: "var(--color-accent)",
        padding: "32px",
        minHeight: "100%",
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
        padding: "0 16px 0 24px",
    },
});

export const MarkdownEditor = ({ value, onChange, onSelectionChange }: MarkdownEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isExternalUpdate = useRef(false);

    // Update listener for content changes
    const updateListener = useCallback(
        EditorView.updateListener.of((update) => {
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
                lumenoteTheme,
                updateListener,
                EditorView.lineWrapping,
            ],
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
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
