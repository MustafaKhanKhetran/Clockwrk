import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui';

const LINES = ['websites', 'brands', 'mobile apps', 'pitch decks', 'saas products'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mode, setMode] = useState(() => localStorage.getItem('portal_password_set') ? 'login' : 'setup');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'reset') {
      if (!email.includes('@')) return setError(true);
      setMode('setup');
      return;
    }
    if (mode === 'setup' && (pass.length < 8 || pass !== confirm)) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }
    if (!email.includes('@') || pass.length < 4) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }
    localStorage.setItem('portal_password_set', '1');
    localStorage.setItem('portal_demo_authed', '1');
    setLeaving(true);
    setTimeout(() => { navigate('/home'); }, 450);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      opacity: leaving ? 0 : 1, transform: leaving ? 'scale(1.02)' : 'none',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }} className="login-split">
      {/* Left: brand panel */}
      <div style={{
        background: '#0a0a0b', color: '#fff', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: 'clamp(28px, 4vw, 56px)', overflow: 'hidden', position: 'relative',
      }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, textTransform: 'lowercase' }}>clockwrk</span>
        <div>
          <h1 className="anim-rise" style={{ fontSize: 'clamp(30px, 3.6vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.08 }}>
            Your team is<br />already working.
          </h1>
          <div style={{ marginTop: 18, height: 30, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', animation: 'loginTicker 10s infinite' }}>
              {[...LINES, LINES[0]].map((l, i) => (
                <span key={i} style={{ height: 30, fontSize: 19, color: '#a0e92a', fontWeight: 500 }}>we ship {l}</span>
              ))}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          Unlimited requests · Fixed weekly plan · Pause any time
        </p>
        <style>{`
          @keyframes loginTicker {
            0%, 16% { transform: translateY(0); }
            20%, 36% { transform: translateY(-30px); }
            40%, 56% { transform: translateY(-60px); }
            60%, 76% { transform: translateY(-90px); }
            80%, 96% { transform: translateY(-120px); }
            100% { transform: translateY(-150px); }
          }
          @media (max-width: 860px) { .login-split { grid-template-columns: 1fr !important; } .login-brand-hide { display: none; } }
        `}</style>
      </div>

      {/* Right: form */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 28, background: 'var(--bg)' }}>
        <form onSubmit={submit} className="anim-rise" style={{
          width: 'min(400px, 100%)', display: 'flex', flexDirection: 'column', gap: 14,
          animation: error ? 'shake 0.5s ease' : undefined,
        }}>
          <div style={{ marginBottom: 14 }}>
            <span className="kicker">Client portal</span>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 6 }}>{mode === 'setup' ? 'Set your password' : mode === 'reset' ? 'Reset access' : 'Welcome back'}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>{mode === 'setup' ? 'Create the password you will use for this portal.' : mode === 'reset' ? 'Enter your account email to continue.' : 'Sign in with your account email and password.'}</p>
          </div>
          <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          {mode !== 'reset' && <input className="input" type="password" placeholder={mode === 'setup' ? 'New password' : 'Password'} value={pass} onChange={(e) => setPass(e.target.value)} />}
          {mode === 'setup' && <input className="input" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          {error && <span style={{ color: 'var(--danger)', fontSize: 12.5 }}>Check your email and access code.</span>}
          <button type="submit" className="btn btn-lime" style={{ height: 50, marginTop: 6 }}>
            {mode === 'reset' ? 'Continue reset' : mode === 'setup' ? 'Set password' : 'Enter portal'} <span style={{ width: 16, height: 16, display: 'grid' }}><Icon.arrow /></span>
          </button>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>
            {mode === 'login' ? <button type="button" onClick={() => setMode('reset')} style={{ border: 0, background: 'none', color: 'inherit' }}>Forgot your password?</button> : mode === 'reset' ? 'We will verify your account before setting a new password.' : 'Use at least eight characters.'}
          </p>
        </form>
      </div>
    </div>
  );
}
