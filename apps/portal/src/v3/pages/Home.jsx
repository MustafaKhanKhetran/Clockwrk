import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import Icon from '../Icon';
import { useSession } from '../session';
import { Action, Meter, ProjectCode, Status } from '../Primitives';

export default function Home() {
  const navigate = useNavigate();
  const { requests, projects, accountMode, hoursRemaining, hoursAllowance, paused, pauseReason, paymentStatus, paymentDueAt, paymentAmount, baseSlots, extraSlots } = useStore();
  const { client } = useSession();
  const firstName = (client?.name || '').split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const active = requests.filter((item) => item.status === 'active' && !item.isParent);
  const review = requests.filter((item) => item.status === 'review' && !item.isParent);
  const queued = requests.filter((item) => item.status === 'queued' && !item.isParent).sort((a, b) => a.queuePos - b.queuePos);
  const complete = requests.filter((item) => item.status === 'done' && !item.isParent);
  const scopeGroups = requests.filter((item) => item.isParent && ['reviewing', 'proposed'].includes(item.scopeStatus));
  const projectFor = (id) => projects.find((project) => project.id === id);
  const accountNotice = paused
    ? pauseReason === 'payment'
      ? { tone: 'critical', label: 'Transfer overdue', title: 'Production is paused until billing is resolved.', copy: `We have not received the $${paymentAmount.toLocaleString()} plan transfer. Your files and queue are safe.` }
      : { tone: 'paused', label: 'Paused by you', title: 'Production is currently paused.', copy: 'Your queue is saved in place. Resume the subscription whenever you are ready for work to continue.' }
    : paymentStatus === 'overdue'
      ? { tone: 'critical', label: 'Transfer overdue', title: 'Your plan payment needs attention.', copy: `We have not received the $${paymentAmount.toLocaleString()} transfer. Send it to prevent production from pausing.` }
      : paymentStatus === 'due'
        ? { tone: 'payment', label: 'Transfer due soon', title: `Your next plan payment is due ${paymentDueAt}.`, copy: `Please transfer $${paymentAmount.toLocaleString()} by the due date using the billing details on your invoice.` }
        : null;

  return (
    <div className="v3-home">
      <section className="v3-home-hero v3-enter">
        <div>
          <p>{today}</p>
          <h1><span>{firstName ? `${firstName},` : 'Welcome,'}</span><br />{requests.length ? 'work is moving.' : "let's get started."}</h1>
          <div className="v3-hero-actions"><Action onClick={() => navigate(projects.length ? '/requests/new' : '/projects/new')} icon="plus">{projects.length ? 'Start a request' : 'Create project'}</Action>{projects.length > 0 && <button onClick={() => navigate('/messages')}>Talk to your team <Icon name="arrow" size={15} /></button>}</div>
        </div>
        <aside className="v3-now-dial">
          <div><span>Right now</span><strong>{active.length + review.length}</strong><small>items moving</small></div>
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="53" /><circle className="is-progress" cx="60" cy="60" r="53" pathLength="100" strokeDasharray={`${Math.min(100, (active.length + review.length) * 17)} 100`} /></svg>
          <ul><li><i className="is-green" />{active.length} building</li><li><i className="is-yellow" />{review.length} need you</li><li><i className="is-blue" />{queued.length} queued</li></ul>
        </aside>
      </section>

      {accountNotice && <section className={`v3-account-notice is-${accountNotice.tone} v3-enter`} role="status"><span className="v3-account-notice-icon"><Icon name={accountNotice.tone === 'critical' ? 'billing' : 'clock'} size={20} /></span><div><small>{accountNotice.label}</small><strong>{accountNotice.title}</strong><p>{accountNotice.copy}</p></div><button onClick={() => navigate('/billing')}>Review billing <Icon name="arrow" size={15} /></button></section>}

      {!!scopeGroups.length && <section className="v3-home-scope v3-enter"><div><span>Scope desk</span><strong>{scopeGroups.some((item) => item.scopeStatus === 'proposed') ? 'A breakdown needs your decision.' : 'The team is shaping oversized work.'}</strong><p>{scopeGroups.length} request {scopeGroups.length === 1 ? 'group is' : 'groups are'} outside production capacity until the scope is agreed.</p></div><button onClick={() => navigate(`/requests/${scopeGroups.find((item) => item.scopeStatus === 'proposed')?.id || scopeGroups[0].id}`)}>Open scope desk <Icon name="arrow" size={15} /></button></section>}

      <section className="v3-glance v3-enter">
        <button onClick={() => navigate('/requests')}><span>In motion</span><strong>{active.length}</strong><small>{active.map((item) => item.title).join(' · ')}</small></button>
        <button className={review.length ? 'is-hot' : ''} onClick={() => navigate('/requests')}><span>Waiting on you</span><strong>{review.length}</strong><small>{review.length ? 'Open the review queue' : 'Nothing blocked'}</small></button>
        <button onClick={() => navigate('/projects')}><span>Portfolio</span><strong>{projects.filter((project) => project.status === 'active').length}</strong><small>active project workspaces</small></button>
        <button onClick={() => navigate('/billing')}><span>{accountMode === 'retainer' ? 'Care hours' : 'Delivered'}</span><strong>{accountMode === 'retainer' ? hoursRemaining : complete.length}</strong><small>{accountMode === 'retainer' ? `of ${hoursAllowance} remaining` : 'approved this cycle'}</small></button>
      </section>

      <div className="v3-home-workspace">
        <section className="v3-workstream v3-enter">
          <header><div><span>Live workstream</span><h2>What the team is doing</h2></div><button onClick={() => navigate('/requests')}>Open board <Icon name="arrow" size={15} /></button></header>
          <div className="v3-work-lines">
            {active.map((request, index) => {
              const project = projectFor(request.projectId);
              return <button key={request.id} onClick={() => navigate(`/requests/${request.id}`)}><em>{String(index + 1).padStart(2, '0')}</em><ProjectCode project={project} /><span><small>{project?.name} · {request.type}</small><strong>{request.title}</strong><p>{request.changelog?.[0]?.text || request.brief}</p></span><div><Status status={request.status} /><Meter value={request.progress} /></div><Icon name="arrow" /></button>;
            })}
          </div>
          <footer><span><i />{Math.max(0, (baseSlots + extraSlots) - active.length)} of {baseSlots + extraSlots} slots available</span><button onClick={() => navigate(projects.length ? '/requests/new' : '/projects/new')}>{projects.length ? 'Add to the queue' : 'Create project'} <Icon name="plus" size={15} /></button></footer>
        </section>

        <aside className="v3-review-stack v3-enter">
          <header><span>Review desk</span><strong>{review.length}</strong><p>Delivered work waiting for your decision.</p></header>
          <div style={{ '--reviews': review.length }}>
            {review.map((request, index) => <button key={request.id} style={{ '--stack': index }} onClick={() => navigate(`/requests/${request.id}`)}><span><small>{projectFor(request.projectId)?.name}</small><strong>{request.title}</strong><i>Delivered {request.deliveredAt || request.due}</i></span><em>{request.deliverables.length} files</em><Icon name="arrow" size={16} /></button>)}
          </div>
          <button className="v3-review-all" onClick={() => navigate('/requests')}>Review everything <Icon name="arrow" size={15} /></button>
        </aside>
      </div>

      <section className="v3-project-ribbon v3-enter">
        <header><div><span>Portfolio pulse</span><h2>Projects at a glance</h2></div><button onClick={() => navigate('/projects')}>All projects</button></header>
        <div>{projects.map((project) => <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)}><ProjectCode project={project} /><span><strong>{project.name}</strong><small>{project.tagline}</small></span><Meter value={project.progress} /><Status status={project.status} /><Icon name="arrow" size={16} /></button>)}</div>
      </section>

    </div>
  );
}
