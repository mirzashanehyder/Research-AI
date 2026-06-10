import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Search, Wrench,
  Upload, FileText, Home, BookOpen, LogOut,
  Menu, X, UserCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { logout } from '../utils/auth';
import { apiGetMe } from '../utils/api';

const links = [
  { to: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/search',    label: 'Search Papers', icon: Search },
  { to: '/tools',     label: 'AI Tools',      icon: Wrench },
  { to: '/upload',    label: 'Upload PDF',    icon: Upload },
  { to: '/docs',      label: 'Doc Space',     icon: FileText },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiGetMe().then(r => r.data),
    staleTime: 60_000,
  });

  const activeClass = 'bg-violet-600 text-white';
  const idleClass   = 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';
  const navClass    = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'} ` +
    (isActive ? activeClass : idleClass);

  /* ── shared inner content ─────────────────────────────── */
  const Inner = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">

      {/* Brand row */}
      <div className={`flex items-center border-b border-slate-200 dark:border-slate-700 py-4 ${collapsed && !mobile ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="text-violet-600 shrink-0" size={22} />
          {(!collapsed || mobile) && (
            <span className="font-bold text-slate-800 dark:text-white text-base truncate">
              ResearchHub <span className="text-violet-500">AI</span>
            </span>
          )}
        </div>
        {/* Desktop collapse toggle */}
        {!mobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
        {/* Mobile close */}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 overflow-y-auto space-y-1 ${collapsed && !mobile ? 'px-2' : 'px-3'}`}>
        <NavLink to="/" className={navClass} end>
          {({ isActive }) => (
            <>
              <Home size={16} className="shrink-0" />
              {(!collapsed || mobile) && <span>Home</span>}
              {collapsed && !mobile && isActive && <span className="sr-only">Home</span>}
            </>
          )}
        </NavLink>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navClass}
            title={collapsed && !mobile ? label : undefined}>
            {() => (
              <>
                <Icon size={16} className="shrink-0" />
                {(!collapsed || mobile) && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`py-4 border-t border-slate-200 dark:border-slate-700 space-y-1 ${collapsed && !mobile ? 'px-2' : 'px-3'}`}>
        {me && (
          <NavLink to="/profile" className={navClass}
            title={collapsed && !mobile ? me.name : undefined}>
            {() => (
              <>
                <UserCircle size={16} className="shrink-0" />
                {(!collapsed || mobile) && <span className="truncate">{me.name}</span>}
              </>
            )}
          </NavLink>
        )}

        {/* Dark mode toggle: icon-only when collapsed */}
        {(!collapsed || mobile) ? (
          <DarkModeToggle />
        ) : (
          <div className="flex justify-center py-1">
            <DarkModeToggle iconOnly />
          </div>
        )}

        <button
          onClick={() => logout()}
          className={`flex items-center gap-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full ${collapsed && !mobile ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}`}
          title={collapsed && !mobile ? 'Sign out' : undefined}
        >
          <LogOut size={16} className="shrink-0" />
          {(!collapsed || mobile) && 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700"
        onClick={() => setMobileOpen(o => !o)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full w-60 z-50 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Inner mobile />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-200 overflow-hidden ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <Inner />
      </aside>
    </>
  );
}
