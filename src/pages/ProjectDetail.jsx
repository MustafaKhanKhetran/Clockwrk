import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { projects, CARE_PLANS, PLAN_CARE, PLANS } from '../mocks';
import ProjectSheet from '../components/ProjectSheet';
import Modal from '../components/Modal';
import { Icon } from '../components/ui';
import { store, useStore } from '../store';

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { accountMode, plan, retainerTier, retainerCadence: activeRetainerCadence } = useStore();
  const [retainerPicker, setRetainerPicker] = useState(false);
  const [retainerCadence, setRetainerCadence] = useState(activeRetainerCadence || 'monthly');
  const [selectedRetainerTier, setSelectedRetainerTier] = useState(PLAN_CARE[plan] || retainerTier || CARE_PLANS[1].id);
  const project = projects.find((item) => item.id === Number(projectId));
  if (!project) return <Navigate to="/projects" replace />;
  const currentPlan = PLANS.find((item) => item.name === plan) || PLANS[1];
  const selectedTier = CARE_PLANS.find((item) => item.id === selectedRetainerTier) || CARE_PLANS[1];
  const selectedTierPrice = retainerCadence === 'annual' ? selectedTier.annualPrice : selectedTier.price;
  const retainerSuffix = retainerCadence === 'annual' ? '/yr' : '/mo';
  const showShippedBanner = project.status === 'complete' && accountMode !== 'retainer';
  const confirmRetainerSwitch = () => {
    store.switchToRetainer(selectedRetainerTier, retainerCadence);
    setRetainerPicker(false);
  };

  return (
    <>
      {showShippedBanner && (
        <section className="project-shipped-banner anim-rise">
          <span><Icon.check /></span>
          <div>
            <strong>{project.name} shipped.</strong>
            <p>Keep it running - monitoring, backups and updates from ${CARE_PLANS[0].price.toLocaleString()}/mo.</p>
          </div>
          <button onClick={() => setRetainerPicker(true)}>See retainer options <Icon.arrow /></button>
        </section>
      )}

      <ProjectSheet
        project={project}
        embedded
        onClose={() => navigate('/projects')}
        onOpenRequest={(requestId) => navigate(`/requests/${requestId}`)}
      />

      <Modal isOpen={retainerPicker} onClose={() => setRetainerPicker(false)} title="Choose your retainer" size="max-w-6xl">
        <div className="billing-picker">
          <div className="billing-picker-head">
            <div>
              <span className="kicker">After launch</span>
              <h3>Keep {project.name} running</h3>
              <p>Select the ongoing care tier that should begin after your current billing period.</p>
            </div>
            <div className="billing-cadence-control billing-retainer-toggle" role="group" aria-label="Retainer cadence">
              {['monthly', 'annual'].map((cadence) => (
                <button key={cadence} className={retainerCadence === cadence ? 'is-active' : ''} onClick={() => setRetainerCadence(cadence)}>
                  {cadence === 'monthly' ? 'Monthly' : 'Annual'}
                </button>
              ))}
            </div>
          </div>
          <div className="billing-retainer-grid">
            {CARE_PLANS.map((tier) => {
              const selected = tier.id === selectedRetainerTier;
              const price = retainerCadence === 'annual' ? tier.annualPrice : tier.price;
              return (
                <article key={tier.id} className={`${tier.recommended ? 'is-recommended' : ''} ${selected ? 'is-selected' : ''}`}>
                  <div className="retainer-card-top">
                    <h3>{tier.name}</h3>
                    <span>{tier.recommended && <b>Recommended</b>}{selected && <b>Selected</b>}</span>
                  </div>
                  <strong className="retainer-price">${price.toLocaleString()}<small>{retainerSuffix}</small></strong>
                  <p className="retainer-price-note">{retainerCadence === 'annual' ? '2 months free' : `or $${tier.annualPrice.toLocaleString()}/yr - 2 months free`}</p>
                  <div className="retainer-headlines">
                    <span><Icon.clock /><strong>{tier.hoursIncluded} hours included</strong></span>
                    <span><Icon.bolt /><strong>{tier.responseTime}</strong></span>
                    {tier.strategyCall && <span><Icon.chat /><strong>{tier.strategyCall}</strong></span>}
                  </div>
                  <ul>{tier.includes.map((item) => <li key={item}><Icon.check />{item}</li>)}</ul>
                  <button onClick={() => setSelectedRetainerTier(tier.id)}>{selected ? 'Selected' : 'Select tier'}</button>
                </article>
              );
            })}
          </div>
          <div className="billing-picker-confirm">
            <p>You'll move from {plan || 'your subscription'} (${currentPlan.monthlyPrice.toLocaleString()}/mo) to {selectedTier.name} (${selectedTierPrice.toLocaleString()}{retainerSuffix}) at the end of your current billing period.</p>
            <button onClick={confirmRetainerSwitch}>Confirm switch <Icon.check /></button>
          </div>
        </div>
      </Modal>
    </>
  );
}
