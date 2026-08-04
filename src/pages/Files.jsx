import { useMemo, useState } from 'react';
import { projects } from '../mocks';
import { Icon, SiteCta } from '../components/ui';
import FileViewer, { FileTag, FileThumb, FTAG } from '../components/FileViewer';
import { useStore } from '../store';
import { downloadMock } from '../utils/download';

export default function Files() {
  const { requests } = useStore();
  const [projectId, setProjectId] = useState(0);
  const [requestId, setRequestId] = useState(0);
  const [kind, setKind] = useState('all');
  const [version, setVersion] = useState('latest');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);

  const files = useMemo(() => requests.flatMap((request) =>
    request.deliverables.map((file) => ({
      ...file,
      requestId: request.id,
      request: request.title,
      projectId: request.projectId,
      project: projects.find((project) => project.id === request.projectId)?.name,
    }))
  ), [requests]);

  const kinds = [...new Set(files.map((file) => file.kind))];
  const requestOptions = requests.filter((request) => request.deliverables.length && (!projectId || request.projectId === projectId));
  const latestCount = files.filter((file) => file.current !== false).length;
  const archivedCount = files.length - latestCount;
  const projectCount = new Set(files.map((file) => file.projectId)).size;
  const activeFilterCount = Number(Boolean(projectId)) + Number(Boolean(requestId)) + Number(kind !== 'all') + Number(version !== 'all') + Number(Boolean(query.trim()));

  const shown = files.filter((file) =>
    (!projectId || file.projectId === projectId) &&
    (!requestId || file.requestId === requestId) &&
    (kind === 'all' || file.kind === kind) &&
    (version === 'all' || (version === 'latest' ? file.current !== false : file.current === false)) &&
    `${file.name} ${file.project} ${file.request}`.toLowerCase().includes(query.toLowerCase())
  );

  const clearFilters = () => {
    setProjectId(0);
    setRequestId(0);
    setKind('all');
    setVersion('latest');
    setQuery('');
  };

  return (
    <>
      <header className="page-head deliverables-head anim-rise">
        <div>
          <span className="kicker">Asset library</span>
          <h1 className="page-title">Deliverables</h1>
          <p className="page-sub">Every approved file and working version, organized by project and request.</p>
        </div>
        <div className="deliverables-head-meta">
          <span><i /> Synced just now</span>
          <strong>{files.length} files</strong>
        </div>
      </header>

      <section className="deliverable-metrics anim-rise" style={{ animationDelay: '0.04s' }}>
        <div><span><Icon.folder /></span><strong>{files.length}</strong><small>Total files</small></div>
        <div><span><Icon.check /></span><strong>{latestCount}</strong><small>Latest versions</small></div>
        <div><span><Icon.layers /></span><strong>{archivedCount}</strong><small>Previous versions</small></div>
        <div><span><Icon.cube /></span><strong>{projectCount}</strong><small>Projects delivered</small></div>
      </section>

      <section className="deliverable-filter-console portal-filterbar anim-rise" style={{ animationDelay: '0.08s' }}>
        <div className="portal-filter-heading"><div><Icon.layers /><span><strong>Filter library</strong><small>Narrow files by version, project, type, or request</small></span></div>{activeFilterCount > 1 && <button onClick={clearFilters}>Reset <Icon.x /></button>}</div>
        <div className="deliverable-filter-top">
          <label className="deliverable-search">
            <span><Icon.eye /></span>
            <input placeholder="Search files, requests, or projects" value={query} onChange={(event) => setQuery(event.target.value)} />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon.x /></button>}
          </label>
          <div className="deliverable-version-toggle">
            {[
              ['latest', 'Latest'],
              ['archived', 'Previous'],
              ['all', 'All versions'],
            ].map(([value, label]) => <button key={value} className={version === value ? 'is-active' : ''} onClick={() => setVersion(value)}>{label}</button>)}
          </div>
        </div>

        <div className="deliverable-filter-row portal-filter-group">
          <span>Project</span>
          <div className="deliverable-pills portal-filter-options">
            <button className={`portal-filter-chip ${!projectId ? 'is-active' : ''}`} onClick={() => { setProjectId(0); setRequestId(0); }}><span>All projects</span><i>{files.length}</i></button>
            {projects.map((project) => {
              const count = files.filter((file) => file.projectId === project.id).length;
              return <button key={project.id} className={`portal-filter-chip ${projectId === project.id ? 'is-active' : ''}`} onClick={() => { setProjectId(project.id); setRequestId(0); }}><span>{project.name}</span><i>{count}</i></button>;
            })}
          </div>
        </div>

        <div className="deliverable-filter-row portal-filter-group">
          <span>File type</span>
          <div className="deliverable-pills portal-filter-options">
            <button className={`portal-filter-chip ${kind === 'all' ? 'is-active' : ''}`} onClick={() => setKind('all')}><span>All types</span><i>{files.length}</i></button>
            {kinds.map((fileKind) => {
              const count = files.filter((file) => file.kind === fileKind).length;
              return <button key={fileKind} className={`portal-filter-chip ${kind === fileKind ? 'is-active' : ''}`} onClick={() => setKind(fileKind)}><span>{FTAG[fileKind] || fileKind.toUpperCase()}</span><i>{count}</i></button>;
            })}
          </div>
        </div>

        {requestOptions.length > 0 && (
          <div className="deliverable-filter-row portal-filter-group is-request">
            <span>Request</span>
            <div className="deliverable-pills portal-filter-options">
              <button className={`portal-filter-chip ${!requestId ? 'is-active' : ''}`} onClick={() => setRequestId(0)}><span>All requests</span><i>{requestOptions.length}</i></button>
              {requestOptions.map((request) => (
                <button key={request.id} className={`portal-filter-chip ${requestId === request.id ? 'is-active' : ''}`} onClick={() => setRequestId(request.id)}>
                  <span>{request.title}</span><i>{request.deliverables.length}</i>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="deliverable-filter-foot">
          <span>Showing <strong>{shown.length}</strong> of {files.length} files</span>
        </div>
      </section>

      {shown.length === 0 ? (
        <section className="deliverables-empty anim-rise">
          <span><Icon.folder /></span>
          <h2>No deliverables found</h2>
          <p>Adjust the active pills or search for a different file.</p>
          <SiteCta className="site-cta-compact" icon={<Icon.x />} onClick={clearFilters}>Clear filters</SiteCta>
        </section>
      ) : (
        <section className="deliverables-library">
          <div className="deliverables-library-head">
            <div><span className="kicker">Library</span><h2>{version === 'latest' ? 'Latest deliverables' : version === 'archived' ? 'Previous versions' : 'All deliverables'}</h2></div>
            <span>{shown.length} result{shown.length === 1 ? '' : 's'}</span>
          </div>
          <div className="deliverable-card-grid">
            {shown.map((file, index) => (
              <article
                key={file.id}
                className={`deliverable-card anim-rise ${file.current === false ? 'is-archived' : ''}`}
                style={{ animationDelay: `${index * 0.045}s` }}
                onClick={() => setViewing(file)}
              >
                <div className={`deliverable-card-preview is-${file.kind}`}>
                  <div className="deliverable-card-chrome"><i /><i /><i /><span>{file.project}</span></div>
                  <span className="deliverable-project-badge"><Icon.layers />{file.project}</span>
                  <span className="deliverable-card-glyph"><FileThumb kind={file.kind} /></span>
                  <div className="deliverable-card-badges">
                    <FileTag kind={file.kind} />
                    <span className={file.current === false ? '' : 'is-latest'}>{file.current === false ? `Version ${file.version}` : 'Latest'}</span>
                  </div>
                </div>
                <div className="deliverable-card-body">
                  <h3>{file.name}</h3>
                  <div className="deliverable-identifiers">
                    <span className="identity-pill is-project"><Icon.layers />{file.project}</span>
                    <span className="identity-pill is-request"><Icon.bolt />{file.request}</span>
                  </div>
                  <div>
                    <span className="identity-pill is-delivered"><Icon.check />Delivered {file.at}</span>
                    {file.size && file.size !== '—' && <span className="deliverable-size">{file.size}</span>}
                    <button onClick={(event) => { event.stopPropagation(); downloadMock(file.name, `${file.name}\n${file.project}\n${file.request}`); }} aria-label={`Download ${file.name}`}><Icon.download /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
