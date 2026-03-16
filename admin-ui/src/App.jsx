import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Settings from './pages/Settings';

export default function App() {
  const location = useLocation();

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🦕</div>
            <div>
              <div className="sidebar-logo-text">DinoBot</div>
              <div className="sidebar-logo-sub">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/conversations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon">💬</span>
            Conversations
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon">⚙️</span>
            Settings
          </NavLink>
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <span className="status-dot online"></span>
            Bot Active
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
