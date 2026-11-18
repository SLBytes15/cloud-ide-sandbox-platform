import { useState, useEffect } from 'react';
import './App.css';

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
      <header className="top-bar">
        <div className="brand">
          <span>⚡ Zaalima Cloud IDE</span>
          <span className="badge">Project 2 Initial Setup</span>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#8b949e' }}>Branch: <code>main</code></span>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <h1>Distributed Cloud IDE Platform</h1>
          <p>Modular MERN Stack + TypeScript Monorepo Foundation</p>
        </section>

        <section className="grid-cards">
          <div className="card">
            <div className="card-header">
              <span>🖥️</span>
              <h3>Frontend Foundation</h3>
            </div>
            <p>React 19 + TypeScript + Vite</p>
            <ul>
              <li>Monaco Editor ready integration point</li>
              <li>xterm.js interactive terminal ready</li>
              <li>Multi-tab workspace state architecture</li>
              <li>WebSocket connection client stub</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <span>⚙️</span>
              <h3>Backend API Status</h3>
            </div>
            <p>Express 5 + TypeScript + Mongoose</p>
            <div className="health-status">
              {loading && (
                <div>
                  <span className="status-indicator status-pending" />
                  <span>Checking backend health...</span>
                </div>
              )}
              {error && (
                <div>
                  <span className="status-indicator status-err" />
                  <span style={{ color: '#f85149' }}>Disconnected: {error}</span>
                </div>
              )}
              {health && (
                <div>
                  <div>
                    <span className="status-indicator status-ok" />
                    <strong>Status: {health.status}</strong>
                  </div>
                  <div>Service: {health.service} v{health.version}</div>
                  <div>Database: {health.database?.status ?? 'Not connected'}</div>
                  <div>Uptime: {Math.floor(health.uptime)}s</div>
                </div>
              )}
            </div>
            <button className="btn" onClick={checkHealth} disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Testing...' : 'Recheck /api/health'}
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <span>📦</span>
              <h3>Shared Contracts</h3>
            </div>
            <p><code>@cloud-ide/shared</code> Package</p>
            <ul>
              <li>Typed DTOs for Workspaces & Files</li>
              <li>REST API request / response contracts</li>
              <li>WebSocket message payloads</li>
              <li>Runtime agnostic TypeScript types</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <span>🛡️</span>
              <h3>Sandboxed Execution Boundary</h3>
            </div>
            <p><code>services/execution</code></p>
            <ul>
              <li>Decoupled from initial setup per architecture</li>
              <li>Docker Engine API runtime integration</li>
              <li>node-pty pseudo-terminal allocation</li>
              <li>cgroups v2, seccomp & namespace isolation</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
