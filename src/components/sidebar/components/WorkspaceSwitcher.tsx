import { useStore } from "../../../store/useStore";
import { Plus } from "lucide-react";
import { t } from "../../../utils/i18n";

interface WorkspaceSwitcherProps {
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    editingId: string | null;
    editValue: string;
    onEditChange: (val: string) => void;
    onEditSave: () => void;
    onEditCancel: () => void;
    onNewWorkspaceEdit: (id: string, name: string) => void;
}

export const WorkspaceSwitcher = ({ 
    onContextMenu, 
    editingId, 
    editValue, 
    onEditChange, 
    onEditSave, 
    onEditCancel,
    onNewWorkspaceEdit
}: WorkspaceSwitcherProps) => {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId, addWorkspace, language } = useStore();

    const handleAddWorkspace = () => {
        const defaultName = t('new_workspace', language);
        addWorkspace(defaultName);
        // Find the newly created workspace (it will be the last one and active)
        setTimeout(() => {
            const newWs = useStore.getState().workspaces[useStore.getState().workspaces.length - 1];
            if (newWs) {
                onNewWorkspaceEdit(newWs.id, newWs.name);
            }
        }, 0);
    };

    return (
        <div className="flex items-center gap-2 p-1.5 bg-app-sidebar/30 backdrop-blur-sm rounded-lg border border-border-muted overflow-hidden">
            {/* Scrollable Dots Container */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide no-scrollbar px-1 py-1">
                {workspaces.map((ws) => {
                    const isEditing = editingId === ws.id;
                    
                    return (
                        <div key={ws.id} className="relative flex items-center">
                            {isEditing ? (
                                <input
                                    autoFocus
                                    className="bg-app-surface border border-accent rounded-sm px-1.5 py-0.5 text-[10px] text-text-primary outline-none min-w-[60px]"
                                    value={editValue}
                                    onChange={(e) => onEditChange(e.target.value)}
                                    onBlur={onEditSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onEditSave();
                                        if (e.key === 'Escape') onEditCancel();
                                    }}
                                />
                            ) : (
                                <button
                                    onClick={() => setActiveWorkspaceId(ws.id)}
                                    onContextMenu={(e) => onContextMenu(e, ws.id)}
                                    className="group relative flex items-center justify-center p-1 shrink-0"
                                    title={ws.name}
                                >
                                    <div 
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                                            activeWorkspaceId === ws.id 
                                            ? 'scale-110 ring-[1.5px] ring-offset-1 ring-offset-app-sidebar ring-accent opacity-100' 
                                            : 'opacity-40 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: ws.color }}
                                    />
                                    
                                    {/* Tooltip-like label on hover */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-app-surface border border-border-subtle rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-sm">
                                        {ws.name}
                                    </div>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="w-px h-3 bg-border-muted shrink-0" />

            <button 
                onClick={handleAddWorkspace}
                className="p-1 rounded-md hover:bg-app-hover text-text-muted hover:text-text-primary transition-all active:scale-95 shrink-0"
                title={t('new_workspace', language)}
            >
                <Plus size={14} />
            </button>
        </div>
    );
};
