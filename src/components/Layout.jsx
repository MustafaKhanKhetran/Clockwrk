import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Avatar, SiteCta } from './ui';
import { me, RETAINER_EXTRA_HOURS } from '../mocks';
import { useStore } from '../store';
import { store } from '../store';
import InstallPrompt from './InstallPrompt';

const NAV = [
  ['Home', '/home', Icon.home],
  ['Requests', '/requests', Icon.bolt],
  ['Projects', '/projects', Icon.layers],
  ['Deliverables', '/deliverables', Icon.folder],
  ['Billing', '/billing', Icon.card],
  ['Messages', '/messages', Icon.chat],
  ['Help', '/support', Icon.help],
  ['My Site', '/site', Icon.cube],
];

export default function Layout({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('portal_theme') || 'light');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hoursPromptOpen, setHoursPromptOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    requests, baseSlots, extraSlots, paused, notifications, accountMode,
    hoursAllowance, hoursRemaining, hoursPct,
  } = useStore();
  const totalSlots = baseSlots + extraSlots;
  const activeCount = requests.filter((r) => r.status === 'active').length;
  const isRetainer = accountMode === 'retainer';
  const hoursLevel = hoursRemaining <= 0 ? 'is-red' : hoursPct >= 0.8 ? 'is-amber' : '';
  const hourText = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const currentNav = NAV.find(([, to]) => location.pathname === to || location.pathname.startsWith(`${to}/`));
  const currentLabel = currentNav?.[0] || (location.pathname.startsWith('/settings') ? 'Settings' : 'Workspace');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  return (
    <div className="portal">
      <aside className="rail">
        <Link to="/home" className="rail-logo" aria-label="Clockwrk home">
          <span className="rail-logo-mark"><span style={{ width: 22, height: 22, display: 'grid' }}><Icon.bolt /></span></span>
          <span className="rail-brand"><strong>clockwrk</strong><small>Client portal</small></span>
        </Link>

        <span className="rail-section-label">Workspace</span>
        <nav className="rail-nav">
          {NAV.map(([label, to, Ic]) => (
            <NavLink key={to} to={to} data-label={label}
              className={({ isActive }) => `rail-ico ${isActive ? 'is-active' : ''}`}>
              <span><Ic /></span><strong>{label}</strong>
            </NavLink>
          ))}
          <button className="rail-ico rail-more" onClick={() => setMoreOpen(true)} aria-label="More sections">
            <span><Icon.menu /></span><strong>More</strong>
          </button>
        </nav>

        <div className="rail-foot">
          <NavLink to="/settings" data-label="Settings"
            className={({ isActive }) => `rail-ico ${isActive ? 'is-active' : ''}`}>
            <span><Icon.gear /></span><strong>Settings</strong>
          </NavLink>
          <Link to="/settings" className="rail-account" aria-label="Account">
            <Avatar name={me.name} size={38} />
            <span><strong>{me.name}</strong><small>{me.company}</small></span>
            <Icon.arrow />
          </Link>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-label">{currentLabel}</span>
            {isRetainer ? (
              <div className="retainer-meter-wrap">
                <button
                  className={`slot-meter is-retainer ${hoursLevel}`}
                  onClick={() => hoursRemaining <= 0 && setHoursPromptOpen(!hoursPromptOpen)}
                  aria-label={hoursRemaining <= 0 ? 'Buy more care hours' : 'Care hours remaining'}
                >
                  <span className="hours-track"><i style={{ width: `${hoursPct * 100}%` }} /></span>
                  {hoursRemaining <= 0
                    ? '0 hours left · Buy more'
                    : `${hourText(hoursRemaining)} of ${hourText(hoursAllowance)} hours left`}
                </button>
                {hoursPromptOpen && hoursRemaining <= 0 && (
                  <div className="retainer-hours-popover">
                    <strong>You are out of care hours</strong>
                    <p>Buy {RETAINER_EXTRA_HOURS.block.hours} more hours for ${RETAINER_EXTRA_HOURS.block.price.toLocaleString()} and keep requests moving this month.</p>
                    <button onClick={() => { store.buyHourBlock(); setHoursPromptOpen(false); }}>
                      Buy {RETAINER_EXTRA_HOURS.block.hours} hours <Icon.arrow />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`slot-meter ${paused ? 'is-paused' : ''}`}>
                <span className="dots">
                  {Array.from({ length: totalSlots }).map((_, i) => (
                    <span key={i} title={i < activeCount && !paused ? 'Slot in use' : 'Slot available'} className={`slot-dot ${i < activeCount && !paused ? 'is-filled' : ''}`} />
                  ))}
                </span>
                {paused ? 'Subscription paused' : `${activeCount}/${totalSlots} slots in use`}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="notification-wrap">
              <button className="theme-toggle notification-button" onClick={() => { setNotificationsOpen(!notificationsOpen); if (!notificationsOpen) store.markNotificationsRead(); }} aria-label="Notifications">
                <span style={{ width: 17, height: 17, display: 'grid' }}><Icon.invoice /></span>
                {notifications.some((item) => item.unread) && <i>{notifications.filter((item) => item.unread).length}</i>}
              </button>
              {notificationsOpen && <div className="notification-popover"><strong>Notifications</strong>{notifications.map((item) => <span key={item.id}>{item.text}</span>)}</div>}
            </div>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
              <span style={{ width: 17, height: 17, display: 'grid' }}>{theme === 'light' ? <Icon.moon /> : <Icon.sun />}</span>
            </button>
            <SiteCta className="site-cta-compact topbar-site-cta" icon={<Icon.plus />} onClick={() => navigate('/projects/new')}>
              New project
            </SiteCta>
          </div>
        </header>
        <main key={location.pathname} className="main portal-route">{children}</main>
        <InstallPrompt />
        {moreOpen && (
          <div className="mobile-more-backdrop" onClick={() => setMoreOpen(false)}>
            <section className="mobile-more-sheet anim-rise" onClick={(event) => event.stopPropagation()}>
              <div><strong>More</strong><button onClick={() => setMoreOpen(false)} aria-label="Close more menu"><Icon.x /></button></div>
              {NAV.slice(5).map(([label, to, Ic]) => (
                <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}>
                  <span><Ic /></span><strong>{label}</strong><Icon.arrow />
                </NavLink>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
