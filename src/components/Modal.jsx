import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children, size = 'max-w-lg' }) {
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    if (!isOpen) return undefined;
    document.addEventListener('keydown', close);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return createPortal((
    <div className="modal-veil" onMouseDown={onClose}>
      <section className={`modal-card ${size}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close modal">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  ), document.body);
}
