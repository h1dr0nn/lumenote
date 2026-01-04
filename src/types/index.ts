export interface Workspace {
    id: string;
    name: string;
    color: string;
    createdAt: number;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    folderId?: string | null;
    workspaceId: string; // Required for all notes
    index?: number;
    createdAt: number;
    updatedAt: number;
    color?: string;
}

export interface Folder {
    id: string;
    name: string;
    parentId?: string | null;
    workspaceId: string; // Required for all folders
    index?: number;
    isExpanded?: boolean;
    createdAt: number;
    color?: string;
}

export type ViewMode = 'edit' | 'view';
