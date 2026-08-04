import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = (event) => { event.preventDefault(); if (!email.includes('@') || password.length < 8) return; localStorage.setItem('portal_demo_authed', 'true'); navigate('/home'); };
  return <main className="v3-login"><section><header><i><Icon name="requests" /></i><strong>clockwrk</strong></header><div><span>Client workspace</span><h1>The work is already moving.</h1><p>Projects, requests, reviews, files, and conversations live here.</p></div><footer><span><i />Team online</span><p>Built work deserves a clear place to move.</p></footer></section><form onSubmit={submit}><span>Welcome back</span><h2>Enter your workspace</h2><p>Use the email and access code connected to your Clockwrk account.</p><label><span>Email address</span><input aria-label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><span>Access code</span><input aria-label="Access code" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button type="submit" disabled={!email.includes('@') || password.length < 8}><span>Open workspace</span><Icon name="arrow" /></button><small>Need access? Ask your workspace owner or Clockwrk project manager.</small></form></main>;
}
