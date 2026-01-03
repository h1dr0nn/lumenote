export interface Note {
    id: string;
    title: string;
    content: string;
    folderId?: string | null;
    index?: number;
    createdAt: number;
    updatedAt: number;
}

export interface Folder {
    id: string;
    name: string;
    parentId?: string | null;
    index?: number;
    isExpanded?: boolean;
    createdAt: number;
}

export type ViewMode = 'edit' | 'view';
