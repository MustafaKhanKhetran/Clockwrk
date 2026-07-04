import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/api/client/login', form);
      const token = data.token || data.access_token || data.data?.token;
      const user = data.user || data.client || data.data?.user || data.data?.client;
      if (!token) throw new Error('The server did not return an access token.');
      login(token, user || {});
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">C</div>
          <h1 className="mt-5 text-2xl font-bold">Client Portal</h1>
          <p className="mt-2 text-sm text-text-secondary">Track your projects, invoices, and support tickets.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Email address</span>
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="you@company.com" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Password</span>
            <span className="relative block">
              <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 pr-16 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary hover:text-primary">{showPassword ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          <button disabled={loading} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-text-muted">Access is available by invitation only.</p>
      </div>
    </div>
  );
}
