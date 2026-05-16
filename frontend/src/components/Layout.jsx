import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sun, Moon } from 'lucide-react';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex items-center justify-end px-6 py-2.5 border-b"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <button
            onClick={toggle}
            className="btn-icon"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-3)',
            color: 'var(--text-1)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#3dba6f', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
};

export default Layout;
