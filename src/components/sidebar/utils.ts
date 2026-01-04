import { Note, Folder } from "../../types";

export const isNote = (id: string, notes: Note[]) => notes.some(n => n.id === id);
export const isFolder = (id: string, folders: Folder[]) => folders.some(f => f.id === id);

export const getItemDepth = (id: string, folders: Folder[], notes: Note[]): number => {
    const folder = folders.find(f => f.id === id);
    if (folder) return folder.parentId ? getItemDepth(folder.parentId, folders, notes) + 1 : 0;
    const note = notes.find(n => n.id === id);
    if (note) return note.folderId ? getItemDepth(note.folderId, folders, notes) + 1 : 0;
    return 0;
};

export const getSubtreeMaxDepth = (folderId: string, folders: Folder[]): number => {
    const childFolders = folders.filter(f => f.parentId === folderId);
    if (childFolders.length === 0) return 0;
    return 1 + Math.max(...childFolders.map(f => getSubtreeMaxDepth(f.id, folders)));
};
