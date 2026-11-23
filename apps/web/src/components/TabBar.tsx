import React from 'react';
import { X, FileText } from 'lucide-react';

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  isDirty?: boolean;
}

interface TabBarProps {
  tabs: OpenTab[];
  activeTabPath?: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string, e: React.MouseEvent) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabPath,
  onSelectTab,
  onCloseTab,
}) => {
  if (tabs.length === 0) {
    return <div className="tab-bar-empty" />;
  }

  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        return (
          <div
            key={tab.path}
            className={`tab-item ${isActive ? 'tab-item-active' : ''}`}
            onClick={() => onSelectTab(tab.path)}
          >
            <FileText size={14} className="tab-icon" color="#58a6ff" />
            <span className="tab-title">{tab.name}</span>
            {tab.isDirty && <span className="tab-dirty-indicator" title="Unsaved changes" />}
            <button
              className="tab-close-btn"
              onClick={(e) => onCloseTab(tab.path, e)}
              title="Close tab"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
