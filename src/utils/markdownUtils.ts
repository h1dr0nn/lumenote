/**
 * Wraps selected text with a given wrapper string
 * @example wrapSelection('hello world', { from: 0, to: 5 }, '**') => '**hello** world'
 */
export function wrapSelection(
    content: string,
    selection: { from: number; to: number },
    wrapper: string
): { content: string; newSelection: { from: number; to: number } } {
    const before = content.slice(0, selection.from);
    const selected = content.slice(selection.from, selection.to);
    const after = content.slice(selection.to);

    const newContent = `${before}${wrapper}${selected}${wrapper}${after}`;
    const newSelection = {
        from: selection.from + wrapper.length,
        to: selection.to + wrapper.length,
    };

    return { content: newContent, newSelection };
}

/**
 * Prepends a prefix to the line containing the given position
 * @example prependLine('hello\nworld', 6, '# ') => 'hello\n# world'
 */
export function prependLine(
    content: string,
    position: number,
    prefix: string
): { content: string; newPosition: number } {
    const lines = content.split('\n');
    let charCount = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= position) {
            lineIndex = i;
            break;
        }
        charCount += lines[i].length + 1; // +1 for newline
    }

    // Check if line already has the prefix
    if (lines[lineIndex].startsWith(prefix)) {
        // Remove prefix (toggle off)
        lines[lineIndex] = lines[lineIndex].slice(prefix.length);
        return {
            content: lines.join('\n'),
            newPosition: Math.max(position - prefix.length, charCount),
        };
    }

    // Add prefix
    lines[lineIndex] = prefix + lines[lineIndex];
    return {
        content: lines.join('\n'),
        newPosition: position + prefix.length,
    };
}

/**
 * Extracts title from markdown content (first H1 heading)
 */
export function extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
}

/**
 * Counts words in content (excluding markdown syntax)
 */
export function countWords(content: string): number {
    const text = content
        .replace(/[#*_`\[\]()]/g, '') // Remove markdown chars
        .replace(/\s+/g, ' ')
        .trim();
    return text ? text.split(' ').length : 0;
}
