import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'max-w-lg' }) {
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    if (isOpen) document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4" onMouseDown={onClose}>
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-xl ${size}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-primary" aria-label="Close modal">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
