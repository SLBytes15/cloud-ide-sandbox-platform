import React from 'react';
import Editor from '@monaco-editor/react';
import { getLanguageFromPath } from '../utils/language.js';
import { createEditorModelPath } from '../utils/workspaceState.js';

interface MonacoEditorViewProps {
  workspaceId: string;
  filePath?: string;
  content: string;
  onChangeContent: (newContent: string) => void;
  readOnly?: boolean;
}

export const MonacoEditorView: React.FC<MonacoEditorViewProps> = ({
  workspaceId,
  filePath,
  content,
  onChangeContent,
  readOnly = false,
}) => {
  if (!filePath) {
    return (
      <div className="monaco-empty-state">
        <div className="empty-message">
          <h3>No file open</h3>
          <p>Select a file from the explorer on the left to start editing</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromPath(filePath);

  return (
    <div className="monaco-wrapper">
      <Editor
        height="100%"
        width="100%"
        theme="vs-dark"
        path={createEditorModelPath(workspaceId, filePath)}
        language={language}
        value={content}
        onChange={(val) => onChangeContent(val || '')}
        options={{
          minimap: { enabled: true, side: 'right' },
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          renderWhitespace: 'selection',
        }}
      />
    </div>
  );
};
