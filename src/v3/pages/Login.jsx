import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { api } from '../api';
import { session } from '../session';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = email.includes('@') && password.length >= 8;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const { token, client } = await api.login(email.trim(), password);
      session.signIn(token, client);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign you in.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return <main className="v3-login"><section><header><i><Icon name="requests" /></i><strong>clockwrk</strong></header><div><span>Client workspace</span><h1>The work is already moving.</h1><p>Projects, requests, reviews, files, and conversations live here.</p></div><footer><span><i />Team online</span><p>Built work deserves a clear place to move.</p></footer></section>
    <form onSubmit={submit}><span>Welcome back</span><h2>Enter your workspace</h2><p>Use the email and password connected to your Clockwrk account.</p>
      {error && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{error}</div>}
      <label><span>Email address</span><input aria-label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label><span>Password</span><input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={!valid || busy}><span>{busy ? 'Signing in…' : 'Open workspace'}</span><Icon name="arrow" /></button>
      <small>Need access? Ask your workspace owner or Clockwrk project manager.</small>
    </form></main>;
}
