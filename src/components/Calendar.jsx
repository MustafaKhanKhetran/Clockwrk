import { useState } from 'react';

/* Mock schedule — wire to real bookings/invoices later.
   kind: delivery (lime) · delivered (dark) · invoice (orange) */
const MONTHS = {
  '2026-06': {
    label: 'June 2026', days: 30, startDow: 1, today: null,
    events: {
      18: [{ kind: 'delivered', text: 'Landing page A/B variant — delivered' }],
      22: [{ kind: 'delivered', text: 'Brand identity refresh — delivered' }],
      30: [{ kind: 'delivered', text: 'Investor pitch deck v2 — delivered' }],
      18.5: null,
    },
  },
  '2026-07': {
    label: 'July 2026', days: 31, startDow: 3, today: 3,
    events: {
      6: [{ kind: 'delivery', text: 'Checkout flow redesign — delivery expected' }],
      7: [{ kind: 'delivery', text: 'Marketing site dark mode — delivery expected' }],
      18: [{ kind: 'invoice', text: 'Business plan renews — $1,550' }],
    },
  },
};
const ORDER = ['2026-06', '2026-07'];
const DOT = { delivery: 'var(--lime)', delivered: 'var(--ink)', invoice: '#f26522' };

export default function Calendar() {
  const [mi, setMi] = useState(1);
  const [sel, setSel] = useState(null);
  const m = MONTHS[ORDER[mi]];
  const cells = [...Array(m.startDow).fill(null), ...Array.from({ length: m.days }, (_, i) => i + 1)];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 14.5, letterSpacing: '-0.01em' }}>{m.label}</strong>
        <span style={{ display: 'flex', gap: 4 }}>
          <button className="theme-toggle" style={{ width: 28, height: 28, fontSize: 12 }} disabled={mi === 0}
            onClick={() => { setMi(mi - 1); setSel(null); }}>‹</button>
          <button className="theme-toggle" style={{ width: 28, height: 28, fontSize: 12 }} disabled={mi === ORDER.length - 1}
            onClick={() => { setMi(mi + 1); setSel(null); }}>›</button>
        </span>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {cells.map((d, i) => {
          const evs = d && m.events[d];
          return (
            <span key={i}
              className={`cal-day ${evs ? 'has-event' : ''} ${d === m.today ? 'is-today' : ''}`}
              onClick={() => evs && setSel(sel === d ? null : d)}>
              {d || ''}
              {evs && (
                <span className="ev">{evs.map((e, j) => <i key={j} style={{ background: DOT[e.kind] }} />)}</span>
              )}
            </span>
          );
        })}
      </div>
      {sel && m.events[sel] && (
        <div className="anim-pop" style={{ marginTop: 12, padding: '11px 14px', borderRadius: 12, background: 'var(--soft)', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {m.events[sel].map((e, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i style={{ width: 7, height: 7, borderRadius: '50%', background: DOT[e.kind], flexShrink: 0 }} />
              {e.text}
            </span>
          ))}
        </div>
      )}
      <div className="cal-legend">
        <span><i style={{ background: DOT.delivery }} /> Delivery due</span>
        <span><i style={{ background: DOT.delivered }} /> Delivered</span>
        <span><i style={{ background: DOT.invoice }} /> Invoice</span>
      </div>
    </div>
  );
}
