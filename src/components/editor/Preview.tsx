import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkGemoji from 'remark-gemoji';
import remarkFootnotes from 'remark-footnotes';
import remarkGithubMarkdownAlerts from 'remark-github-markdown-alerts';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import mermaid from 'mermaid';
import { useStore } from '../../store/useStore';
import { t } from '../../utils/i18n';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface PreviewProps {
  content: string;
}

// Mermaid component for rendering diagrams
const MermaidBlock = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(id.current, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Lỗi render biểu đồ Mermaid');
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-error">
        <AlertCircle size={14} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div 
      className="mermaid-block" 
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

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
    if (language === 'mermaid') {
      setDetectedLang('mermaid');
      return;
    }

    if (!language && codeText) {
      try {
        const result = hljs.highlightAuto(codeText);
        if (result.language) {
          // If it looks like a URL and has no spaces, don't let auto-detect misidentify it
          if (codeText.startsWith('http') && !codeText.includes(' ')) {
            setDetectedLang('plaintext');
          } else {
            setDetectedLang(result.language);
          }
        }
      } catch { setDetectedLang('code'); }
    } else if (language) {
      setDetectedLang(language);
    }
  }, [language, codeText]);

  if (detectedLang === 'mermaid') {
    return <MermaidBlock chart={codeText} />;
  }

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
  const { language } = useStore();
  
  const handleInlineCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copy_md_success', language));
  };

  // Pre-process content to ensure all checkboxes are GFM-compliant and support bare [ ]
  const processedContent = content
    ? content
        .replace(/^(\s*)\[( |x|X)\]/gm, '$1- [$2]') // Ensure bare [ ] becomes - [ ]
        .replace(/^(\s*- \[( |x|X)\])(\s*)$/gm, '$1 \u200B') // Empty tasks: Add space + ZWS
        .replace(/^(\s*- \[( |x|X)\])(?! |\u200B)/gm, '$1 ') // Tasks with text: Ensure literal space if missing
    : `*${t('start_writing', language)}*`;

  return (
    <article className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm, 
          remarkGemoji, 
          remarkFootnotes, 
          remarkGithubMarkdownAlerts
        ] as any}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre: ({ children }) => <>{children}</>,
          li: ({ children, className, ...props }) => {
            const isTask = className?.includes('task-list-item') || 
                          (Array.isArray(children) && children.some(c => c?.props?.type === 'checkbox'));
            return (
              <li {...props} className={(className || '') + (isTask ? ' task-list-item' : '')}>
                {children}
              </li>
            );
          },
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input 
                  type="checkbox" 
                  checked={checked} 
                  readOnly 
                  {...props} 
                />
              );
            }
            return <input type={type} {...props} />;
          },
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
        {processedContent}
      </ReactMarkdown>

      <style>{`
        .markdown-preview {
          font-family: var(--font-preview);
          font-size: var(--text-md);
          line-height: 1.75;
          color: var(--color-text-primary);
          margin: 0;
        }
        
        .markdown-preview h1 { font-size: var(--text-xl); font-weight: 600; margin: 1em 0 0.5em; border-bottom: 1px solid var(--color-text-muted); padding-bottom: 0.3em; }
        .markdown-preview h2 { font-size: var(--text-lg); font-weight: 600; margin: 1em 0 0.5em; border-bottom: 1px solid var(--color-text-muted); padding-bottom: 0.3em; }
        .markdown-preview h3 { font-size: var(--text-md); font-weight: 600; margin: 1em 0 0.5em; }
        .markdown-preview p { margin: 0.75em 0; display: block; }
        .markdown-preview p:empty { display: none; }
        .markdown-preview img { display: inline-block; vertical-align: middle; margin: 0 4px 4px 0; }
        .markdown-preview p:first-child { margin-top: 0; }
        .markdown-preview strong { font-weight: 700; }
        .markdown-preview em { font-style: italic; }
        .markdown-preview hr {
          border: none;
          height: 2.5px;
          background: var(--color-text-muted);
          margin: 2rem 0;
        }
        
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
          border-left: 4px solid var(--color-border-subtle);
          padding-left: 1em;
          margin: 1em 0;
          color: var(--color-text-secondary);
        }
        
        .markdown-preview table { width: 100%; border-collapse: collapse; margin: 1em 0; border: 1px solid var(--color-border-subtle); }
        .markdown-preview th, .markdown-preview td {
          border: 1px solid var(--color-border-subtle);
          padding: 0.5em 1em;
        }
        .markdown-preview th { background: var(--color-app-hover); font-weight: 600; }
        
        /* Task list / Checkbox styling */
        .markdown-preview input[type="checkbox"] {
          margin: 0 0.5em 0.25em 0;
          vertical-align: middle;
          width: 1.2em;
          height: 1.2em;
          accent-color: var(--color-accent);
          cursor: pointer;
        }
        .markdown-preview .task-list-item {
          list-style-type: none;
        }
        
        /* Mermaid diagrams */
        .markdown-preview .mermaid-block {
          background: white;
          padding: 1rem;
          border-radius: var(--radius-md);
          margin: 1rem 0;
          display: flex;
          justify-content: center;
          border: 1px solid var(--color-border-subtle);
        }
        .markdown-preview .mermaid-error {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        /* GFM Alerts */
        .markdown-preview .markdown-alert {
          padding: 0 0 0 1rem;
          margin: 0.5rem 0;
          border-left: 3px solid #d0d7de;
        }
        .markdown-preview .markdown-alert .markdown-alert-content p {
          margin: 0;
        }
        .markdown-preview .markdown-alert .markdown-alert-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          margin-bottom: 4px;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .markdown-preview .markdown-alert .markdown-alert-icon {
          width: 14px;
          height: 14px;
          display: inline-block;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        .markdown-preview .markdown-alert.markdown-alert-note .markdown-alert-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%230969da'%3E%3Cpath d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'/%3E%3C/svg%3E");
        }
        .markdown-preview .markdown-alert.markdown-alert-tip .markdown-alert-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%231a7f37'%3E%3Cpath d='M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z'/%3E%3C/svg%3E");
        }
        .markdown-preview .markdown-alert.markdown-alert-important .markdown-alert-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%238250df'%3E%3Cpath d='M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'/%3E%3C/svg%3E");
        }
        .markdown-preview .markdown-alert.markdown-alert-warning .markdown-alert-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%239a6700'%3E%3Cpath d='M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'/%3E%3C/svg%3E");
        }
        .markdown-preview .markdown-alert.markdown-alert-caution .markdown-alert-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23d1242f'%3E%3Cpath d='M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'/%3E%3C/svg%3E");
        }
        
        .markdown-preview .markdown-alert.markdown-alert-note { border-left-color: #0969da; }
        .markdown-preview .markdown-alert.markdown-alert-note .markdown-alert-title { color: #0969da; }
        
        .markdown-preview .markdown-alert.markdown-alert-tip { border-left-color: #1a7f37; }
        .markdown-preview .markdown-alert.markdown-alert-tip .markdown-alert-title { color: #1a7f37; }
        
        .markdown-preview .markdown-alert.markdown-alert-important { border-left-color: #8250df; }
        .markdown-preview .markdown-alert.markdown-alert-important .markdown-alert-title { color: #8250df; }
        
        .markdown-preview .markdown-alert.markdown-alert-warning { border-left-color: #9a6700; }
        .markdown-preview .markdown-alert.markdown-alert-warning .markdown-alert-title { color: #9a6700; }
        
        .markdown-preview .markdown-alert.markdown-alert-caution { border-left-color: #d1242f; }
        .markdown-preview .markdown-alert.markdown-alert-caution .markdown-alert-title { color: #d1242f; }
      `}</style>
    </article>
  );
};
