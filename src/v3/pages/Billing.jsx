import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADDONS, CARE_PLANS, invoices, PLAN_CARE, PLANS } from '../../mocks';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { Action, PageIntro, Status } from '../Primitives';

export default function Billing() {
  const navigate = useNavigate();
  const { plan, requests, baseSlots, extraSlots, billingCadence, accountMode, retainerTier } = useStore();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [tiersOpen, setTiersOpen] = useState(false);
  const currentPlan = PLANS.find((item) => item.name === plan) || PLANS[1];
  const currentCare = CARE_PLANS.find((item) => item.id === (accountMode === 'retainer' ? retainerTier : PLAN_CARE[plan])) || CARE_PLANS[1];
  const active = requests.filter((item) => item.status === 'active').length;
  const planPrice = billingCadence === 'monthly' ? currentPlan.monthlyPrice : currentPlan.price;
  const suffix = billingCadence === 'monthly' ? '/month' : '/week';
  const slotAddon = ADDONS.find((item) => item.id === 'slot');

  return <div className="v3-billing-page"><PageIntro index="Account ledger" title="Billing" copy="Your subscription, capacity, care coverage, and invoice records without the fine-print maze." />
    <section className="v3-billing-hero v3-enter">
      <div className="v3-billing-plan"><header><span>{accountMode === 'retainer' ? 'Active retainer' : 'Active subscription'}</span><Status status="active" /></header><h2>{accountMode === 'retainer' ? currentCare.name : plan}</h2><p>{accountMode === 'retainer' ? `${currentCare.hoursIncluded} hours of ongoing care and maintenance.` : `${baseSlots + extraSlots} requests can run in parallel. Queue as much work as you need.`}</p><div className="v3-price"><strong>${accountMode === 'retainer' ? currentCare.price.toLocaleString() : planPrice.toLocaleString()}</strong><span>{accountMode === 'retainer' ? '/month' : suffix}</span></div>{accountMode !== 'retainer' && <div className="v3-cadence"><button className={billingCadence === 'weekly' ? 'is-active' : ''} onClick={() => store.setBillingCadence('weekly')}>Pay weekly</button><button className={billingCadence === 'monthly' ? 'is-active' : ''} onClick={() => store.setBillingCadence('monthly')}>Pay monthly</button></div>}<footer><Action onClick={() => setTiersOpen(!tiersOpen)}>Change plan</Action><button onClick={() => setPauseOpen(true)}>Subscription options</button></footer></div>
      <aside className="v3-capacity"><header><span>Parallel capacity</span><strong>{active}/{baseSlots + extraSlots}</strong></header><div>{Array.from({ length: baseSlots + extraSlots }).map((_, index) => <button key={index} className={index < active ? 'is-used' : ''} onClick={() => navigate(index < active ? '/requests' : '/requests/new')}><span>{String(index + 1).padStart(2, '0')}</span><strong>{index < active ? 'Working' : 'Open'}</strong><small>{index < active ? requests.filter((item) => item.status === 'active')[index]?.title : 'Start a request'}</small><Icon name="arrow" size={15} /></button>)}</div><footer><span>Extra slot · ${slotAddon?.weeklyPrice || 400}/week</span><button onClick={store.buySlot}><Icon name="plus" size={15} />Add capacity</button></footer></aside>
    </section>

    {tiersOpen && <section className="v3-plan-lineup v3-enter"><header><span>Plans</span><button onClick={() => setTiersOpen(false)}><Icon name="close" size={15} /></button></header>{PLANS.map((item) => <button key={item.name} className={item.name === plan ? 'is-current' : ''} onClick={() => store.setPlan(item.name, item.slots)}><span>{item.name === plan ? 'Current' : `${item.slots} slots`}</span><h3>{item.name}</h3><p>{item.blurb}</p><strong>${item.price.toLocaleString()}<small>/wk</small></strong><Icon name="arrow" /></button>)}</section>}

    <section className="v3-care-ledger v3-enter"><header><div><span>Care included</span><h2>{currentCare.name} protects what ships.</h2><p>Monitoring, updates, fixes, and strategy stay connected to your build.</p></div><strong>${currentCare.price}<small> value / month</small></strong></header><div>{currentCare.includes.slice(0, 6).map((item) => <span key={item}><Icon name="check" size={14} />{item}</span>)}</div><button onClick={() => setTiersOpen(true)}>Compare ongoing care <Icon name="arrow" size={15} /></button></section>

    <section className="v3-invoice-ledger v3-enter"><header><div><span>Documents</span><h2>Invoice history</h2></div><strong>{invoices.length} records</strong></header><div>{invoices.map((invoice) => <div key={invoice.id}><span><Icon name="billing" size={16} /><strong>{invoice.id}</strong></span><span><strong>{invoice.date}</strong><small>{invoice.lineItems.map((item) => item.label).join(' + ')}</small></span><strong>${invoice.amount.toLocaleString()}</strong><Status status={invoice.status} /><button aria-label={`Download ${invoice.id}`}><Icon name="download" size={16} /></button></div>)}</div></section>

    {pauseOpen && <div className="v3-dialog-layer" onMouseDown={() => setPauseOpen(false)}><section onMouseDown={(event) => event.stopPropagation()}><header><span>Subscription options</span><button onClick={() => setPauseOpen(false)}><Icon name="close" size={16} /></button></header><p>Choose what should happen when active production stops.</p><div className="v3-option-stack"><button onClick={() => { store.setPaused(true); setPauseOpen(false); }}><Icon name="clock" /><span><strong>Pause production</strong><small>Keep every file and request, then resume later.</small></span><Icon name="arrow" /></button><button className="is-care" onClick={() => { store.switchToRetainer(currentCare.id); setPauseOpen(false); }}><Icon name="site" /><span><em>Recommended</em><strong>Move to ongoing care</strong><small>Keep shipped work monitored, updated, and supported.</small></span><Icon name="arrow" /></button><button onClick={() => setPauseOpen(false)}><Icon name="close" /><span><strong>Cancel at period end</strong><small>Production and care end after the current billing period.</small></span><Icon name="arrow" /></button></div></section></div>}
  </div>;
}
