"""
Python tests for Lumenote markdown parsing validation
Cross-checks markdown processing with Python libraries
"""
import pytest
import re


def wrap_selection(content: str, selection_from: int, selection_to: int, wrapper: str) -> str:
    """Wraps selected text with a given wrapper string"""
    before = content[:selection_from]
    selected = content[selection_from:selection_to]
    after = content[selection_to:]
    return f"{before}{wrapper}{selected}{wrapper}{after}"


def prepend_line(content: str, position: int, prefix: str) -> str:
    """Prepends a prefix to the line containing the given position"""
    lines = content.split('\n')
    char_count = 0
    line_index = 0
    
    for i, line in enumerate(lines):
        if char_count + len(line) >= position:
            line_index = i
            break
        char_count += len(line) + 1  # +1 for newline
    
    # Check if line already has the prefix
    if lines[line_index].startswith(prefix):
        lines[line_index] = lines[line_index][len(prefix):]
    else:
        lines[line_index] = prefix + lines[line_index]
    
    return '\n'.join(lines)


def extract_title(content: str) -> str:
    """Extracts title from markdown content (first H1 heading)"""
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    return match.group(1).strip() if match else 'Untitled'


def count_words(content: str) -> int:
    """Counts words in content (excluding markdown syntax)"""
    text = re.sub(r'[#*_`\[\]()]', '', content)
    text = re.sub(r'\s+', ' ', text).strip()
    return len(text.split()) if text else 0


class TestWrapSelection:
    def test_wrap_bold(self):
        result = wrap_selection('hello world', 0, 5, '**')
        assert result == '**hello** world'
    
    def test_wrap_italic(self):
        result = wrap_selection('hello world', 6, 11, '_')
        assert result == 'hello _world_'
    
    def test_wrap_empty_selection(self):
        result = wrap_selection('hello', 2, 2, '**')
        assert result == 'he****llo'
    
    def test_wrap_inline_code(self):
        result = wrap_selection('const x = 1', 6, 7, '`')
        assert result == 'const `x` = 1'


class TestPrependLine:
    def test_prepend_heading(self):
        result = prepend_line('hello world', 0, '# ')
        assert result == '# hello world'
    
    def test_prepend_multiline(self):
        result = prepend_line('line1\nline2\nline3', 7, '## ')
        assert result == 'line1\n## line2\nline3'
    
    def test_toggle_off(self):
        result = prepend_line('# hello', 2, '# ')
        assert result == 'hello'
    
    def test_prepend_bullet(self):
        result = prepend_line('item', 0, '- ')
        assert result == '- item'


class TestExtractTitle:
    def test_extract_h1(self):
        assert extract_title('# My Title\n\nContent here') == 'My Title'
    
    def test_no_heading(self):
        assert extract_title('Just some text') == 'Untitled'
    
    def test_first_h1_only(self):
        assert extract_title('# First\n# Second') == 'First'


class TestCountWords:
    def test_count_basic(self):
        assert count_words('hello world') == 2
    
    def test_ignore_markdown(self):
        assert count_words('**bold** _italic_ `code`') == 3
    
    def test_empty_content(self):
        assert count_words('') == 0
    
    def test_multiple_spaces(self):
        assert count_words('hello    world') == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
