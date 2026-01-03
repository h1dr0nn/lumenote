import { describe, it, expect } from 'vitest';
import { wrapSelection, prependLine, extractTitle, countWords } from '../../utils/markdownUtils';

describe('wrapSelection', () => {
    it('should wrap selected text with bold markers', () => {
        const result = wrapSelection('hello world', { from: 0, to: 5 }, '**');
        expect(result.content).toBe('**hello** world');
        expect(result.newSelection).toEqual({ from: 2, to: 7 });
    });

    it('should wrap selected text with italic markers', () => {
        const result = wrapSelection('hello world', { from: 6, to: 11 }, '_');
        expect(result.content).toBe('hello _world_');
    });

    it('should handle empty selection', () => {
        const result = wrapSelection('hello', { from: 2, to: 2 }, '**');
        expect(result.content).toBe('he****llo');
    });

    it('should wrap inline code', () => {
        const result = wrapSelection('const x = 1', { from: 6, to: 7 }, '`');
        expect(result.content).toBe('const `x` = 1');
    });
});

describe('prependLine', () => {
    it('should prepend heading to a line', () => {
        const result = prependLine('hello world', 0, '# ');
        expect(result.content).toBe('# hello world');
    });

    it('should prepend to correct line in multiline content', () => {
        const result = prependLine('line1\nline2\nline3', 7, '## ');
        expect(result.content).toBe('line1\n## line2\nline3');
    });

    it('should toggle off if prefix already exists', () => {
        const result = prependLine('# hello', 2, '# ');
        expect(result.content).toBe('hello');
    });

    it('should prepend bullet list marker', () => {
        const result = prependLine('item', 0, '- ');
        expect(result.content).toBe('- item');
    });
});

describe('extractTitle', () => {
    it('should extract title from H1 heading', () => {
        expect(extractTitle('# My Title\n\nContent here')).toBe('My Title');
    });

    it('should return Untitled if no heading', () => {
        expect(extractTitle('Just some text')).toBe('Untitled');
    });

    it('should extract first H1 only', () => {
        expect(extractTitle('# First\n# Second')).toBe('First');
    });
});

describe('countWords', () => {
    it('should count words correctly', () => {
        expect(countWords('hello world')).toBe(2);
    });

    it('should ignore markdown syntax', () => {
        expect(countWords('**bold** _italic_ `code`')).toBe(3);
    });

    it('should return 0 for empty content', () => {
        expect(countWords('')).toBe(0);
    });

    it('should handle multiple spaces', () => {
        expect(countWords('hello    world')).toBe(2);
    });
});
