import { useEffect } from 'react';
import { Icon } from './ui';

/** Centered modal popup — one scrollable page, no tabs. */
export default function Sheet({ onClose, children, header, width }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <>
      <div className="sheet-veil" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" style={width ? { width } : undefined}>
        <div className="sheet-anim">
          <div style={{ padding: '24px clamp(20px, 3vw, 30px) 18px', position: 'relative', borderBottom: '1px solid var(--line)' }}>
            <button onClick={onClose} aria-label="Close" style={{
              position: 'absolute', top: 18, right: 20,
              width: 38, height: 38, display: 'grid', placeItems: 'center',
              border: '1px solid var(--line)', borderRadius: '50%',
              background: 'var(--card)', color: 'var(--ink)',
              transition: 'transform 0.3s var(--ease-spring), border-color 0.25s ease',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(90deg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
              <span style={{ width: 15, height: 15 }}><Icon.x /></span>
            </button>
            {header}
          </div>
          <div className="sheet-body">{children}</div>
        </div>
      </section>
    </>
  );
}
