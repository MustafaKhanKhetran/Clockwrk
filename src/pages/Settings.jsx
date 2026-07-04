import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me } from '../mocks';
import { Avatar } from '../components/ui';

const BRAND_COLORS = ['#a0e92a', '#0a0a0b', '#f7f7f5', '#383838'];

export default function Settings() {
  const navigate = useNavigate();
  const [name, setName] = useState(me.name);
  const [company, setCompany] = useState(me.company);
  const [saved, setSaved] = useState(false);
  const [notif, setNotif] = useState({ delivery: true, comments: true, billing: false });

  const save = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ on, onClick }) => (
    <button type="button" onClick={onClick} aria-pressed={on} style={{
      width: 42, height: 24, borderRadius: 99, border: 0, position: 'relative',
      background: on ? 'var(--lime)' : 'var(--line)', transition: 'background 0.25s ease',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s var(--ease-spring)',
      }} />
    </button>
  );

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Profile, brand kit, and how we reach you.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="settings-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile */}
          <form onSubmit={save} className="pcard anim-rise" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
              <Avatar name={name} size={44} />
              <div>
                <span className="kicker">Profile</span>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>{name}</h2>
              </div>
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Company</label>
              <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" value={me.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <button type="submit" className={`btn btn-sm ${saved ? 'btn-lime' : 'btn-primary'}`} style={{ alignSelf: 'flex-start' }}>
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
          </form>

          {/* Password */}
          <section className="pcard anim-rise" style={{ padding: 22, animationDelay: '0.08s' }}>
            <span className="kicker">Security</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Access code</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input" type="password" placeholder="Current code" />
              <input className="input" type="password" placeholder="New code" />
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>Update code</button>
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Brand kit */}
          <section className="pcard anim-rise" style={{ padding: 22, animationDelay: '0.05s' }}>
            <span className="kicker">Brand kit</span>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{company}</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 14px' }}>
              Upload once — every brief automatically carries your brand.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {BRAND_COLORS.map((c) => (
                <span key={c} title={c} style={{ width: 34, height: 34, borderRadius: 10, background: c, border: '1px solid var(--line)' }} />
              ))}
              <button className="btn btn-ghost btn-sm" style={{ height: 34 }}>+ Color</button>
            </div>
            <div style={{ padding: '18px 16px', border: '2px dashed var(--line)', borderRadius: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' }}>
              📁 Drop logos & fonts here
            </div>
          </section>

          {/* Notifications */}
          <section className="pcard anim-rise" style={{ padding: 22, animationDelay: '0.12s' }}>
            <span className="kicker">Notifications</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Email me when…</h2>
            {[['delivery', 'A request is delivered'], ['comments', 'The team comments or asks a question'], ['billing', 'An invoice is issued']].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13.5 }}>{label}</span>
                <Toggle on={notif[k]} onClick={() => setNotif({ ...notif, [k]: !notif[k] })} />
              </div>
            ))}
          </section>

          {/* Sign out */}
          <section className="pcard anim-rise" style={{ padding: 22, animationDelay: '0.16s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 14 }}>Sign out</strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>You'll need your access code to get back in.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem('portal_demo_authed'); navigate('/login'); }}>
              Sign out
            </button>
          </section>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
