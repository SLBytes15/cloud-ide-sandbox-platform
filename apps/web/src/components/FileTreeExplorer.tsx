import React, { useState } from 'react';
import type { FileTreeItem } from '@cloud-ide/shared';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';

interface FileTreeExplorerProps {
  items: FileTreeItem[];
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (name: string, isDirectory: boolean) => void;
  onDeleteFile?: (path: string) => void;
}

export const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({
  items,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
}) => {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newIsDirectory, setNewIsDirectory] = useState(false);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onCreateFile(newFileName.trim(), newIsDirectory);
    setNewFileName('');
    setIsCreating(false);
  };

  const renderItem = (item: FileTreeItem) => {
    const isDir = item.type === 'directory';
    const isCollapsed = collapsedPaths.has(item.path);
    const isActive = activeFilePath === item.path;

    return (
      <div key={item.id} className="tree-node">
        <div
          className={`tree-row ${isActive ? 'active-tree-row' : ''}`}
          onClick={(e) => {
            if (isDir) {
              toggleFolder(item.path, e);
            } else {
              onSelectFile(item.path);
            }
          }}
        >
          <span className="tree-icon-wrapper">
            {isDir ? (
              isCollapsed ? (
                <ChevronRight size={14} className="chevron-icon" />
              ) : (
                <ChevronDown size={14} className="chevron-icon" />
              )
            ) : (
              <span style={{ width: 14 }} />
            )}
            {isDir ? (
              isCollapsed ? (
                <Folder size={15} color="#dcb67a" />
              ) : (
                <FolderOpen size={15} color="#dcb67a" />
              )
            ) : (
              <FileText size={15} color="#58a6ff" />
            )}
          </span>
          <span className="tree-label">{item.name}</span>

          {onDeleteFile && !isDir && (
            <button
              className="tree-action-btn delete-btn"
              title="Delete File"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${item.name}?`)) {
                  onDeleteFile(item.path);
                }
              }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {isDir && !isCollapsed && item.children && item.children.length > 0 && (
          <div className="tree-children">
            {item.children.map((child) => renderItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <span className="file-tree-title">FILES</span>
        <div className="file-tree-actions">
          <button
            className="icon-btn"
            title="New File"
            onClick={() => {
              setIsCreating(true);
              setNewIsDirectory(false);
            }}
          >
            <Plus size={14} />
          </button>
          <button
            className="icon-btn"
            title="New Folder"
            onClick={() => {
              setIsCreating(true);
              setNewIsDirectory(true);
            }}
          >
            <Folder size={14} />
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="tree-create-form">
          <input
            type="text"
            className="tree-create-input"
            placeholder={newIsDirectory ? 'folder name...' : 'filename.ext...'}
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            onBlur={() => {
              if (!newFileName.trim()) setIsCreating(false);
            }}
          />
        </form>
      )}

      <div className="file-tree-list">
        {items.length === 0 ? (
          <div className="empty-tree-notice">No files in workspace</div>
        ) : (
          items.map((item) => renderItem(item))
        )}
      </div>
    </div>
  );
};
