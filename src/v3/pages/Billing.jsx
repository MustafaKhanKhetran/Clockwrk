import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADDONS, CARE_PLANS, PLAN_CARE, PLANS } from '../../catalog';
import { store, useStore } from '../../store';
import { api } from '../api';
import PendingChange from '../PendingChange';
import PlanChangeDialog from '../PlanChangeDialog';
import Icon from '../Icon';
import { Action, AnimatedNumber, PageIntro, Status } from '../Primitives';

export default function Billing() {
  const navigate = useNavigate();
  const { plan, requests, baseSlots, extraSlots, billingCadence, accountMode, retainerTier,
    serverInvoices, account, totalPending } = useStore();
  const invoices = serverInvoices;
  const [pauseOpen, setPauseOpen] = useState(false);
  const [tiersOpen, setTiersOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [billing, setBilling] = useState(null);
  const [changeTarget, setChangeTarget] = useState(null);

  // The authoritative view of the account: real plan, real add-ons, real slot
  // count, and anything sitting between requested and activated.
  const loadBilling = useCallback(async () => {
    try {
      const summary = await api.billingSummary();
      setBilling(summary);
      // Plan/slots changed under us — refresh the shared store so the live rail
      // and every other page agree with billing.
      if (summary?.plan && summary.plan !== String(plan || '').toLowerCase()) store.loadFromApi();
    } catch { /* page still renders */ }
  }, [plan]);
  useEffect(() => { loadBilling(); }, [loadBilling]);

  // Plan, capacity and cancellation changes are handled by a human — there is no
  // self-serve payment flow yet. Rather than pretend the change happened, raise a
  // ticket the team actually receives.
  const requestChange = async (subject, description) => {
    setNotice('');
    try {
      await api.createTicket({ subject, category: 'Billing Question', description, priority: 'Normal' });
      setNotice(`${subject} — sent. The team will confirm shortly.`);
      setTiersOpen(false);
      setPauseOpen(false);
    } catch (err) {
      setNotice(err.message || 'Could not send that request.');
    }
    setTimeout(() => setNotice(''), 6000);
  };
  // The billing summary is authoritative and refreshes after every change; the
  // store only loads once at shell mount, so it goes stale the moment a plan
  // change is verified.
  const livePlanName = billing?.plan ? billing.plan[0].toUpperCase() + billing.plan.slice(1) : plan;
  const liveCadence = billing?.cadence || billingCadence;
  const currentPlan = PLANS.find((item) => item.name === livePlanName) || PLANS[1];
  const currentCare = CARE_PLANS.find((item) => item.id === (accountMode === 'retainer' ? retainerTier : PLAN_CARE[livePlanName])) || CARE_PLANS[1];
  const active = requests.filter((item) => item.status === 'active').length;
  const activeRequests = requests.filter((item) => item.status === 'active');
  // Prefer the API's slot count — it includes paid-for add-on slots.
  const totalSlots = billing?.slots ?? (baseSlots + extraSlots);
  const openSlots = Math.max(0, totalSlots - active);
  const planPrice = liveCadence === 'monthly' ? currentPlan.monthlyPrice : currentPlan.price;
  const suffix = liveCadence === 'monthly' ? '/month' : '/week';
  const slotAddon = ADDONS.find((item) => item.id === 'slot');
  const nextDue = (billing?.nextBillingDate || account?.next_payment_due)
    ? new Date(billing?.nextBillingDate || account.next_payment_due).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  // Paying monthly beats 52 weekly payments a year — show the actual gap.
  const savingPerMonth = currentPlan.monthlyPrice
    ? Math.round((currentPlan.price * 52) / 12 - currentPlan.monthlyPrice)
    : 0;

  return <div className="v3-billing-page"><PageIntro index="Account ledger" title="Billing" copy="Your subscription, capacity, care coverage, and invoice records without the fine-print maze." />
    {nextDue && <section className={`v3-next-billing v3-enter${totalPending > 0 ? ' is-due' : ''}`}>
      <span className="v3-next-billing-mark"><Icon name="calendar" size={18} /></span>
      <div><small>{totalPending > 0 ? 'Payment outstanding' : 'Next payment'}</small><strong>{totalPending > 0 ? `$${Number(totalPending).toLocaleString()} due ${nextDue}` : `Your ${liveCadence} plan renews ${nextDue}`}</strong><p>{totalPending > 0 ? 'Send the transfer using the details on your latest invoice to keep production running.' : `Billed ${liveCadence} · ${account?.company || ''}`}</p></div>
      {savingPerMonth > 0 && liveCadence === 'weekly' && <button onClick={() => store.setBillingCadence('monthly')}>Save ${savingPerMonth.toLocaleString()}/mo by paying monthly</button>}
    </section>}

    {notice && <p className="v3-billing-notice" role="status">{notice}</p>}
    {billing?.pendingChanges?.map((change) => (
      <PendingChange key={change.id} change={change} onChanged={loadBilling} />
    ))}
    <section className="v3-billing-hero v3-enter">
      <div className="v3-billing-plan"><header><span>{accountMode === 'retainer' ? 'Active retainer' : 'Active subscription'}</span><Status status="active" /></header><h2>{accountMode === 'retainer' ? currentCare.name : livePlanName}</h2><p>{accountMode === 'retainer' ? `${currentCare.hoursIncluded} hours of ongoing care and maintenance.` : `${totalSlots} requests can run in parallel. Queue as much work as you need.`}</p><div className="v3-price"><strong><AnimatedNumber prefix="$" value={accountMode === 'retainer' ? currentCare.price : planPrice} /></strong><span>{accountMode === 'retainer' ? '/month' : suffix}</span></div>{accountMode !== 'retainer' && <div className="v3-cadence" data-cadence={liveCadence} role="group" aria-label="Billing cadence"><i aria-hidden="true" /><button className={liveCadence === 'weekly' ? 'is-active' : ''} aria-pressed={liveCadence === 'weekly'} onClick={() => store.setBillingCadence('weekly')}>Weekly</button><button className={liveCadence === 'monthly' ? 'is-active' : ''} aria-pressed={liveCadence === 'monthly'} onClick={() => store.setBillingCadence('monthly')}>Monthly</button></div>}<footer><Action onClick={() => setTiersOpen(!tiersOpen)}>Change plan</Action><button onClick={() => setPauseOpen(true)}>Subscription options</button></footer></div>
      <aside className="v3-capacity"><header><span>Parallel capacity</span><strong><AnimatedNumber value={active} /> <small>of</small> <AnimatedNumber value={totalSlots} /></strong></header><div className="v3-capacity-list">{activeRequests.map((request, index) => <button key={request.id} className="v3-slot-pill is-used" onClick={() => navigate(`/requests/${request.id}`)}><span>{String(index + 1).padStart(2, '0')}</span><i><Icon name="requests" size={17} /></i><div><strong>{request.title}</strong><small>{request.progress}% complete · due {request.due}</small></div><Status status="active" /><Icon name="arrow" size={15} /></button>)}{openSlots > 0 && <div className="v3-open-slot-stack"><div aria-hidden="true">{Array.from({ length: Math.min(openSlots, 5) }).map((_, index) => <i key={`${totalSlots}-${index}`} style={{ '--stack': index }} />)}</div><button className="v3-slot-pill is-open" onClick={() => navigate('/requests/new')}><span>{String(active + 1).padStart(2, '0')}</span><i><Icon name="plus" size={17} /></i><div><strong>{openSlots} open {openSlots === 1 ? 'slot' : 'slots'}</strong><small>Ready for your next request</small></div><Icon name="arrow" size={15} /></button></div>}</div>{!!billing?.addons?.length && <div className="v3-addon-list">{billing.addons.map((addon) => <div key={addon.id}><span><strong>{addon.name}</strong><small>{addon.quantity > 1 ? `${addon.quantity} × ` : ''}{addon.status === 'scheduled_removal' ? `Ends ${new Date(addon.ends_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : 'Active'}</small></span>{addon.status === 'active' && <button onClick={() => setChangeTarget({ kind: 'addon', target: addon.addon_id, label: addon.name, remove: true })}>Remove</button>}</div>)}</div>}
      <footer><span>Extra slot · ${slotAddon?.weeklyPrice || 400}/week</span><button onClick={() => setChangeTarget({ kind: 'addon', target: 'slot', label: 'an extra request slot' })}><Icon name="plus" size={15} />Add capacity</button></footer></aside>
    </section>

    {tiersOpen && <section className="v3-plan-lineup v3-enter"><header><span>Plans</span><button onClick={() => setTiersOpen(false)}><Icon name="close" size={15} /></button></header><div className="v3-plan-cards">{PLANS.map((item) => <button key={item.name} className={item.name === livePlanName ? 'is-current' : ''} onClick={() => setChangeTarget({ kind: 'plan', target: item.name.toLowerCase(), label: item.name })}><span>{item.name === livePlanName ? 'Current' : `${item.slots} slots`}</span><h3>{item.name}</h3><p>{item.blurb}</p><strong>${item.price.toLocaleString()}<small>/wk</small></strong><Icon name="arrow" /></button>)}</div></section>}

    <section className="v3-care-ledger"><header><div key={currentCare.id} className="v3-care-copy-fade"><span>Care included</span><h2>{currentCare.name} protects what ships.</h2><p>Monitoring, updates, fixes, and strategy stay connected to your build.</p></div><strong><AnimatedNumber prefix="$" value={currentCare.price} /><small> value / month</small></strong></header><div key={`${currentCare.id}-benefits`} className="v3-care-items-fade">{currentCare.includes.slice(0, 6).map((item) => <span key={item}><Icon name="check" size={14} />{item}</span>)}</div><button onClick={() => setTiersOpen(true)}>Compare ongoing care <Icon name="arrow" size={15} /></button></section>

    <section className="v3-invoice-ledger v3-enter"><header><div><span>Documents</span><h2>Invoice history</h2></div><strong>{invoices.length} records</strong></header><div>{!invoices.length && <p className="v3-chat-note">No invoices yet.</p>}{invoices.map((invoice) => {
      const label = invoice.lineItems ? invoice.lineItems.map((item) => item.label).join(' + ') : [invoice.plan, invoice.billing].filter(Boolean).join(' · ');
      const when = invoice.date || (invoice.submitted_at ? new Date(invoice.submitted_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
      return <div key={invoice.id}><span><Icon name="billing" size={16} /><strong>INV-{String(invoice.id).padStart(4, '0')}</strong></span><span><strong>{when}</strong><small>{label}</small></span><strong>${Number(invoice.amount).toLocaleString()}</strong><Status status={invoice.status === 'confirmed' ? 'paid' : invoice.status === 'pending' ? 'queued' : invoice.status} >{invoice.status === 'confirmed' ? 'Paid' : invoice.status === 'pending' ? 'Pending' : invoice.status}</Status></div>;
    })}</div></section>

    {pauseOpen && <div className="v3-dialog-layer" onMouseDown={() => setPauseOpen(false)}><section onMouseDown={(event) => event.stopPropagation()}><header><span>Subscription options</span><button onClick={() => setPauseOpen(false)}><Icon name="close" size={16} /></button></header><p>Choose what should happen when active production stops.</p><div className="v3-option-stack"><button onClick={() => requestChange('Pause production', `${account?.company || 'Client'} asked to pause production. Queue and files stay in place.`)}><Icon name="clock" /><span><strong>Pause production</strong><small>Keep every file and request, then resume later.</small></span><Icon name="arrow" /></button><button className="is-care" onClick={() => requestChange('Move to ongoing care', `${account?.company || 'Client'} asked to move from the subscription onto ${currentCare.name} ($${currentCare.price}/mo).`)}><Icon name="site" /><span><em>Recommended</em><strong>Move to ongoing care</strong><small>Keep shipped work monitored, updated, and supported.</small></span><Icon name="arrow" /></button><button onClick={() => requestChange('Cancel at period end', `${account?.company || 'Client'} asked to cancel at the end of the current billing period.`)}><Icon name="close" /><span><strong>Cancel at period end</strong><small>Production and care end after the current billing period.</small></span><Icon name="arrow" /></button></div></section></div>}
    {changeTarget && <PlanChangeDialog
      kind={changeTarget.kind}
      target={changeTarget.target}
      label={changeTarget.label}
      onClose={() => setChangeTarget(null)}
      onDone={async (res) => {
        setChangeTarget(null);
        await loadBilling();
        setNotice(res?.scheduled ? 'Change scheduled — nothing to pay now.' : 'Request created. Transfer the amount shown to activate it.');
        setTimeout(() => setNotice(''), 6000);
      }}
    />}
  </div>;
}
