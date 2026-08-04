import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REQUESTABLE_SERVICES, SERVICES, projects, RETAINER_EXTRA_HOURS } from '../mocks';
import { Icon, CatChip, SiteCta } from '../components/ui';
import { store, useStore } from '../store';

const STEP_LABELS = ['Project', 'Service', 'Brief', 'Priority'];

export default function NewRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [transitioning, setTransitioning] = useState(false);
  const [category, setCategory] = useState('Development');
  const [service, setService] = useState(null);
  const [showIncluded, setShowIncluded] = useState(false);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [placement, setPlacement] = useState('auto');
  const [priority, setPriority] = useState('normal');
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const [sent, setSent] = useState(false);
  const [scopeAcknowledged, setScopeAcknowledged] = useState(false);

  const {
    requests, baseSlots, extraSlots, accountMode, hoursRemaining, retainerCadence,
  } = useStore();
  const totalSlots = baseSlots + extraSlots;
  const activeCount = requests.filter((request) => request.status === 'active').length;
  const openSlots = Math.max(totalSlots - activeCount, 0);
  const slotOpen = openSlots > 0;
  const isRetainer = accountMode === 'retainer';
  const hourText = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const estimateHours = 0.5;
  const overHours = isRetainer && (hoursRemaining <= 0 || estimateHours > hoursRemaining);
  const needsScopeGuard = isRetainer && Boolean(service) && Object.prototype.hasOwnProperty.call(SERVICES, category);
  const canNext = step === 0
    ? Boolean(projectId)
    : step === 1
      ? Boolean(service) && (!needsScopeGuard || scopeAcknowledged)
      : step === 2
        ? Boolean(title.trim() && brief.trim())
        : true;
  const selectedProject = projects.find((project) => project.id === projectId);
  const selectService = (group, item, prefill = false) => {
    setCategory(group);
    setService(item);
    setScopeAcknowledged(false);
    if (prefill && !title.trim()) setTitle(item);
  };

  useEffect(() => {
    const pending = store.consumePendingRequestService();
    if (!pending) return;
      setCategory(pending.category);
      setService(pending.service);
      setTitle(pending.service);
      setScopeAcknowledged(false);
    setShowIncluded(true);
    setStep(1);
  }, []);

  const changeStep = (nextStep) => {
    if (transitioning || nextStep === step) return;
    setDirection(nextStep > step ? 'forward' : 'back');
    setTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setTransitioning(false);
    }, 240);
  };

  const submit = () => {
    setTransitioning(true);
    setTimeout(() => {
      if (isRetainer) store.logHours(estimateHours);
      setSent(true);
      setTransitioning(false);
      setTimeout(() => navigate('/requests'), 1600);
    }, 240);
  };

  if (sent) {
    return (
      <main className="composer-shell composer-success">
        <section className="composer-success-card anim-pop">
          <span><Icon.check /></span>
          <small>Request submitted</small>
          <h1>{title}</h1>
          <p>{isRetainer ? `${hourText(estimateHours)} care hours logged. Your team will take it from here.` : slotOpen && placement === 'auto' ? 'Your open slot is reserved. Work can begin today.' : 'Your request is ready in the queue.'}</p>
          <div><i>{selectedProject?.name}</i><i>{service}</i></div>
        </section>
      </main>
    );
  }

  return (
    <main className="composer-shell composer-shell-embedded">
      <div className="composer-wrap">
        <div className="composer-embedded-head">
          <span className="kicker">Requests / New request</span>
          <button className="request-close" onClick={() => navigate('/requests')} aria-label="Close"><Icon.x /></button>
        </div>
        <div className="composer-progress">
          <div className="composer-progress-labels">
            {STEP_LABELS.map((label, index) => (
              <span key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}>
                <i>{index < step ? <Icon.check /> : index + 1}</i>{label}
              </span>
            ))}
          </div>
          <div className="composer-progress-track"><i style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        </div>

        <section className={`composer-scene ${transitioning ? `is-exiting-${direction}` : `is-entering-${direction}`}`}>
          {step === 0 && (
            <div className="composer-panel">
              <div className="composer-heading">
                <span className="kicker">Choose a project</span>
                <h1>Where does this belong?</h1>
                <p>Every request stays connected to a project, its team, files, and delivery history.</p>
              </div>

              <div className="composer-project-select">
                {projects.map((project, index) => (
                  <button
                    key={project.id}
                    className={projectId === project.id ? 'is-selected' : ''}
                    style={{ '--project-delay': `${index * 60}ms` }}
                    onClick={() => setProjectId(project.id)}
                  >
                    <span>{project.name.slice(0, 2).toUpperCase()}</span>
                    <div><strong>{project.name}</strong><small>{project.tagline}</small></div>
                    <i>{projectId === project.id ? <Icon.check /> : <Icon.arrow />}</i>
                  </button>
                ))}
                <button className="is-new" onClick={() => navigate('/projects/new')}>
                  <span><Icon.plus /></span>
                  <div><strong>Create a new project</strong><small>Set up a separate workspace first</small></div>
                  <i><Icon.arrow /></i>
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="composer-panel">
              <div className="composer-heading">
                <span className="kicker">Choose a service</span>
                <h1>What are we making?</h1>
                <p>Select a service from the same categories used across clockwrk.</p>
              </div>

              <div className="portal-services-selector">
                {Object.entries(SERVICES).map(([group, items]) => (
                  <article key={group} className={`portal-services-item ${category === group ? 'is-active' : ''}`}>
                    <button className="portal-services-bar" onClick={() => setCategory(group)} aria-expanded={category === group}>
                      <span>{group}</span>
                      <span>{items.length}</span>
                    </button>
                    <div className="portal-services-panel">
                      <div className="portal-services-pills">
                        {items.map((item, index) => (
                          <button
                            key={item}
                            className={`portal-service-pill ${service === item && category === group ? 'is-selected' : ''}`}
                            style={{ '--pill-delay': `${index * 28}ms` }}
                            onClick={() => selectService(group, item)}
                          >
                            <span>{item}</span>
                            <i>{service === item && category === group ? <Icon.check /> : <Icon.plus />}</i>
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <section className="request-included-services">
                <button className="request-included-toggle" onClick={() => setShowIncluded(!showIncluded)} aria-expanded={showIncluded}>
                  <span>
                    <small>Also included <b>Included</b></small>
                    <strong>Technical services covered by your plan</strong>
                    <em>Everything here is covered by your plan. No extra cost.</em>
                  </span>
                  <i>{showIncluded ? 'Hide' : 'Show all services'} <Icon.arrow /></i>
                </button>
                {showIncluded && (
                  <div className="request-included-grid anim-rise">
                    {Object.entries(REQUESTABLE_SERVICES).map(([group, items]) => (
                      <article key={group}>
                        <header><strong>{group}</strong><span>{items.length}</span></header>
                        <div>
                          {items.map((item, index) => (
                            <button
                              key={item}
                              className={service === item && category === group ? 'is-selected' : ''}
                              style={{ '--pill-delay': `${index * 24}ms` }}
                              onClick={() => selectService(group, item, true)}
                            >
                              <span>{item}</span>
                              <i>{service === item && category === group ? <Icon.check /> : <Icon.plus />}</i>
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {needsScopeGuard && !scopeAcknowledged && (
                <section className="retainer-scope-guard anim-rise">
                  <span><Icon.bolt /></span>
                  <div>
                    <strong>That sounds like a new project.</strong>
                    <p>Retainers cover changes, fixes and upkeep. For a new build, restart your subscription and get dedicated slots.</p>
                  </div>
                  <button onClick={() => store.resumeSubscription('Business')}>Restart subscription</button>
                  <button onClick={() => { setScopeAcknowledged(true); changeStep(2); }}>Continue anyway</button>
                </section>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="composer-panel">
              <div className="composer-heading">
                <span className="kicker">Tell us about it</span>
                <h1>Give it a clear brief.</h1>
                <p><strong>{category}</strong> / {service}</p>
              </div>

              <div className="composer-form">
                <fieldset>
                  <legend>Project</legend>
                  <div className="composer-project-pills">
                    {projects.map((project) => (
                      <button key={project.id} type="button" className={projectId === project.id ? 'is-active' : ''} onClick={() => setProjectId(project.id)}>
                        <span>{project.name.slice(0, 2).toUpperCase()}</span>{project.name}
                        {projectId === project.id && <i><Icon.check /></i>}
                      </button>
                    ))}
                    <button type="button" className="is-new"><span><Icon.plus /></span>New project</button>
                  </div>
                </fieldset>

                <label>
                  <span>Request name</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Checkout flow redesign" autoFocus />
                </label>
                <label>
                  <span>The brief</span>
                  <textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="What does done look like? Add context, links, references, and anything to avoid." />
                </label>
                <button type="button" className="composer-attach">
                  <i><Icon.clip /></i>
                  <span><strong>Add references</strong><small>Drop files here or browse</small></span>
                  <em>Optional</em>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="composer-panel">
              <div className="composer-heading">
                <span className="kicker">Set the priority</span>
                <h1>Where should it go?</h1>
                <p>Start it now or keep it ready in your request queue.</p>
              </div>

              <div className="composer-review-pill">
                <CatChip category={category} size={42} />
                <span><small>{selectedProject?.name} / {service}</small><strong>{title}</strong></span>
                <button onClick={() => changeStep(2)}>Edit</button>
              </div>

              <div className="composer-priority">
                <span><strong>Request priority</strong><small>Priority communicates urgency. Placement controls where the request sits.</small></span>
                <div>
                  {[['standard', 'Standard'], ['normal', 'Normal'], ['urgent', 'Urgent']].map(([value, label]) => (
                    <button key={value} className={priority === value ? 'is-active' : ''} onClick={() => setPriority(value)}>{label}</button>
                  ))}
                </div>
              </div>

              {isRetainer ? (
                <section className={`retainer-hours-estimate ${overHours ? 'is-over' : ''}`}>
                  {overHours ? (
                    <>
                      <div>
                        <strong>You're out of care hours this month.</strong>
                        <p>Buy {RETAINER_EXTRA_HOURS.block.hours} more for ${RETAINER_EXTRA_HOURS.block.price.toLocaleString()}, upgrade to Care Pro (12 hrs/mo), or submit anyway and we'll bill ${RETAINER_EXTRA_HOURS.hourly}/hr.</p>
                      </div>
                      <div>
                        <button onClick={store.buyHourBlock}>Buy {RETAINER_EXTRA_HOURS.block.hours} hours — ${RETAINER_EXTRA_HOURS.block.price.toLocaleString()}</button>
                        <button onClick={() => store.switchToRetainer('business', retainerCadence)}>Upgrade tier</button>
                        <button onClick={submit}>Submit anyway</button>
                      </div>
                    </>
                  ) : (
                    <p>This will use approximately {hourText(estimateHours)}h of your {hourText(hoursRemaining)} remaining hours.</p>
                  )}
                </section>
              ) : (
                <>
                  <span className="composer-placement-label">Placement</span>
                  <div className="composer-placement">
                    <button className={placement === 'auto' ? 'is-selected' : ''} onClick={() => setPlacement('auto')}>
                      <i><Icon.bolt /></i>
                      <span><strong>{slotOpen ? 'Start in an open slot' : 'Take the next slot'}</strong><small>{slotOpen ? `${openSlots} available. The team can begin today.` : 'Starts automatically when capacity opens.'}</small></span>
                      <em>{placement === 'auto' && <Icon.check />}</em>
                    </button>
                    <button className={placement === 'queue' ? 'is-selected' : ''} onClick={() => setPlacement('queue')}>
                      <i><Icon.layers /></i>
                      <span><strong>Add to request queue</strong><small>Keep it staged and choose when work begins.</small></span>
                      <em>{placement === 'queue' && <Icon.check />}</em>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <footer className="composer-actions">
          <button onClick={() => (step === 0 ? navigate(-1) : changeStep(step - 1))}>{step === 0 ? 'Cancel' : 'Back'}</button>
          <span>{isRetainer ? `${hourText(hoursRemaining)} care hours available` : slotOpen ? `${openSlots} request slot${openSlots === 1 ? '' : 's'} available` : 'New requests will join your queue'}</span>
          {step < 3 ? (
            <SiteCta className="site-cta-compact" disabled={!canNext || transitioning} onClick={() => canNext && changeStep(step + 1)}>Continue</SiteCta>
          ) : (
            <SiteCta className="site-cta-compact" icon={<Icon.check />} disabled={transitioning || overHours} onClick={submit}>Submit request</SiteCta>
          )}
        </footer>
      </div>
    </main>
  );
}
