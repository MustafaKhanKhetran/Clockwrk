import { useMemo, useState } from 'react';
import { projects } from '../mocks';
import { Icon, EmptyState } from '../components/ui';
import FileViewer, { FileTag, FileThumb } from '../components/FileViewer';
import { useStore } from '../store';

export default function Files() {
  const { requests } = useStore();
  const [proj, setProj] = useState(0);
  const [req, setReq] = useState(0);
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState(null);

  const files = useMemo(() => requests.flatMap((r) =>
    r.deliverables.map((d) => ({
      ...d, requestId: r.id, request: r.title,
      projectId: r.projectId, project: projects.find((p) => p.id === r.projectId)?.name,
    }))
  ), [requests]);

  const kinds = [...new Set(files.map((f) => f.kind))];
  const reqOptions = requests.filter((r) => r.deliverables.length && (!proj || r.projectId === proj));

  const shown = files.filter((f) =>
    (!proj || f.projectId === proj) &&
    (!req || f.requestId === req) &&
    (kind === 'all' || f.kind === kind) &&
    f.name.toLowerCase().includes(q.toLowerCase()));

  const chip = (active) => ({
    background: active ? 'var(--ink)' : 'var(--card)',
    color: active ? 'var(--bg)' : 'var(--muted)',
    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
  });

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title" style={{ fontWeight: 400 }}>Deliverables <strong style={{ fontWeight: 700 }}>· {files.length}</strong></h1>
          <p className="page-sub">Everything we've shipped, every version — viewable right here in the portal.</p>
        </div>
      </header>

      {/* filters */}
      <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, animationDelay: '0.06s' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240, height: 40 }} />
          <span className="kicker">Project</span>
          <button className="btn btn-sm" style={chip(!proj)} onClick={() => { setProj(0); setReq(0); }}>All</button>
          {projects.map((p) => (
            <button key={p.id} className="btn btn-sm" style={chip(proj === p.id)} onClick={() => { setProj(p.id); setReq(0); }}>{p.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="kicker">Request</span>
          <button className="btn btn-sm" style={chip(!req)} onClick={() => setReq(0)}>All</button>
          {reqOptions.map((r) => (
            <button key={r.id} className="btn btn-sm" style={chip(req === r.id)} onClick={() => setReq(r.id)}>{r.title}</button>
          ))}
          <span className="kicker" style={{ marginLeft: 8 }}>Type</span>
          <button className="btn btn-sm" style={chip(kind === 'all')} onClick={() => setKind('all')}>All</button>
          {kinds.map((k) => (
            <button key={k} className="btn btn-sm" style={{ ...chip(kind === k), textTransform: 'uppercase', fontSize: 11 }} onClick={() => setKind(k)}>{k}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="🗂" title="No files match" sub="Loosen a filter — or wait for the next delivery, it's never far away." />
      ) : (
        <div className="file-grid">
          {shown.map((f, i) => (
            <article key={f.id} className="pcard is-hoverable file-tile anim-rise" style={{ animationDelay: `${i * 0.04}s`, opacity: f.current === false ? 0.68 : 1 }}
              onClick={() => setViewing(f)}>
              <div className="file-thumb" style={{ position: 'relative' }}>
                <span style={{ transform: 'scale(1.6)' }}><FileThumb kind={f.kind} /></span>
                <span style={{ position: 'absolute', top: 10, left: 10 }}><FileTag kind={f.kind} /></span>
                {f.current === false && <span style={{ position: 'absolute', top: 10, right: 10 }} className="pill pill-soft">v{f.version}</span>}
              </div>
              <div style={{ padding: '13px 15px' }}>
                <strong style={{ fontSize: 13.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{f.project} · {f.request}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.at}{f.size && f.size !== '—' ? ` · ${f.size}` : ''}</span>
                  <button className="btn btn-ghost btn-sm" style={{ height: 30, padding: '0 10px' }} onClick={(e) => e.stopPropagation()}>
                    <span style={{ width: 13, height: 13, display: 'grid' }}><Icon.download /></span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
