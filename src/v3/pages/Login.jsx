import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { api } from '../api';
import { session } from '../session';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');       // 'signin' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const canSignIn = email.includes('@') && password.length >= 8;
  const canReset = email.includes('@');

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signin') {
        if (!canSignIn) return;
        const { token, client } = await api.login(email.trim(), password);
        session.signIn(token, client);
        navigate('/home', { replace: true });
      } else {
        if (!canReset) return;
        // The API never confirms whether the address is registered, so we can
        // safely show the same message every time.
        await api.forgotPassword(email.trim());
        setNotice('If that email is registered, a reset link has been prepared. Contact Clockwrk to receive it.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      if (mode === 'signin') setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return <main className="v3-login"><section><header><i><Icon name="requests" /></i><strong>clockwrk</strong></header><div><span>Client workspace</span><h1>The work is already moving.</h1><p>Projects, requests, reviews, files, and conversations live here.</p></div><footer><span><i />Team online</span><p>Built work deserves a clear place to move.</p></footer></section>
    <form onSubmit={submit}>
      {mode === 'signin'
        ? <><span>Welcome back</span><h2>Enter your workspace</h2><p>Use the email and password connected to your Clockwrk account.</p></>
        : <><span>Reset password</span><h2>Get a fresh link</h2><p>Enter your account email and Clockwrk will prepare a one-time reset link for you.</p></>}
      {error && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{error}</div>}
      {notice && <div className="v3-login-notice" role="status">{notice}</div>}
      <label><span>Email address</span><input aria-label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {mode === 'signin' && <label><span>Password</span><input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
      <button type="submit" disabled={busy || (mode === 'signin' ? !canSignIn : !canReset)}>
        <span>{busy ? (mode === 'signin' ? 'Signing in…' : 'Sending…') : (mode === 'signin' ? 'Open workspace' : 'Request reset link')}</span>
        <Icon name="arrow" />
      </button>
      <button type="button" className="v3-login-mode-toggle" onClick={() => { setMode(mode === 'signin' ? 'forgot' : 'signin'); setError(''); setNotice(''); }}>
        {mode === 'signin' ? 'Forgot your password?' : 'Back to sign in'}
      </button>
      <small>Need access? Ask your workspace owner or Clockwrk project manager.</small>
    </form></main>;
}
