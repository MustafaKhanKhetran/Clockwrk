import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects } from '../../mocks';
import { useStore } from '../../store';
import Icon from '../Icon';
import { Action, Avatar, Meter, PageIntro, ProjectCode, Status } from '../Primitives';

export default function Projects() {
  const navigate = useNavigate();
  const { requests } = useStore();
  const [filter, setFilter] = useState('all');
  const shown = projects.filter((project) => filter === 'all' || project.status === filter);
  return <div className="v3-projects-page"><PageIntro index="Portfolio" title="Projects" copy="Each workspace keeps its strategy, requests, people, builds, and delivery history together." action={<Action icon="plus" onClick={() => navigate('/projects/new')}>New project</Action>} />
    <section className="v3-project-switch v3-enter"><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All <i>{projects.length}</i></button><button className={filter === 'active' ? 'is-active' : ''} onClick={() => setFilter('active')}>Active <i>{projects.filter((item) => item.status === 'active').length}</i></button><button className={filter === 'paused' ? 'is-active' : ''} onClick={() => setFilter('paused')}>Paused <i>{projects.filter((item) => item.status === 'paused').length}</i></button></section>
    <section className="v3-project-list v3-enter">{shown.map((project, index) => { const projectRequests = requests.filter((item) => item.projectId === project.id); return <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)}><em>{String(index + 1).padStart(2, '0')}</em><ProjectCode project={project} /><div className="v3-project-name"><span><Status status={project.status} />{project.stack.map((item) => <i key={item}>{item}</i>)}</span><h2>{project.name}</h2><p>{project.description}</p></div><div className="v3-project-crew"><span>{[project.pm, ...project.members].slice(0, 4).map((person) => <Avatar key={person.id} name={person.name} size="xs" online={person.online} />)}</span><small>{project.members.length + 2} people</small></div><div className="v3-project-data"><Meter value={project.progress} /><span><strong>{projectRequests.filter((item) => item.status === 'active').length}</strong> active</span><span><strong>{projectRequests.filter((item) => item.status === 'done').length}</strong> shipped</span></div><Icon name="arrow" /></button>; })}</section>
  </div>;
}
