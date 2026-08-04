import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { me, projects } from '../mocks';
import { useStore } from '../store';
import Icon from './Icon';
import { Avatar } from './Primitives';

const links = [
  ['Home', '/home', 'home'],
  ['Requests', '/requests', 'requests'],
  ['Projects', '/projects', 'projects'],
  ['Deliverables', '/deliverables', 'files'],
  ['Messages', '/messages', 'messages'],
];
const utility = [
  ['Billing', '/billing', 'billing'],
  ['My site', '/site', 'site'],
  ['Help', '/support', 'help'],
  ['Settings', '/settings', 'settings'],
];
const allLinks = [...links, ...utility];

export default function Shell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { requests, accountMode, hoursRemaining, hoursAllowance, baseSlots, extraSlots, notifications } = useStore();
  const [theme, setTheme] = useState(() => localStorage.getItem('portal_theme') || 'light');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const active = requests.filter((item) => item.status === 'active');
  const reviews = requests.filter((item) => item.status === 'review');
  const queued = requests.filter((item) => item.status === 'queued');
  const current = allLinks.find(([, path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[0] || 'Workspace';

  useEffect(() => {
    document.documentElement.dataset.v3Theme = theme;
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    setCreateOpen(false);
    setAccountOpen(false);
    setAlertsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handle = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = [
      ...allLinks.map(([label, to, icon]) => ({ id: `nav-${to}`, label, meta: 'Page', to, icon })),
      ...projects.map((project) => ({ id: `project-${project.id}`, label: project.name, meta: 'Project', to: `/projects/${project.id}`, icon: 'projects' })),
      ...requests.map((request) => ({ id: `request-${request.id}`, label: request.title, meta: 'Request', to: `/requests/${request.id}`, icon: 'requests' })),
    ];
    return (query ? items.filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)) : items).slice(0, 9);
  }, [requests, search]);

  const jump = (to) => {
    navigate(to);
    setSearchOpen(false);
    setSearch('');
  };

  return (
    <div className="v3-shell">
      <a href="#v3-content" className="v3-skip">Skip to content</a>
      <header className="v3-nav">
        <button className="v3-wordmark" onClick={() => navigate('/home')} aria-label="Clockwrk home"><i><Icon name="requests" size={19} /></i><strong>clockwrk</strong></button>
        <nav aria-label="Main navigation">
          {links.map(([label, to]) => <NavLink key={to} to={to}>{({ isActive }) => <>{isActive && <i />}{label}</>}</NavLink>)}
        </nav>
        <div className="v3-nav-tools">
          <button className="v3-search-trigger" onClick={() => setSearchOpen(true)}><Icon name="search" size={16} /><span>Find</span><kbd>⌘K</kbd></button>
          <button className="v3-icon-button" onClick={() => setAlertsOpen(!alertsOpen)} aria-label="Notifications"><Icon name="bell" size={18} />{notifications.some((item) => item.unread) && <i />}</button>
          <button className="v3-icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Change theme"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} /></button>
          <div className="v3-create-wrap">
            <button className="v3-create" onClick={() => setCreateOpen(!createOpen)}><span>Create</span><Icon name="plus" size={18} /></button>
            {createOpen && <div className="v3-create-menu"><button onClick={() => navigate('/requests/new')}><Icon name="requests" />New request<small>Send work to the team</small></button><button onClick={() => navigate('/projects/new')}><Icon name="projects" />New project<small>Open a fresh workspace</small></button></div>}
          </div>
          <button className="v3-account" onClick={() => setAccountOpen(!accountOpen)} aria-label="Account menu"><Avatar name={me.name} size="sm" /></button>
        </div>
        {alertsOpen && <aside className="v3-popover v3-alerts"><header><strong>Updates</strong><button onClick={() => setAlertsOpen(false)}><Icon name="close" size={15} /></button></header>{notifications.map((item) => <button key={item.id} onClick={() => navigate('/requests')}><i className={item.unread ? 'is-new' : ''} /><span>{item.text}<small>Open workspace</small></span></button>)}</aside>}
        {accountOpen && <aside className="v3-popover v3-account-menu"><div><Avatar name={me.name} /><span><strong>{me.name}</strong><small>{me.company}</small></span></div><button className="v3-mobile-menu-only" onClick={() => navigate('/messages')}><Icon name="messages" size={16} />Messages<Icon name="arrow" size={14} /></button>{utility.map(([label, to, icon]) => <button key={to} onClick={() => navigate(to)}><Icon name={icon} size={16} />{label}<Icon name="arrow" size={14} /></button>)}</aside>}
      </header>

      <div className="v3-live-rail" aria-label="Workspace status">
        <span><i className="is-live" />Team online</span>
        <span><strong>{active.length}</strong> building now</span>
        <span className={reviews.length ? 'is-attention' : ''}><strong>{reviews.length}</strong> awaiting approval</span>
        <span><strong>{queued.length}</strong> in queue</span>
        <span>{accountMode === 'retainer' ? <><strong>{hoursRemaining}</strong> of {hoursAllowance} hours left</> : <><strong>{active.length}</strong> of {baseSlots + extraSlots} slots used</>}</span>
        <span className="v3-live-route">{current}</span>
      </div>

      <main id="v3-content" key={location.pathname}>{children}</main>

      <nav className="v3-mobile-nav" aria-label="Mobile navigation">
        {links.slice(0, 4).map(([label, to, icon]) => <NavLink key={to} to={to} aria-label={label}><Icon name={icon} size={20} /><span>{label}</span></NavLink>)}
        <button onClick={() => setCreateOpen(!createOpen)} aria-label="Create"><Icon name="plus" size={20} /><span>Create</span></button>
        <button onClick={() => setAccountOpen(!accountOpen)} aria-label="More"><Icon name="settings" size={20} /><span>More</span></button>
      </nav>

      {searchOpen && <div className="v3-search-layer" onMouseDown={() => setSearchOpen(false)}><section onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search workspace"><header><Icon name="search" size={22} /><input autoFocus aria-label="Search workspace" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests, projects, pages…" /><button onClick={() => setSearchOpen(false)}>Esc</button></header><div><span>{search ? 'Results' : 'Go somewhere'}</span>{results.map((item) => <button key={item.id} onClick={() => jump(item.to)}><i><Icon name={item.icon} size={17} /></i><strong>{item.label}</strong><small>{item.meta}</small><Icon name="arrow" size={15} /></button>)}</div></section></div>}
    </div>
  );
}
