/**
 * @typedef {{ id: string, name: string, path: string, isDirty?: boolean }} WorkspaceTab
 * @typedef {{ fileTree: Array<any>, fileBuffers: Map<string, string>, openTabs: WorkspaceTab[], activeTabPath: string }} WorkspaceEditorState
 */

/** @returns {WorkspaceEditorState} */
export function createEmptyWorkspaceEditorState() {
  return { fileTree: [], fileBuffers: new Map(), openTabs: [], activeTabPath: '' };
}

/**
 * @param {Array<any>} fileTree
 * @param {Array<{path: string, content?: string}>} files
 * @param {WorkspaceTab[]} [openTabs]
 * @param {string} [activeTabPath]
 * @returns {WorkspaceEditorState}
 */
export function createWorkspaceEditorState(fileTree, files, openTabs = [], activeTabPath = '') {
  return {
    fileTree,
    fileBuffers: new Map(files.map((file) => [file.path, file.content || ''])),
    openTabs,
    activeTabPath,
  };
}

/** @param {string} workspaceId @param {string} filePath @returns {string} */
export function createEditorModelPath(workspaceId, filePath) {
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `/${encodeURIComponent(workspaceId)}${normalizedPath}`;
}

/**
 * @param {Map<string, WorkspaceEditorState>} states
 * @param {string} workspaceId
 * @param {(state: WorkspaceEditorState) => WorkspaceEditorState} update
 * @returns {Map<string, WorkspaceEditorState>}
 */
export function updateWorkspaceEditorState(states, workspaceId, update) {
  const next = new Map(states);
  next.set(workspaceId, update(states.get(workspaceId) || createEmptyWorkspaceEditorState()));
  return next;
}

/**
 * Replace server file data while retaining unsaved buffers for this workspace.
 * @param {WorkspaceEditorState} current
 * @param {Array<any>} fileTree
 * @param {Array<{path: string, content?: string}>} files
 * @returns {WorkspaceEditorState}
 */
export function replaceWorkspaceFiles(current, fileTree, files) {
  const buffers = new Map(files.map((file) => [file.path, file.content || '']));
  const dirtyPaths = new Set(current.openTabs.filter((tab) => tab.isDirty).map((tab) => tab.path));

  for (const path of dirtyPaths) {
    if (current.fileBuffers.has(path)) buffers.set(path, current.fileBuffers.get(path) || '');
  }

  const openTabs = current.openTabs.filter((tab) => buffers.has(tab.path));
  const activeTabPath = openTabs.some((tab) => tab.path === current.activeTabPath)
    ? current.activeTabPath
    : (openTabs[0]?.path || '');

  return { fileTree, fileBuffers: buffers, openTabs, activeTabPath };
}

/** @param {Array<any>} items @param {string} path @returns {Array<any>} */
export function removeFileTreeItem(items, path) {
  return items.flatMap((item) => {
    if (item.path === path) return [];
    if (item.type !== 'directory' || !Array.isArray(item.children)) return [item];
    return [{ ...item, children: removeFileTreeItem(item.children, path) }];
  });
}
