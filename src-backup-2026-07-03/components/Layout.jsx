import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Badge from './Badge';

const nav = [
  ['Dashboard', '/dashboard', 'M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z'],
  ['Projects', '/projects', 'M4 7h16M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'],
  ['Invoices', '/invoices', 'M7 3h10a2 2 0 0 1 2 2v16l-3-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2Zm2 6h6m-6 4h6'],
  ['Support', '/support', 'M4 13a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-3v-6h5M4 13v7h3v-6H4'],
  ['Files', '/files', 'M6 3h8l4 4v14H6V3Zm8 0v5h5'],
  ['Messages', '/messages', 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z'],
  ['Settings', '/settings', 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6v.1H10v-.1a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4v-4h.1a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4h4v.1a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1h.1v4h-.1a1.7 1.7 0 0 0-.6 1Z'],
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = nav.find((item) => item[1] === location.pathname)?.[0] || 'Client Portal';
  const company = user?.company || user?.company_name || 'Your company';
  const name = user?.name || user?.full_name || 'Client';
  const plan = user?.plan?.name || user?.plan_name || user?.plan || 'Client';

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-30 flex min-h-screen w-60 flex-col bg-primary px-4 py-6">
        <div className="px-3">
          <div className="text-xl font-bold text-white">Clockwrk</div>
          <div className="mt-0.5 text-xs text-text-muted">Client Portal</div>
        </div>
        <nav className="mt-8 flex-1 space-y-1">
          {nav.map(([label, href, path]) => (
            <NavLink key={href} to={href} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={path} /></svg>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 pt-5">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <div className="mt-1.5"><Badge variant="accent">{plan}</Badge></div>
          <button onClick={logout} className="mt-4 flex w-full items-center gap-2 text-sm text-white/60 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth="2" d="M10 17l5-5-5-5m5 5H3m11-9h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></svg>
            Log out
          </button>
        </div>
      </aside>
      <div className="ml-60 min-h-screen">
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-8">
          <h1 className="text-lg font-semibold text-primary">{title}</h1>
          <p className="text-sm font-medium text-text-secondary">{company}</p>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
