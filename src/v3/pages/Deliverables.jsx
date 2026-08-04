import { useMemo, useState } from 'react';
import { projects } from '../../mocks';
import { useStore } from '../../store';
import Icon from '../Icon';
import { PageIntro, ProjectCode } from '../Primitives';

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
    <section className="v3-file-tools v3-enter"><label><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the delivery archive" /></label><div><button className={!project ? 'is-active' : ''} onClick={() => setProject(0)}>All projects</button>{projects.map((item) => <button key={item.id} className={project === item.id ? 'is-active' : ''} onClick={() => setProject(item.id)}>{item.name}</button>)}</div><div><button className={kind === 'all' ? 'is-active' : ''} onClick={() => setKind('all')}>All formats</button>{kinds.map((item) => <button key={item} className={kind === item ? 'is-active' : ''} onClick={() => setKind(item)}>{fileLabels[item] || item}</button>)}</div></section>
    <section className="v3-file-index v3-enter"><header><span>{shown.length} results</span><span>Project / request</span><span>Delivered</span><span>Format</span><span /></header>{shown.map((file, index) => <article key={`${file.id}-${index}`}><em>{String(index + 1).padStart(2, '0')}</em><i className={`is-${file.kind}`}>{fileLabels[file.kind] || file.kind}</i><span><strong>{file.name}</strong><small>{file.size || 'Working file'} · version {file.version || 1}</small></span><span><ProjectCode project={file.project} /><span><strong>{file.project?.name}</strong><small>{file.request}</small></span></span><time>{file.at}</time><b>{fileLabels[file.kind] || file.kind}</b><button aria-label={`Download ${file.name}`}><Icon name="download" size={16} /></button></article>)}</section>
  </div>;
}
