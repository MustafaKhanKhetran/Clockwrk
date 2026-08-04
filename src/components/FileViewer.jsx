/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './ui';
import { downloadMock } from '../utils/download';

export const FTAG = {
  pdf: 'PDF', svg: 'SVG', figma: 'FIG', zip: 'ZIP', video: 'MP4',
  img: 'PNG', png: 'PNG', icon: 'ICO', html: 'HTML', code: 'JS',
};
const TAG_CLASS = {
  pdf: 'ftag-pdf', svg: 'ftag-svg', figma: 'ftag-fig', zip: 'ftag-zip', video: 'ftag-mp4',
  img: 'ftag-png', png: 'ftag-png', icon: 'ftag-ico', html: 'ftag-html', code: 'ftag-code',
};

export function FileTag({ kind }) {
  return <span className={`ftag ${TAG_CLASS[kind] || 'ftag-zip'}`}>{FTAG[kind] || kind?.toUpperCase()}</span>;
}

export function FileThumb({ kind }) {
  const glyph = {
    pdf: <span className="pdf-line b" style={{ width: 20, height: 5, display: 'block' }} />,
    svg: <svg viewBox="0 0 24 24" width="20"><circle cx="9" cy="9" r="5" fill="#7e5bef" /><rect x="11" y="11" width="9" height="9" rx="2" fill="#a0e92a" /></svg>,
    icon: <svg viewBox="0 0 24 24" width="18"><path d="M12 2l2.9 6.9L22 9.8l-5.5 4.7L18.2 22 12 18l-6.2 4 1.7-7.5L2 9.8l7.1-.9L12 2z" fill="#f26522" /></svg>,
    figma: <svg viewBox="0 0 24 24" width="16"><circle cx="8" cy="6" r="4" fill="#f24e1e" /><circle cx="16" cy="6" r="4" fill="#ff7262" /><circle cx="8" cy="14" r="4" fill="#a259ff" /><circle cx="16" cy="14" r="4" fill="#1abcfe" /><circle cx="8" cy="22" r="4" fill="#0acf83" /></svg>,
    video: <span style={{ width: 0, height: 0, borderLeft: '11px solid #356f9f', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', display: 'block' }} />,
    zip: <svg viewBox="0 0 24 24" width="18"><rect x="5" y="3" width="14" height="18" rx="2" fill="#c9ccd1" /><rect x="11" y="3" width="2" height="10" fill="#737375" /></svg>,
    html: <svg viewBox="0 0 24 24" width="18"><path d="M4 4h16l-1.5 15L12 21l-6.5-2L4 4z" fill="#abe847" /></svg>,
  };
  return <span className="fthumb">{glyph[kind] || glyph.zip}</span>;
}

/* In-portal file viewer. PDFs page through, media shows on a checker stage,
   html opens the live preview inside a browser chrome. */
export default function FileViewer({ file, onClose }) {
  const [page, setPage] = useState(1);
  const pages = 14;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (file.kind === 'pdf' && e.key === 'ArrowRight') setPage((p) => Math.min(pages, p + 1));
      if (file.kind === 'pdf' && e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [file.kind, onClose]);

  return createPortal((
    <>
      <div className="sheet-veil" style={{ zIndex: 910 }} onClick={onClose} />
      <section className="sheet file-viewer-sheet" role="dialog" aria-modal="true" style={{ zIndex: 911 }}>
        <div className="sheet-anim">
          <div className="file-viewer-head">
            <FileThumb kind={file.kind} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</strong>
                <FileTag kind={file.kind} />
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {[file.project, file.request].filter(Boolean).join(' · ')} · delivered {file.at}{file.size && file.size !== '—' ? ` · ${file.size}` : ''}
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadMock(file.name, `${file.name}\nDelivered by Clockwrk`)}>
              <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.download /></span> Download
            </button>
            <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--card)', color: 'var(--ink)' }}>
              <span style={{ width: 14, height: 14 }}><Icon.x /></span>
            </button>
          </div>

          <div className="file-viewer-body">
            {file.kind === 'pdf' && (
              <div className="viewer-stage" style={{ padding: '28px 0 54px' }}>
                <div className="pdf-page" key={page}>
                  <span className="pdf-line b" />
                  <span className="pdf-line l" />
                  {[92, 100, 84, 96, 70].map((w, i) => <span key={i} className="pdf-line" style={{ width: `${w}%` }} />)}
                  <span style={{ marginTop: 'auto', fontSize: 10, color: '#9aa0a6', textAlign: 'center' }}>{file.name} — page {page}</span>
                </div>
                <div className="viewer-nav">
                  <button onClick={() => setPage(Math.max(1, page - 1))}>‹</button>
                  Page {page} / {pages}
                  <button onClick={() => setPage(Math.min(pages, page + 1))}>›</button>
                </div>
              </div>
            )}

            {(file.kind === 'svg' || file.kind === 'img' || file.kind === 'png' || file.kind === 'icon') && (
              <div className="viewer-stage">
                <div className="anim-pop" style={{ display: 'grid', placeItems: 'center', gap: 14, padding: 40 }}>
                  <span style={{ transform: 'scale(3.2)', display: 'grid', placeItems: 'center', padding: 18 }}>
                    <FileThumb kind={file.kind} />
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Rendered at 100% — vector files scale losslessly</span>
                </div>
              </div>
            )}

            {file.kind === 'video' && (
              <div className="viewer-stage" style={{ background: '#0a0a0b', minHeight: 380 }}>
                <button className="anim-pop" style={{ width: 74, height: 74, borderRadius: '50%', border: 0, background: 'var(--lime)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'transform 0.25s var(--ease-spring)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
                  <span style={{ width: 0, height: 0, borderLeft: '22px solid #0a0a0b', borderTop: '13px solid transparent', borderBottom: '13px solid transparent', marginLeft: 5 }} />
                </button>
                <div className="viewer-nav" style={{ width: 'calc(100% - 48px)', justifyContent: 'flex-start', gap: 10 }}>
                  <span>0:00</span>
                  <span style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.25)' }}>
                    <span style={{ display: 'block', width: '0%', height: '100%', borderRadius: 99, background: 'var(--lime)' }} />
                  </span>
                  <span>2:14</span>
                </div>
              </div>
            )}

            {(file.kind === 'html' || file.kind === 'figma') && (
              <div className="preview-frame">
                <div className="preview-bar">
                  <span className="dot" style={{ background: '#ff5f57' }} />
                  <span className="dot" style={{ background: '#febc2e' }} />
                  <span className="dot" style={{ background: '#28c840' }} />
                  <span className="preview-url">🔒 {file.url || 'preview.clockwrk.io'}</span>
                  <a className="btn btn-ghost btn-sm" href={file.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Open ↗</a>
                </div>
                <div className="safe-preview">
                  <span><Icon.layers /></span><strong>{file.name}</strong>
                  <p>{file.url ? 'External preview ready' : 'Preview link will appear when attached'}</p>
                  {file.url && <a href={file.url} target="_blank" rel="noreferrer">Open in new tab <Icon.arrow /></a>}
                </div>
              </div>
            )}

            {file.kind === 'zip' && (
              <div className="viewer-stage" style={{ minHeight: 240 }}>
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <div style={{ transform: 'scale(2)', marginBottom: 18, display: 'grid', placeItems: 'center' }}><FileThumb kind="zip" /></div>
                  Archive — download to browse contents
                </div>
              </div>
            )}

            {file.kind === 'code' && (
              <div className="code-viewer">
                <div className="code-viewer-head"><span>{file.name}</span><i>Read only</i></div>
                <pre><code>{`// Delivered by clockwrk
export const release = {
  project: "${file.project || 'Platform MVP'}",
  artifact: "${file.name}",
  version: ${file.version || 1},
  status: "production-ready",
};

export function initialize(config) {
  if (!config) throw new Error("Configuration is required");
  return release;
}`}</code></pre>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  ), document.body);
}
