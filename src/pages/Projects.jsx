import { useState } from 'react';
import { projects } from '../mocks';
import { StatusPill, Avatar } from '../components/ui';
import ProjectSheet from '../components/ProjectSheet';
import RequestSheet from '../components/RequestSheet';
import { useStore } from '../store';

export default function Projects() {
  const { requests } = useStore();
  const [openProj, setOpenProj] = useState(null);
  const [openReq, setOpenReq] = useState(null);

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Run as many in parallel as you like — each with its own team, preview, and request stream.</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {projects.map((p, i) => {
          const pReqs = requests.filter((r) => r.projectId === p.id);
          return (
            <article key={p.id} className="pcard is-hoverable anim-rise" onClick={() => setOpenProj(p)}
              style={{ padding: 22, animationDelay: `${i * 0.07}s`, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', cursor: 'pointer' }}>
              <div style={{ flex: '1 1 230px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{p.name}</h2>
                  <StatusPill status={p.status} />
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{p.tagline}</p>
                <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                  {pReqs.length} requests · {pReqs.filter((r) => r.status === 'active').length} active · {p.preview.kind === 'html' ? '🌐 live preview' : '🎨 design file'}
                </p>
              </div>
              <div style={{ flex: '2 1 240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>Progress</span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.progress}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--soft)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 99, background: 'var(--lime)', transition: 'width 1s var(--ease-out)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {[p.pm, p.am, ...p.members].slice(0, 3).map((m, j) => (
                    <span key={j} style={{ marginLeft: j ? -7 : 0 }}><Avatar name={m.name} size={28} /></span>
                  ))}
                  {p.members.length + 2 > 3 && <span className="av-more">+{p.members.length + 2 - 3}</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.pm.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>PM · {p.am.name} (AM)</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {openReq && <RequestSheet requestId={openReq} onClose={() => setOpenReq(null)} />}
      {openProj && !openReq && <ProjectSheet project={openProj} onClose={() => setOpenProj(null)} onOpenRequest={setOpenReq} />}
    </>
  );
}
