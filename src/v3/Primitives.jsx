import Icon from './Icon';

export function Action({ children, icon = 'arrow', tone = 'dark', className = '', ...props }) {
  return <button className={`v3-action is-${tone} ${className}`} {...props}><span>{children}</span><i><Icon name={icon} size={16} /></i></button>;
}

export function Avatar({ name, online = false, size = 'md' }) {
  const initials = (name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('');
  return <span className={`v3-avatar is-${size}`}>{initials}{online && <i />}</span>;
}

export function Status({ status, children }) {
  const labels = { active: 'Building', review: 'Needs review', queued: 'Queued', done: 'Delivered', paused: 'Paused', paid: 'Paid' };
  return <span className={`v3-status is-${status}`}><i />{children || labels[status] || status}</span>;
}

export function ProjectCode({ project }) {
  return <span className="v3-project-code">{project?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'CW'}</span>;
}

export function Meter({ value, label }) {
  return <span className="v3-meter" aria-label={label || `${value}% complete`}><span><i style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} /></span><strong>{value}%</strong></span>;
}

export function PageIntro({ index, title, copy, action }) {
  return <header className="v3-page-intro"><span>{index}</span><div><h1>{title}</h1><p>{copy}</p></div>{action}</header>;
}
