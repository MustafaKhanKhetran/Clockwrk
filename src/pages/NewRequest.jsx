import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVICES, projects } from '../mocks';
import { Icon, CatChip } from '../components/ui';
import { useStore } from '../store';

export default function NewRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('Development');
  const [service, setService] = useState(null);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [placement, setPlacement] = useState('auto');
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const [sent, setSent] = useState(false);

  const { requests, baseSlots, extraSlots } = useStore();
  const activeCount = requests.filter((r) => r.status === 'active').length;
  const slotOpen = activeCount < baseSlots + extraSlots;
  const canNext = step === 0 ? !!service : step === 1 ? title.trim() && brief.trim() : true;

  const submit = () => {
    setSent(true);
    setTimeout(() => navigate('/requests'), 1600);
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="anim-pop" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 54 }}>🚀</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '12px 0 6px' }}>Request submitted</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>
            {slotOpen && placement === 'auto' ? 'It just filled an open slot — work starts today.' : 'It\'s in your queue — you control what we build next.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'clamp(20px, 4vw, 48px)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 17 }}>clockwrk</span>
          <button className="theme-toggle" onClick={() => navigate(-1)} aria-label="Close">
            <span style={{ width: 15, height: 15 }}><Icon.x /></span>
          </button>
        </div>

        <div className="composer-steps">
          {[0, 1, 2].map((i) => <span key={i} className={`composer-step-dot ${i <= step ? 'is-active' : ''}`} />)}
        </div>

        {step === 0 && (
          <div className="anim-rise" key="s0">
            <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.04em', textAlign: 'center', marginBottom: 6 }}>
              What are we making?
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 26 }}>Pick the closest match — we'll figure out the details together.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
              {Object.keys(SERVICES).map((c) => (
                <button key={c} onClick={() => { setCategory(c); setService(null); }} className="btn btn-sm"
                  style={{
                    background: category === c ? 'var(--ink)' : 'var(--card)',
                    color: category === c ? 'var(--bg)' : 'var(--muted)',
                    border: `1px solid ${category === c ? 'var(--ink)' : 'var(--line)'}`,
                  }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {SERVICES[category].map((s, i) => (
                <button key={s} className={`svc-pick anim-rise ${service === s ? 'is-selected' : ''}`}
                  style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setService(s)}>
                  <CatChip category={category} size={34} />
                  <strong style={{ fontSize: 13.5 }}>{s}</strong>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="anim-rise" key="s1" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.04em', textAlign: 'center', marginBottom: 6 }}>
              Tell us about it
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>
              {category} · {service}
            </p>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Which project is this for?</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {projects.map((p) => (
                  <button key={p.id} type="button" className="btn btn-sm" onClick={() => setProjectId(p.id)} style={{
                    background: projectId === p.id ? 'var(--ink)' : 'var(--card)',
                    color: projectId === p.id ? 'var(--bg)' : 'var(--muted)',
                    border: `1px solid ${projectId === p.id ? 'var(--ink)' : 'var(--line)'}`,
                  }}>▣ {p.name}</button>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" style={{ borderStyle: 'dashed' }}>+ New project</button>
              </div>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>Give it a name</label>
              <input className="input" placeholder='e.g. "Checkout flow redesign"' value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>The brief</label>
              <textarea className="input" style={{ minHeight: 170 }}
                placeholder={'What does done look like?\n\nDrop in links, references, examples you like, things to avoid. More context = better first draft.'}
                value={brief} onChange={(e) => setBrief(e.target.value)} />
            </div>
            <div style={{ padding: '14px 16px', border: '2px dashed var(--line)', borderRadius: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
              📎 Drag files here or click to attach references (optional)
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="anim-rise" key="s2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.04em', textAlign: 'center', marginBottom: 10 }}>
              Where should it go?
            </h1>
            <div className="pcard" style={{ padding: 20 }}>
              <span className="kicker">Review</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '6px 0 4px' }}>{title || 'Untitled request'}</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{category} · {service}</p>
              <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 10, lineHeight: 1.55 }}>{brief.slice(0, 200)}{brief.length > 200 ? '…' : ''}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button className={`svc-pick ${placement === 'auto' ? 'is-selected' : ''}`} onClick={() => setPlacement('auto')} style={{ alignItems: 'flex-start', textAlign: 'left' }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <strong style={{ fontSize: 14 }}>{slotOpen ? 'Start now' : 'Next available slot'}</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {slotOpen ? 'A slot is open — we start today, first results in 2–3 days.' : 'All slots busy — this jumps in the moment one frees up.'}
                </span>
              </button>
              <button className={`svc-pick ${placement === 'queue' ? 'is-selected' : ''}`} onClick={() => setPlacement('queue')} style={{ alignItems: 'flex-start', textAlign: 'left' }}>
                <span style={{ fontSize: 20 }}>🗂️</span>
                <strong style={{ fontSize: 14 }}>Add to queue</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Park it in the backlog — drag it up whenever you're ready.</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 34 }}>
          <button className="btn btn-ghost" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button className="btn btn-primary" disabled={!canNext} style={{ opacity: canNext ? 1 : 0.4 }} onClick={() => canNext && setStep(step + 1)}>
              Continue <span style={{ width: 15, height: 15, display: 'grid' }}><Icon.arrow /></span>
            </button>
          ) : (
            <button className="btn btn-lime" onClick={submit}>
              Submit request <span style={{ width: 15, height: 15, display: 'grid' }}><Icon.arrow /></span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
