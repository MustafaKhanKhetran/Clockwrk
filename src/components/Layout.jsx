import { useEffect, useMemo, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Avatar, SiteCta } from './ui';
import { me, projects, RETAINER_EXTRA_HOURS } from '../mocks';
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

const PRIMARY_NAV = NAV.slice(0, 5);
const SECONDARY_NAV = NAV.slice(5);

export default function Layout({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('portal_theme') || 'light');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hoursPromptOpen, setHoursPromptOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [railCompact, setRailCompact] = useState(() => localStorage.getItem('portal_rail_compact') === 'true');
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
  const commandResults = useMemo(() => {
    const needle = commandQuery.trim().toLowerCase();
    const entries = [
      ...NAV.map(([label, to, Ic]) => ({ id: `page-${to}`, label, sub: 'Page', to, Ic })),
      ...projects.map((project) => ({ id: `project-${project.id}`, label: project.name, sub: 'Project', to: `/projects/${project.id}`, Ic: Icon.layers })),
      ...requests.map((request) => ({ id: `request-${request.id}`, label: request.title, sub: 'Request', to: `/requests/${request.id}`, Ic: Icon.bolt })),
    ];
    return (needle ? entries.filter((item) => `${item.label} ${item.sub}`.toLowerCase().includes(needle)) : entries).slice(0, 8);
  }, [commandQuery, requests]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('portal_rail_compact', String(railCompact));
  }, [railCompact]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goTo = (to) => {
    navigate(to);
    setCommandOpen(false);
    setCommandQuery('');
  };

  const renderNavLink = ([label, to, Ic]) => (
    <NavLink key={to} to={to} data-label={label}
      className={({ isActive }) => `rail-ico ${isActive ? 'is-active' : ''}`}>
      <span><Ic /></span><strong>{label}</strong><i className="rail-active-dot" />
    </NavLink>
  );

  return (
    <div className={`portal portal-v2 ${railCompact ? 'rail-is-compact' : ''}`}>
      <aside className="rail">
        <div className="rail-head">
          <Link to="/home" className="rail-logo" aria-label="Clockwrk home">
            <span className="rail-logo-mark"><span><Icon.bolt /></span></span>
            <span className="rail-brand"><strong>clockwrk</strong><small>Client workspace</small></span>
          </Link>
          <button className="rail-collapse" onClick={() => setRailCompact((value) => !value)} aria-label={railCompact ? 'Expand navigation' : 'Collapse navigation'}>
            <Icon.arrow />
          </button>
        </div>

        <button className="rail-command" onClick={() => setCommandOpen(true)}>
          <span><Icon.eye /></span><strong>Find anything</strong><kbd>⌘K</kbd>
        </button>

        <nav className="rail-nav" aria-label="Workspace navigation">
          <span className="rail-section-label">Workspace</span>
          {PRIMARY_NAV.map(renderNavLink)}
          <span className="rail-section-label rail-section-secondary">Manage</span>
          {SECONDARY_NAV.map(renderNavLink)}
          <button className="rail-ico rail-more" onClick={() => setMoreOpen(true)} aria-label="More sections">
            <span><Icon.menu /></span><strong>More</strong>
          </button>
        </nav>

        <div className="rail-foot">
          <NavLink to="/settings" data-label="Settings"
            className={({ isActive }) => `rail-ico ${isActive ? 'is-active' : ''}`}>
            <span><Icon.gear /></span><strong>Settings</strong><i className="rail-active-dot" />
          </NavLink>
          <Link to="/settings" className="rail-account" aria-label="Account">
            <Avatar name={me.name} size={38} />
            <span><strong>{me.name}</strong><small>{me.company}</small></span>
            <Icon.arrow />
          </Link>
        </div>
      </aside>

      <div className="portal-stage">
        <header className="topbar">
          <div className="topbar-context">
            <div className="topbar-route"><span>Clockwrk</span><i>/</i><strong>{currentLabel}</strong></div>
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
            <button className="topbar-search" onClick={() => setCommandOpen(true)}><Icon.eye /><span>Search</span><kbd>⌘K</kbd></button>
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
        {commandOpen && (
          <div className="command-veil" onMouseDown={() => setCommandOpen(false)}>
            <section className="command-panel" role="dialog" aria-modal="true" aria-label="Find anything" onMouseDown={(event) => event.stopPropagation()}>
              <label className="command-input">
                <Icon.eye />
                <input aria-label="Find a page, project, or request" autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Find a page, project, or request" />
                <kbd>Esc</kbd>
              </label>
              <div className="command-results">
                <span>{commandQuery ? 'Matches' : 'Jump to'}</span>
                {commandResults.length ? commandResults.map((item) => {
                  const Ic = item.Ic;
                  return <button key={item.id} onClick={() => goTo(item.to)}><i><Ic /></i><span><strong>{item.label}</strong><small>{item.sub}</small></span><Icon.arrow /></button>;
                }) : <p>No matches. Try a project or request name.</p>}
              </div>
              <footer><span><kbd>↵</kbd> Open</span><span><kbd>Esc</kbd> Close</span></footer>
            </section>
          </div>
        )}
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
