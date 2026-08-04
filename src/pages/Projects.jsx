import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects } from '../mocks';
import { StatusPill, Avatar, Icon, SiteCta } from '../components/ui';
import { useStore } from '../store';

export default function Projects() {
  const navigate = useNavigate();
  const { requests } = useStore();
  const [filter, setFilter] = useState('all');

  const visibleProjects = filter === 'all' ? projects : projects.filter((project) => project.status === filter);
  const activeRequests = requests.filter((request) => request.status === 'active').length;
  const delivered = requests.filter((request) => request.status === 'done').length;
  const averageProgress = Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length);

  return (
    <>
      <header className="page-head projects-page-head anim-rise">
        <div>
          <span className="kicker">Portfolio</span>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Every workstream, request, team member, and delivery in one place.</p>
        </div>
        <SiteCta className="site-cta-compact" icon={<Icon.plus />} onClick={() => navigate('/projects/new')}>New project</SiteCta>
      </header>

      <section className="project-metrics anim-rise" style={{ animationDelay: '0.04s' }}>
        <div><span>Projects</span><strong>{projects.length}</strong><small>{projects.filter((project) => project.status === 'active').length} currently active</small></div>
        <div><span>Requests moving</span><strong>{activeRequests}</strong><small>Across all workstreams</small></div>
        <div><span>Delivered</span><strong>{delivered}</strong><small>Approved requests</small></div>
        <div><span>Portfolio progress</span><strong>{averageProgress}%</strong><small>Average completion</small></div>
      </section>

      <section className="portal-filterbar projects-filterbar anim-rise" style={{ animationDelay: '0.08s' }}>
        <div className="portal-filter-heading"><div><Icon.layers /><span><strong>Project view</strong><small>Filter by current status</small></span></div><em><i /> Updated just now</em></div>
        <div className="portal-filter-group">
          <span>Status</span>
          <div className="portal-filter-options">
            {['all', 'active', 'paused'].map((item) => (
              <button key={item} className={`portal-filter-chip ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)}>
                <span>{item === 'all' ? 'All projects' : item}</span><i>{item === 'all' ? projects.length : projects.filter((project) => project.status === item).length}</i>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="project-portfolio-grid">
        {visibleProjects.map((project, index) => {
          const projectRequests = requests.filter((request) => request.projectId === project.id);
          const moving = projectRequests.filter((request) => request.status === 'active').length;
          const review = projectRequests.filter((request) => request.status === 'review').length;
          const crew = [project.pm, project.am, ...project.members];
          return (
            <article
              key={project.id}
              className="project-portfolio-card anim-rise"
              style={{ animationDelay: `${0.1 + index * 0.07}s` }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="project-card-top">
                <span className="project-card-mark">{project.name.slice(0, 2).toUpperCase()}</span>
                <StatusPill status={project.status} />
                <button aria-label={`Open ${project.name}`}><Icon.arrow /></button>
              </div>
              <div className="project-card-copy">
                <span>{project.stack.join(' / ')}</span>
                <h2>{project.name}</h2>
                <p>{project.tagline}</p>
              </div>
              <div className="project-card-progress">
                <div><span>Overall progress</span><strong>{project.progress}%</strong></div>
                <div><i style={{ width: `${project.progress}%` }} /></div>
              </div>
              <div className="project-card-stats">
                <span><strong>{projectRequests.length}</strong><small>Requests</small></span>
                <span><strong>{moving}</strong><small>Moving</small></span>
                <span><strong>{review}</strong><small>In review</small></span>
                <span><strong>{project.targetAt}</strong><small>Target</small></span>
              </div>
              <div className="project-card-foot">
                <div className="project-card-crew">
                  {crew.slice(0, 4).map((member, memberIndex) => <span key={`${member.name}-${memberIndex}`} style={{ zIndex: 5 - memberIndex }}><Avatar name={member.name} size={31} online={member.online} /></span>)}
                  {crew.length > 4 && <i>+{crew.length - 4}</i>}
                </div>
                <span><strong>{project.pm.name}</strong><small>Project lead</small></span>
              </div>
            </article>
          );
        })}
      </div>

    </>
  );
}
