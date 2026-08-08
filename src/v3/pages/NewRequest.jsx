import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { REQUESTABLE_SERVICES, SERVICES } from '../../catalog';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { Action, ProjectCode } from '../Primitives';

// Everything a client can ask for under their plan, in one list:
// the creative disciplines first (what most requests are), then the ops and
// care work that `SERVICE_CATALOG` tags `billing: 'included'`. Anything not in
// here is chargeable and belongs on the billing side, not in a free request.
const SERVICE_GROUPS = { ...SERVICES, ...REQUESTABLE_SERVICES };
const FIRST_CATEGORY = Object.keys(SERVICE_GROUPS)[0];

export default function NewRequest() {
  const navigate = useNavigate();
  const { projects } = useStore();
  const [params] = useSearchParams();
  const presetProject = Number(params.get('project')) || null;
  const [step, setStep] = useState(0);
  const [project, setProject] = useState(null);
  const [category, setCategory] = useState(FIRST_CATEGORY);
  const [service, setService] = useState(SERVICE_GROUPS[FIRST_CATEGORY][0]);
  const [draggedService, setDraggedService] = useState('');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const steps = ['Project', 'Service', 'Brief', 'Placement'];

  // Select the first project, and re-select when the seed list is replaced by
  // the client's real projects — otherwise the composer keeps a mock project.
  useEffect(() => {
    if (!projects.length) return;
    const stillValid = project && projects.some((item) => item.id === project.id && item.name === project.name);
    if (!stillValid) setProject(projects.find((item) => item.id === presetProject) || projects[0]);
  }, [presetProject, project, projects]);

  const submit = async () => {
    if (!project || saving) return;
    setSaving(true);
    setError('');
    try {
      await store.createRequest({
        projectId: project.id,
        title: title.trim() || service,
        brief: brief.trim(),
        type: `${category} · ${service}`,
        priority,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not submit your request.');
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  if (done) return <section className="v3-composer-success"><i><Icon name="check" size={30} /></i><span>Request added</span><h1>{title || service}</h1><p>It is connected to {project?.name} and ready in your production queue.</p><Action onClick={() => navigate('/requests')}>Open request board</Action></section>;
  return <div className="v3-composer-page"><header><button onClick={() => navigate('/requests')}><Icon name="close" /></button><span>New request</span><strong>{step + 1} / {steps.length}</strong></header><nav>{steps.map((item, index) => <button key={item} className={index === step ? 'is-active' : index < step ? 'is-done' : ''} onClick={() => index <= step && setStep(index)}><i>{index < step ? <Icon name="check" size={12} /> : index + 1}</i>{item}</button>)}</nav><main>
    {step === 0 && <section className="v3-composer-stage"><span>Start with context</span><h1>Which project owns this work?</h1><p>The team, files, and decisions stay attached to this workspace.</p><div className="v3-project-choice">{projects.map((item) => <button key={item.id} className={project?.id === item.id ? 'is-active' : ''} onClick={() => setProject(item)}><ProjectCode project={item} /><span><strong>{item.name}</strong><small>{item.tagline || item.description || 'Project workspace'}</small></span>{project?.id === item.id ? <Icon name="check" /> : <Icon name="arrow" />}</button>)}</div></section>}
    {step === 1 && <section className="v3-composer-stage"><span>Choose the craft</span><h1>What kind of work is this?</h1><p>Choose a discipline, then click a service or drag it into your selection. Everything here is covered by your plan.</p><div className="v3-service-studio"><nav aria-label="Service disciplines">{Object.keys(SERVICE_GROUPS).map((item) => <button key={item} className={category === item ? 'is-active' : ''} aria-pressed={category === item} onClick={() => { setCategory(item); setService(SERVICE_GROUPS[item][0]); }}>{category === item && <i />}{item}<em>{SERVICE_GROUPS[item].length}</em></button>)}</nav><div className={`v3-service-drop ${draggedService ? 'is-ready' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.getData('text/plain') || draggedService; if (dropped) setService(dropped); setDraggedService(''); }}><span><small>Your selection</small><strong>{draggedService || service}</strong></span><i><Icon name={draggedService ? 'download' : 'check'} size={17} /></i></div><div className="v3-service-cards">{SERVICE_GROUPS[category].map((item, index) => <button key={item} draggable className={service === item ? 'is-active' : ''} aria-pressed={service === item} onDragStart={(event) => { event.dataTransfer.setData('text/plain', item); event.dataTransfer.effectAllowed = 'move'; setDraggedService(item); }} onDragEnd={() => setDraggedService('')} onClick={() => setService(item)}><i><Icon name="grip" size={15} /></i><span><small>{category} · {String(index + 1).padStart(2, '0')}</small><strong>{item}</strong></span><em>{service === item ? 'Selected' : 'Drag to select'}</em>{service === item && <b><Icon name="check" size={13} /></b>}</button>)}</div><footer><Icon name="grip" size={15} /><span>Drag any service into the selection dock</span><strong>Included in your plan</strong></footer></div></section>}
    {step === 2 && <section className="v3-composer-stage"><span>Write the brief</span><h1>Make the outcome unmistakable.</h1><p>Describe what success looks like, who it is for, and anything the team must keep.</p><div className="v3-brief-form"><label><span>Request title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Rebuild customer onboarding" /></label><label><span>What should the team make?</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Goals, audience, constraints, references, and the final outcome…" /></label><button><Icon name="attach" />Add files or links</button></div></section>}
    {step === 3 && <section className="v3-composer-stage"><span>Place the work</span><h1>Set its priority.</h1><p>Urgent work is visible to the team immediately. Queue position can still be changed later.</p><div className="v3-priority-choice">{[['Normal','Standard queue'],['High','Move ahead of normal work'],['Urgent','Team review required']].map(([item, copy]) => <button key={item} className={priority === item ? 'is-active' : ''} onClick={() => setPriority(item)}><i /><span><strong>{item}</strong><small>{copy}</small></span>{priority === item && <Icon name="check" />}</button>)}</div><div className="v3-request-recap"><ProjectCode project={project} /><span><small>{project?.name} · {category} · {service}</small><strong>{title || 'Untitled request'}</strong><p>{brief || 'No brief entered yet.'}</p></span></div></section>}
  </main><footer><button onClick={() => step ? setStep(step - 1) : navigate('/requests')}>{step ? 'Back' : 'Cancel'}</button><span>{error ? <b className="v3-composer-error">{error}</b> : step === 2 && (!title.trim() || !brief.trim()) ? 'Add a title and brief to continue' : `${project?.name || 'Select a project'} · ${service}`}</span><Action disabled={saving || !project || (step === 2 && (!title.trim() || !brief.trim()))} onClick={() => step === 3 ? submit() : setStep(step + 1)}>{step === 3 ? (saving ? 'Adding…' : 'Add to queue') : 'Continue'}</Action></footer></div>;
}
