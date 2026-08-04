import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me, projects, activity, team, PLANS, ADDONS, CARE_PLANS } from '../mocks';
import { Icon, StatusPill, ProgressRing, Avatar, CatChip, TeamPill } from '../components/ui';
import RequestSheet from '../components/RequestSheet';
import ProjectSheet from '../components/ProjectSheet';
import { store, useStore } from '../store';

const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export default function Home() {
  const navigate = useNavigate();
  const {
    requests, extraSlots, paused, plan, baseSlots, hosting, domains, securityMonitors, reports,
    accountMode, retainerTier, retainerCadence, hoursAllowance, hoursRemaining, hoursResetAt,
  } = useStore();
  const [openReq, setOpenReq] = useState(null);
  const [openProj, setOpenProj] = useState(null);
  const [planPicker, setPlanPicker] = useState(false);
  const [shippedDismissed, setShippedDismissed] = useState(false);

  const totalSlots = baseSlots + extraSlots;
  const active = requests.filter((request) => request.status === 'active');
  const inReview = requests.filter((request) => request.status === 'review');
  const queued = requests
    .filter((request) => request.status === 'queued')
    .sort((a, b) => a.queuePos - b.queuePos);
  const done = requests.filter((request) => request.status === 'done');
  const currentPlan = PLANS.find((option) => option.name === plan) || PLANS[1];
  const isRetainer = accountMode === 'retainer';
  const careTier = CARE_PLANS.find((option) => option.id === retainerTier) || CARE_PLANS[1];
  const carePrice = retainerCadence === 'annual' ? careTier.annualPrice : careTier.price;
  const careSuffix = retainerCadence === 'annual' ? '/yr' : '/mo';
  const slotAddon = ADDONS.find((addon) => addon.id === 'slot');
  const addonTotal = extraSlots * (slotAddon?.weeklyPrice || 0);
  const weeklyTotal = currentPlan.price + addonTotal;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const projectFor = (request) => projects.find((project) => project.id === request.projectId);
  const deliveryState = (request) => {
    if (request.deliveredAt) return { tone: 'delivered', label: `Delivered ${request.deliveredAt}` };
    if (!request.due) return { tone: 'unscheduled', label: 'Not scheduled' };
    const overdue = new Date(`${request.due}, 2026`) < new Date('2026-07-05T00:00:00');
    return { tone: overdue ? 'overdue' : 'expected', label: overdue ? `Overdue · ${request.due}` : `Expected ${request.due}` };
  };
  const teamOnWork = [...new Map(
    projects.flatMap((project) => [project.pm, project.am, ...project.members]).map((member) => [member.id, member]),
  ).values()];
  const reviewVariant = inReview.length === 1 ? 'single' : inReview.length === 2 ? 'pair' : inReview.length === 3 ? 'trio' : 'many';
  const visibleReviews = inReview.length > 3 ? inReview.slice(0, 3) : inReview;
  const shippedProject = projects.find((project) => project.status === 'complete');
  const showShippedStrip = Boolean(shippedProject && accountMode === 'subscription' && !shippedDismissed);
  const hourText = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div className="overview">
      <header className="overview-intro anim-rise">
        <div>
          <p className="overview-date">{todayLabel}</p>
          <h1>{greeting}, {me.name.split(' ')[0]}.</h1>
          <p className="overview-summary">
            {isRetainer
              ? `Your site is healthy. ${hourText(hoursRemaining)} care hours left this month.`
              : paused
              ? 'Your subscription is paused. Your queue, files, and project history are safe.'
              : inReview.length
                ? `${active.length} requests are moving and ${inReview.length} ${inReview.length === 1 ? 'delivery needs' : 'deliveries need'} your review.`
                : `${active.length} requests are moving. Everything is on schedule.`}
          </p>
        </div>
        <span className="overview-live"><i /> Team online</span>
      </header>

      {showShippedStrip && (
        <section className="home-shipped-strip anim-rise">
          <span><Icon.check /></span>
          <div>
            <strong>{shippedProject.name} shipped.</strong>
            <p>Keep it running with monitoring, backups and updates from ${CARE_PLANS[0].price.toLocaleString()}/mo.</p>
          </div>
          <button onClick={() => navigate('/billing')}>See retainer options <Icon.arrow /></button>
          <button className="home-shipped-dismiss" onClick={() => setShippedDismissed(true)} aria-label="Dismiss shipped project notice">x</button>
        </section>
      )}

      <section className="overview-metrics anim-rise" style={{ animationDelay: '0.04s' }}>
        {isRetainer ? (
          <>
            <div><span>Care hours</span><strong>{hourText(hoursRemaining)}<small> of {hourText(hoursAllowance)} left · resets {hoursResetAt}</small></strong></div>
            <div><span>Uptime</span><strong>{hosting.accounts[0]?.uptime || '99.99'}%<small> last 30 days</small></strong></div>
            <div><span>Next report</span><strong>Aug 1<small> monthly health report</small></strong></div>
            <div><span>Renews</span><strong>{me.renewsAt}<small> {careTier.name} · ${carePrice.toLocaleString()}{careSuffix}</small></strong></div>
          </>
        ) : (
          <>
            <div>
              <span>Active projects</span>
              <strong>{projects.filter((project) => project.status === 'active').length}<small> in motion</small></strong>
            </div>
            <div>
              <span>Waiting on you</span>
              <strong>{inReview.length}<small> {inReview.length === 1 ? 'delivery' : 'deliveries'}</small></strong>
            </div>
            <div>
              <span>Up next</span>
              <strong>{queued.length}<small> queued</small></strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{done.length}<small> this cycle</small></strong>
            </div>
          </>
        )}
      </section>

      {paused && (
        <section className="overview-notice anim-rise">
          <Icon.clock />
          <div>
            <strong>Work is currently paused</strong>
            <span>Resume when you are ready and your team will pick up where they left off.</span>
          </div>
          <button onClick={() => store.setPaused(false)}>Resume service</button>
        </section>
      )}

      {inReview.length > 0 && !paused && (
        <section className={`review-deck is-${reviewVariant} anim-rise`} style={{ animationDelay: '0.08s' }}>
          <header className="review-deck-head">
            <div>
              <span className="review-deck-icon"><Icon.eye /></span>
              <span><small>Ready for you</small><strong>{inReview.length} deliveries await approval</strong><p>Review, request changes, or approve the work.</p></span>
            </div>
            <button onClick={() => navigate('/requests')}>View all <Icon.arrow /></button>
          </header>
          <div className="review-deck-track">
            {visibleReviews.map((request, index) => (
              <button key={request.id} onClick={() => setOpenReq(request.id)} style={{ '--review-delay': `${index * 55}ms` }}>
                <span className="review-deck-card-top">
                  <CatChip category={request.category} size={35} />
                  <i>{String(index + 1).padStart(2, '0')}</i>
                </span>
                <span className="review-deck-card-copy">
                  <strong>{request.title}</strong>
                  <span className="review-card-identifiers">
                    <i className="identity-pill is-project"><Icon.layers />{projectFor(request)?.name}</i>
                    <i className={`request-priority is-${(request.priority || 'standard').toLowerCase()}`}><i />{request.priority || 'Standard'}</i>
                    <i className="identity-pill is-delivered"><Icon.check />Delivered {request.deliveredAt}</i>
                  </span>
                  <span className="review-card-brief">{request.brief}</span>
                </span>
                <span className="review-deck-card-action"><span>Open review</span><em>{request.deliverables.length} files</em><i><Icon.arrow /></i></span>
              </button>
            ))}
            {inReview.length > 3 && (
              <button className="review-deck-more" onClick={() => navigate('/requests')}>
                <span>+{inReview.length - 3}</span>
                <strong>More deliveries</strong>
                <small>Open the full review queue</small>
                <i><Icon.arrow /></i>
              </button>
            )}
          </div>
        </section>
      )}

      {isRetainer && inReview.length === 0 && (
        <section className="site-health-strip anim-rise" style={{ animationDelay: '0.08s' }}>
          <span><Icon.check /></span>
          <div>
            <strong>Everything is running.</strong>
            <p>Uptime {hosting.accounts[0]?.uptime || '99.99'}% · Last backup 4h ago · SSL valid · No security alerts</p>
          </div>
          <button onClick={() => navigate('/site')}>View My Site <Icon.arrow /></button>
        </section>
      )}

      <div className="overview-dashboard anim-rise" style={{ animationDelay: '0.12s' }}>
        <div className="overview-dashboard-main">
          <section className="overview-module work-module">
            <div className="overview-section-head">
              <div>
                <span className="overview-eyebrow">Current work</span>
                <h2>Your active requests</h2>
              </div>
              <span className="overview-section-pill">
                {paused ? 'Paused' : `${active.length} active`}
              </span>
            </div>

            <div className={`workboard ${paused ? 'is-paused' : ''}`}>
              {active.map((request, index) => (
                <button key={request.id} className="work-row" onClick={() => setOpenReq(request.id)}>
                  <span className="work-index">0{index + 1}</span>
                  <CatChip category={request.category} size={42} />
                  <span className="work-copy">
                    <strong>{request.title}</strong>
                    <span className="work-identifiers">
                      <i className="identity-pill is-project"><Icon.layers />{projectFor(request)?.name}</i>
                      <i className={`request-priority is-${(request.priority || 'standard').toLowerCase()}`}><i />{request.priority || 'Standard'}</i>
                      <i className={`identity-pill is-${deliveryState(request).tone}`}><Icon.cal />{deliveryState(request).label}</i>
                    </span>
                    <span>{request.changelog?.[0]?.text || request.brief}</span>
                  </span>
                  <ProgressRing value={request.progress} size={54} stroke={4} />
                  <span className="work-arrow"><Icon.arrow /></span>
                </button>
              ))}
            </div>

            {!isRetainer && totalSlots - active.length > 0 && (
              <button
                className={`open-slot-stack d${Math.min(totalSlots - active.length, 3)}`}
                onClick={() => navigate('/requests/new')}
              >
                <span className="empty-work-icon"><Icon.plus /></span>
                <span>
                  <strong>{totalSlots - active.length} open request slot{totalSlots - active.length > 1 ? 's' : ''}</strong>
                  <small>Ready for your next request</small>
                </span>
                <span className="overview-section-pill">Start request</span>
              </button>
            )}
          </section>

          <section className="overview-module projects-module">
            <div className="overview-section-head">
              <div>
                <span className="overview-eyebrow">Portfolio</span>
                <h2>Project health</h2>
              </div>
              <button className="overview-text-action" onClick={() => navigate('/projects')}>
                View all <Icon.arrow />
              </button>
            </div>

            <div className="project-ledger">
              {projects.map((project) => {
                const projectRequests = requests.filter((request) => request.projectId === project.id);
                return (
                  <button key={project.id} className="project-ledger-row" onClick={() => setOpenProj(project)}>
                    <span className="project-monogram">{project.name.split(' ').map((word) => word[0]).join('')}</span>
                    <span className="project-ledger-copy">
                      <strong>{project.name}</strong>
                      <small>{project.tagline}</small>
                    </span>
                    <span className="project-team">
                      {[project.pm, project.am, ...project.members].slice(0, 3).map((member, index) => (
                        <span key={member.id} style={{ zIndex: 3 - index }}><Avatar name={member.name} size={28} /></span>
                      ))}
                    </span>
                    <span className="project-request-count">{projectRequests.length} requests</span>
                    <span className="project-progress">
                      <span><i style={{ width: `${project.progress}%` }} /></span>
                      <strong>{project.progress}%</strong>
                    </span>
                    <StatusPill status={project.status} />
                    <span className="work-arrow"><Icon.arrow /></span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="overview-module activity-module">
            <div className="overview-panel-head">
              <div>
                <span className="overview-eyebrow">Recent activity</span>
                <h2>What changed</h2>
              </div>
              <button className="panel-icon-action" onClick={() => navigate('/messages')} aria-label="Open messages"><Icon.arrow /></button>
            </div>
            <div className="activity-list">
              {activity.slice(0, 4).map((item) => (
                <div key={item.id}>
                  <i />
                  <span>{item.text}</span>
                  <time>{item.at}</time>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="overview-dashboard-side">
          <section className="overview-module team-module">
            <div className="overview-panel-head">
              <div>
                <span className="overview-eyebrow">Your team</span>
                <h2>Assigned to you</h2>
              </div>
              <span className="team-count">{teamOnWork.length}</span>
            </div>
            <div className="team-pill-list">
              {[
                ['Managers', team.filter((member) => /Manager/i.test(member.role))],
                ['Developers', team.filter((member) => /Developer/i.test(member.role))],
                ['Designers', team.filter((member) => /Designer/i.test(member.role))],
              ].filter(([, members]) => members.length).map(([label, members]) => (
                <TeamPill key={label} label={label} members={members} />
              ))}
            </div>
            <button className="team-message" onClick={() => navigate('/messages')}>Message your team <Icon.arrow /></button>
          </section>

          {!isRetainer && <section className="overview-module queue-module">
            <div className="overview-panel-head">
              <div>
                <span className="overview-eyebrow">Up next</span>
                <h2>Request queue</h2>
              </div>
              <span className="overview-section-pill">{queued.length}</span>
            </div>
            <div className="side-queue-list">
              {queued.map((request, index) => (
                <button key={request.id} onClick={() => setOpenReq(request.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>{request.title}</strong>
                    <small>{projectFor(request)?.name}</small>
                  </span>
                  <i>{index === 0 ? 'Next' : 'Queued'}</i>
                </button>
              ))}
            </div>
            <button className="team-message" onClick={() => navigate('/requests')}>Manage queue <Icon.arrow /></button>
          </section>}

          <section className="overview-module plan-panel">
          <div className="overview-panel-head">
            <span className="overview-eyebrow">Membership</span>
            <span className={`plan-state ${paused ? 'is-paused' : ''}`}>{paused ? 'Paused' : 'Active'}</span>
          </div>
          {isRetainer ? (
            <>
              <div className="plan-title-row">
                <div>
                  <div className="plan-name">{careTier.name}</div>
                  <p>{hourText(hoursRemaining)} of {hourText(hoursAllowance)} care hours left this month</p>
                </div>
                <strong>${carePrice.toLocaleString()}<small>{careSuffix}</small></strong>
              </div>
              <div className="plan-care-included"><Icon.check /> Monitoring, backups and updates active</div>
              <div className="plan-renewal">
                <span>Hours reset</span>
                <strong>{hoursResetAt}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="plan-title-row">
                <div>
                  <div className="plan-name">{plan}</div>
                  <p>{totalSlots} parallel slots · unlimited requests and revisions</p>
                </div>
                <strong>${currentPlan.price.toLocaleString()}<small>/wk</small></strong>
              </div>
              <div className="plan-care-included"><Icon.check /> Care included</div>
              {extraSlots > 0 && (
                <div className="plan-addons">
                  <h3>Add-ons</h3>
                  <div>
                    <span>
                      <strong>{slotAddon.name}</strong>
                      <small>{extraSlots} × ${slotAddon.weeklyPrice.toLocaleString()}/wk</small>
                    </span>
                    <strong>${addonTotal.toLocaleString()}</strong>
                  </div>
                </div>
              )}
              <div className="plan-total">
                <span>Total weekly</span>
                <strong>${weeklyTotal.toLocaleString()}<small>/wk</small></strong>
              </div>
              <div className="plan-renewal">
                <span>Next invoice date</span>
                <strong>{me.renewsAt}</strong>
              </div>
            </>
          )}
          {!isRetainer && (
            <>
              <div className="plan-actions">
                <button onClick={() => setPlanPicker(!planPicker)}>Change plan</button>
                <button onClick={() => navigate('/billing')}>Billing details</button>
              </div>
              {planPicker && (
                <div className="plan-picker anim-rise">
                  {PLANS.map((option) => (
                    <button key={option.name} onClick={() => { store.setPlan(option.name, option.slots); setPlanPicker(false); }}>
                      <span>{option.name}<small>{option.slots} slots</small></span>
                      <strong>${option.price}/wk</strong>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {isRetainer && (
            <div className="plan-actions">
              <button onClick={() => navigate('/billing')}>Manage retainer</button>
              <button onClick={() => store.resetHours()}>Reset hours</button>
            </div>
          )}
          </section>
        </aside>
      </div>

      <section className="home-infrastructure anim-rise">
        <div className="overview-section-head"><div><span className="overview-eyebrow">My Site</span><h2>Managed systems</h2></div><button className="overview-text-action" onClick={() => navigate('/site')}>Open site operations <Icon.arrow /></button></div>
        <div>
          <button onClick={() => navigate('/site')}><span><Icon.clock /></span><strong>{hosting.accounts[0]?.uptime}%</strong><small>Hosting uptime</small></button>
          <button onClick={() => navigate('/site')}><span><Icon.home /></span><strong>{domains.length}</strong><small>Upcoming renewals</small></button>
          <button onClick={() => navigate('/site')}><span><Icon.eye /></span><strong>{securityMonitors.filter((item) => item.on).length}</strong><small>Security monitors</small></button>
          <button onClick={() => navigate('/site')}><span><Icon.invoice /></span><strong>{reports.length}</strong><small>Reports available</small></button>
        </div>
      </section>

      {openReq && <RequestSheet requestId={openReq} onClose={() => setOpenReq(null)} />}
      {openProj && !openReq && (
        <ProjectSheet
          project={openProj}
          onClose={() => setOpenProj(null)}
          onOpenRequest={(id) => setOpenReq(id)}
        />
      )}
    </div>
  );
}
