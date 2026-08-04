import { useMemo, useState } from 'react';
import { projects } from '../../mocks';
import { useStore } from '../../store';
import Icon from '../Icon';
import { FileMark, PageIntro, ProjectCode } from '../Primitives';

const fileLabels = { pdf: 'PDF', figma: 'FIG', zip: 'ZIP', html: 'LIVE', code: 'CODE', svg: 'SVG', icon: 'ICON', video: 'VIDEO', img: 'IMAGE', png: 'PNG' };

export default function Deliverables() {
  const { requests } = useStore();
  const [project, setProject] = useState(0);
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const files = useMemo(() => requests.flatMap((request) => request.deliverables.map((file) => ({ ...file, requestId: request.id, request: request.title, projectId: request.projectId, project: projects.find((item) => item.id === request.projectId) }))), [requests]);
  const kinds = [...new Set(files.map((file) => file.kind))];
  const shown = files.filter((file) => (!project || file.projectId === project) && (kind === 'all' || file.kind === kind) && `${file.name} ${file.request} ${file.project?.name}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="v3-files-page"><PageIntro index="Delivery archive" title="Deliverables" copy="Production files, source packages, live builds, and every version your team has shipped." />
    <section className="v3-delivery-summary v3-enter"><div><span>Available files</span><strong>{files.length}</strong></div><div><span>Project workspaces</span><strong>{new Set(files.map((file) => file.projectId)).size}</strong></div><div><span>Latest delivery</span><strong>{files[0]?.at || '—'}</strong></div></section>
    <section className="v3-file-tools v3-enter"><label><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files, requests, or projects" /></label><div aria-label="Filter by project"><span>Project</span><button className={!project ? 'is-active' : ''} onClick={() => setProject(0)}>All</button>{projects.map((item) => <button key={item.id} className={project === item.id ? 'is-active' : ''} onClick={() => setProject(item.id)}>{item.name}</button>)}</div><div aria-label="Filter by format"><span>Format</span><button className={kind === 'all' ? 'is-active' : ''} onClick={() => setKind('all')}>All</button>{kinds.map((item) => <button key={item} className={kind === item ? 'is-active' : ''} onClick={() => setKind(item)}>{fileLabels[item] || item}</button>)}</div></section>
    <section className="v3-file-index v3-enter"><header><div><span>Delivery index</span><strong>{shown.length} {shown.length === 1 ? 'file' : 'files'}</strong></div><small>Every file stays attached to its request and project.</small></header><div>{shown.map((file) => <article key={file.id}><FileMark kind={file.kind} /><div className="v3-file-primary"><strong>{file.name}</strong><small>{file.size || 'Working file'} · version {file.version || 1}</small></div><div className="v3-file-context"><ProjectCode project={file.project} /><span><strong>{file.project?.name}</strong><small>{file.request}</small></span></div><div className="v3-file-meta"><span><Icon name="calendar" size={14} />{file.at}</span><span>{file.current ? 'Latest version' : 'Previous version'}</span></div><button aria-label={`Download ${file.name}`}><Icon name="download" size={17} /></button></article>)}{!shown.length && <div className="v3-file-empty"><Icon name="search" size={22} /><strong>No matching files</strong><span>Try another project, format, or search term.</span></div>}</div></section>
  </div>;
}
