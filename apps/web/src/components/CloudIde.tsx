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
import { Code2, Play, Save } from 'lucide-react';
import { getLanguageFromPath } from '../utils/language.js';

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
            onClick={() => setStatusMessage(`Execution requested for ${activeWorkspace?.runtime || 'node'} sandbox...`)}
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
