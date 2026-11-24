import { useState, useEffect } from 'react';
import './App.css';
import { CloudIde } from './components/CloudIde.js';
import { Code2, LayoutDashboard } from 'lucide-react';

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  database: {
    status: string;
  };
}

export function App() {
  const [activeView, setActiveView] = useState<'ide' | 'dashboard'>('ide');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error connecting to API');
      }
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="app-container">
      {/* Global Header */}
      <header className="top-bar">
        <div className="brand">
          <span>⚡ Zaalima Cloud IDE</span>
          <span className="badge">Week 1 Platform</span>
        </div>

        {/* View Switcher: Interactive IDE vs Status Dashboard */}
        <div className="view-switcher">
          <button
            className={`nav-btn ${activeView === 'ide' ? 'nav-btn-active' : ''}`}
            onClick={() => setActiveView('ide')}
          >
            <Code2 size={15} />
            <span>Cloud IDE Editor</span>
          </button>
          <button
            className={`nav-btn ${activeView === 'dashboard' ? 'nav-btn-active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={15} />
            <span>Architecture & Health</span>
          </button>
        </div>

        <div className="top-bar-right">
          <span className="branch-tag">Local development</span>
        </div>
      </header>

      {/* Main Container */}
      {activeView === 'ide' ? (
        <CloudIde />
      ) : (
        <main className="main-content">
          <section className="hero">
            <h1>Distributed Cloud IDE Platform</h1>
            <p>Cards list repository implementation areas; API health below is checked live.</p>
          </section>

          <section className="grid-cards">
            <div className="card">
              <div className="card-header">
                <span>🖥️</span>
                <h3>Week 1.A: Frontend IDE</h3>
              </div>
              <p>React 19 + Monaco Editor + Tabs</p>
              <ul>
                <li>Monaco editor with workspace-specific model paths</li>
                <li>Multi-file tabs and unsaved-change markers</li>
                <li>Nested file tree navigation (not virtualized)</li>
                <li>Configured language mappings and local workers</li>
              </ul>
            </div>

            <div className="card">
              <div className="card-header">
                <span>⚙️</span>
                <h3>Week 1.B: Backend & Persistence</h3>
              </div>
              <p>Express 5 + Mongoose + MongoDB</p>
              <div className="health-status">
                {loading && <div>Checking backend health...</div>}
                {error && <div style={{ color: '#f85149' }}>Status: Disconnected ({error})</div>}
                {health && (
                  <div>
                    <div>Status: <strong>{health.status}</strong></div>
                    <div>Database: {health.database?.status}</div>
                    <div>Uptime: {Math.floor(health.uptime)}s</div>
                  </div>
                )}
              </div>
              <ul>
                <li>Workspace, file, and execution-job model modules</li>
                <li>Workspace and file REST route modules</li>
                <li>Hierarchical file-tree response code</li>
              </ul>
            </div>

            <div className="card">
              <div className="card-header">
                <span>🛡️</span>
                <h3>Week 1.C: Container Lifecycle</h3>
              </div>
              <p>Docker Engine API + cgroups v2</p>
              <ul>
                <li>Execution service and container lifecycle modules</li>
                <li>Resource and filesystem configuration code</li>
                <li>Runtime timeout and cleanup paths</li>
                <li>Runtime behavior was not checked in this frontend QA pass</li>
              </ul>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
