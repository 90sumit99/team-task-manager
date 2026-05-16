import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, Zap, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Badges';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects',  label: 'Projects',  icon: FolderKanban },
];

const SidebarContent = ({ onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}>
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>TaskFlow</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto btn-icon">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="section-title px-3 mb-2 mt-1">Menu</p>
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1"
          style={{ background: 'var(--surface-3)' }}>
          <Avatar name={user?.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{user?.name}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="sidebar-link w-full text-red-400 hover:text-red-300 mt-1"
          style={{ '--hover-bg': 'rgba(239,68,68,0.08)' }}
        >
          <LogOut size={15} />
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0 h-screen sticky top-0 border-r"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile: hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 btn-secondary p-2 shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-in drawer */}
      {mobileOpen && (
        <aside className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[240px] border-r animate-slide-in-l"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </aside>
      )}
    </>
  );
};

export default Sidebar;
