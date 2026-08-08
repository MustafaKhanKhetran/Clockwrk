export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onCancel, onConfirm, loading }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="surface-heading">
            <span className={`surface-icon ${danger ? 'surface-icon-danger' : 'surface-icon-accent'}`} aria-hidden="true">
              {danger ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m10.29 3.86-8.2 14.2A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.73-2.94l-8.2-14.2a2 2 0 0 0-3.42 0Z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              )}
            </span>
            <div>
              <h3>{title}</h3>
              {message && <p>{message}</p>}
            </div>
          </div>
          <button className="drawer-close" onClick={onCancel} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="modal-actions confirm-dialog-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={loading} onClick={onConfirm}>
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
