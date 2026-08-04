import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, SiteCta } from '../components/ui';

const PROJECT_TYPES = ['Product', 'Website', 'Brand', 'Campaign', 'Internal'];

export default function NewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('Product');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [deadline, setDeadline] = useState('');
  const [owner, setOwner] = useState('');
  const [references, setReferences] = useState('');
  const [notes, setNotes] = useState('');
  const canCreate = name.trim() && goal.trim() && audience.trim() && owner.trim();

  return (
    <section className="new-project-page">
      <header className="page-head anim-rise">
        <div>
          <span className="kicker">Projects / New project</span>
          <h1 className="page-title">Create a project</h1>
          <p className="page-sub">Set the context once, then keep every request and delivery connected.</p>
        </div>
        <button className="request-close" onClick={() => navigate('/projects')} aria-label="Close"><Icon.x /></button>
      </header>

      <form className="project-setup" onSubmit={(event) => { event.preventDefault(); navigate('/projects'); }}>
        <div className="project-setup-main">
          <section className="workspace-panel project-form-section anim-rise">
            <div className="project-section-head"><span>01</span><div><h2>Project identity</h2><p>The information your team will see on every request.</p></div></div>
            <div className="project-form-grid">
              <label className="is-wide"><span>Project name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Platform launch" autoFocus /></label>
              <fieldset className="is-wide">
                <legend>Project type</legend>
                <div className="project-type-pills">
                  {PROJECT_TYPES.map((item) => <button key={item} type="button" className={type === item ? 'is-active' : ''} onClick={() => setType(item)}>{item}</button>)}
                </div>
              </fieldset>
              <label className="is-wide"><span>Primary goal</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What should this project achieve, and what does success look like?" /></label>
              <label className="is-wide"><span>Audience</span><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Who is this for?" /></label>
            </div>
          </section>

          <section className="workspace-panel project-form-section anim-rise" style={{ animationDelay: '0.06s' }}>
            <div className="project-section-head"><span>02</span><div><h2>Delivery context</h2><p>Give the team timing, ownership, and reference material.</p></div></div>
            <div className="project-form-grid">
              <label><span>Target date</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
              <label><span>Project owner</span><input type="email" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="owner@company.com" /></label>
              <label className="is-wide"><span>Reference links</span><input value={references} onChange={(event) => setReferences(event.target.value)} placeholder="Figma, Drive, Notion, existing website..." /></label>
              <label className="is-wide"><span>Constraints and notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Brand rules, technical constraints, approvals, or anything the team should know." /></label>
              <button type="button" className="project-upload"><i><Icon.clip /></i><span><strong>Add project files</strong><small>Briefs, brand assets, research, or technical documents</small></span><em>Optional</em></button>
            </div>
          </section>

        </div>

        <aside className="project-summary anim-rise" style={{ animationDelay: '0.1s' }}>
          <span className="kicker">Setup summary</span>
          <h2>{name || 'Untitled project'}</h2>
          <p>{type} project</p>
          <dl>
            <div><dt>Owner</dt><dd>{owner || 'Not set'}</dd></div>
            <div><dt>Target</dt><dd>{deadline || 'Flexible'}</dd></div>
            <div><dt>Services</dt><dd>Managed separately</dd></div>
          </dl>
          <SiteCta className="site-cta-compact" icon={<Icon.plus />} disabled={!canCreate} type="submit">Create project</SiteCta>
          <button type="button" onClick={() => navigate('/projects')}>Cancel</button>
          <small>Managed services and add-ons are purchased separately.</small>
        </aside>
      </form>
    </section>
  );
}
