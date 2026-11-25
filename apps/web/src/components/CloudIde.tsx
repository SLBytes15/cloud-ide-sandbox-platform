import React, { useState, useEffect } from 'react';
import type { WorkspaceSummary, FileTreeItem, FileNode } from '@cloud-ide/shared';
import {
  mockWorkspaceSummaries,
  mockFileTree,
  mockFileNodes,
} from '@cloud-ide/shared';
import { FileTreeExplorer } from './FileTreeExplorer.js';
import { TabBar } from './TabBar.js';
import { MonacoEditorView } from './MonacoEditorView.js';
import { TerminalView } from './TerminalView.js';
import { ExecutionPanel } from './ExecutionPanel.js';
import { Code2, Play, Save, Terminal as TerminalIcon, Cpu } from 'lucide-react';
import { getLanguageFromPath } from '../utils/language.js';
import { executeWasmFallback } from '../utils/wasmeval.js';
import type { ExecutionUiStatus } from '../utils/executionState.js';
import {
  createWorkspaceEditorState,
  removeFileTreeItem,
  replaceWorkspaceFiles,
  updateWorkspaceEditorState,
} from '../utils/workspaceState.js';

type WorkspaceFileLoadState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export const CloudIde: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>(mockWorkspaceSummaries);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(mockWorkspaceSummaries[0]?.id || '');
  const [workspaceEditors, setWorkspaceEditors] = useState(() => new Map([
    [mockWorkspaceSummaries[0]?.id || '', createWorkspaceEditorState(
      mockFileTree,
      mockFileNodes,
      [
        { id: '1', name: 'index.js', path: '/src/index.js' },
        { id: '2', name: 'README.md', path: '/README.md' },
      ],
      '/src/index.js',
    )],
  ]));
  const [fileLoadStates, setFileLoadStates] = useState<Record<string, WorkspaceFileLoadState>>({});
  const [fileLoadAttempt, setFileLoadAttempt] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [showTerminal, setShowTerminal] = useState<boolean>(true);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const executionStatus: ExecutionUiStatus = 'idle';

  // Load workspaces from backend API on mount
  useEffect(() => {
    let cancelled = false;
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch('/api/v1/workspaces');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setWorkspaces(json.data);
          setActiveWorkspaceId((currentId) =>
            json.data.some((workspace: WorkspaceSummary) => workspace.id === currentId)
              ? currentId
              : json.data[0].id,
          );
        }
      } catch {
        // Sample workspaces remain available, and file loading reports API failure below.
      }
    };
    void fetchWorkspaces();
    return () => { cancelled = true; };
  }, []);

  // Load workspace files when active workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return;
    let cancelled = false;
    const workspaceId = activeWorkspaceId;
    setFileLoadStates((prev) => ({ ...prev, [workspaceId]: { status: 'loading' } }));

    const fetchWorkspaceFiles = async () => {
      try {
        const res = await fetch(`/api/v1/workspaces/${workspaceId}/files`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.message || 'Unexpected workspace response');
        if (cancelled) return;
        const files = Array.isArray(json.data.files) ? json.data.files as FileNode[] : [];
        setWorkspaceEditors((prev) => updateWorkspaceEditorState(prev, workspaceId, (state) =>
          replaceWorkspaceFiles(state, Array.isArray(json.data.tree) ? json.data.tree : [], files),
        ));
        setFileLoadStates((prev) => ({ ...prev, [workspaceId]: { status: 'ready' } }));
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown error';
        setFileLoadStates((prev) => ({
          ...prev,
          [workspaceId]: { status: 'error', message },
        }));
      }
    };

    void fetchWorkspaceFiles();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, fileLoadAttempt]);

  const activeEditor = workspaceEditors.get(activeWorkspaceId) || createWorkspaceEditorState([], []);
  const { fileTree, fileBuffers, openTabs, activeTabPath } = activeEditor;
  const fileLoadState = fileLoadStates[activeWorkspaceId];

  const handleSelectFile = (path: string) => {
    setWorkspaceEditors((prev) => updateWorkspaceEditorState(prev, activeWorkspaceId, (state) => {
      const existing = state.openTabs.some((tab) => tab.path === path);
      const name = path.split('/').pop() || path;
      return {
        ...state,
        openTabs: existing ? state.openTabs : [...state.openTabs, { id: `${activeWorkspaceId}:${path}`, name, path }],
        activeTabPath: path,
      };
    }));
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceEditors((prev) => updateWorkspaceEditorState(prev, activeWorkspaceId, (state) => {
      const remaining = state.openTabs.filter((tab) => tab.path !== path);
      return {
        ...state,
        openTabs: remaining,
        activeTabPath: state.activeTabPath === path
          ? (remaining[remaining.length - 1]?.path || '')
          : state.activeTabPath,
      };
    }));
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTabPath) return;
    setWorkspaceEditors((prev) => updateWorkspaceEditorState(prev, activeWorkspaceId, (state) => ({
      ...state,
      fileBuffers: new Map(state.fileBuffers).set(activeTabPath, newContent),
      openTabs: state.openTabs.map((tab) =>
        tab.path === activeTabPath ? { ...tab, isDirty: true } : tab,
      ),
    })));
  };

  const handleSaveActiveFile = () => {
    if (!activeTabPath) return;
    setStatusMessage(`Not saved: ${activeTabPath} is only stored in this browser session.`);
  };

  const handleCreateFile = (name: string, isDirectory: boolean) => {
    const cleanName = name.trim();
    const path = `/${cleanName}`;
    const newItem: FileTreeItem = {
      id: `file_${Date.now()}`,
      name: cleanName,
      path,
      type: isDirectory ? 'directory' : 'file',
      ...(isDirectory ? { children: [] } : {}),
    };

    setWorkspaceEditors((prev) => updateWorkspaceEditorState(prev, activeWorkspaceId, (state) => ({
      ...state,
      fileTree: [...state.fileTree, newItem],
      fileBuffers: isDirectory ? state.fileBuffers : new Map(state.fileBuffers).set(path, ''),
      openTabs: isDirectory || state.openTabs.some((tab) => tab.path === path)
        ? state.openTabs
        : [...state.openTabs, { id: `${activeWorkspaceId}:${path}`, name: cleanName, path, isDirty: true }],
      activeTabPath: isDirectory ? state.activeTabPath : path,
    })));
    setStatusMessage(`Created ${path} in the local editor state; it was not sent to the backend.`);
  };

  const handleDeleteFile = (path: string) => {
    setWorkspaceEditors((prev) => updateWorkspaceEditorState(prev, activeWorkspaceId, (state) => {
      const openTabs = state.openTabs.filter((tab) => tab.path !== path);
      const fileBuffers = new Map(state.fileBuffers);
      fileBuffers.delete(path);
      return {
        ...state,
        fileTree: removeFileTreeItem(state.fileTree, path),
        fileBuffers,
        openTabs,
        activeTabPath: state.activeTabPath === path
          ? (openTabs[openTabs.length - 1]?.path || '')
          : state.activeTabPath,
      };
    }));
    setStatusMessage(`Removed ${path} from the local editor state; it was not sent to the backend.`);
  };

  const handleWasmOfflineRun = async () => {
    setStatusMessage('Running offline client-side WebAssembly fallback...');
    const result = await executeWasmFallback('square', [12]);
    if (result.success) {
      setStatusMessage(`WASM (square(12)): ${result.result} (${result.durationMs}ms offline)`);
    } else {
      setStatusMessage(result.output);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const activeContent = activeTabPath ? fileBuffers.get(activeTabPath) || '' : '';
  const activeLanguage = activeTabPath ? getLanguageFromPath(activeTabPath) : 'plaintext';

  return (
    <div className="ide-layout">
      {/* IDE Top Toolbar */}
      <div className="ide-toolbar">
        <div className="toolbar-left">
          <div className="workspace-selector-wrapper">
            <label className="toolbar-label" htmlFor="workspace-select">Workspace:</label>
            <select
              id="workspace-select"
              className="workspace-select"
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.runtime})
                </option>
              ))}
            </select>
          </div>
          <span className="runtime-badge">{activeWorkspace?.runtime || 'node'}</span>
        </div>

        <div className="toolbar-center">
          <span className="active-filepath">{activeTabPath || 'No file selected'}</span>
        </div>

        <div className="toolbar-right">
          <button
            className="toolbar-btn primary-btn"
            onClick={handleWasmOfflineRun}
            title="Instant Offline Client-side WebAssembly Execution"
            aria-label="Run WebAssembly offline demo"
          >
            <Cpu size={14} color="#bc8cff" />
            <span>WASM Offline</span>
          </button>
          <button
            className="toolbar-btn primary-btn"
            onClick={() => setShowTerminal((prev) => !prev)}
            title="Toggle Terminal Dock"
            aria-label="Toggle terminal dock"
          >
            <TerminalIcon size={14} />
            <span>Terminal</span>
          </button>
          <button
            className="toolbar-btn primary-btn"
            onClick={() => setShowExecutionPanel((prev) => !prev)}
            title="Show execution status and contract readiness"
            aria-expanded={showExecutionPanel}
            aria-label="Toggle execution panel"
          >
            <Play size={14} />
            <span>Execution</span>
          </button>
          <button
            className="toolbar-btn primary-btn"
            onClick={handleSaveActiveFile}
            disabled={!activeTabPath}
            title="Save Buffer (Ctrl+S / Cmd+S)"
            aria-label="Save active file"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
          <button
            className="toolbar-btn success-btn"
            title="Disabled until the execution API contract and isolated runtime are agreed"
            disabled
            aria-label="Run active file (disabled: execution contract pending)"
          >
            <Play size={14} />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* IDE Main Area: Sidebar + Editor */}
      <div className="ide-body">
        {/* Left Sidebar: File Tree Explorer */}
        <aside className="ide-sidebar">
          <FileTreeExplorer
            items={fileTree}
            activeFilePath={activeTabPath}
            isLoading={fileLoadState?.status === 'loading'}
            loadError={fileLoadState?.status === 'error' ? fileLoadState.message : undefined}
            onRetry={() => setFileLoadAttempt((attempt) => attempt + 1)}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
          />
        </aside>

        {/* Right Editor Area: Tabs + Monaco Editor */}
        <main className="ide-editor-area">
          <TabBar
            tabs={openTabs}
            activeTabPath={activeTabPath}
            onSelectTab={handleSelectFile}
            onCloseTab={handleCloseTab}
          />

          <div className="editor-container">
            <MonacoEditorView
              workspaceId={activeWorkspaceId}
              filePath={activeTabPath}
              content={activeContent}
              onChangeContent={handleContentChange}
            />
          </div>

          {showExecutionPanel && (
            <ExecutionPanel
              status={executionStatus}
              workspaceId={activeWorkspaceId}
              filePath={activeTabPath || 'No file selected'}
              onClose={() => setShowExecutionPanel(false)}
            />
          )}

          {/* Docked Interactive Terminal */}
          {showTerminal && (
            <TerminalView
              workspaceId={activeWorkspace?.id || 'ws_default'}
              onToggleMinimize={() => setShowTerminal((prev) => !prev)}
            />
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="ide-statusbar" role="status" aria-live="polite">
        <div className="statusbar-left">
          <span className="status-item">
            <Code2 size={13} style={{ marginRight: 4 }} />
            {activeLanguage.toUpperCase()}
          </span>
          <span className="status-item">UTF-8</span>
          <span className="status-item">{statusMessage}</span>
        </div>
        <div className="statusbar-right">
          <span className="status-item">Zaalima Cloud IDE v0.1.0</span>
          <span className="status-item">Execution: contract pending</span>
        </div>
      </footer>
    </div>
  );
};
