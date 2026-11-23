import React, { useState, useEffect } from 'react';
import type { WorkspaceSummary, FileTreeItem, FileNode } from '@cloud-ide/shared';
import {
  mockWorkspaceSummaries,
  mockFileTree,
  mockFileNodes,
} from '@cloud-ide/shared';
import { FileTreeExplorer } from './FileTreeExplorer.js';
import { TabBar, OpenTab } from './TabBar.js';
import { MonacoEditorView } from './MonacoEditorView.js';
import { TerminalView } from './TerminalView.js';
import { Code2, Play, Save, Terminal as TerminalIcon, Cpu } from 'lucide-react';
import { getLanguageFromPath } from '../utils/language.js';
import { executeWasmFallback } from '../utils/wasmeval.js';

export const CloudIde: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>(mockWorkspaceSummaries);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(mockWorkspaceSummaries[0]?.id || '');
  const [fileTree, setFileTree] = useState<FileTreeItem[]>(mockFileTree);
  const [fileBuffers, setFileBuffers] = useState<Map<string, string>>(
    new Map(mockFileNodes.map((f) => [f.path, f.content || '']))
  );
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: '1', name: 'index.js', path: '/src/index.js' },
    { id: '2', name: 'README.md', path: '/README.md' },
  ]);
  const [activeTabPath, setActiveTabPath] = useState<string>('/src/index.js');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [showTerminal, setShowTerminal] = useState<boolean>(true);

  // Load workspaces from backend API on mount
  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/v1/workspaces');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setWorkspaces(json.data);
          if (!activeWorkspaceId) {
            setActiveWorkspaceId(json.data[0].id);
          }
        }
      }
    } catch {
      // Offline fallback already loaded via mockWorkspaceSummaries
    }
  };

  // Load workspace files when active workspace changes
  const fetchWorkspaceFiles = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/files`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setFileTree(json.data.tree || []);
          if (Array.isArray(json.data.files)) {
            const newBuffers = new Map<string, string>();
            for (const f of json.data.files as FileNode[]) {
              newBuffers.set(f.path, f.content || '');
            }
            setFileBuffers(newBuffers);
          }
        }
      }
    } catch {
      // Offline fallback in state
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspaceFiles(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleSelectFile = (path: string) => {
    const existing = openTabs.find((t) => t.path === path);
    if (!existing) {
      const name = path.split('/').pop() || path;
      setOpenTabs((prev) => [...prev, { id: String(Date.now()), name, path }]);
    }
    setActiveTabPath(path);
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.path !== path);
    setOpenTabs(remaining);
    if (activeTabPath === path && remaining.length > 0) {
      setActiveTabPath(remaining[remaining.length - 1].path);
    } else if (remaining.length === 0) {
      setActiveTabPath('');
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTabPath) return;
    setFileBuffers((prev) => {
      const next = new Map(prev);
      next.set(activeTabPath, newContent);
      return next;
    });

    setOpenTabs((prev) =>
      prev.map((tab) => (tab.path === activeTabPath ? { ...tab, isDirty: true } : tab))
    );
  };

  const handleExecuteScript = async () => {
    if (!activeTabPath || !activeContent.trim()) {
      setStatusMessage('No code to execute in active buffer');
      return;
    }

    setStatusMessage(`Executing ${activeTabPath} in ${activeWorkspace?.runtime || 'node'} sandbox...`);
    setShowTerminal(true);

    try {
      const res = await fetch(`/api/v1/workspaces/${activeWorkspaceId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeContent,
          runtime: activeWorkspace?.runtime || 'node',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { durationMs, exitCode, status } = json.data;
          setStatusMessage(`Completed in ${durationMs}ms (exit code ${exitCode}) [${status}]`);
        } else {
          setStatusMessage('Execution completed');
        }
      } else {
        setStatusMessage('Execution failed (server error)');
      }
    } catch {
      setStatusMessage('Offline execution simulated');
    }
  };

  const handleSaveActiveFile = async () => {
    if (!activeTabPath) return;
    setIsSaving(true);
    setStatusMessage(`Saving ${activeTabPath}...`);
    try {
      // In-memory buffer is already up-to-date
      setOpenTabs((prev) =>
        prev.map((tab) => (tab.path === activeTabPath ? { ...tab, isDirty: false } : tab))
      );
      setStatusMessage(`Saved ${activeTabPath}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (name: string, isDirectory: boolean) => {
    const cleanName = name.trim();
    const path = `/${cleanName}`;
    const newItem: FileTreeItem = {
      id: `file_${Date.now()}`,
      name: cleanName,
      path,
      type: isDirectory ? 'directory' : 'file',
      ...(isDirectory ? { children: [] } : {}),
    };

    setFileTree((prev) => [...prev, newItem]);
    if (!isDirectory) {
      setFileBuffers((prev) => {
        const next = new Map(prev);
        next.set(path, '');
        return next;
      });
      handleSelectFile(path);
    }
    setStatusMessage(`Created ${path}`);
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
            <span className="toolbar-label">Workspace:</span>
            <select
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
          >
            <Cpu size={14} color="#bc8cff" />
            <span>WASM Offline</span>
          </button>
          <button
            className="toolbar-btn primary-btn"
            onClick={() => setShowTerminal((prev) => !prev)}
            title="Toggle Terminal Dock"
          >
            <TerminalIcon size={14} />
            <span>Terminal</span>
          </button>
          <button
            className="toolbar-btn primary-btn"
            onClick={handleSaveActiveFile}
            disabled={!activeTabPath || isSaving}
            title="Save Buffer (Ctrl+S / Cmd+S)"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
          <button
            className="toolbar-btn success-btn"
            title="Execute Code in Ephemeral Sandbox"
            onClick={handleExecuteScript}
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
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={(path) => {
              setFileTree((prev) => prev.filter((item) => item.path !== path));
              setOpenTabs((prev) => prev.filter((tab) => tab.path !== path));
              if (activeTabPath === path) setActiveTabPath('');
            }}
          />
        </aside>

        {/* Right Editor Area: Tabs + Monaco Editor */}
        <main className="ide-editor-area">
          <TabBar
            tabs={openTabs}
            activeTabPath={activeTabPath}
            onSelectTab={setActiveTabPath}
            onCloseTab={handleCloseTab}
          />

          <div className="editor-container">
            <MonacoEditorView
              filePath={activeTabPath}
              content={activeContent}
              onChangeContent={handleContentChange}
            />
          </div>

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
      <footer className="ide-statusbar">
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
          <span className="status-item">Sandbox: Ready</span>
        </div>
      </footer>
    </div>
  );
};
