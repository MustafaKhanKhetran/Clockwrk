import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

export function AnimatedNumber({ value, prefix = '', suffix = '', className = '' }) {
  const numericValue = Number(value) || 0;
  const previous = useRef(numericValue);
  const frame = useRef();
  const [display, setDisplay] = useState(numericValue);

  useEffect(() => {
    const from = previous.current;
    previous.current = numericValue;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === numericValue) {
      setDisplay(numericValue);
      return undefined;
    }

    const started = performance.now();
    const duration = 620;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(from + (numericValue - from) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [numericValue]);

  return <span className={`v3-animated-number ${className}`}>{prefix}{Math.round(display).toLocaleString()}{suffix}</span>;
}

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

/**
 * A project's visual anchor, used everywhere a project is referenced.
 * Prefers an uploaded logo, then the project's emoji (chosen by the client or
 * derived from its type by the API), and only falls back to initials for
 * projects created before icons existed.
 */
export function ProjectCode({ project, size = 'md' }) {
  if (project?.logoUrl) {
    return <img className={`v3-project-code is-logo is-${size}`} src={project.logoUrl} alt="" />;
  }
  if (project?.icon) {
    return <span className={`v3-project-code is-emoji is-${size}`} aria-hidden="true">{project.icon}</span>;
  }
  return <span className={`v3-project-code is-${size}`}>{project?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'CW'}</span>;
}

const fileIcons = {
  pdf: 'filePdf', figma: 'figma', zip: 'archive', html: 'browser', code: 'code',
  svg: 'vector', icon: 'vector', video: 'video', img: 'image', png: 'image',
};

export function FileMark({ kind = 'file', size = 'md' }) {
  return <span className={`v3-file-mark is-${kind} is-${size}`} aria-hidden="true"><Icon name={fileIcons[kind] || 'file'} size={size === 'sm' ? 18 : 22} /></span>;
}

export function Meter({ value, label }) {
  return <span className="v3-meter" aria-label={label || `${value}% complete`}><span><i style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} /></span><strong>{value}%</strong></span>;
}

export function PageIntro({ index, title, copy, action }) {
  return <header className="v3-page-intro"><span>{index}</span><div><h1>{title}</h1><p>{copy}</p></div>{action}</header>;
}
