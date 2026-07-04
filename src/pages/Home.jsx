import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me, projects, activity, team, PLANS } from '../mocks';
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
  const { requests, extraSlots, paused, plan, baseSlots } = useStore();
  const [openReq, setOpenReq] = useState(null);
  const [openProj, setOpenProj] = useState(null);
  const [planPicker, setPlanPicker] = useState(false);

  const totalSlots = baseSlots + extraSlots;
  const active = requests.filter((request) => request.status === 'active');
  const inReview = requests.filter((request) => request.status === 'review');
  const queued = requests
    .filter((request) => request.status === 'queued')
    .sort((a, b) => a.queuePos - b.queuePos);
  const done = requests.filter((request) => request.status === 'done');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const projectFor = (request) => projects.find((project) => project.id === request.projectId);
  const teamOnWork = [...new Map(
    projects.flatMap((project) => [project.pm, project.am, ...project.members]).map((member) => [member.id, member]),
  ).values()];

  return (
    <div className="overview">
      <header className="overview-intro anim-rise">
        <div>
          <p className="overview-date">{todayLabel}</p>
          <h1>{greeting}, {me.name.split(' ')[0]}.</h1>
          <p className="overview-summary">
            {paused
              ? 'Your subscription is paused. Your queue, files, and project history are safe.'
              : inReview.length
                ? `${active.length} requests are moving and ${inReview.length} delivery needs your review.`
                : `${active.length} requests are moving. Everything is on schedule.`}
          </p>
        </div>
        <div className="overview-intro-actions">
          <span className="overview-live"><i /> Team online</span>
          <button className="overview-primary" onClick={() => navigate('/requests/new')}>
            <Icon.plus /> New request
          </button>
        </div>
      </header>

      <section className="overview-metrics anim-rise" style={{ animationDelay: '0.04s' }}>
        <div>
          <span>In progress</span>
          <strong>{active.length}<small> / {totalSlots} slots</small></strong>
        </div>
        <div>
          <span>Waiting on you</span>
          <strong>{inReview.length}<small> delivery</small></strong>
        </div>
        <div>
          <span>Up next</span>
          <strong>{queued.length}<small> queued</small></strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{done.length}<small> this cycle</small></strong>
        </div>
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
        <button className="review-callout anim-rise" style={{ animationDelay: '0.08s' }} onClick={() => setOpenReq(inReview[0].id)}>
          <span className="review-callout-icon"><Icon.eye /></span>
          <span className="review-callout-copy">
            <small>Ready for your review</small>
            <strong>{inReview[0].title}</strong>
            <span>{projectFor(inReview[0])?.name} · delivered {inReview[0].deliveredAt}</span>
          </span>
          <span className="review-callout-action">Open delivery <Icon.arrow /></span>
        </button>
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
                {paused ? 'Paused' : `${active.length} / ${totalSlots} slots`}
              </span>
            </div>

            <div className={`workboard ${paused ? 'is-paused' : ''}`}>
              {active.map((request, index) => (
                <button key={request.id} className="work-row" onClick={() => setOpenReq(request.id)}>
                  <span className="work-index">0{index + 1}</span>
                  <CatChip category={request.category} size={42} />
                  <span className="work-copy">
                    <small>{projectFor(request)?.name} · {request.type}</small>
                    <strong>{request.title}</strong>
                    <span>{request.changelog?.[0]?.text || request.brief}</span>
                  </span>
                  <span className="work-delivery">
                    <small>Expected</small>
                    <strong>{request.due}</strong>
                  </span>
                  <ProgressRing value={request.progress} size={54} stroke={4} />
                  <span className="work-arrow"><Icon.arrow /></span>
                </button>
              ))}
            </div>

            {totalSlots - active.length > 0 && (
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

          <section className="overview-module queue-module">
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
          </section>

          <section className="overview-module plan-panel">
          <div className="overview-panel-head">
            <span className="overview-eyebrow">Membership</span>
            <span className={`plan-state ${paused ? 'is-paused' : ''}`}>{paused ? 'Paused' : 'Active'}</span>
          </div>
          <div className="plan-name">{plan}</div>
          <p>{totalSlots} parallel slots · unlimited requests and revisions</p>
          <div className="plan-renewal">
            <span>Next invoice</span>
            <strong>{me.renewsAt}</strong>
          </div>
          <div className="plan-actions">
            <button onClick={() => setPlanPicker(!planPicker)}>Change plan</button>
            <button onClick={() => navigate('/billing')}>Billing details</button>
          </div>
          {planPicker && (
            <div className="plan-picker anim-rise">
              {PLANS.map((option) => (
                <button key={option.name} onClick={() => { store.setPlan(option.name, option.slots); setPlanPicker(false); }}>
                  <span>{option.name}<small>{option.slots} slots</small></span>
                  <strong>${option.price}/mo</strong>
                </button>
              ))}
            </div>
          )}
          </section>
        </aside>
      </div>

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
