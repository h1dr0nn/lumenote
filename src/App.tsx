import { Sidebar } from "./components/sidebar/Sidebar";
import { MarkdownEditor } from "./components/editor/MarkdownEditor";
import { Preview } from "./components/editor/Preview";
import { EditorToolbar } from "./components/toolbar/EditorToolbar";
import { ViewModeToggle } from "./components/layout/ViewModeToggle";
import { useStore } from "./store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Share2 } from "lucide-react";

function App() {
  const { activeNoteId, notes, viewMode, updateNoteContent } = useStore();
  const activeNote = notes.find(n => n.id === activeNoteId);

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

            <button className="p-2 text-text-muted hover:text-text-secondary transition-colors">
              <Share2 size={18} />
            </button>
            <button className="p-2 text-text-muted hover:text-text-secondary transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Toolbar - Only show in edit mode */}
        {viewMode === 'edit' && activeNoteId && <EditorToolbar />}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden w-full">
          <div className="max-w-[800px] mx-auto h-full">
            <AnimatePresence mode="wait">
              {activeNoteId ? (
                <motion.div
                  key={viewMode + activeNoteId}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="h-full"
                >
                  {viewMode === 'edit' ? (
                    <MarkdownEditor
                      value={activeNote?.content || ""}
                      onChange={(value) => activeNote && updateNoteContent(activeNote.id, value)}
                    />
                  ) : (
                    <div className="px-8 py-6 overflow-y-auto h-full">
                      <Preview content={activeNote?.content || ""} />
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-muted space-y-4">
                  <div className="p-6 bg-app-hover rounded-full">
                    <Hash size={48} strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium">Chọn một ghi chú hoặc tạo mới để bắt đầu</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
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
