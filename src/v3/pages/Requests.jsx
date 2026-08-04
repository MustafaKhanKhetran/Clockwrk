import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects } from '../../mocks';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { Action, Meter, PageIntro, ProjectCode, Status } from '../Primitives';

const columns = [
  ['active', 'Building', 'The team is working here now.'],
  ['review', 'Review', 'Delivered and waiting for you.'],
  ['queued', 'Queue', 'Drag to change what starts next.'],
  ['done', 'Shipped', 'Approved work and final files.'],
];

export default function Requests() {
  const navigate = useNavigate();
  const { requests } = useStore();
  const [project, setProject] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const filtered = useMemo(() => project ? requests.filter((item) => item.projectId === project) : requests, [project, requests]);
  const projectFor = (id) => projects.find((item) => item.id === id);
  const onDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    store.reorderQueue(dragIndex, index);
    setDragIndex(null);
  };

  return (
    <div className="v3-requests-page">
      <PageIntro index="Work queue" title="Requests" copy="Every brief, review, and shipped item moves through one shared production line." action={<Action icon="plus" onClick={() => navigate('/requests/new')}>New request</Action>} />
      <section className="v3-request-controls v3-enter"><span>Show</span><button className={!project ? 'is-active' : ''} onClick={() => setProject(0)}>All work <i>{requests.length}</i></button>{projects.map((item) => <button key={item.id} className={project === item.id ? 'is-active' : ''} onClick={() => setProject(item.id)}>{item.name}<i>{requests.filter((request) => request.projectId === item.id).length}</i></button>)}</section>

      <section className="v3-kanban v3-enter">
        {columns.map(([status, title, copy]) => {
          const items = filtered.filter((item) => item.status === status).sort((a, b) => status === 'queued' ? a.queuePos - b.queuePos : 0);
          return <article key={status} className={`v3-kanban-column is-${status}`}><header><span><i />{title}</span><strong>{items.length}</strong><p>{copy}</p></header><div>{items.map((request, index) => {
            const projectItem = projectFor(request.projectId);
            return <button key={request.id} className={dragIndex === index && status === 'queued' ? 'is-dragging' : ''} draggable={status === 'queued'} onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(index)} onClick={() => navigate(`/requests/${request.id}`)}>{status === 'queued' && <span className="v3-drag"><Icon name="grip" size={15} />{request.queuePos}</span>}<div className="v3-ticket-top"><ProjectCode project={projectItem} /><Status status={request.status} /></div><small>{projectItem?.name} · {request.type}</small><h3>{request.title}</h3><p>{request.brief}</p><footer><span className={`v3-priority is-${(request.priority || 'normal').toLowerCase()}`}><i />{request.priority || 'Normal'}</span>{request.due && <span><Icon name="calendar" size={13} />{request.deliveredAt ? `Delivered ${request.deliveredAt}` : request.due}</span>}{status === 'active' && <Meter value={request.progress} />}</footer></button>;
          })}{!items.length && <button className="v3-kanban-empty" onClick={() => navigate('/requests/new')}><Icon name="plus" /><span><strong>Nothing here</strong><small>Add a request when you are ready.</small></span></button>}</div></article>;
        })}
      </section>
    </div>
  );
}
