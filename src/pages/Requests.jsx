import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects } from '../mocks';
import { Icon, StatusPill, ProgressRing, CatChip } from '../components/ui';
import RequestSheet from '../components/RequestSheet';
import { store, useStore } from '../store';

const SECTIONS = [
  ['active', 'Active', 'In your slots right now'],
  ['review', 'In review', 'Delivered — waiting on you'],
  ['queued', 'Queued', 'Drag to reorder what we build next'],
  ['done', 'Completed', 'Everything we\'ve shipped'],
];

export default function Requests() {
  const navigate = useNavigate();
  const { requests, baseSlots, extraSlots, plan } = useStore();
  const [openReq, setOpenReq] = useState(null);
  const [projFilter, setProjFilter] = useState(0);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const filtered = projFilter ? requests.filter((r) => r.projectId === projFilter) : requests;
  const byStatus = (s) => {
    const list = filtered.filter((r) => r.status === s);
    return s === 'queued' ? list.sort((a, b) => a.queuePos - b.queuePos) : list;
  };
  const projName = (r) => projects.find((p) => p.id === r.projectId)?.name;

  const onDrop = (to) => {
    if (dragIdx !== null && dragIdx !== to && !projFilter) store.reorderQueue(dragIdx, to);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title">Requests</h1>
          <p className="page-sub">{plan} plan · {baseSlots + extraSlots} parallel slots · unlimited queue</p>
        </div>
        <button className="btn btn-lime" onClick={() => navigate('/requests/new')}>
          <span style={{ width: 15, height: 15, display: 'grid' }}><Icon.plus /></span> New request
        </button>
      </header>

      {/* project filter */}
      <div className="anim-rise" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22, animationDelay: '0.05s' }}>
        {[{ id: 0, name: 'All projects' }, ...projects].map((p) => (
          <button key={p.id} className="btn btn-sm" onClick={() => setProjFilter(p.id)} style={{
            background: projFilter === p.id ? 'var(--ink)' : 'var(--card)',
            color: projFilter === p.id ? 'var(--bg)' : 'var(--muted)',
            border: `1px solid ${projFilter === p.id ? 'var(--ink)' : 'var(--line)'}`,
          }}>{p.name}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {SECTIONS.map(([key, label, hint], si) => {
          const items = byStatus(key);
          return (
            <section key={key} className="anim-rise" style={{ animationDelay: `${si * 0.08}s` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{label}</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{items.length} · {key === 'queued' && projFilter ? 'clear the project filter to reorder' : hint}</span>
              </div>
              {items.length === 0 ? (
                <div style={{ padding: '18px 20px', border: '2px dashed var(--line)', borderRadius: 16, color: 'var(--muted)', fontSize: 13.5 }}>
                  {key === 'active' ? 'A slot is open — queue something and it starts immediately.' : 'Nothing here right now.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((r, i) => (
                    <div key={r.id}
                      className={`req-row ${key === 'queued' && dragIdx === i ? 'is-dragging' : ''} ${key === 'queued' && overIdx === i && dragIdx !== i ? 'is-drop-target' : ''}`}
                      draggable={key === 'queued' && !projFilter}
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                      onDrop={() => onDrop(i)}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      onClick={() => setOpenReq(r.id)}
                    >
                      {key === 'queued' && !projFilter && (
                        <span style={{ width: 16, height: 16, color: 'var(--muted)', cursor: 'grab' }}><Icon.grip /></span>
                      )}
                      {key === 'queued' && <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', width: 16 }}>{r.queuePos}</span>}
                      <CatChip category={r.category} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 14.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</strong>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {projName(r)} · {r.type}
                          {r.due && r.status === 'active' && ` · delivery ${r.due}`}
                          {r.deliveredAt && r.status !== 'active' && ` · delivered ${r.deliveredAt}`}
                        </span>
                      </div>
                      {r.rating && <span style={{ fontSize: 12, color: '#f5c518', letterSpacing: 1 }}>{'★'.repeat(r.rating.stars)}</span>}
                      {r.status === 'active' && <ProgressRing value={r.progress} size={42} stroke={4} />}
                      <StatusPill status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {openReq && <RequestSheet requestId={openReq} onClose={() => setOpenReq(null)} />}
    </>
  );
}
