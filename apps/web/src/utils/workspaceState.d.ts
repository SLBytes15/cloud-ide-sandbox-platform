import type { FileNode, FileTreeItem } from '@cloud-ide/shared';

export interface WorkspaceTabState {
  id: string;
  name: string;
  path: string;
  isDirty?: boolean;
}

export interface WorkspaceEditorState {
  fileTree: FileTreeItem[];
  fileBuffers: Map<string, string>;
  openTabs: WorkspaceTabState[];
  activeTabPath: string;
}

export function createEmptyWorkspaceEditorState(): WorkspaceEditorState;
export function createEditorModelPath(workspaceId: string, filePath: string): string;
export function createWorkspaceEditorState(
  fileTree: FileTreeItem[],
  files: FileNode[],
  openTabs?: WorkspaceTabState[],
  activeTabPath?: string,
): WorkspaceEditorState;
export function updateWorkspaceEditorState(
  states: Map<string, WorkspaceEditorState>,
  workspaceId: string,
  update: (state: WorkspaceEditorState) => WorkspaceEditorState,
): Map<string, WorkspaceEditorState>;
export function replaceWorkspaceFiles(
  current: WorkspaceEditorState,
  fileTree: FileTreeItem[],
  files: FileNode[],
): WorkspaceEditorState;
export function removeFileTreeItem(items: FileTreeItem[], path: string): FileTreeItem[];
