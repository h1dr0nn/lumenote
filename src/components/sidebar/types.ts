export type ContextMenuType = { 
    x: number; 
    y: number; 
    type: 'sidebar' | 'note' | 'folder'; 
    itemId?: string 
};

export type DragTarget = { 
    id: string; 
    position: 'above' | 'inside' | 'below' 
} | null;
