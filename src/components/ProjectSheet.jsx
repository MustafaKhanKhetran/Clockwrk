import { useState } from 'react';
import Sheet from './Sheet';
import FileViewer, { FileTag, FileThumb } from './FileViewer';
import { StatusPill, Avatar, Icon, CatChip } from './ui';
import { useStore } from '../store';

export default function ProjectSheet({ project: p, onClose, onOpenRequest }) {
  const { requests } = useStore();
  const [viewing, setViewing] = useState(null);
  const projReqs = requests.filter((r) => r.projectId === p.id);
  const order = { active: 0, review: 1, queued: 2, done: 3 };
  const sorted = [...projReqs].sort((a, b) => order[a.status] - order[b.status]);
  const allFiles = projReqs.flatMap((r) => r.deliverables.map((d) => ({ ...d, request: r.title })));
  const crew = [{ ...p.pm, lead: 'PM' }, { ...p.am, lead: 'AM' }, ...p.members];

  const header = (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', paddingRight: 50 }}>
      <span className="svc-icon" style={{ width: 48, height: 48, background: 'var(--lime)' }}>
        <span style={{ width: 20, height: 20, display: 'grid', color: '#0a0a0b' }}><Icon.layers /></span>
      </span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <StatusPill status={p.status} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.tagline}</span>
        </div>
        <h2 style={{ fontSize: 'clamp(18px, 2.2vw, 23px)', fontWeight: 700, letterSpacing: '-0.03em' }}>{p.name}</h2>
      </div>
      <div style={{ minWidth: 160 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
          <span>Progress</span><strong style={{ color: 'var(--ink)' }}>{p.progress}%</strong>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: 'var(--soft)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p.progress}%`, background: 'var(--lime)', borderRadius: 99, transition: 'width 0.8s var(--ease-out)' }} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Sheet onClose={onClose} header={header}>
        {/* about + facts */}
        <div className="sheet-section" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 18 }} data-sheet-cols>
          <div>
            <span className="kicker">About this project</span>
            <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 8, color: 'var(--ink-dim)' }}>{p.description}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {p.stack.map((s) => <span key={s} className="pill pill-soft">{s}</span>)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
            {[['Started', p.startedAt], ['Target', p.targetAt],
              ['Requests', `${projReqs.length} total`], ['In motion', `${projReqs.filter((r) => r.status === 'active').length} active`]]
              .map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', borderRadius: 11, background: 'var(--soft)' }}>
                  <span className="kicker" style={{ fontSize: 9 }}>{k}</span>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 3 }}>{v}</div>
                </div>
              ))}
          </div>
        </div>

        {/* live preview */}
        <div className="sheet-section">
          <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>
            {p.preview.kind === 'html' ? 'Live preview — staging build' : 'Design workspace'}
          </span>
          <div className="preview-frame">
            <div className="preview-bar">
              <span className="dot" style={{ background: '#ff5f57' }} />
              <span className="dot" style={{ background: '#febc2e' }} />
              <span className="dot" style={{ background: '#28c840' }} />
              <span className="preview-url">🔒 {p.preview.url}</span>
              <a className="btn btn-ghost btn-sm" href={p.preview.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Open ↗</a>
            </div>
            {p.preview.kind === 'html' ? (
              <iframe title={p.name} src={p.preview.url} style={{ width: '100%', height: 340, border: 0, display: 'block', background: '#fff' }} />
            ) : (
              <div className="preview-canvas" style={{ height: 220 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, display: 'grid', placeItems: 'center' }}><FileThumb kind="figma" /></div>
                  {p.preview.label} — opens in Figma
                </div>
              </div>
            )}
          </div>
        </div>

        {/* requests */}
        <div className="sheet-section">
          <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>Requests · {sorted.length}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sorted.map((r) => (
              <div key={r.id} className="req-row" onClick={() => onOpenRequest(r.id)}>
                <CatChip category={r.category} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</strong>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {r.type}
                    {r.status === 'active' && ` · ${r.progress}% · due ${r.due}`}
                    {r.status === 'done' && ` · approved ${r.approvedAt}`}
                    {r.status === 'queued' && ` · queue #${r.queuePos}`}
                  </span>
                </div>
                {r.rating && <span style={{ fontSize: 11.5, color: '#f5c518', letterSpacing: 1 }}>{'★'.repeat(r.rating.stars)}</span>}
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </div>

        {/* team — individual members */}
        <div className="sheet-section">
          <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>Team on this project · {crew.length}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {crew.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14 }}>
                <Avatar name={m.name} size={36} online={m.online} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{m.role}</div>
                </div>
                {m.lead && <span className="role-pill">{m.lead}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* files */}
        <div className="sheet-section">
          <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>All project files · click to view</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {allFiles.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>No files yet — first delivery is never far away.</p>}
            {allFiles.map((f) => (
              <div key={f.id} className="req-row" style={{ opacity: f.current ? 1 : 0.65 }} onClick={() => setViewing(f)}>
                <FileThumb kind={f.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</strong>
                    <FileTag kind={f.kind} />
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{f.request} · {f.at}</span>
                </div>
                <span className={`pill ${f.current ? 'pill-lime' : 'pill-soft'}`}>v{f.version}</span>
                <button className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>
                  <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.download /></span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <style>{`@media (max-width: 760px) { [data-sheet-cols] { grid-template-columns: 1fr !important; } }`}</style>
      </Sheet>

      {viewing && <FileViewer file={{ ...viewing, project: p.name }} onClose={() => setViewing(null)} />}
    </>
  );
}
