import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './TopBar.css';

const PAGE_TITLES = {
  '/':           'Overview',
  '/overview':   'Overview',
  '/clients':    'Clients',
  '/projects':   'Projects',
  '/requests':   'Requests',
  '/my-work':    'My Work',
  '/time':       'Time',
  '/team':       'Team',
  '/finance':    'Finance',
  '/newsletter': 'Newsletter',
  '/bookings':   'Bookings',
  '/calendar':   'Calendar',
  '/pipeline':   'Pipeline',
  '/referrals':  'Referrals',
  '/workload':   'Workload',
  '/jobs':       'Jobs',
  '/reports':    'Reports',
  '/health':     'Website Health',
  '/workflows':  'Workflow Health',
  '/alerts':     'Alerts',
  '/messages':   'Messages',
  '/audit':      'Audit Logs',
  '/knowledge':  'Knowledge',
  '/settings':   'Settings',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const title = PAGE_TITLES[pathname] || 'Dashboard';
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
        <span className="topbar-date">{today}</span>
      </div>
      <div className="topbar-right">
        <button className="topbar-icon-btn" title="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button className="topbar-icon-btn" title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="topbar-notif-dot" />
        </button>
        <button
          className="topbar-theme-toggle"
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <span className="topbar-theme-track">
            <span className="topbar-theme-thumb">
              {theme === 'dark'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 7.7A8.5 8.5 0 1 1 12 3Z"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              }
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
