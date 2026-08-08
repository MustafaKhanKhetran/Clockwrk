export default function FormModal({ open, title, subtitle, onClose, onSubmit, children, actions, size = '' }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="surface-heading">
            <span className="surface-icon surface-icon-accent" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </span>
            <div>
              <h3>{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <form className="modal-form" onSubmit={onSubmit}>
          {children}
          {actions && <div className="modal-actions">{actions}</div>}
        </form>
      </div>
    </div>
  );
}
