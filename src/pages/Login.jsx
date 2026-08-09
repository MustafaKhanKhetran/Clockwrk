import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, submit2faChallenge } from '../utils/auth';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);
  const [code, setCode] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handlePassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requires_2fa) {
        setMfaToken(result.mfa_token);
      } else {
        setUser(result.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChallenge = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await submit2faChallenge(mfaToken, code.trim());
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const backToPassword = () => {
    setMfaToken(null); setCode(''); setError('');
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo"><span>CW</span></div>
        <div className="login-heading">
          <h1>{mfaToken ? 'Two-step verification' : 'Welcome back'}</h1>
          <p>{mfaToken ? 'Enter the 6-digit code from your authenticator app' : 'Sign in to the Clockwrk workspace'}</p>
        </div>

        {!mfaToken && (
          <form className="login-form" onSubmit={handlePassword}>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email" type="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="mkk@clockwrk.io" required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-pass-wrap">
                <input
                  id="password" type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                />
                <button type="button" className="login-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              <span>{loading ? 'Signing in' : 'Sign in'}</span>
              <span className="login-btn-icon">
                {loading
                  ? <span className="login-spinner" />
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                }
              </span>
            </button>
          </form>
        )}

        {mfaToken && (
          <form className="login-form" onSubmit={handleChallenge}>
            <div className="login-field">
              <label htmlFor="code">Verification code</label>
              <input
                id="code" type="text" inputMode="numeric" autoComplete="one-time-code"
                value={code} onChange={e => setCode(e.target.value)}
                placeholder="123 456 or backup code" required autoFocus
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              <span>{loading ? 'Verifying' : 'Verify'}</span>
              <span className="login-btn-icon">
                {loading
                  ? <span className="login-spinner" />
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                }
              </span>
            </button>
            <button type="button" className="login-back" onClick={backToPassword}>
              Use a different account
            </button>
          </form>
        )}

        <p className="login-footer">Clockwrk Internal Dashboard · Restricted Access</p>
      </div>
    </div>
  );
}
