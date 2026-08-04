import { useNavigate, useParams } from 'react-router-dom';
import { projects } from '../../mocks';
import { useStore } from '../../store';
import Icon from '../Icon';
import { Action, Avatar, Meter, ProjectCode, Status } from '../Primitives';

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { requests } = useStore();
  const project = projects.find((item) => String(item.id) === String(projectId));
  if (!project) return <section className="v3-missing"><h1>Project not found</h1><Action onClick={() => navigate('/projects')}>Back to projects</Action></section>;
  const work = requests.filter((item) => item.projectId === project.id);
  const files = work.flatMap((item) => item.deliverables.map((file) => ({ ...file, request: item.title })));
  return <div className="v3-project-record"><header><button onClick={() => navigate('/projects')}><Icon name="back" /></button><ProjectCode project={project} /><div><span><Status status={project.status} />{project.stack.join(' · ')}</span><h1>{project.name}</h1><p>{project.description}</p></div><Action icon="plus" onClick={() => navigate('/requests/new')}>Add request</Action></header>
    <section className="v3-project-progress"><div><span>Portfolio progress</span><strong>{project.progress}%</strong></div><Meter value={project.progress} /><p><span><small>Started</small><strong>{project.startedAt}</strong></span><span><small>Target</small><strong>{project.targetAt}</strong></span><span><small>Requests</small><strong>{work.length}</strong></span><span><small>Files</small><strong>{files.length}</strong></span></p></section>
    <div className="v3-project-record-grid"><main><section className="v3-project-work"><header><span>Project work</span><button onClick={() => navigate('/requests')}>Open board</button></header>{work.map((request, index) => <button key={request.id} onClick={() => navigate(`/requests/${request.id}`)}><em>{String(index + 1).padStart(2, '0')}</em><span><small>{request.type}</small><strong>{request.title}</strong></span><Status status={request.status} />{request.progress !== undefined && <Meter value={request.progress} />}<Icon name="arrow" /></button>)}</section><section className="v3-project-preview"><header><span>Live workspace</span><a href={project.preview.url} target="_blank" rel="noreferrer">Open build <Icon name="external" size={14} /></a></header><div><i><Icon name="site" size={30} /></i><span>{project.preview.label}</span><h2>{project.name}</h2><p>{project.preview.url}</p></div></section><section className="v3-project-files"><header><span>Recent deliverables</span><strong>{files.length}</strong></header>{files.slice(0, 5).map((file) => <button key={file.id}><i>{file.kind.toUpperCase()}</i><span><strong>{file.name}</strong><small>{file.request} · {file.at}</small></span><Icon name="download" /></button>)}</section></main><aside><section><span>Project crew</span>{[project.pm, project.am, ...project.members].map((person) => <button key={person.id} onClick={() => navigate('/messages')}><Avatar name={person.name} online={person.online} /><span><strong>{person.name}</strong><small>{person.role}</small></span><Icon name="messages" size={15} /></button>)}</section><section><span>Project brief</span><p>{project.tagline}</p><strong>{project.stack.join(' / ')}</strong></section></aside></div>
  </div>;
}
