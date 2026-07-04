import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import { ErrorState, Spinner } from '../components/PageState';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPatch, apiPost, objectFrom } from '../utils/api';
import { date } from '../utils/format';

const fields = 'w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState('');
  const { updateUser } = useAuth();

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);
  const load = useCallback(async () => {
    try { setProfile(objectFrom(await apiGet('/api/client/me'), 'user')); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving('profile');
    try {
      const response = await apiPatch('/api/client/me', {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        company: profile.company || profile.company_name,
      });
      const updated = objectFrom(response, 'user');
      const next = { ...profile, ...updated };
      setProfile(next);
      updateUser(next);
      notify('Profile updated successfully.');
    } catch (err) { notify(err.message, 'error'); }
    finally { setSaving(''); }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      notify('New passwords do not match.', 'error');
      return;
    }
    setSaving('password');
    try {
      await apiPost('/api/client/change-password', passwords);
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      notify('Password changed successfully.');
    } catch (err) { notify(err.message, 'error'); }
    finally { setSaving(''); }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profile) return <Spinner />;
  const plan = profile.plan?.name || profile.plan_name || profile.plan || 'Client';
  return (
    <div>
      {toast && <div className={`fixed right-6 top-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'error' ? 'bg-danger' : 'bg-success'}`}>{toast.message}</div>}
      <div className="mb-6"><h2 className="text-2xl font-bold">Settings</h2><p className="mt-1 text-sm text-text-secondary">Manage your profile and account security.</p></div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <form onSubmit={saveProfile} className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold">Profile</h3><p className="mt-1 text-sm text-text-secondary">Keep your contact information up to date.</p>
            <div className="mt-6 grid grid-cols-2 gap-5">
              <label><span className="mb-1.5 block text-sm font-medium">Name</span><input required value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={fields} /></label>
              <label><span className="mb-1.5 block text-sm font-medium">Email</span><input required type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={fields} /></label>
              <label><span className="mb-1.5 block text-sm font-medium">Phone</span><input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={fields} /></label>
              <label><span className="mb-1.5 block text-sm font-medium">Company</span><input value={profile.company || profile.company_name || ''} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className={fields} /></label>
            </div>
            <div className="mt-6 text-right"><button disabled={saving === 'profile'} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60">{saving === 'profile' ? 'Saving…' : 'Save profile'}</button></div>
          </form>
          <form onSubmit={savePassword} className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold">Security</h3><p className="mt-1 text-sm text-text-secondary">Use a strong, unique password for this account.</p>
            <div className="mt-6 grid grid-cols-3 gap-5">
              <label><span className="mb-1.5 block text-sm font-medium">Current password</span><input required type="password" autoComplete="current-password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} className={fields} /></label>
              <label><span className="mb-1.5 block text-sm font-medium">New password</span><input required minLength="8" type="password" autoComplete="new-password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} className={fields} /></label>
              <label><span className="mb-1.5 block text-sm font-medium">Confirm password</span><input required minLength="8" type="password" autoComplete="new-password" value={passwords.confirm_password} onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })} className={fields} /></label>
            </div>
            <div className="mt-6 text-right"><button disabled={saving === 'password'} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60">{saving === 'password' ? 'Saving…' : 'Change password'}</button></div>
          </form>
        </div>
        <aside className="h-fit rounded-xl border border-border bg-surface p-6 shadow-card"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Your plan</h3><Badge variant="accent">{plan}</Badge></div><dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between border-b border-border pb-4"><dt className="text-text-secondary">Billing cycle</dt><dd className="font-medium">{profile.billing_cycle || profile.plan?.billing_cycle || '—'}</dd></div><div className="flex justify-between"><dt className="text-text-secondary">Member since</dt><dd className="font-medium">{date(profile.member_since || profile.created_at)}</dd></div></dl></aside>
      </div>
    </div>
  );
}
