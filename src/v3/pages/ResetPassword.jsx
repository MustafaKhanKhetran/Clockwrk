// Reached from the reset URL the owner shares (or a future email flow).
// Handles both password reset AND first-login: the endpoint sets the hash and
// signs the user in on success, so the same page works for a new client who
// has never had a password.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../Icon';
import { api } from '../api';
import { session } from '../session';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== pw;
  const canSubmit = !!token && pw.length >= 8 && pw === confirm;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      const { token: authToken, client } = await api.resetPassword(token, pw);
      session.signIn(authToken, client);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="v3-login">
    <section>
      <header><i><Icon name="requests" /></i><strong>clockwrk</strong></header>
      <div><span>Set a new password</span><h1>One password, then you are in.</h1><p>Choose something you will remember — the link works once.</p></div>
      <footer><span><i />Secure by default</span><p>The link expires in 60 minutes.</p></footer>
    </section>
    <form onSubmit={submit}>
      <span>Reset password</span>
      <h2>Choose a new password</h2>
      <p>{token ? 'Set a password of at least 8 characters. You will be signed in as soon as it saves.' : 'This link is missing its token. Ask Clockwrk for a fresh reset link.'}</p>
      {error && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{error}</div>}
      <label><span>New password</span><input aria-label="New password" type="password" autoComplete="new-password" value={pw} onChange={(event) => setPw(event.target.value)} disabled={!token} /></label>
      <label><span>Confirm new password</span><input aria-label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={!token} /></label>
      {mismatch && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />Passwords do not match.</div>}
      <button type="submit" disabled={!canSubmit || busy}><span>{busy ? 'Saving…' : 'Save & open workspace'}</span><Icon name="arrow" /></button>
      <button type="button" className="v3-login-mode-toggle" onClick={() => navigate('/login')}>Back to sign in</button>
    </form>
  </main>;
}
