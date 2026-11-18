export type FileNodeType = 'file' | 'directory';

export interface FileNode {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
  type: FileNodeType;
  parentId?: string | null;
  size?: number;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  type: FileNodeType;
  children?: FileTreeItem[];
}
