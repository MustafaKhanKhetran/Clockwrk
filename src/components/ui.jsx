/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';

/* ---------- inline icon set (stroke style, lucide-like) ---------- */
const P = (d) => <path d={d} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />;
export const Icon = {
  home: () => <svg viewBox="0 0 24 24">{P('M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5')}</svg>,
  bolt: () => <svg viewBox="0 0 24 24">{P('M13 2 4 14h6l-1 8 9-12h-6l1-8Z')}</svg>,
  folder: () => <svg viewBox="0 0 24 24">{P('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z')}</svg>,
  layers: () => <svg viewBox="0 0 24 24">{P('m12 3 9 5-9 5-9-5 9-5Z')}{P('m3 13 9 5 9-5')}</svg>,
  card: () => <svg viewBox="0 0 24 24">{P('M3 6h18v12H3zM3 10h18')}</svg>,
  chat: () => <svg viewBox="0 0 24 24">{P('M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z')}</svg>,
  help: () => <svg viewBox="0 0 24 24">{P('M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z')}{P('M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7')}{P('M12 17h.01')}</svg>,
  lock: () => <svg viewBox="0 0 24 24">{P('M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3')}</svg>,
  gear: () => <svg viewBox="0 0 24 24">{P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z')}{P('M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5A7 7 0 0 0 19 12Z')}</svg>,
  plus: () => <svg viewBox="0 0 24 24">{P('M12 5v14M5 12h14')}</svg>,
  x: () => <svg viewBox="0 0 24 24">{P('M6 6l12 12M18 6 6 18')}</svg>,
  sun: () => <svg viewBox="0 0 24 24">{P('M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z')}{P('M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4')}</svg>,
  moon: () => <svg viewBox="0 0 24 24">{P('M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z')}</svg>,
  menu: () => <svg viewBox="0 0 24 24">{P('M4 7h16M4 12h16M4 17h16')}</svg>,
  arrow: () => <svg viewBox="0 0 24 24">{P('M5 12h14m-6-6 6 6-6 6')}</svg>,
  download: () => <svg viewBox="0 0 24 24">{P('M12 3v12m-5-5 5 5 5-5M4 21h16')}</svg>,
  check: () => <svg viewBox="0 0 24 24">{P('m4.5 12.5 5 5 10-11')}</svg>,
  grip: () => <svg viewBox="0 0 24 24">{P('M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01')}</svg>,
  pen: () => <svg viewBox="0 0 24 24">{P('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z')}</svg>,
  cube: () => <svg viewBox="0 0 24 24">{P('M21 8 12 3 3 8v8l9 5 9-5V8Z')}{P('M3 8l9 5 9-5M12 13v8')}</svg>,
  mega: () => <svg viewBox="0 0 24 24">{P('M3 11v3l14 4V6L3 11Z')}{P('M17 6a4 4 0 0 1 0 12M7 15v4h3')}</svg>,
  spark: () => <svg viewBox="0 0 24 24">{P('M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8')}</svg>,
  cal: () => <svg viewBox="0 0 24 24">{P('M4 6h16v15H4zM4 10h16M8 3v4M16 3v4')}</svg>,
  mic: () => <svg viewBox="0 0 24 24">{P('M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z')}{P('M18 11a6 6 0 0 1-12 0M12 17v4')}</svg>,
  clip: () => <svg viewBox="0 0 24 24">{P('m20 10-8.5 8.5a5 5 0 0 1-7-7L13 3a3.3 3.3 0 0 1 4.7 4.7L9.5 16a1.7 1.7 0 0 1-2.4-2.4L15 6')}</svg>,
  video: () => <svg viewBox="0 0 24 24">{P('M3 7h12v10H3zM15 10l6-3v10l-6-3')}</svg>,
  invoice: () => <svg viewBox="0 0 24 24">{P('M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6')}</svg>,
  eye: () => <svg viewBox="0 0 24 24">{P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z')}{P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z')}</svg>,
  clock: () => <svg viewBox="0 0 24 24">{P('M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z')}{P('M12 7v5l3 2')}</svg>,
};

export function SiteCta({ children, icon = <Icon.arrow />, className = '', ...props }) {
  return (
    <button className={`site-cta ${className}`} {...props}>
      <span className="site-cta-text">{children}</span>
      <span className="site-cta-icon">{icon}</span>
    </button>
  );
}

/* Category icon chips — replaces emoji for a cleaner look */
export const CAT_ICON = {
  Development: Icon.bolt,
  Design: Icon.pen,
  Branding: Icon.spark,
  Presence: Icon.mega,
  'Outdoor & Print': Icon.cube,
};

/* Dashboard-style team pill: avatar stack (max 3, then +N) + label + count */
export function TeamPill({ label, members }) {
  const shown = members.slice(0, 3);
  const extra = members.length - shown.length;
  return (
    <span className="team-pill">
      <span className="tp-stack">
        {shown.map((m, i) => <Avatar key={i} name={m.name} size={30} />)}
        {extra > 0 && <span className="tp-more">+{extra}</span>}
      </span>
      <span className="tp-label">{label}</span>
      <span className="tp-count">{members.length}</span>
    </span>
  );
}

export function CatChip({ category, size = 40 }) {
  const Ic = CAT_ICON[category] || Icon.bolt;
  return (
    <span className="svc-icon" style={{ width: size, height: size }}>
      <span style={{ width: size * 0.45, height: size * 0.45, display: 'grid', color: 'var(--ink)' }}><Ic /></span>
    </span>
  );
}

export function Pill({ tone = 'soft', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export const STATUS_PILL = {
  active: ['lime', 'In progress'],
  review: ['ink', 'In review'],
  queued: ['soft', 'Queued'],
  done: ['soft', 'Completed'],
  paused: ['amber', 'Paused'],
  open: ['blue', 'Open'],
  resolved: ['soft', 'Resolved'],
  paid: ['lime', 'Paid'],
};

export function StatusPill({ status }) {
  const [tone, label] = STATUS_PILL[status] || ['soft', status];
  return <Pill tone={tone}>{label}</Pill>;
}

export function Avatar({ name, size = 34, online }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <span style={{
      position: 'relative', display: 'inline-grid', placeItems: 'center',
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#ffffff', color: '#0a0a0b',
      border: '1px solid var(--line)',
      fontSize: size * 0.34, fontWeight: 700, letterSpacing: '-0.02em',
    }}>
      {initials}
      {online && <span title="Online" aria-label="Online" style={{ position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: '50%', background: 'var(--lime)', border: '2px solid var(--card)' }} />}
    </span>
  );
}

export function ProgressRing({ value, size = 54, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg className="progress-ring" width={size} height={size} style={{ '--ring-c': c }}>
      <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      <circle className="fill" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} />
      <text x="50%" y="52%" transform={`rotate(90 ${size / 2} ${size / 2})`} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: 'var(--ink)', fontSize: size * 0.24, fontWeight: 700 }}>{value}%</text>
    </svg>
  );
}

export function CountUp({ to, prefix = '', suffix = '', duration = 900 }) {
  const [v, setV] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [to, duration]);
  return <>{prefix}{v.toLocaleString()}{suffix}</>;
}

export function EmptyState({ emoji = '✨', title, sub, action }) {
  return (
    <div className="empty-state anim-fade">
      <span className="big">{emoji}</span>
      <strong style={{ color: 'var(--ink)', fontSize: 16 }}>{title}</strong>
      {sub && <p style={{ fontSize: 13.5, maxWidth: 340 }}>{sub}</p>}
      {action}
    </div>
  );
}

export function Confetti({ trigger }) {
  if (!trigger) return null;
  const bits = Array.from({ length: 14 });
  const colors = ['#a0e92a', '#0a0a0b', '#f4d35e', '#1ec38b'];
  return (
    <span style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {bits.map((_, i) => (
        <span key={i} className="confetti-bit" style={{
          left: `${8 + (i * 6.5)}%`, top: '40%',
          background: colors[i % 4],
          animationDelay: `${(i % 5) * 0.05}s`,
        }} />
      ))}
    </span>
  );
}

export function useStagger(count, base = 0.05) {
  return (i) => ({ animationDelay: `${i * base}s` });
}
