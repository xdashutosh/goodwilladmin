import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Tag,
  Package,
  Mail,
  Settings as SettingsIcon,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/sections', label: 'Sections', icon: Layers },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/enquiries', label: 'Enquiries', icon: Mail },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 860;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Close the drawer after navigating on mobile
  const closeOnMobile = () => { if (isMobile()) setSidebarOpen(false); };

  const currentTitle =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/'))?.label ||
    (location.pathname.startsWith('/products') ? 'Products' : 'Dashboard');

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/brand/plan-a-day.png" alt="Plan.A.Day" className="sidebar-logo" />
          <div className="brand-sub">Goodwill Printers · Admin</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeOnMobile}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="nav-item logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className={`main-area ${sidebarOpen ? '' : 'expanded'}`}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="hamburger" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle sidebar" title="Toggle sidebar">
              <Menu size={22} />
            </button>
            <span className="page-title">{currentTitle}</span>
          </div>
          <div className="user-chip">
            <span>{user?.name || user?.email || 'Admin'}</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
