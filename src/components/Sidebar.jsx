import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from './RoleGuard';
import './Sidebar.css';

const NAV = [
  { group: null, items: [{ path: '/overview', label: 'Overview', icon: 'grid', roles: [] }] },
  { group: 'Launch', items: [
    { path: '/clients', label: 'Clients', icon: 'users', roles: ['client_access'] },
    { path: '/projects', label: 'Projects', icon: 'folder', roles: ['project_access'] },
    { path: '/requests', label: 'Requests', icon: 'check', roles: ['managers', 'delivery_heads'] },
    { path: '/files', label: 'Files', icon: 'folder', roles: ['allStaff'] },
    { path: '/bookings', label: 'Bookings', icon: 'calendar', roles: ['booking_access'] },
    { path: '/calendar', label: 'Calendar', icon: 'cal', roles: ['delivery', 'managers'] },
    { path: '/finance', label: 'Finance', icon: 'dollar', roles: ['finance_access'] },
    { path: '/referrals', label: 'Referrals', icon: 'share', roles: ['owner', 'finance', 'sales'] },
  ] },
  { group: 'People', items: [
    { path: '/team', label: 'Team', icon: 'team', roles: ['people_access'] },
    { path: '/jobs', label: 'HR & Careers', icon: 'hr', roles: ['hr_access'] },
    { path: '/my-work', label: 'My Work', icon: 'briefcase', roles: ['workers'] },
    { path: '/time', label: 'Time', icon: 'clock', roles: ['request_access'] },
  ] },
  { group: 'Ops', items: [
    { path: '/alerts', label: 'Alerts', icon: 'bell', roles: ['system_access'] },
    { path: '/settings', label: 'Settings', icon: 'settings', roles: ['owner'] },
    { path: '/coming-soon', label: 'Coming Soon', icon: 'zap', roles: [] },
  ] },
];

const icon = (body) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{body}</svg>;
const ICONS = {
  grid: icon(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>),
  users: icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  folder: icon(<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />),
  check: icon(<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  briefcase: icon(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>),
  clock: icon(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  calendar: icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  cal: icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="12" cy="16" r="1" fill="currentColor" /></>),
  trending: icon(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>),
  dollar: icon(<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
  share: icon(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>),
  team: icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>),
  bar: icon(<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  hr: icon(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  mail: icon(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>),
  chart: icon(<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  activity: icon(<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />),
  zap: icon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />),
  bell: icon(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  shield: icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  database: icon(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></>),
  settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06" /></>),
};

export default function Sidebar() {
  const { user, logout, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const handleLogout = () => {
    if (logout) logout();
    else if (signOut) signOut();
    navigate('/login');
  };
  const query = search.trim().toLowerCase();
  const visibleGroups = NAV
    .map(group => ({
      ...group,
      items: group.items.filter(item => (
        (item.roles.length === 0 || hasRole(user, item.roles))
        && (!query || item.label.toLowerCase().includes(query))
      )),
    }))
    .filter(group => group.items.length > 0);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CW';
  const formatRole = (role) => role ? role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/assets/favicon/apple-touch-icon.png" alt="Clockwrk" className="sidebar-logo-img" />
      </div>
      <label className="sidebar-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search navigation"
        />
      </label>
      <nav className="sidebar-nav">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className="sidebar-group">
            {group.group && <div className="sidebar-group-label">{group.group}</div>}
            {group.items.map(item => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}>
                <span className="sidebar-icon">{ICONS[item.icon]}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name?.split(' ')[0]}</span>
            <span className="sidebar-user-role">{formatRole(user?.role)}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Log out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>
    </aside>
  );
}
