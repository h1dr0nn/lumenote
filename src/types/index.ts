export interface Note {
    id: string;
    title: string;
    content: string;
    folderId?: string | null;
    createdAt: number;
    updatedAt: number;
}

export interface Folder {
    id: string;
    name: string;
    parentId?: string | null;
    isExpanded?: boolean;
    createdAt: number;
}

export type ViewMode = 'edit' | 'view';
