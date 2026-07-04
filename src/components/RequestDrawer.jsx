import { useState } from 'react';
import { Icon, StatusPill, Confetti } from './ui';
import { SVC_EMOJI, FILE_EMOJI } from '../mocks';

export default function RequestDrawer({ request: r, onClose }) {
  const [tab, setTab] = useState('overview');
  const [approved, setApproved] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionText, setRevisionText] = useState('');
  const [revisionSent, setRevisionSent] = useState(false);

  const TABS = ['overview', 'timeline', 'deliverables', 'comments'];

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className="drawer">
        {/* hero */}
        <div style={{ padding: '26px 28px 18px', borderBottom: '1px solid var(--line)', position: 'relative' }}>
          <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 18, right: 18, width: 34, height: 34, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: '50%', background: 'var(--card)', color: 'var(--ink)' }}>
            <span style={{ width: 15, height: 15 }}><Icon.x /></span>
          </button>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span className="svc-icon" style={{ width: 48, height: 48, fontSize: 22 }}>{SVC_EMOJI[r.category]}</span>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                <StatusPill status={approved ? 'done' : r.status} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.category} · {r.type}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{r.title}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 18 }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 13px', border: 0, borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                textTransform: 'capitalize', transition: 'all 0.2s ease',
                background: tab === t ? 'var(--ink)' : 'transparent',
                color: tab === t ? 'var(--bg)' : 'var(--muted)',
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div className="drawer-body">
          {tab === 'overview' && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <span className="kicker">Brief</span>
                <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8, color: 'var(--ink-dim)' }}>{r.brief}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Brand', r.brand], ['Status', r.status], r.startedAt && ['Started', r.startedAt], r.due && ['Delivery', r.due], r.deliveredAt && ['Delivered', r.deliveredAt]]
                  .filter(Boolean).map(([k, v]) => (
                    <div key={k} style={{ padding: 13, borderRadius: 12, background: 'var(--soft)' }}>
                      <span className="kicker" style={{ fontSize: 9.5 }}>{k}</span>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, textTransform: 'capitalize' }}>{String(v)}</div>
                    </div>
                  ))}
              </div>
              {r.status === 'review' && !approved && (
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 16, border: '1.5px solid var(--lime)', background: 'var(--lime-soft)' }}>
                  <strong style={{ fontSize: 14.5 }}>Happy with the delivery?</strong>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-lime btn-sm" style={{ position: 'relative' }} onClick={() => setApproved(true)}>
                      <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.check /></span> Approve
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setRevisionOpen(!revisionOpen)}>Request revision</button>
                  </div>
                  {revisionOpen && !revisionSent && (
                    <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea className="input" placeholder="What should we change? Be as picky as you like — revisions are unlimited."
                        value={revisionText} onChange={(e) => setRevisionText(e.target.value)} />
                      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}
                        onClick={() => setRevisionSent(true)} disabled={!revisionText.trim()}>Send revision notes</button>
                    </div>
                  )}
                  {revisionSent && <span className="anim-pop" style={{ fontSize: 13, fontWeight: 600 }}>✅ Revision requested — back in the workshop.</span>}
                </div>
              )}
              {approved && (
                <div className="anim-pop" style={{ position: 'relative', padding: 18, borderRadius: 16, background: 'var(--ink)', color: 'var(--bg)', textAlign: 'center' }}>
                  <Confetti trigger />
                  <strong>🎉 Approved — nice one!</strong>
                  <p style={{ fontSize: 12.5, opacity: 0.7, marginTop: 4 }}>Deliverables are saved in your library. A queued request will move into this slot.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'timeline' && (
            <div className="tl anim-fade">
              {(r.timeline.length ? r.timeline : [{ label: 'Waiting in queue', at: 'Moves into a slot automatically', now: true }]).map((t, i) => (
                <div key={i} className={`tl-item ${t.done ? 'is-done' : ''} ${t.now ? 'is-now' : ''}`}>
                  <span className="tl-dot" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.at}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'deliverables' && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {r.deliverables.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>
                  Nothing delivered yet — files will appear here the moment we ship.
                </p>
              )}
              {r.deliverables.map((d) => (
                <div key={d.id} className="req-row" style={{ cursor: 'default' }}>
                  <span className="svc-icon" style={{ fontSize: 16 }}>{FILE_EMOJI[d.kind] || '📎'}</span>
                  <strong style={{ flex: 1, fontSize: 13.5 }}>{d.name}</strong>
                  <button className="btn btn-ghost btn-sm">
                    <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.download /></span> Download
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'comments' && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {r.comments.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>No comments yet.</p>
              )}
              {r.comments.map((c, i) => (
                <div key={i} className={`chat-bubble ${c.who === 'You' ? 'is-me' : 'is-them'}`} style={{ maxWidth: '86%' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.6, marginBottom: 3 }}>{c.who} · {c.at}</div>
                  {c.text}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input className="input" placeholder="Write a comment…" style={{ height: 42 }} />
                <button className="btn btn-primary btn-sm" style={{ height: 42 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
