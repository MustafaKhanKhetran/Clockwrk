import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Icon, Avatar } from './ui';
import { me } from '../mocks';
import { useStore } from '../store';

const NAV = [
  ['Home', '/home', Icon.home],
  ['Requests', '/requests', Icon.bolt],
  ['Projects', '/projects', Icon.layers],
  ['Deliverables', '/files', Icon.folder],
  ['Billing', '/billing', Icon.card],
  ['Messages', '/messages', Icon.chat],
  ['Help', '/support', Icon.help],
];

export default function Layout({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('portal_theme') || 'light');
  const navigate = useNavigate();
  const { requests, baseSlots, extraSlots, paused, plan } = useStore();
  const totalSlots = baseSlots + extraSlots;
  const activeCount = requests.filter((r) => r.status === 'active').length;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  return (
    <div className="portal">
      <aside className="rail">
        <Link to="/home" className="rail-logo" aria-label="Clockwrk home">
          <span className="rail-logo-mark"><span style={{ width: 22, height: 22, display: 'grid' }}><Icon.bolt /></span></span>
        </Link>

        <nav className="rail-nav">
          {NAV.map(([label, to, Ic]) => (
            <NavLink key={to} to={to} data-label={label}
              className={({ isActive }) => `rail-ico ${isActive ? 'is-active' : ''}`}>
              <Ic />
            </NavLink>
          ))}
        </nav>

        <div className="rail-foot">
          <NavLink to="/settings" data-label="Settings"
            className={({ isActive }) => `rail-ico ${isActive ? 'is-active' : ''}`}>
            <Icon.gear />
          </NavLink>
          <Link to="/settings" className="rail-avatar" data-label={me.name} aria-label="Account">
            <Avatar name={me.name} size={38} />
          </Link>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="slot-meter">
              <span className="dots">
                {Array.from({ length: totalSlots }).map((_, i) => (
                  <span key={i} className={`slot-dot ${i < activeCount && !paused ? 'is-filled' : ''}`} />
                ))}
              </span>
              {paused ? 'Subscription paused' : `${activeCount}/${totalSlots} slots in use`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
              <span style={{ width: 17, height: 17, display: 'grid' }}>{theme === 'light' ? <Icon.moon /> : <Icon.sun />}</span>
            </button>
            <button className="cta" onClick={() => navigate('/requests/new')}>
              New request
              <span className="cta-ico"><span style={{ width: 15, height: 15, display: 'grid' }}><Icon.plus /></span></span>
            </button>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
