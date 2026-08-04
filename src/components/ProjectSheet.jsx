import { useState } from 'react';
import Sheet from './Sheet';
import FileViewer, { FileTag, FileThumb } from './FileViewer';
import { StatusPill, Avatar, Icon, CatChip, SiteCta } from './ui';
import { store, useStore } from '../store';
import { LAUNCH_BUNDLES } from '../mocks';

export default function ProjectSheet({ project, onClose, onOpenRequest, embedded = false }) {
  const { requests, bundles } = useStore();
  const [viewing, setViewing] = useState(null);
  const projectRequests = requests.filter((request) => request.projectId === project.id);
  const order = { active: 0, review: 1, queued: 2, done: 3 };
  const sortedRequests = [...projectRequests].sort((a, b) => order[a.status] - order[b.status]);
  const allFiles = projectRequests.flatMap((request) => request.deliverables.map((file) => ({ ...file, request: request.title })));
  const crew = [{ ...project.pm, lead: 'Project manager' }, { ...project.am, lead: 'Account manager' }, ...project.members];
  const moving = projectRequests.filter((request) => request.status === 'active').length;
  const review = projectRequests.filter((request) => request.status === 'review').length;
  const complete = projectRequests.filter((request) => request.status === 'done').length;

  const header = (
    <div className="project-detail-header">
      <span className="project-detail-mark">{project.name.slice(0, 2).toUpperCase()}</span>
      <div>
        <span><StatusPill status={project.status} /> Project workspace</span>
        <h2>{project.name}</h2>
        <p>{project.tagline}</p>
      </div>
      <div className="project-detail-header-actions">
        <a href={project.preview.url} target="_blank" rel="noreferrer">Open workspace <Icon.arrow /></a>
      </div>
    </div>
  );

  return (
    <>
      <Sheet onClose={onClose} header={header} width="min(1360px, calc(100vw - 24px))" className="project-detail-sheet" embedded={embedded}>
        <div className="project-detail">
          <section className="project-detail-overview">
            <div className="project-detail-summary">
              <span className="kicker">Project brief</span>
              <p>{project.description}</p>
              <div>{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
            </div>
            <div className="project-detail-progress">
              <span>Overall progress</span>
              <strong>{project.progress}%</strong>
              <div><i style={{ width: `${project.progress}%` }} /></div>
              <small>Started {project.startedAt} · target {project.targetAt}</small>
            </div>
          </section>

          <section className="project-detail-metrics">
            <div><span><Icon.bolt /></span><strong>{moving}</strong><small>Active requests</small></div>
            <div><span><Icon.eye /></span><strong>{review}</strong><small>Waiting for review</small></div>
            <div><span><Icon.check /></span><strong>{complete}</strong><small>Approved</small></div>
            <div><span><Icon.folder /></span><strong>{allFiles.length}</strong><small>Delivered files</small></div>
          </section>

          <div className="project-detail-grid">
            <div className="project-detail-main">
              <section className="project-detail-section">
                <div className="project-detail-section-head">
                  <div><span className="kicker">Current work</span><h3>Request stream</h3></div>
                  <span>{sortedRequests.length} total</span>
                </div>
                <div className="project-request-stream">
                  {sortedRequests.map((request, index) => (
                    <button key={request.id} onClick={() => onOpenRequest(request.id)} style={{ '--row-delay': `${index * 45}ms` }}>
                      <span className="project-request-index">{String(index + 1).padStart(2, '0')}</span>
                      <CatChip category={request.category} size={38} />
                      <span className="project-request-copy">
                        <small>{request.type}</small>
                        <strong>{request.title}</strong>
                        <i>
                          {request.status === 'active' && `${request.progress}% complete · due ${request.due}`}
                          {request.status === 'review' && `Delivered ${request.deliveredAt} · ready for review`}
                          {request.status === 'done' && `Approved ${request.approvedAt}`}
                          {request.status === 'queued' && `Queue position ${request.queuePos}`}
                        </i>
                      </span>
                      <StatusPill status={request.status} />
                      <span className="project-request-arrow"><Icon.arrow /></span>
                    </button>
                  ))}
                  {sortedRequests.length === 0 && <p className="project-detail-empty">No requests have been added to this project.</p>}
                </div>
              </section>

              {project.progress >= 90 && (
                <section className="project-detail-section launch-bundle-section">
                  <div className="project-detail-section-head"><div><span className="kicker">Launch</span><h3>Finish the rollout</h3></div><span>One-time bundles</span></div>
                  <div className="launch-bundle-grid">
                    {LAUNCH_BUNDLES.map((bundle) => (
                      <article key={bundle.id} className={bundles.includes(bundle.id) ? 'is-bought' : ''}>
                        <span>{bundles.includes(bundle.id) ? 'Purchased' : 'Launch bundle'}</span>
                        <h4>{bundle.name}</h4><strong>${bundle.price}</strong>
                        <p>{bundle.includes.join(' · ')}</p>
                        <button onClick={() => store.buyBundle(bundle.id)}>{bundles.includes(bundle.id) ? 'Added' : 'Add bundle'}</button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="project-detail-section">
                <div className="project-detail-section-head">
                  <div><span className="kicker">Latest build</span><h3>{project.preview.kind === 'html' ? 'Live workspace' : 'Design workspace'}</h3></div>
                  <a href={project.preview.url} target="_blank" rel="noreferrer">Open <Icon.arrow /></a>
                </div>
                <div className="project-workspace-preview">
                  <div className="project-preview-bar"><i /><i /><i /><span>{project.preview.url}</span></div>
                  <div className={`project-preview-stage is-${project.preview.kind}`}>
                    <span><Icon.layers /></span>
                    <small>{project.preview.label}</small>
                    <strong>{project.name}</strong>
                    <p>{project.preview.kind === 'html' ? 'Staging environment connected' : 'Shared design source connected'}</p>
                  </div>
                </div>
              </section>

              <section className="project-detail-section">
                <div className="project-detail-section-head">
                  <div><span className="kicker">Deliverables</span><h3>Project files</h3></div>
                  <span>{allFiles.length} files</span>
                </div>
                <div className="project-file-list">
                  {allFiles.map((file) => (
                    <button key={file.id} onClick={() => setViewing(file)}>
                      <FileThumb kind={file.kind} />
                      <span><strong>{file.name}</strong><small>{file.request} · {file.at}</small></span>
                      <FileTag kind={file.kind} />
                      <i className={file.current ? 'is-current' : ''}>v{file.version}</i>
                      <em><Icon.download /></em>
                    </button>
                  ))}
                  {allFiles.length === 0 && <p className="project-detail-empty">Delivered files will appear here.</p>}
                </div>
              </section>
            </div>

            <aside className="project-detail-aside">
              <section>
                <div className="project-detail-section-head">
                  <div><span className="kicker">Your team</span><h3>Assigned crew</h3></div>
                  <span>{crew.length}</span>
                </div>
                <div className="project-team-list">
                  {crew.map((member, index) => (
                    <div key={`${member.name}-${index}`}>
                      <Avatar name={member.name} size={38} online={member.online} />
                      <span><strong>{member.name}</strong><small>{member.role}</small></span>
                      {member.lead && <i>{member.lead}</i>}
                    </div>
                  ))}
                </div>
                <SiteCta className="site-cta-compact" icon={<Icon.chat />}>Message team</SiteCta>
              </section>

              <section className="project-detail-dates">
                <span className="kicker">Schedule</span>
                <div><small>Started</small><strong>{project.startedAt}</strong></div>
                <i />
                <div><small>Target delivery</small><strong>{project.targetAt}</strong></div>
              </section>
            </aside>
          </div>
        </div>
      </Sheet>

      {viewing && <FileViewer file={{ ...viewing, project: project.name }} onClose={() => setViewing(null)} />}
    </>
  );
}
