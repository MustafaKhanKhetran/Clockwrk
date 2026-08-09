import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { api, uploadFile } from '../api';
import { usePortalBack } from '../navigation';
import { Action, FileMark, Status } from '../Primitives';
import { LINK_KINDS, RESOURCE_KINDS } from '../projectTypes';

const LINK_ICON = {
  production: 'site', staging: 'browser', figma: 'figma', prototype: 'vector',
  github: 'code', appstore: 'requests', docs: 'file', other: 'external',
};
const ACTIVITY_COPY = {
  request_created: 'Request created',
  request_delivered: 'Request delivered',
  comment: 'Comment added',
  file: 'File uploaded',
  message: 'Message sent',
};

export default function ProjectDetail() {
  const navigate = useNavigate();
  const goBack = usePortalBack('/projects');
  const { projectId } = useParams();
  const { requests, account } = useStore();
  const fileInput = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [brief, setBrief] = useState({ goal: '', audience: '', success_measure: '', target_date: '' });
  const [savingBrief, setSavingBrief] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ kind: 'production', label: '', url: '' });
  const [resourceDraft, setResourceDraft] = useState({ kind: 'brand', title: '', url: '' });
  const [addingLink, setAddingLink] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.project(projectId);
      setData(res);
      setBrief({
        goal: res.project.goal || '',
        audience: res.project.audience || '',
        success_measure: res.project.successMeasure || '',
        target_date: res.project.targetAt ? res.project.targetAt.slice(0, 10) : '',
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <section className="v3-empty-panel"><span>Loading project…</span></section>;
  if (error || !data) {
    return <section className="v3-missing"><h1>{error || 'Project not found'}</h1><Action onClick={goBack}>Go back</Action></section>;
  }

  const { project, summary, activity } = data;
  const work = requests.filter((item) => String(item.projectId) === String(project.id));
  const current = work.filter((item) => item.status !== 'done');
  const deliveredRecently = work.filter((item) => item.status === 'done').slice(0, 3);
  const files = work.flatMap((item) => (item.deliverables || []).map((file) => ({ ...file, request: item.title })));
  const primaryLink = project.links.find((l) => l.kind === 'production') || project.links[0];

  const saveBrief = async () => {
    setSavingBrief(true);
    try {
      await api.updateProject(project.id, {
        goal: brief.goal,
        audience: brief.audience,
        success_measure: brief.success_measure,
        target_date: brief.target_date || null,
      });
      await load();
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not save the brief.');
    } finally {
      setSavingBrief(false);
    }
  };

  const addLink = async () => {
    if (!linkDraft.url.trim()) return;
    setBusy(true);
    try {
      const preset = LINK_KINDS.find((k) => k.id === linkDraft.kind);
      await api.addProjectLink(project.id, { ...linkDraft, label: linkDraft.label.trim() || preset.label });
      setLinkDraft({ kind: 'production', label: '', url: '' });
      setAddingLink(false);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const addResource = async () => {
    if (!resourceDraft.title.trim() || !resourceDraft.url.trim()) return;
    setBusy(true);
    try {
      await api.addProjectResource(project.id, resourceDraft);
      setResourceDraft({ kind: 'brand', title: '', url: '' });
      setAddingResource(false);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const uploadResource = async (event) => {
    const chosen = [...event.target.files];
    if (!chosen.length) return;
    setBusy(true);
    try {
      for (const file of chosen) {
        const up = await uploadFile(file);
        await api.addProjectResource(project.id, { kind: resourceDraft.kind, title: up.name, file_url: up.url, file_name: up.name });
      }
      await load();
    } catch (err) { setError(err.message); } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const remove = async (fn, id) => { setBusy(true); try { await fn(project.id, id); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteConfirmation('');
    setDeleteError('');
  };

  const deleteProject = async () => {
    if (deleteConfirmation.trim() !== project.name) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteProject(project.id);
      await store.loadFromApi();
      navigate('/projects', { replace: true });
    } catch (err) {
      setDeleteError(err.message || 'Could not delete this project.');
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return <div className="v3-project-record">
    {/* ── Header: identity, objective, primary actions ── */}
    <header>
      <button onClick={goBack} aria-label="Back to previous page"><Icon name="back" /></button>
      {project.logoUrl
        ? <img className="v3-project-logo" src={project.logoUrl} alt="" />
        : <span className="v3-project-emoji is-lg">{project.icon}</span>}
      <div>
        <span><Status status={project.status} />{project.type}{project.targetAt && <> · Target {fmt(project.targetAt)}</>}</span>
        <h1>{project.name}</h1>
        <p>{project.description || project.goal || 'No objective set yet.'}</p>
      </div>
      <div className="v3-record-actions">
        <Action icon="plus" onClick={() => navigate(`/requests/new?project=${project.id}`)}>New request</Action>
        <button onClick={() => navigate(`/messages?project=${project.id}`)}><Icon name="messages" size={16} />Message Clockwrk</button>
        {primaryLink && <a className="v3-ghost-link" href={primaryLink.url} target="_blank" rel="noreferrer">Open project <Icon name="external" size={14} /></a>}
        {account?.portal_role === 'admin' && <button className="v3-delete-project" onClick={() => setDeleteOpen(true)}><Icon name="trash" size={15} />Delete project</button>}
      </div>
    </header>

    {/* ── Work summary: counts, not a completion percentage ── */}
    <section className="v3-work-summary">
      {[['In progress', summary.inProgress, 'is-active'], ['Needs your review', summary.needsReview, 'is-review'],
        ['Up next', summary.upNext, 'is-queued'], ['Delivered', summary.delivered, 'is-done']].map(([label, value, cls]) => (
        <button key={label} className={cls} onClick={() => navigate(`/requests?project=${project.id}`)}>
          <strong>{value}</strong><span>{label}</span>
        </button>
      ))}
    </section>

    <div className="v3-project-record-grid">
      <main>
        {/* ── Current work (not a second kanban) ── */}
        <section className="v3-project-work">
          <header><span>Current work</span><button onClick={() => navigate(`/requests?project=${project.id}`)}>Open request board <Icon name="arrow" size={14} /></button></header>
          {!current.length && !deliveredRecently.length && <p className="v3-chat-note">No requests yet. Start one and it will appear here.</p>}
          {current.map((request, index) => <button key={request.id} onClick={() => navigate(`/requests/${request.id}`)}>
            <em>{String(index + 1).padStart(2, '0')}</em>
            <span><small>{request.type}</small><strong>{request.title}</strong></span>
            <Status status={request.status} />
            <Icon name="arrow" />
          </button>)}
          {!!deliveredRecently.length && <><span className="v3-subhead">Recently delivered</span>
            {deliveredRecently.map((request) => <button key={request.id} className="is-muted" onClick={() => navigate(`/requests/${request.id}`)}>
              <em>✓</em><span><small>{request.type}</small><strong>{request.title}</strong></span><Status status="done" /><Icon name="arrow" />
            </button>)}</>}
        </section>

        {/* ── Project links ── */}
        <section className="v3-project-links">
          <header><span>Project links</span><button onClick={() => setAddingLink(!addingLink)}><Icon name={addingLink ? 'close' : 'plus'} size={14} />{addingLink ? 'Cancel' : 'Add link'}</button></header>
          {addingLink && <div className="v3-inline-add">
            <select value={linkDraft.kind} onChange={(e) => setLinkDraft({ ...linkDraft, kind: e.target.value })}>{LINK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
            <input value={linkDraft.url} onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })} placeholder="https://" />
            <button type="button" onClick={addLink} disabled={busy || !linkDraft.url.trim()}>Save</button>
          </div>}
          {!project.links.length && !addingLink && <p className="v3-chat-note">No links yet — add the live site, Figma file, or repository.</p>}
          <div className="v3-link-grid">
            {project.links.map((link) => <div key={link.id}>
              <a href={link.url} target="_blank" rel="noreferrer"><i><Icon name={LINK_ICON[link.kind] || 'external'} size={17} /></i><span><strong>{link.label}</strong><small>{LINK_KINDS.find((k) => k.id === link.kind)?.label}</small></span><Icon name="external" size={14} /></a>
              <button onClick={() => remove(api.removeProjectLink, link.id)} aria-label={`Remove ${link.label}`}><Icon name="close" size={13} /></button>
            </div>)}
          </div>
        </section>

        {/* ── Project resources: client inputs, distinct from deliverables ── */}
        <section className="v3-project-resources">
          <header><div><span>Project resources</span><small>Material you supply to Clockwrk — brand kit, briefs, references</small></div><button onClick={() => setAddingResource(!addingResource)}><Icon name={addingResource ? 'close' : 'plus'} size={14} />{addingResource ? 'Cancel' : 'Add'}</button></header>
          {addingResource && <>
            <div className="v3-inline-add">
              <select value={resourceDraft.kind} onChange={(e) => setResourceDraft({ ...resourceDraft, kind: e.target.value })}>{RESOURCE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
              <input value={resourceDraft.title} onChange={(e) => setResourceDraft({ ...resourceDraft, title: e.target.value })} placeholder="Title" />
              <input value={resourceDraft.url} onChange={(e) => setResourceDraft({ ...resourceDraft, url: e.target.value })} placeholder="https://" />
              <button type="button" onClick={addResource} disabled={busy || !resourceDraft.title.trim() || !resourceDraft.url.trim()}>Save</button>
            </div>
            <input ref={fileInput} type="file" multiple hidden onChange={uploadResource} />
            <button className="v3-upload" onClick={() => fileInput.current?.click()} disabled={busy}><Icon name="attach" /><span><strong>{busy ? 'Uploading…' : 'Upload a document'}</strong><small>Added as “{RESOURCE_KINDS.find((k) => k.id === resourceDraft.kind)?.label}”</small></span></button>
          </>}
          {!project.resources.length && !addingResource && <p className="v3-chat-note">Nothing shared yet. Add brand guidelines, requirements, or references.</p>}
          <div className="v3-resource-list">
            {project.resources.map((item) => <div key={item.id}>
              <FileMark kind={item.file_url ? 'file' : 'html'} size="sm" />
              <span><strong>{item.title}</strong><small>{RESOURCE_KINDS.find((k) => k.id === item.kind)?.label}</small></span>
              <a href={item.file_url || item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><Icon name={item.file_url ? 'download' : 'external'} size={16} /></a>
              <button onClick={() => remove(api.removeProjectResource, item.id)} aria-label={`Remove ${item.title}`}><Icon name="close" size={13} /></button>
            </div>)}
          </div>
        </section>

        {/* ── Recent deliverables: preview only ── */}
        <section className="v3-project-files">
          <header><div><span>Recent deliverables</span><small>Files produced by Clockwrk</small></div><button onClick={() => navigate(`/deliverables?project=${project.id}`)}>View all <Icon name="arrow" size={14} /></button></header>
          {!files.length && <p className="v3-chat-note">Delivered files will appear here.</p>}
          {files.slice(0, 4).map((file) => <a key={file.id} href={file.url || undefined} target="_blank" rel="noreferrer" download className={file.url ? '' : 'is-unavailable'}>
            <FileMark kind={file.kind} /><span><strong>{file.name}</strong><small>{file.request} · {file.at}</small></span><Icon name="download" />
          </a>)}
        </section>
      </main>

      <aside>
        {/* ── Project brief, editable ── */}
        <section className="v3-project-brief">
          <header><span>Project brief</span><button onClick={() => (editing ? saveBrief() : setEditing(true))} disabled={savingBrief}>{savingBrief ? 'Saving…' : editing ? 'Save' : 'Edit'}</button></header>
          {editing ? <div className="v3-brief-edit">
            <label><span>Goal</span><textarea value={brief.goal} onChange={(e) => setBrief({ ...brief, goal: e.target.value })} /></label>
            <label><span>Audience</span><input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} /></label>
            <label><span>Success measure</span><input value={brief.success_measure} onChange={(e) => setBrief({ ...brief, success_measure: e.target.value })} /></label>
            <label><span>Target date</span><input type="date" value={brief.target_date} onChange={(e) => setBrief({ ...brief, target_date: e.target.value })} /></label>
          </div> : <dl>
            <dt>Goal</dt><dd>{project.goal || '—'}</dd>
            <dt>Audience</dt><dd>{project.audience || '—'}</dd>
            <dt>Success measure</dt><dd>{project.successMeasure || '—'}</dd>
            <dt>Target date</dt><dd>{fmt(project.targetAt) || 'Not set'}</dd>
            <dt>Started</dt><dd>{fmt(project.startedAt) || '—'}</dd>
          </dl>}
        </section>

        {/* ── Recent activity ── */}
        <section className="v3-project-activity">
          <header><span>Recent activity</span></header>
          {!activity.length && <p className="v3-chat-note">Activity will appear as work moves.</p>}
          {activity.map((item, index) => <div key={`${item.kind}-${index}`}>
            <i />
            <span><strong>{ACTIVITY_COPY[item.kind] || 'Update'}</strong><small>{item.subject}</small></span>
            <time>{item.at}</time>
          </div>)}
        </section>
      </aside>
    </div>
    {deleteOpen && <div className="v3-dialog-layer" onMouseDown={closeDelete}>
      <section className="v3-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-project-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><span>Delete project</span><button onClick={closeDelete} disabled={deleting} aria-label="Close dialog"><Icon name="close" size={17} /></button></header>
        <div className="v3-delete-dialog-body">
          <span>Permanent action</span>
          <h2 id="delete-project-title">Delete {project.name}?</h2>
          <p>This permanently removes the project and its requests, file records, conversations, and time history from your workspace. This cannot be undone.</p>
          <label><span>Type <strong>{project.name}</strong> to confirm</span><input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={deleting} /></label>
          {deleteError && <p className="v3-delete-error" role="alert">{deleteError}</p>}
          <div><button type="button" onClick={closeDelete} disabled={deleting}>Keep project</button><button type="button" className="is-danger" onClick={deleteProject} disabled={deleting || deleteConfirmation.trim() !== project.name}>{deleting ? 'Deleting…' : 'Delete project'}</button></div>
        </div>
      </section>
    </div>}
  </div>;
}
