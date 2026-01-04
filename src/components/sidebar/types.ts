export interface ContextMenuType {
    x: number;
    y: number;
    type: 'sidebar' | 'note' | 'folder' | 'workspace';
    itemId?: string;
}

export type DragTarget = { 
    id: string; 
    position: 'above' | 'inside' | 'below' 
} | null;
