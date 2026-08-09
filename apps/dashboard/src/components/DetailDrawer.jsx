export default function DetailDrawer({ open, title, subtitle, onClose, children, actions }) {
  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="surface-heading">
            <span className="surface-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h16"/></svg>
            </span>
            <div>
              <h3>{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close details">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="drawer-body">
          {children}
          {actions && <div className="drawer-actions">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function DrawerRow({ label, value, children }) {
  return (
    <div className="drawer-row">
      <span>{label}</span>
      <strong>{children || value || '-'}</strong>
    </div>
  );
}
