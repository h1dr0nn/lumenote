import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/useStore';

describe('useStore', () => {
    beforeEach(() => {
        // Reset store to initial state
        useStore.setState({
            notes: [
                {
                    id: '1',
                    title: 'Test Note',
                    content: '# Test\n\nContent',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }
            ],
            activeNoteId: '1',
            viewMode: 'view',
        });
    });

    it('should initialize with default notes', () => {
        const { notes } = useStore.getState();
        expect(notes.length).toBeGreaterThan(0);
    });

    it('should set active note id', () => {
        const { setActiveNoteId } = useStore.getState();
        setActiveNoteId('1');
        expect(useStore.getState().activeNoteId).toBe('1');
    });

    it('should toggle view mode', () => {
        const { setViewMode } = useStore.getState();
        setViewMode('edit');
        expect(useStore.getState().viewMode).toBe('edit');
        setViewMode('view');
        expect(useStore.getState().viewMode).toBe('view');
    });

    it('should update note content', () => {
        const { updateNoteContent } = useStore.getState();
        updateNoteContent('1', '# Updated Content');
        const note = useStore.getState().notes.find(n => n.id === '1');
        expect(note?.content).toBe('# Updated Content');
    });

    it('should add new note', () => {
        const initialCount = useStore.getState().notes.length;
        const { addNote } = useStore.getState();
        addNote();
        expect(useStore.getState().notes.length).toBe(initialCount + 1);
    });

    it('should set new note as active after adding', () => {
        const { addNote } = useStore.getState();
        addNote();
        const { notes, activeNoteId } = useStore.getState();
        const newNote = notes[notes.length - 1];
        expect(activeNoteId).toBe(newNote.id);
    });

    it('should switch to edit mode after adding note', () => {
        useStore.setState({ viewMode: 'view' });
        const { addNote } = useStore.getState();
        addNote();
        expect(useStore.getState().viewMode).toBe('edit');
    });
});
