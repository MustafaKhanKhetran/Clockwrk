import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me, invoices, PLANS, ADDONS, PLAN_CARE, CARE_PLANS, RETAINER_EXTRA_HOURS, SERVICE_CATALOG } from '../mocks';
import { Icon, StatusPill, SiteCta } from '../components/ui';
import Modal from '../components/Modal';
import { store, useStore } from '../store';
import { downloadMock } from '../utils/download';

const COVERAGE_BUCKETS = ['Run & maintain', 'Secure', 'Speed', 'Grow', 'Set up & launch'];
const MAILBOX_PRICES = { Starter: 6, Team: 12, Business: 22 };

function RetainerTierCards({ cadence, currentCareId, selectedId, onSelect, actionForTier, currentLabel = 'Included with your plan' }) {
  const retainerPriceFor = (tier) => cadence === 'annual' ? tier.annualPrice : tier.price;
  const retainerSuffix = cadence === 'annual' ? '/yr' : '/mo';

  return (
    <div className="billing-retainer-grid">
      {CARE_PLANS.map((tier) => {
        const current = tier.id === currentCareId;
        const selected = tier.id === selectedId;
        return (
          <article key={tier.id} className={`${tier.recommended ? 'is-recommended' : ''} ${current ? 'is-included' : ''} ${selected ? 'is-selected' : ''}`}>
            <div className="retainer-card-top">
              <h3>{tier.name}</h3>
              <span>
                {tier.recommended && <b>Recommended</b>}
                {current && <b>{currentLabel}</b>}
                {selected && !current && <b>Selected</b>}
              </span>
            </div>
            <strong className="retainer-price">${retainerPriceFor(tier).toLocaleString()}<small>{retainerSuffix}</small></strong>
            <p className="retainer-price-note">
              {cadence === 'annual'
                ? '2 months free'
                : `or $${tier.annualPrice.toLocaleString()}/yr — 2 months free`}
            </p>
            <div className="retainer-headlines">
              <span><Icon.clock /><strong>{tier.hoursIncluded} hours included</strong></span>
              <span><Icon.bolt /><strong>{tier.responseTime}</strong></span>
              {tier.strategyCall && <span><Icon.chat /><strong>{tier.strategyCall}</strong></span>}
            </div>
            <ul>
              {tier.includes.map((item) => <li key={item}><Icon.check />{item}</li>)}
            </ul>
            {onSelect && <button onClick={() => onSelect(tier.id)}>{selected ? 'Selected' : 'Select tier'}</button>}
            {actionForTier?.(tier, current)}
          </article>
        );
      })}
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const {
    plan, baseSlots, extraSlots, paused, requests, subscriptionAddons,
    serviceSubscriptions, hosting, mailboxes, billingCadence, accountMode, retainerTier, retainerCadence: activeRetainerCadence,
  } = useStore();
  const [compare, setCompare] = useState(false);
  const [pauseModal, setPauseModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [retainerPicker, setRetainerPicker] = useState(false);
  const [retainerSuccess, setRetainerSuccess] = useState(false);
  const [selectedRetainerTier, setSelectedRetainerTier] = useState(PLAN_CARE[plan] || CARE_PLANS[1].id);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [catalogBucket, setCatalogBucket] = useState('Run & maintain');
  const [retainerCadence, setRetainerCadence] = useState(activeRetainerCadence || 'monthly');

  const activeCount = requests.filter((request) => request.status === 'active').length;
  const isRetainer = accountMode === 'retainer';
  const currentPlan = PLANS.find((item) => item.name === plan) || PLANS[1];
  const currentCareId = isRetainer ? retainerTier : PLAN_CARE[plan];
  const careTier = CARE_PLANS.find((item) => item.id === currentCareId) || CARE_PLANS[0];
  const hasSubscription = Boolean(plan);
  const includedServices = SERVICE_CATALOG.filter((service) => service.billing === 'included');
  const coveredServices = includedServices.filter((service) => service.bucket === catalogBucket);
  const monthlyPlanSaving = Math.max(Math.round(currentPlan.price * 4.3333 - currentPlan.monthlyPrice), 0);
  const subscriptionPrice = billingCadence === 'monthly' ? currentPlan.monthlyPrice : currentPlan.price;
  const subscriptionSuffix = billingCadence === 'monthly' ? '/mo' : '/wk';
  const infrastructureTotal = [
    ...(hosting?.accounts || []).map((account) => account.price || 0),
    ...(mailboxes || []).map((mailbox) => MAILBOX_PRICES[mailbox.plan] || 0),
    ...serviceSubscriptions.map((item) => {
      const service = SERVICE_CATALOG.find((option) => option.id === item.id);
      return service?.billing === 'infra' && service.cadence === 'mo' ? service.price || 0 : 0;
    }),
  ].reduce((total, amount) => total + amount, 0);
  const addonActive = (id) => id === 'slot'
    ? extraSlots > 0
    : subscriptionAddons.some((item) => item.id === id);
  const toggleAddon = (addon) => {
    if (addon.id === 'slot') return store.buySlot();
    store.toggleAddon(addon.id, 'weekly', !addonActive(addon.id));
  };
  const planPriceFor = (item) => billingCadence === 'monthly' ? item.monthlyPrice : item.price;
  const planSuffix = billingCadence === 'monthly' ? '/mo' : '/wk';
  const retainerPriceFor = (tier) => retainerCadence === 'annual' ? tier.annualPrice : tier.price;
  const retainerSuffix = retainerCadence === 'annual' ? '/yr' : '/mo';
  const activeRetainerTier = CARE_PLANS.find((item) => item.id === retainerTier) || careTier;
  const activeRetainerPrice = activeRetainerCadence === 'annual' ? activeRetainerTier.annualPrice : activeRetainerTier.price;
  const activeRetainerSuffix = activeRetainerCadence === 'annual' ? '/yr' : '/mo';
  const selectedTier = CARE_PLANS.find((item) => item.id === selectedRetainerTier) || careTier;
  const selectedTierPrice = retainerPriceFor(selectedTier);
  const switchSummary = isRetainer
    ? `You'll switch from ${activeRetainerTier.name} ($${activeRetainerPrice.toLocaleString()}${activeRetainerSuffix}) to ${selectedTier.name} ($${selectedTierPrice.toLocaleString()}${retainerSuffix}) at the end of your current billing period.`
    : `You'll move from ${plan || 'your subscription'} ($${currentPlan.monthlyPrice.toLocaleString()}/mo) to ${selectedTier.name} ($${selectedTierPrice.toLocaleString()}${retainerSuffix}) at the end of your current billing period.`;
  const openRetainerPicker = () => {
    setSelectedRetainerTier(currentCareId || CARE_PLANS[1].id);
    setRetainerCadence(activeRetainerCadence || 'monthly');
    setPauseModal(false);
    setCancelConfirm(false);
    setRetainerPicker(true);
  };
  const confirmRetainerSwitch = () => {
    store.switchToRetainer(selectedRetainerTier, retainerCadence);
    setRetainerPicker(false);
    setRetainerSuccess(true);
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <span className="kicker">Subscription</span>
          <h1 className="page-title">Billing</h1>
          <p className="page-sub">Your weekly retainer, included care, capacity add-ons, and invoice history.</p>
        </div>
        <button className="billing-manage"><Icon.card /> Manage payment method</button>
      </header>

      <section className={`billing-overview anim-rise ${isRetainer ? 'is-retainer' : ''}`}>
        <div className="billing-plan-card">
          {isRetainer ? (
            <>
              <div className="billing-plan-top billing-retainer-card-top">
                <span><i /> Active retainer</span>
                <strong>{activeRetainerTier.name}</strong>
                <p>{activeRetainerTier.hoursIncluded} care hours · {activeRetainerTier.responseTime} response · ongoing updates and monitoring.</p>
              </div>
              <div className="billing-plan-total">
                <span>
                  <small>{activeRetainerCadence === 'annual' ? 'Annual care retainer' : 'Monthly care retainer'}</small>
                  <strong>${activeRetainerPrice.toLocaleString()}<i>{activeRetainerSuffix}</i></strong>
                </span>
                <span><small>Care hours</small><strong>{activeRetainerTier.hoursIncluded}/mo</strong></span>
                <span><small>Response</small><strong>{activeRetainerTier.responseTime}</strong></span>
              </div>
              <div className="billing-plan-actions">
                <SiteCta className="site-cta-compact billing-cta" onClick={() => store.resumeSubscription('Business')}>Resume subscription</SiteCta>
                <button onClick={openRetainerPicker}>Change retainer</button>
              </div>
            </>
          ) : (
            <>
              <div className="billing-plan-top">
                <span><i className={paused ? 'is-paused' : ''} /> {paused ? 'Paused' : 'Active subscription'}</span>
                <strong>{plan}</strong>
                <p>{baseSlots + extraSlots} parallel request slots · unlimited queue and revisions</p>
                <div className="billing-cadence-control" role="group" aria-label="Billing cadence">
                  {['weekly', 'monthly'].map((cadence) => (
                    <button key={cadence} className={billingCadence === cadence ? 'is-active' : ''} onClick={() => store.setBillingCadence(cadence)}>
                      {cadence === 'weekly' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>
                <small className="billing-cadence-note">Weekly — pause or cancel any week. Monthly — save ~10%, billed upfront.</small>
              </div>
              <div className="billing-plan-total">
                <span>
                  <small>{billingCadence === 'monthly' ? 'Monthly retainer' : 'Weekly retainer'}</small>
                  <strong>
                    ${subscriptionPrice.toLocaleString()}<i>{subscriptionSuffix}</i>
                    {billingCadence === 'monthly' && monthlyPlanSaving > 0 && <em>Save ${monthlyPlanSaving.toLocaleString()}/mo</em>}
                  </strong>
                </span>
                <span><small>Next invoice</small><strong>{me.renewsAt}</strong></span>
              </div>
              <div className="billing-plan-actions">
                <SiteCta className="site-cta-compact billing-cta" onClick={() => setCompare(!compare)}>Change plan</SiteCta>
                <button onClick={() => (paused ? store.setPaused(false) : setPauseModal(true))}>{paused ? 'Resume subscription' : 'Pause subscription'}</button>
              </div>
            </>
          )}
        </div>

        {!isRetainer && (
          <div className="billing-capacity-card">
            <div className="billing-capacity-head"><span><Icon.bolt /></span><div><small>Request capacity</small><strong>{baseSlots + extraSlots} slots</strong></div></div>
            <div className="billing-capacity-boxes">
              <button onClick={() => navigate('/requests')}>
                <span><strong>{activeCount}</strong><small>Used requests</small></span>
                <i><Icon.arrow /></i>
              </button>
              <button onClick={() => navigate('/requests/new')}>
                <span><strong>{Math.max(baseSlots + extraSlots - activeCount, 0)}</strong><small>Unused request slots</small></span>
                <i><Icon.arrow /></i>
              </button>
            </div>
            <div className="billing-capacity-foot"><span>{extraSlots ? `${extraSlots} additional slot${extraSlots > 1 ? 's' : ''}` : 'No additional slots'}</span><button onClick={store.buySlot}><Icon.plus /> Add slot</button></div>
          </div>
        )}
      </section>

      {retainerSuccess && (
        <section className="billing-switch-success anim-pop">
          <div><strong>Retainer scheduled</strong><p>Your account will move to {activeRetainerTier.name} at the end of the current billing period.</p></div>
          <button onClick={() => setRetainerSuccess(false)}>Dismiss</button>
        </section>
      )}

      {compare && !isRetainer && (
        <section className="billing-plan-compare anim-rise">
          {PLANS.map((item) => (
            <article key={item.name} className={item.name === plan ? 'is-current' : ''}>
              <div><strong>{item.name}</strong>{item.name === plan && <span>Current</span>}</div>
              <h3>${planPriceFor(item).toLocaleString()}<small>{planSuffix}</small></h3>
              <p>{item.blurb}</p>
              <span>{item.slots} parallel slot{item.slots > 1 ? 's' : ''} · {CARE_PLANS.find((care) => care.id === PLAN_CARE[item.name])?.name} included</span>
              {item.name !== plan && <button onClick={() => { store.setPlan(item.name, item.slots); setCompare(false); }}>{item.price > currentPlan.price ? 'Upgrade plan' : 'Switch plan'}</button>}
            </article>
          ))}
        </section>
      )}

      <section className="billing-included-stack anim-rise">
        <div className="billing-care">
          <div className="billing-section-head">
            <div>
              <span className="kicker">Website care</span>
              <h2>{isRetainer ? `${careTier.name} retainer` : `${careTier.name} · included with your ${plan} plan`}</h2>
              <p>{isRetainer ? 'Your ongoing care plan keeps shipped work monitored, updated, and ready for small changes.' : 'No extra charge. It is part of your weekly retainer.'}</p>
            </div>
            <span className="billing-included-badge"><Icon.check /> {isRetainer ? 'Your plan' : 'Included'}</span>
          </div>
          <div className="billing-care-included">
            {careTier.includes.map((item) => <span key={item}><Icon.check />{item}</span>)}
          </div>
        </div>

        <section className="billing-retainer-compare">
          <div className="billing-retainer-head">
            <div>
              <span className="kicker">{hasSubscription ? 'After your project ships' : 'Website care'}</span>
              <h2>{hasSubscription ? 'Keep it running' : 'Choose your retainer'}</h2>
              <p>
                {hasSubscription
                  ? `When your build is complete, you move onto a retainer. Your current plan includes ${careTier.name} at no extra cost.`
                  : 'Pick the ongoing care tier that matches how often your site needs changes, monitoring, and support.'}
              </p>
            </div>
            <div className="billing-cadence-control billing-retainer-toggle" role="group" aria-label="Retainer cadence">
              {['monthly', 'annual'].map((cadence) => (
                <button key={cadence} className={retainerCadence === cadence ? 'is-active' : ''} onClick={() => setRetainerCadence(cadence)}>
                  {cadence === 'monthly' ? 'Monthly' : 'Annual'}
                </button>
              ))}
            </div>
          </div>
          <RetainerTierCards
            cadence={retainerCadence}
            currentCareId={currentCareId}
            currentLabel={isRetainer ? 'Your plan' : 'Included with your plan'}
            actionForTier={(tier, current) => (
              isRetainer && !current
                ? <button onClick={() => { store.switchToRetainer(tier.id, retainerCadence); setRetainerSuccess(true); }}>Switch</button>
                : null
            )}
          />
          <p className="billing-retainer-footnote"><strong>Need more hours?</strong> ${RETAINER_EXTRA_HOURS.hourly}/hr, or a {RETAINER_EXTRA_HOURS.block.hours}-hour block for ${RETAINER_EXTRA_HOURS.block.price}.</p>
        </section>

        <div className="billing-catalog">
          <button className="catalog-disclosure" onClick={() => setCatalogOpen(!catalogOpen)} aria-expanded={catalogOpen}>
            <span><strong>What your plan covers</strong><small>Technical services your team can request without a separate charge.</small></span>
            <Icon.arrow />
          </button>
          {catalogOpen && (
            <div className="catalog-body catalog-checklist anim-rise">
              <nav>
                {COVERAGE_BUCKETS.map((bucket) => (
                  <button key={bucket} className={catalogBucket === bucket ? 'is-active' : ''} onClick={() => setCatalogBucket(bucket)}>{bucket}</button>
                ))}
              </nav>
              <div>
                {coveredServices.map((service) => (
                  <article key={service.id}>
                    <i><Icon.check /></i>
                    <span><strong>{service.name}</strong><small>{service.category}</small></span>
                  </article>
                ))}
              </div>
              <footer>
                <span>All included — just send a request.</span>
                <button onClick={() => navigate('/requests/new')}>Start request <Icon.arrow /></button>
              </footer>
            </div>
          )}
        </div>

        <div className="billing-service-summary">
          <div><span className="kicker">Plan billing</span><h2>{isRetainer ? 'Care retainer' : `${billingCadence === 'monthly' ? 'Monthly' : 'Weekly'} plan`}</h2><strong>{isRetainer ? `$${activeRetainerPrice.toLocaleString()}${activeRetainerSuffix}` : `$${subscriptionPrice.toLocaleString()}${subscriptionSuffix}`}</strong></div>
          <div><span className="kicker">Care</span><h2>{careTier.name}</h2><strong>Included</strong></div>
          <div><span className="kicker">Infrastructure</span><h2>Pass-through costs</h2><strong>${infrastructureTotal.toLocaleString()}/mo</strong></div>
          <div><span className="kicker">Next invoice</span><h2>Renewal date</h2><strong>{me.renewsAt}</strong></div>
        </div>
      </section>

      <section className="billing-addons anim-rise">
        <div className="billing-section-head">
          <div><span className="kicker">Capacity</span><h2>Add-ons</h2><p>Only four paid add-ons remain: more capacity, faster queue, white label delivery, or embedded hiring.</p></div>
          <span>{ADDONS.length} add-ons</span>
        </div>
        <div className="billing-addon-grid">
          {ADDONS.map((addon) => {
            const active = addonActive(addon.id);
            return (
              <article key={addon.id} className={active ? 'is-active' : ''}>
                <span className="billing-addon-state">{active ? 'Active' : 'Optional'}</span>
                <span className="billing-addon-icon"><Icon.plus /></span>
                <h3>{addon.name}</h3>
                <p>{addon.blurb}</p>
                <div>
                  <strong>${addon.weeklyPrice.toLocaleString()}<small>/wk</small></strong>
                  <button className={active ? 'is-added' : ''} onClick={() => toggleAddon(addon)} aria-label={`${active ? 'Remove' : 'Add'} ${addon.name}`}>
                    {active ? <Icon.check /> : <Icon.plus />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="billing-invoices anim-rise">
        <div className="billing-section-head"><div><span className="kicker">Documents</span><h2>Invoice history</h2><p>Download receipts for your accounting records.</p></div><span>{invoices.length} invoices</span></div>
        <div className="billing-invoice-table">
          <div className="billing-invoice-head"><span>Invoice</span><span>Date / renewal</span><span>Amount</span><span>Status</span><span>Renewal</span><span /></div>
          {invoices.map((invoice) => <div key={invoice.id}><span><i><Icon.invoice /></i><span><strong>{invoice.id}</strong><small>{invoice.lineItems.map((item) => `${item.label} · ${item.cadence}`).join(' + ')}</small></span></span><span><strong>{invoice.date}</strong><small>{invoice.renewalAt ? `Renews ${invoice.renewalAt}` : 'One-time purchase'}</small></span><strong>${invoice.amount.toLocaleString()}</strong><StatusPill status={invoice.status} /><label className="invoice-renew"><input type="checkbox" defaultChecked={invoice.autoRenew} disabled={!invoice.renewalAt} />Auto-renew</label><button aria-label={`Download ${invoice.id}`} onClick={() => downloadMock(`${invoice.id}.pdf`, invoice.lineItems.map((item) => `${item.label} · ${item.cadence} · $${item.amount}`).join('\n'))}><Icon.download /></button></div>)}
        </div>
      </section>

      <Modal isOpen={pauseModal} onClose={() => { setPauseModal(false); setCancelConfirm(false); }} title={cancelConfirm ? 'Cancel subscription' : 'Subscription options'} size="max-w-3xl">
        {cancelConfirm ? (
          <div className="billing-cancel-confirm">
            <span><Icon.card /></span>
            <h3>Confirm cancellation?</h3>
            <p>This mock flow does not cancel billing, but in production this would end your subscription at the close of the current period.</p>
            <div>
              <button onClick={() => { setCancelConfirm(false); setPauseModal(false); }}>Confirm cancel</button>
              <button onClick={() => setCancelConfirm(false)}>Go back</button>
            </div>
          </div>
        ) : (
          <div className="billing-mode-modal">
            <p>Your build stays available either way. Choose whether to pause work, move into care after launch, or cancel the active subscription.</p>
            <div className="billing-choice-list">
              <button onClick={() => { store.setPaused(true); setPauseModal(false); }}>
                <span><Icon.clock /></span>
                <strong>Pause subscription</strong>
                <small>Stop new work at the end of this period. Resume when you are ready.</small>
              </button>
              <button className="is-recommended" onClick={openRetainerPicker}>
                <i>Recommended</i>
                <span><Icon.check /></span>
                <strong>Switch to a retainer</strong>
                <small>Keep shipped work monitored and updated from ${CARE_PLANS[0].price.toLocaleString()}/mo.</small>
              </button>
              <button onClick={() => setCancelConfirm(true)}>
                <span><Icon.card /></span>
                <strong>Cancel subscription</strong>
                <small>End the active subscription after confirmation. Mock only.</small>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={retainerPicker} onClose={() => setRetainerPicker(false)} title="Choose your retainer" size="max-w-6xl">
        <div className="billing-picker">
          <div className="billing-picker-head">
            <div>
              <span className="kicker">After launch</span>
              <h3>Keep the shipped project healthy</h3>
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
          <RetainerTierCards
            cadence={retainerCadence}
            currentCareId={currentCareId}
            selectedId={selectedRetainerTier}
            currentLabel={isRetainer ? 'Your plan' : 'Included today'}
            onSelect={setSelectedRetainerTier}
          />
          <div className="billing-picker-confirm">
            <p>{switchSummary}</p>
            <button onClick={confirmRetainerSwitch}>Confirm switch <Icon.check /></button>
          </div>
        </div>
      </Modal>
    </>
  );
}
