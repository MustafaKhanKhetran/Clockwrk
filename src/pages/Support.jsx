import { useState } from 'react';
import { tickets as seed } from '../mocks';
import { StatusPill, EmptyState } from '../components/ui';

const FAQS = [
  ['How fast is a request delivered?', 'Most requests land in 2–3 business days. Bigger ones get split into milestones so you still see progress every few days.'],
  ['What counts as one request?', 'One focused deliverable — a page, a feature, a logo, a deck. If it\'s bigger, we\'ll slice it with you into slot-sized pieces.'],
  ['Are revisions really unlimited?', 'Yes. We iterate until you\'re happy — that\'s the whole point of the subscription.'],
  ['Can I pause my plan?', 'Any time from Billing. Unused days roll over, and your queue and files stay put.'],
];

export default function Support() {
  const [tickets, setTickets] = useState(seed);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setTickets([{ id: `T-${47 + tickets.length}`, subject: subject.trim(), status: 'open', at: 'Just now', replies: 0 }, ...tickets]);
    setSubject(''); setBody(''); setOpen(false);
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title">Help</h1>
          <p className="page-sub">Stuck on anything? We're quick.</p>
        </div>
        <button className="btn btn-lime" onClick={() => setOpen(!open)}>New ticket</button>
      </header>

      {open && (
        <form onSubmit={submit} className="pcard anim-pop" style={{ padding: 20, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" placeholder="What's up?" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus />
          <textarea className="input" placeholder="Any details that help us fix it faster…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary btn-sm">Submit ticket</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 16, alignItems: 'start' }} className="help-grid">
        <section className="anim-rise" style={{ animationDelay: '0.06s', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="kicker" style={{ marginBottom: 4 }}>Your tickets</span>
          {tickets.length === 0 ? (
            <EmptyState emoji="🎈" title="No tickets" sub="Nothing broken. We like it that way." />
          ) : tickets.map((t) => (
            <div key={t.id} className="req-row" style={{ cursor: 'default' }}>
              <span className="svc-icon" style={{ fontSize: 15 }}>🎫</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 13.5 }}>{t.subject}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.id} · {t.at} · {t.replies} replies</div>
              </div>
              <StatusPill status={t.status} />
            </div>
          ))}
        </section>

        <section className="pcard anim-rise" style={{ animationDelay: '0.12s', padding: 22 }}>
          <span className="kicker">Quick answers</span>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
            {FAQS.map(([q, a], i) => (
              <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--line)' : 0 }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '13px 0', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  {q} <span style={{ color: 'var(--muted)', transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s var(--ease-spring)' }}>+</span>
                </button>
                <div style={{ maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.35s var(--ease-out)' }}>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, paddingBottom: 13 }}>{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <style>{`@media (max-width: 1024px) { .help-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
