import { Sidebar } from "./components/sidebar/Sidebar";
import { MarkdownEditor } from "./components/editor/MarkdownEditor";
import { Preview } from "./components/editor/Preview";
import { EditorToolbar } from "./components/toolbar/EditorToolbar";
import { ViewModeToggle } from "./components/layout/ViewModeToggle";
import { useStore } from "./store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Settings as SettingsIcon, Share2 } from "lucide-react";
import { SharePopup } from "./components/popups/SharePopup";
import { SettingsPopup } from "./components/popups/SettingsPopup";
import { useEffect } from "react";

function App() {
  const { 
    activeNoteId, 
    notes, 
    viewMode, 
    updateNoteContent, 
    activePopup, 
    setActivePopup,
    theme,
    fontPreset, // renamed back to fontPreset for consistency with previous tool calls, or fontSet if I prefer
    fontSize
  } = useStore();
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Handle Theme and Typography
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Theme application
    const applyTheme = (t: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(t);
    };

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      applyTheme(systemTheme);
    } else {
      applyTheme(theme);
    }

    // Font Set Definitions
    const fontSets = {
      sans: {
        ui: '"Inter", "Segoe UI", Roboto, sans-serif',
        serif: 'Georgia, "Times New Roman", serif',
        mono: '"JetBrains Mono", "Cascadia Code", monospace'
      },
      serif: {
        ui: 'system-ui, -apple-system, sans-serif',
        serif: '"Charter", "Bitstream Charter", "Iowan Old Style", serif',
        mono: '"SF Mono", "Source Code Pro", monospace'
      },
      mono: {
        ui: '"Outfit", "Avenir Next", sans-serif',
        serif: 'Charter, serif',
        mono: '"Fira Code", "Fira Mono", monospace'
      }
    };

    const currentSet = fontSets[fontPreset as keyof typeof fontSets] || fontSets.sans;
    
    // Propagate to CSS variables
    root.style.setProperty('--font-ui', currentSet.ui);
    root.style.setProperty('--font-serif', currentSet.serif);
    root.style.setProperty('--font-mono', currentSet.mono);
    
    // Legacy support for Editor/Preview specific vars
    root.style.setProperty('--font-editor', currentSet.mono);
    root.style.setProperty('--font-preview', currentSet.ui);
    
    root.style.setProperty('--text-md', `${fontSize}px`);
    
    // Explicitly reset weight for editor to avoid bolding issue
    root.style.setProperty('--cm-font-weight', '400');
  }, [theme, fontPreset, fontSize]);

  return (
    <div className="flex h-screen w-full bg-app-bg text-text-primary font-ui overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-app-surface relative">
        {/* Header */}
        <header className="h-12 border-b border-border-muted flex items-center justify-between px-6 bg-app-surface/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary truncate max-w-[200px]">
              {activeNote?.title || "No Note Selected"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="mr-4">
              <ViewModeToggle />
            </div>

            <button 
              onClick={() => setActivePopup('share')}
              className={`p-2 transition-colors ${activePopup === 'share' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <Share2 size={18} />
            </button>
            <button 
              onClick={() => setActivePopup('settings')}
              className={`p-2 transition-colors ${activePopup === 'settings' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        {/* Toolbar - Animate presence to avoid jump */}
        <AnimatePresence>
          {viewMode === 'edit' && activeNoteId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 40 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="border-b border-border-muted bg-app-surface overflow-hidden"
            >
              <EditorToolbar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden w-full flex">
          <div className="w-full max-w-[900px] h-full">
            <AnimatePresence mode="wait" initial={false}>
              {activeNoteId ? (
                <motion.div
                  key={viewMode + activeNoteId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="h-full"
                >
                  {viewMode === 'edit' ? (
                    <MarkdownEditor
                      value={activeNote?.content || ""}
                      onChange={(value) => activeNote && updateNoteContent(activeNote.id, value)}
                    />
                  ) : (
                    <div className="px-12 py-8 overflow-y-auto h-full scroll-smooth">
                      <Preview content={activeNote?.content || ""} />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-text-muted space-y-4"
                >
                  <div className="p-6 bg-app-hover rounded-full">
                    <Hash size={48} strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium">Chọn một ghi chú hoặc tạo mới để bắt đầu</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Popups */}
        <SharePopup />
        <SettingsPopup />
      </main>
    </div>
  );
}

const Hash = ({ size, strokeWidth }: { size: number, strokeWidth: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9"></line>
    <line x1="4" y1="15" x2="20" y2="15"></line>
    <line x1="10" y1="3" x2="8" y2="21"></line>
    <line x1="16" y1="3" x2="14" y2="21"></line>
  </svg>
);

export default App;
