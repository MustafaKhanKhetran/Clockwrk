import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { Action, Meter, PageIntro, ProjectCode, Status } from '../Primitives';

const columns = [
  ['active', 'Building', 'The team is working here now.'],
  ['review', 'Review', 'Delivered and waiting for you.'],
  ['queued', 'Queue', 'Drag the order of what starts next.'],
  ['done', 'Shipped', 'Approved work and final files.'],
];

export default function Requests() {
  const navigate = useNavigate();
  const { requests, projects } = useStore();
  const [params, setParams] = useSearchParams();
  const [moving, setMoving] = useState('');
  const [error, setError] = useState('');
  const project = Number(params.get('project')) || 0;
  const setProject = (id) => setParams(id ? { project: String(id) } : {}, { replace: true });
  const filtered = useMemo(() => project ? requests.filter((item) => item.projectId === project) : requests, [project, requests]);
  const production = filtered.filter((item) => !item.isParent);
  const groups = filtered.filter((item) => item.isParent);
  const queue = requests.filter((item) => item.status === 'queued' && !item.isParent).sort((a, b) => a.queuePos - b.queuePos);
  const projectFor = (id) => projects.find((item) => item.id === id);

  const move = async (id, direction) => {
    const from = queue.findIndex((item) => item.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= queue.length || moving) return;
    setMoving(String(id));
    setError('');
    try { await store.reorderQueue(from, to); } catch (err) { setError(err.message || 'Queue order could not be saved.'); }
    setMoving('');
  };

  return (
    <div className="v3-requests-page" data-tour="request-board">
      <PageIntro index="Work queue" title="Requests" copy="Every brief, review, and shipped item moves through one shared production line." action={<Action icon="plus" onClick={() => navigate('/requests/new')}>New request</Action>} />
      <section className="v3-request-controls v3-enter"><span>Show</span><button className={!project ? 'is-active' : ''} onClick={() => setProject(0)}>All work <i>{requests.length}</i></button>{projects.map((item) => <button key={item.id} className={project === item.id ? 'is-active' : ''} onClick={() => setProject(item.id)}>{item.name}<i>{requests.filter((request) => request.projectId === item.id).length}</i></button>)}</section>

      {!!groups.length && <section className="v3-scope-groups v3-enter" aria-label="Request groups">
        <header><div><span>Oversized work</span><h2>Scope groups</h2></div><p>Large requests are agreed as smaller linked parts before they enter production.</p></header>
        <div>{groups.map((request) => {
          const projectItem = projectFor(request.projectId);
          const needsDecision = request.scopeStatus === 'proposed';
          return <button key={request.id} className={needsDecision ? 'is-action' : ''} onClick={() => navigate(`/requests/${request.id}`)}>
            <ProjectCode project={projectItem} />
            <span><small>{projectItem?.name} · Request group</small><strong>{request.title}</strong><p>{needsDecision ? `${request.breakdown.length} proposed parts need your approval` : request.scopeStatus === 'reviewing' ? 'The team is preparing a clear breakdown' : `${request.children.length} linked parts`}</p></span>
            <em>{needsDecision ? 'Review breakdown' : request.scopeStatus === 'reviewing' ? 'Being scoped' : `${request.children.filter((child) => child.status === 'done').length}/${request.children.length} shipped`}</em>
            <Icon name="arrow" size={16} />
          </button>;
        })}</div>
      </section>}

      {error && <p className="v3-board-error" role="alert">{error}</p>}
      {requests.length === 0
        ? <section className="v3-empty-panel v3-enter">
            <Icon name="requests" size={28} />
            <strong>{projects.length ? 'No requests yet' : 'Create a project first'}</strong>
            <span>{projects.length ? 'A request is one job — a page to design, a bug to fix, content to update. File one and it moves through the queue.' : 'Requests live inside a project. Set one up and you can start filing work in seconds.'}</span>
            <Action icon="plus" onClick={() => navigate(projects.length ? '/requests/new' : '/projects/new')}>{projects.length ? 'File your first request' : 'Create your first project'}</Action>
          </section>
        : <section className="v3-kanban v3-enter" data-tour="request-queue">
        {columns.map(([status, title, copy]) => {
          const items = production.filter((item) => item.status === status).sort((a, b) => status === 'queued' ? a.queuePos - b.queuePos : 0);
          return <article key={status} className={`v3-kanban-column is-${status}`}><header><span><i />{title}</span><strong>{items.length}</strong><p>{copy}</p></header><div>{items.map((request) => {
            const projectItem = projectFor(request.projectId);
            const queueIndex = status === 'queued' ? queue.findIndex((item) => item.id === request.id) : -1;
            return <article className="v3-kanban-ticket" key={request.id}>
              <button className="v3-ticket-open" onClick={() => navigate(`/requests/${request.id}`)}>
                {status === 'queued' && <span className="v3-drag">{request.queuePos}</span>}
                <div className="v3-ticket-top"><ProjectCode project={projectItem} /><Status status={request.status} /></div>
                <small>{request.isChild ? `Part ${request.partNumber} of ${request.partCount} · ${request.parentTitle}` : `${projectItem?.name} · ${request.type}`}</small>
                <h3>{request.title}</h3><p>{request.brief}</p>
                <footer><span className={`v3-priority is-${(request.priority || 'normal').toLowerCase()}`}><i />{request.priority || 'Normal'}</span>{request.dependsOnRequestId && <span className={request.dependencyComplete ? 'is-ready' : 'is-blocked'}><Icon name="link" size={13} />{request.dependencyComplete ? 'Dependency cleared' : `After ${request.dependsOnTitle}`}</span>}{request.due && <span><Icon name="calendar" size={13} />{request.deliveredAt ? `Delivered ${request.deliveredAt}` : request.due}</span>}{status === 'active' && <Meter value={request.progress} />}</footer>
              </button>
              {status === 'queued' && <div className="v3-queue-actions" aria-label={`Move ${request.title} in queue`}><button disabled={queueIndex <= 0 || !!moving} onClick={() => move(request.id, -1)} aria-label="Move up"><Icon name="up" size={14} /></button><button disabled={queueIndex < 0 || queueIndex === queue.length - 1 || !!moving} onClick={() => move(request.id, 1)} aria-label="Move down"><Icon name="down" size={14} /></button></div>}
            </article>;
          })}{!items.length && <button className="v3-kanban-empty" onClick={() => navigate('/requests/new')}><Icon name="plus" /><span><strong>Nothing here</strong><small>Add a request when you are ready.</small></span></button>}</div></article>;
        })}
      </section>
      }
    </div>
  );
}
