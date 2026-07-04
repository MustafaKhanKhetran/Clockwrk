import { useState } from 'react';
import { me, invoices, PLANS, ADDONS } from '../mocks';
import { Icon, StatusPill, CountUp } from '../components/ui';
import { store, useStore } from '../store';

export default function Billing() {
  const { plan, baseSlots, extraSlots, paused } = useStore();
  const [compare, setCompare] = useState(false);
  const [pausing, setPausing] = useState(false);
  const price = PLANS.find((p) => p.name === plan)?.price ?? 1550;
  const addonTotal = extraSlots * ADDONS[0].price;

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-sub">Your plan, add-ons, and invoices — no surprises, no contracts.</p>
        </div>
      </header>

      {/* Plan hero */}
      <section className="pcard anim-rise" style={{ padding: 26, marginBottom: 16, background: '#0a0a0b', color: '#fff', border: 0, display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <span className="kicker" style={{ color: '#a0e92a' }}>Current plan {paused && '· paused'}</span>
          <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', margin: '6px 0 4px' }}>{plan}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {baseSlots} slots{extraSlots > 0 && ` + ${extraSlots} add-on`} · unlimited requests & revisions · renews <strong style={{ color: '#fff' }}>{me.renewsAt}</strong>
          </p>
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em' }}>
          $<CountUp to={price + addonTotal} /><span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>/mo</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-sm" style={{ background: '#a0e92a', color: '#0a0a0b' }} onClick={() => setCompare(!compare)}>Change plan</button>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
            onClick={() => (paused ? store.setPaused(false) : setPausing(!pausing))}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </section>

      {pausing && !paused && (
        <section className="pcard anim-pop" style={{ padding: 20, marginBottom: 16, border: '1.5px solid var(--lime)' }}>
          <strong style={{ fontSize: 15 }}>Pause your subscription?</strong>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '6px 0 14px' }}>
            Your queue, files, and history stay exactly as they are. Unused days roll over — resume whenever you're ready.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { store.setPaused(true); setPausing(false); }}>Pause at period end</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPausing(false)}>Never mind</button>
          </div>
        </section>
      )}

      {compare && (
        <section className="anim-rise" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
          {PLANS.map((p) => (
            <article key={p.name} className="pcard is-hoverable" style={{ padding: 22, border: p.name === plan ? '2px solid var(--lime)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 17 }}>{p.name}</strong>
                {p.name === plan && <span className="pill pill-lime">Current</span>}
              </div>
              <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-0.03em', margin: '10px 0 2px' }}>${p.price}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>/mo</span></div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{p.blurb}</p>
              {p.name !== plan && (
                <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => { store.setPlan(p.name, p.slots); setCompare(false); }}>
                  {p.price > price ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
            </article>
          ))}
        </section>
      )}

      {/* Add-ons */}
      <section className="anim-rise" style={{ marginBottom: 16, animationDelay: '0.08s' }}>
        <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>Add-ons</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <article className="pcard addon-card is-hoverable">
            <span style={{ width: 22, height: 22, display: 'grid', color: 'var(--ink)' }}><Icon.bolt /></span>
            <strong style={{ fontSize: 14.5 }}>{ADDONS[0].name}</strong>
            <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{ADDONS[0].blurb}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="addon-price">${ADDONS[0].price}<small>{ADDONS[0].per}</small></span>
              <span className="stepper">
                <button onClick={store.removeSlot} aria-label="Remove slot">−</button>
                <strong style={{ fontSize: 14, minWidth: 14, textAlign: 'center' }}>{extraSlots}</strong>
                <button onClick={store.buySlot} aria-label="Add slot">+</button>
              </span>
            </div>
          </article>
          {ADDONS.slice(1).map((a, i) => (
            <article key={a.id} className="pcard addon-card is-hoverable">
              <span style={{ width: 22, height: 22, display: 'grid', color: 'var(--ink)' }}>{i === 0 ? <Icon.clock /> : <Icon.spark />}</span>
              <strong style={{ fontSize: 14.5 }}>{a.name}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{a.blurb}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="addon-price">${a.price}<small>{a.per}</small></span>
                <button className="btn btn-ghost btn-sm">Add</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section className="pcard anim-rise" style={{ padding: 22, animationDelay: '0.12s' }}>
        <span className="kicker">History</span>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>Invoices</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {invoices.map((inv, i) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < invoices.length - 1 ? '1px solid var(--line)' : 0 }}>
              <span className="svc-icon"><span style={{ width: 16, height: 16, display: 'grid', color: 'var(--ink)' }}><Icon.invoice /></span></span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13.5 }}>{inv.id}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{inv.date}</div>
              </div>
              <strong style={{ fontSize: 14 }}>${inv.amount.toLocaleString()}</strong>
              <StatusPill status={inv.status} />
              <button className="btn btn-ghost btn-sm">
                <span style={{ width: 13, height: 13, display: 'grid' }}><Icon.download /></span> PDF
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
