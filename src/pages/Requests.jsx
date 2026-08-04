import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects, RETAINER_EXTRA_HOURS } from '../mocks';
import { Icon, StatusPill, ProgressRing, CatChip, SiteCta } from '../components/ui';
import { store, useStore } from '../store';

const SECTIONS = [
  ['active', 'Active', 'In your slots right now'],
  ['review', 'In review', 'Delivered — waiting on you'],
  ['queued', 'Queued', 'Drag to reorder what we build next'],
  ['done', 'Completed', 'Everything we\'ve shipped'],
];

export default function Requests() {
  const navigate = useNavigate();
  const {
    requests, baseSlots, extraSlots, plan, accountMode,
    hoursUsed, hoursAllowance, hoursRemaining, hoursPct,
  } = useStore();
  const [projFilter, setProjFilter] = useState(0);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const filtered = projFilter ? requests.filter((r) => r.projectId === projFilter) : requests;
  const isRetainer = accountMode === 'retainer';
  const hourText = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const hoursLevel = hoursRemaining <= 0 ? 'is-red' : hoursPct >= 0.8 ? 'is-amber' : '';
  const chronological = [...filtered].sort((a, b) => b.id - a.id);
  const requestHours = (request) => request.careHours || (request.status === 'queued' ? 0 : 0.5);
  const byStatus = (s) => {
    const list = filtered.filter((r) => r.status === s);
    return s === 'queued' ? list.sort((a, b) => a.queuePos - b.queuePos) : list;
  };
  const projName = (r) => projects.find((p) => p.id === r.projectId)?.name;
  const priorityFor = (request) => request.priority || (request.status === 'review' ? 'High' : request.category === 'Development' ? 'Normal' : 'Standard');
  const dateFor = (request) => request.deliveredAt
    ? `Delivered ${request.deliveredAt}`
    : request.due
      ? `Due ${request.due}`
      : request.startedAt
        ? `Started ${request.startedAt}`
        : 'Not scheduled';
  const deliveryState = (request) => {
    if (request.deliveredAt) return { tone: 'delivered', label: `Delivered ${request.deliveredAt}` };
    if (!request.due) return { tone: 'unscheduled', label: request.status === 'queued' ? 'Not scheduled' : dateFor(request) };
    const dueDate = new Date(`${request.due}, 2026`);
    const overdue = request.status === 'active' && dueDate < new Date('2026-07-05T00:00:00');
    return { tone: overdue ? 'overdue' : 'expected', label: overdue ? `Overdue · ${request.due}` : `Expected ${request.due}` };
  };

  const onDrop = (to) => {
    if (dragIdx !== null && dragIdx !== to && !projFilter) store.reorderQueue(dragIdx, to);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <span className="kicker">Delivery pipeline</span>
          <h1 className="page-title">Requests</h1>
          <p className="page-sub">{isRetainer ? `Care requests · ${hourText(hoursRemaining)} of ${hourText(hoursAllowance)} hours left` : `${plan} plan · ${baseSlots + extraSlots} parallel slots · unlimited queue`}</p>
        </div>
        <SiteCta className="site-cta-compact" icon={<Icon.plus />} onClick={() => navigate('/requests/new')}>New request</SiteCta>
      </header>

      {isRetainer ? (
        <section className={`request-hours-strip anim-rise ${hoursLevel}`}>
          <div>
            <span className="kicker">Care hours</span>
            <strong>{hourText(hoursUsed)} of {hourText(hoursAllowance)} used</strong>
            <p>{hourText(hoursRemaining)} hours left this month.</p>
          </div>
          <span className="hours-track"><i style={{ width: `${hoursPct * 100}%` }} /></span>
          <button onClick={store.buyHourBlock}>Buy {RETAINER_EXTRA_HOURS.block.hours} hours — ${RETAINER_EXTRA_HOURS.block.price.toLocaleString()}</button>
        </section>
      ) : (
        <section className="request-summary anim-rise">
          <div><span>In progress</span><strong>{byStatus('active').length}</strong><small>{baseSlots + extraSlots} total slots</small></div>
          <div><span>Waiting on you</span><strong>{byStatus('review').length}</strong><small>Ready for review</small></div>
          <div><span>Queued</span><strong>{byStatus('queued').length}</strong><small>Prioritized backlog</small></div>
          <div><span>Delivered</span><strong>{byStatus('done').length}</strong><small>Approved work</small></div>
        </section>
      )}

      <section className="portal-filterbar anim-rise" style={{ animationDelay: '0.05s' }}>
        <div className="portal-filter-heading"><div><Icon.layers /><span><strong>Filter requests</strong><small>Choose a project workspace</small></span></div>{projFilter > 0 && <button onClick={() => setProjFilter(0)}>Reset <Icon.x /></button>}</div>
        <div className="portal-filter-group">
          <span>Project</span>
          <div className="portal-filter-options">
            {[{ id: 0, name: 'All projects' }, ...projects].map((p) => (
              <button key={p.id} className={`portal-filter-chip ${projFilter === p.id ? 'is-active' : ''}`} onClick={() => setProjFilter(p.id)}>
                <span>{p.name}</span><i>{p.id ? requests.filter((request) => request.projectId === p.id).length : requests.length}</i>
              </button>
            ))}
          </div>
        </div>
      </section>

      {isRetainer ? (
        <section className="workspace-panel retainer-request-list anim-rise">
          <div className="request-board-head">
            <div><span className="request-status-dot is-active" /><h2>Care request history</h2><i>{chronological.length}</i></div>
            <span>Newest first · hours shown per request</span>
          </div>
          <div className="request-list">
            {chronological.map((r, i) => (
              <div key={r.id}
                className="req-row retainer-req-row"
                role="button"
                tabIndex={0}
                aria-label={`Open request ${r.title}`}
                style={{ '--request-delay': `${i * 40}ms` }}
                onClick={() => navigate(`/requests/${r.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/requests/${r.id}`);
                  }
                }}
              >
                <CatChip category={r.category} />
                <div className="request-row-copy">
                  <strong>{r.title}</strong>
                  <span className="request-identifiers">
                    <i className="identity-pill is-project"><Icon.layers />{projName(r)}</i>
                    <i className="identity-pill is-type">{r.type}</i>
                    <i className={`identity-pill is-${deliveryState(r).tone}`}><Icon.cal />{deliveryState(r).label}</i>
                  </span>
                </div>
                <span className="care-hours-pill">{hourText(requestHours(r))}h</span>
                <span className={`request-priority is-${priorityFor(r).toLowerCase()}`}><i />{priorityFor(r)}</span>
                {r.rating && <span style={{ fontSize: 12, color: '#f5c518', letterSpacing: 1 }}>{'★'.repeat(r.rating.stars)}</span>}
                {r.status === 'active' && <ProgressRing value={r.progress} size={42} stroke={4} />}
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="request-board">
          {SECTIONS.map(([key, label, hint], si) => {
            const items = byStatus(key);
            return (
              <section key={key} className="workspace-panel request-board-section anim-rise" style={{ animationDelay: `${si * 0.08}s` }}>
                <div className="request-board-head">
                  <div><span className={`request-status-dot is-${key}`} /><h2>{label}</h2><i>{items.length}</i></div>
                  <span>{key === 'queued' && projFilter ? 'Clear project filter to reorder' : hint}</span>
                </div>
                {items.length === 0 ? (
                  <div style={{ padding: '18px 20px', border: '2px dashed var(--line)', borderRadius: 16, color: 'var(--muted)', fontSize: 13.5 }}>
                    {key === 'active' ? 'A slot is open — queue something and it starts immediately.' : 'Nothing here right now.'}
                  </div>
                ) : (
                  <div className="request-list">
                    {items.map((r, i) => (
                      <div key={r.id}
                        className={`req-row ${key === 'queued' && dragIdx === i ? 'is-dragging' : ''} ${key === 'queued' && overIdx === i && dragIdx !== i ? 'is-drop-target' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open request ${r.title}`}
                        style={{ '--request-delay': `${i * 40}ms` }}
                        draggable={key === 'queued' && !projFilter}
                        onDragStart={() => setDragIdx(i)}
                        onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                        onDrop={() => onDrop(i)}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                        onClick={() => navigate(`/requests/${r.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/requests/${r.id}`);
                          }
                        }}
                      >
                        {key === 'queued' && !projFilter && (
                          <span style={{ width: 16, height: 16, color: 'var(--muted)', cursor: 'grab' }}><Icon.grip /></span>
                        )}
                        {key === 'queued' && <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', width: 16 }}>{r.queuePos}</span>}
                        <CatChip category={r.category} />
                        <div className="request-row-copy">
                          <strong>{r.title}</strong>
                          <span className="request-identifiers">
                            <i className="identity-pill is-project"><Icon.layers />{projName(r)}</i>
                            <i className="identity-pill is-type">{r.type}</i>
                            <i className={`identity-pill is-${deliveryState(r).tone}`}><Icon.cal />{deliveryState(r).label}</i>
                          </span>
                        </div>
                        <span className={`request-priority is-${priorityFor(r).toLowerCase()}`}><i />{priorityFor(r)}</span>
                        {key === 'queued' && !projFilter && <span className="queue-reorder-controls"><button disabled={i === 0} onClick={(event) => { event.stopPropagation(); store.reorderQueue(i, i - 1); }} aria-label={`Move ${r.title} up`}>↑</button><button disabled={i === items.length - 1} onClick={(event) => { event.stopPropagation(); store.reorderQueue(i, i + 1); }} aria-label={`Move ${r.title} down`}>↓</button></span>}
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
      )}

    </>
  );
}
