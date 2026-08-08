import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../../store';
import Icon from '../Icon';
import { uploadFile } from '../api';
import { Action } from '../Primitives';
import { emojiForType, ICON_CHOICES, LINK_KINDS, PROJECT_TYPES, RESOURCE_KINDS } from '../projectTypes';

export default function NewProject() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Website');
  const [icon, setIcon] = useState('');
  const [iconOpen, setIconOpen] = useState(false);
  const [objective, setObjective] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [measure, setMeasure] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [links, setLinks] = useState([]);
  const [linkDraft, setLinkDraft] = useState({ kind: 'production', label: '', url: '' });
  const [resources, setResources] = useState([]);
  const [resourceDraft, setResourceDraft] = useState({ kind: 'brand', title: '', url: '' });
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Falls back to the type's emoji, exactly as the server would.
  const shownIcon = icon || emojiForType(type, name.length);

  const addLink = () => {
    if (!linkDraft.url.trim()) return;
    const preset = LINK_KINDS.find((k) => k.id === linkDraft.kind);
    setLinks([...links, { ...linkDraft, label: linkDraft.label.trim() || preset.label }]);
    setLinkDraft({ kind: 'production', label: '', url: '' });
  };

  const addResource = () => {
    if (!resourceDraft.title.trim() || !resourceDraft.url.trim()) return;
    setResources([...resources, { ...resourceDraft }]);
    setResourceDraft({ kind: 'brand', title: '', url: '' });
  };

  const attachFiles = async (event) => {
    const chosen = [...event.target.files];
    if (!chosen.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await Promise.all(chosen.map((file) => uploadFile(file)));
      setResources((current) => [
        ...current,
        ...uploaded.map((f) => ({ kind: resourceDraft.kind, title: f.name, file_url: f.url, file_name: f.name })),
      ]);
    } catch (err) {
      setError(err.message || 'Could not upload that file.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await store.createProject({
        name: name.trim(),
        type,
        icon: shownIcon,
        description: objective.trim(),
        goal: goal.trim(),
        audience: audience.trim(),
        successMeasure: measure.trim(),
        targetDate: targetDate || null,
        links,
        resources,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not create the project.');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return <section className="v3-composer-success"><i><span className="v3-project-emoji is-lg">{shownIcon}</span></i><span>Project workspace created</span><h1>{name}</h1><p>Add requests, share references, and track everything the team delivers here.</p><Action onClick={() => navigate('/projects')}>Open projects</Action></section>;
  }

  return <div className="v3-project-builder">
    <header><button onClick={() => navigate('/projects')} aria-label="Back to projects"><Icon name="back" /></button><span>New project</span><strong>Workspace setup</strong></header>
    <main>
      <aside>
        <span>One clear source of truth</span>
        <h1>Build the project around its outcome.</h1>
        <p>This context follows every request, file, and conversation added later.</p>
        <div className="v3-builder-preview">
          <span className="v3-project-emoji is-lg">{shownIcon}</span>
          <div><strong>{name || 'Untitled project'}</strong><small>{type}</small></div>
        </div>
        <ol><li className="is-active"><i>1</i>Identity</li><li><i>2</i>Direction</li><li><i>3</i>Links &amp; resources</li></ol>
      </aside>

      <form onSubmit={submit}>
        <section>
          <span>01 · Identity</span>
          <h2>Name the workspace</h2>
          <div className="v3-identity-row">
            <div className="v3-icon-picker">
              <button type="button" className="v3-icon-current" onClick={() => setIconOpen(!iconOpen)} aria-label="Choose a project icon">
                <span className="v3-project-emoji">{shownIcon}</span>
                <small>Icon</small>
              </button>
              {iconOpen && <div className="v3-icon-menu">
                {ICON_CHOICES.map((choice) => <button type="button" key={choice} className={choice === icon ? 'is-active' : ''} onClick={() => { setIcon(choice); setIconOpen(false); }}>{choice}</button>)}
                <button type="button" className="v3-icon-auto" onClick={() => { setIcon(''); setIconOpen(false); }}>Auto</button>
              </div>}
            </div>
            <label><span>Project name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Patient booking app" /></label>
          </div>

          <span className="v3-field-label">Project type</span>
          <div className="v3-type-grid">
            {PROJECT_TYPES.map((item) => <button type="button" key={item.name} className={type === item.name ? 'is-active' : ''} onClick={() => setType(item.name)}>
              <span className="v3-project-emoji">{item.emoji[0]}</span>
              <strong>{item.name}</strong>
              <small>{item.blurb}</small>
            </button>)}
          </div>

          <label><span>Short objective</span><input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="One line the whole team can work from" /></label>
        </section>

        <section>
          <span>02 · Direction</span>
          <h2>Give the team the why</h2>
          <label><span>Primary goal</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What must this project achieve?" /></label>
          <div className="v3-field-pair">
            <label><span>Audience</span><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Who is it for?" /></label>
            <label><span>Success measure</span><input value={measure} onChange={(event) => setMeasure(event.target.value)} placeholder="How will you know it worked?" /></label>
          </div>
          <label className="v3-half"><span>Target date <em>optional</em></span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
        </section>

        <section>
          <span>03 · Links &amp; resources</span>
          <h2>Point us at what already exists</h2>
          <p className="v3-section-note">Links are places the work lives. Resources are material you are giving us to work from — both can be added later.</p>

          <span className="v3-field-label">Project links</span>
          {!!links.length && <ul className="v3-chip-list">{links.map((link, index) => <li key={`${link.url}-${index}`}><span>{LINK_KINDS.find((k) => k.id === link.kind)?.label}</span><strong>{link.label}</strong><button type="button" onClick={() => setLinks(links.filter((_, i) => i !== index))} aria-label="Remove link"><Icon name="close" size={13} /></button></li>)}</ul>}
          <div className="v3-inline-add">
            <select value={linkDraft.kind} onChange={(event) => setLinkDraft({ ...linkDraft, kind: event.target.value })}>{LINK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
            <input value={linkDraft.url} onChange={(event) => setLinkDraft({ ...linkDraft, url: event.target.value })} placeholder="https://" />
            <button type="button" onClick={addLink} disabled={!linkDraft.url.trim()}><Icon name="plus" size={15} />Add</button>
          </div>

          <span className="v3-field-label">Project resources</span>
          {!!resources.length && <ul className="v3-chip-list">{resources.map((item, index) => <li key={`${item.title}-${index}`}><span>{RESOURCE_KINDS.find((k) => k.id === item.kind)?.label}</span><strong>{item.title}</strong>{item.file_url && <em>file</em>}<button type="button" onClick={() => setResources(resources.filter((_, i) => i !== index))} aria-label="Remove resource"><Icon name="close" size={13} /></button></li>)}</ul>}
          <div className="v3-inline-add">
            <select value={resourceDraft.kind} onChange={(event) => setResourceDraft({ ...resourceDraft, kind: event.target.value })}>{RESOURCE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
            <input value={resourceDraft.title} onChange={(event) => setResourceDraft({ ...resourceDraft, title: event.target.value })} placeholder="Title" />
            <input value={resourceDraft.url} onChange={(event) => setResourceDraft({ ...resourceDraft, url: event.target.value })} placeholder="https://" />
            <button type="button" onClick={addResource} disabled={!resourceDraft.title.trim() || !resourceDraft.url.trim()}><Icon name="plus" size={15} />Add</button>
          </div>

          <input ref={fileInput} type="file" multiple hidden onChange={attachFiles} accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.doc,.docx,.xls,.xlsx,.txt,.csv" />
          <button type="button" className="v3-upload" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Icon name="attach" />
            <span><strong>{uploading ? 'Uploading…' : 'Upload documents'}</strong><small>Brand guidelines, briefs, research, references · up to 25 MB each</small></span>
          </button>
        </section>

        <footer>
          <span>{error ? <b className="v3-composer-error">{error}</b> : name ? `${shownIcon} ${name} · ${type}` : 'Add a project name to continue'}</span>
          <Action type="submit" disabled={!name.trim() || saving || uploading} icon="check">{saving ? 'Creating…' : 'Create project'}</Action>
        </footer>
      </form>
    </main>
  </div>;
}
