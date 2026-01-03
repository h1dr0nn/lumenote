import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface PreviewProps {
  content: string;
}

// Code block component
const CodeBlock = ({ language, children }: { language?: string; children: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState(language || 'code');

  const getTextContent = (node: any): string => {
    if (typeof node === 'string') return node;
    if (node?.props?.children) return getTextContent(node.props.children);
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    return '';
  };

  const codeText = getTextContent(children);

  useEffect(() => {
    if (!language && codeText) {
      try {
        const result = hljs.highlightAuto(codeText);
        if (result.language) setDetectedLang(result.language);
      } catch { setDetectedLang('code'); }
    } else if (language) {
      setDetectedLang(language);
    }
  }, [language, codeText]);

  const highlightedCode = (() => {
    try {
      if (detectedLang && detectedLang !== 'code') {
        return hljs.highlight(codeText, { language: detectedLang, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(codeText).value;
    } catch { return codeText; }
  })();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    toast.success('Đã copy!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{detectedLang}</span>
        <button onClick={handleCopy} className="copy-btn">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre><code dangerouslySetInnerHTML={{ __html: highlightedCode }} /></pre>
    </div>
  );
};

export const Preview = ({ content }: PreviewProps) => {
  const handleInlineCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy!');
  };

  return (
    <article className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = className?.includes('language-') ||
              (typeof children === 'string' && children.includes('\n'));

            if (isBlock || (typeof children === 'string' && children.length > 50)) {
              return <CodeBlock language={match?.[1]}>{children}</CodeBlock>;
            }

            return (
              <code
                onClick={() => handleInlineCopy(String(children))}
                className="inline-code"
                {...props}
              >
                {children}
              </code>
            );
          }
        }}
      >
        {content || "*Bắt đầu viết...*"}
      </ReactMarkdown>

      <style>{`
        .markdown-preview {
          font-family: var(--font-editor);
          font-size: var(--text-md);
          line-height: 1.75;
          color: var(--color-text-primary);
        }
        
        .markdown-preview h1 { font-size: var(--text-xl); font-weight: 600; margin: 0.5em 0; }
        .markdown-preview h2 { font-size: var(--text-lg); font-weight: 600; margin: 0.5em 0; }
        .markdown-preview h3 { font-size: var(--text-md); font-weight: 600; margin: 0.5em 0; }
        .markdown-preview p { margin: 0.75em 0; }
        .markdown-preview p:first-child { margin-top: 0; }
        .markdown-preview strong { font-weight: 700; }
        .markdown-preview em { font-style: italic; }
        
        .markdown-preview a { color: var(--color-text-accent); text-decoration: none; }
        .markdown-preview a:hover { text-decoration: underline; }
        
        .markdown-preview .inline-code {
          background: var(--color-app-hover);
          color: var(--color-accent);
          padding: 0.125em 0.375em;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
          cursor: pointer;
        }
        .markdown-preview .inline-code:hover { background: var(--color-accent-soft); }
        
        .markdown-preview .code-block {
          margin: 1em 0;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border-subtle);
        }
        
        .markdown-preview .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5em 1em;
          background: var(--color-app-hover);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        
        .markdown-preview .code-lang {
          font-size: 0.75em;
          font-weight: 500;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }
        
        .markdown-preview .copy-btn {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 4px;
        }
        .markdown-preview .copy-btn:hover { background: var(--color-app-active); color: var(--color-accent); }
        
        .markdown-preview pre {
          background: var(--color-app-bg);
          padding: 1em;
          margin: 0;
          overflow-x: auto;
        }
        .markdown-preview pre code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
        }
        
        .markdown-preview ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .markdown-preview ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .markdown-preview li { margin: 0.25em 0; }
        
        .markdown-preview blockquote {
          border-left: 3px solid var(--color-accent);
          padding-left: 1em;
          margin: 1em 0;
          color: var(--color-text-secondary);
          font-style: italic;
        }
        
        .markdown-preview table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        .markdown-preview th, .markdown-preview td {
          border: 1px solid var(--color-border-subtle);
          padding: 0.5em 1em;
        }
        .markdown-preview th { background: var(--color-app-hover); font-weight: 600; }
        .markdown-preview hr { border: none; border-top: 1px solid var(--color-border-subtle); margin: 1.5em 0; }
      `}</style>
    </article>
  );
};
