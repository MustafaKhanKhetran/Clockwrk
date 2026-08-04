import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './ui';

/** Centered modal popup — one scrollable page, no tabs. */
export default function Sheet({ onClose, children, header, width, className = '', embedded = false }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (embedded) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, [embedded, onClose]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = 0;
    const frame = requestAnimationFrame(() => {
      body.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (embedded) {
    return (
      <section className={`sheet-embedded ${className}`}>
        <div className="sheet-head">
          <button className="sheet-close" onClick={onClose} aria-label="Back">
            <span style={{ width: 15, height: 15 }}><Icon.x /></span>
          </button>
          {header}
        </div>
        <div className="sheet-body">{children}</div>
      </section>
    );
  }

  return createPortal((
    <>
      <div className="sheet-veil" onClick={onClose} />
      <section className={`sheet ${className}`} role="dialog" aria-modal="true" style={width ? { width } : undefined}>
        <div className="sheet-anim">
          <div className="sheet-head">
            <button className="sheet-close" onClick={onClose} aria-label="Close">
              <span style={{ width: 15, height: 15 }}><Icon.x /></span>
            </button>
            {header}
          </div>
          <div ref={bodyRef} className="sheet-body">{children}</div>
        </div>
      </section>
    </>
  ), document.body);
}
