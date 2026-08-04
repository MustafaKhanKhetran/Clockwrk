import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects, SERVICES } from '../../mocks';
import Icon from '../Icon';
import { Action, ProjectCode } from '../Primitives';

export default function NewRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [project, setProject] = useState(projects[0]);
  const [category, setCategory] = useState('Development');
  const [service, setService] = useState(SERVICES.Development[0]);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [done, setDone] = useState(false);
  const steps = ['Project', 'Service', 'Brief', 'Placement'];
  if (done) return <section className="v3-composer-success"><i><Icon name="check" size={30} /></i><span>Request added</span><h1>{title || service}</h1><p>It is connected to {project.name} and ready in your production queue.</p><Action onClick={() => navigate('/requests')}>Open request board</Action></section>;
  return <div className="v3-composer-page"><header><button onClick={() => navigate('/requests')}><Icon name="close" /></button><span>New request</span><strong>{step + 1} / {steps.length}</strong></header><nav>{steps.map((item, index) => <button key={item} className={index === step ? 'is-active' : index < step ? 'is-done' : ''} onClick={() => index <= step && setStep(index)}><i>{index < step ? <Icon name="check" size={12} /> : index + 1}</i>{item}</button>)}</nav><main>
    {step === 0 && <section className="v3-composer-stage"><span>Start with context</span><h1>Which project owns this work?</h1><p>The team, files, and decisions stay attached to this workspace.</p><div className="v3-project-choice">{projects.map((item) => <button key={item.id} className={project.id === item.id ? 'is-active' : ''} onClick={() => setProject(item)}><ProjectCode project={item} /><span><strong>{item.name}</strong><small>{item.tagline}</small></span>{project.id === item.id ? <Icon name="check" /> : <Icon name="arrow" />}</button>)}</div></section>}
    {step === 1 && <section className="v3-composer-stage"><span>Choose the craft</span><h1>What kind of work is this?</h1><p>Pick a discipline, then the exact service. Everything listed here is covered by your plan.</p><div className="v3-service-browser"><aside>{Object.keys(SERVICES).map((item) => <button key={item} className={category === item ? 'is-active' : ''} onClick={() => { setCategory(item); setService(SERVICES[item][0]); }}>{item}<i>{SERVICES[item].length}</i></button>)}</aside><div>{SERVICES[category].map((item) => <button key={item} className={service === item ? 'is-active' : ''} onClick={() => setService(item)}>{item}{service === item && <Icon name="check" size={14} />}</button>)}</div></div></section>}
    {step === 2 && <section className="v3-composer-stage"><span>Write the brief</span><h1>Make the outcome unmistakable.</h1><p>Describe what success looks like, who it is for, and anything the team must keep.</p><div className="v3-brief-form"><label><span>Request title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Rebuild customer onboarding" /></label><label><span>What should the team make?</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Goals, audience, constraints, references, and the final outcome…" /></label><button><Icon name="attach" />Add files or links</button></div></section>}
    {step === 3 && <section className="v3-composer-stage"><span>Place the work</span><h1>Set its priority.</h1><p>Urgent work is visible to the team immediately. Queue position can still be changed later.</p><div className="v3-priority-choice">{[['Normal','Standard queue'],['High','Move ahead of normal work'],['Urgent','Team review required']].map(([item, copy]) => <button key={item} className={priority === item ? 'is-active' : ''} onClick={() => setPriority(item)}><i /><span><strong>{item}</strong><small>{copy}</small></span>{priority === item && <Icon name="check" />}</button>)}</div><div className="v3-request-recap"><ProjectCode project={project} /><span><small>{project.name} · {category} · {service}</small><strong>{title || 'Untitled request'}</strong><p>{brief || 'No brief entered yet.'}</p></span></div></section>}
  </main><footer><button onClick={() => step ? setStep(step - 1) : navigate('/requests')}>{step ? 'Back' : 'Cancel'}</button><span>{step === 2 && (!title.trim() || !brief.trim()) ? 'Add a title and brief to continue' : `${project.name} · ${service}`}</span><Action disabled={step === 2 && (!title.trim() || !brief.trim())} onClick={() => step === 3 ? setDone(true) : setStep(step + 1)}>{step === 3 ? 'Add to queue' : 'Continue'}</Action></footer></div>;
}
