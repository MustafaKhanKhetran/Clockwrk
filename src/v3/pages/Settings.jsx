import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../../store';
import { api, getToken } from '../api';
import { session, useSession } from '../session';
import Icon from '../Icon';
import { Action, Avatar, PageIntro } from '../Primitives';

const NOTIFY_OPTIONS = [
  ['delivery_ready', 'Delivery ready', 'When work is delivered for your review'],
  ['team_message', 'Team message', 'When Clockwrk replies to you'],
  ['billing_activity', 'Billing activity', 'Invoices and payment reminders'],
  ['weekly_summary', 'Weekly summary', 'A Monday digest of everything moving'],
];

export default function Settings() {
  const navigate = useNavigate();
  const { client } = useSession();
  const identity = client || { name: '', company: '', email: '' };

  const [name, setName] = useState(identity.name);
  const [company, setCompany] = useState(identity.company || '');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwState, setPwState] = useState({ busy: false, error: '', done: false });

  const [notify, setNotify] = useState({ delivery_ready: true, team_message: true, billing_activity: false, weekly_summary: true });
  const [notifyState, setNotifyState] = useState({ busy: false, done: false });

  const [contacts, setContacts] = useState([]);
  const [invite, setInvite] = useState({ email: '', name: '' });
  const [contactError, setContactError] = useState('');
  const [contactBusy, setContactBusy] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const { contacts: rows } = await api.contacts();
      setContacts(rows || []);
    } catch { /* surfaced on the next write */ }
  }, []);

  useEffect(() => {
    loadContacts();
    api.me().then(({ client: me }) => {
      if (me?.notify_prefs) {
        const prefs = typeof me.notify_prefs === 'string' ? JSON.parse(me.notify_prefs) : me.notify_prefs;
        setNotify((current) => ({ ...current, ...prefs }));
      }
    }).catch(() => {});
  }, [loadContacts]);

  const save = async (event) => {
    event.preventDefault();
    setSaveError('');
    try {
      const { client: updated } = await api.updateMe({ name: name.trim(), company: company.trim() });
      session.signIn(getToken(), updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setSaveError(err.message || 'Could not save your profile.');
    }
  };

  const changePassword = async () => {
    if (!currentPw || newPw.length < 8) {
      setPwState({ busy: false, error: 'New password must be at least 8 characters.', done: false });
      return;
    }
    setPwState({ busy: true, error: '', done: false });
    try {
      await api.changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setPwState({ busy: false, error: '', done: true });
      setTimeout(() => setPwState((p) => ({ ...p, done: false })), 2500);
    } catch (err) {
      setPwState({ busy: false, error: err.message || 'Could not update your password.', done: false });
    }
  };

  const toggleNotify = async (key, value) => {
    const next = { ...notify, [key]: value };
    setNotify(next);
    setNotifyState({ busy: true, done: false });
    try {
      await api.saveNotifications(next);
      setNotifyState({ busy: false, done: true });
      setTimeout(() => setNotifyState({ busy: false, done: false }), 1800);
    } catch {
      setNotify(notify);          // revert on failure
      setNotifyState({ busy: false, done: false });
    }
  };

  const addContact = async () => {
    if (!invite.email.includes('@') || contactBusy) return;
    setContactBusy(true);
    setContactError('');
    try {
      const { contact } = await api.addContact({ email: invite.email.trim(), name: invite.name.trim() });
      setContacts([...contacts, contact]);
      setInvite({ email: '', name: '' });
    } catch (err) {
      setContactError(err.message || 'Could not add that person.');
    } finally {
      setContactBusy(false);
    }
  };

  const updateContact = async (id, patch) => {
    setContacts(contacts.map((c) => c.id === id ? { ...c, ...patch } : c));
    try { await api.updateContact(id, patch); } catch { loadContacts(); }
  };

  const removeContact = async (id) => {
    setContacts(contacts.filter((c) => c.id !== id));
    try { await api.removeContact(id); } catch { loadContacts(); }
  };

  return <div className="v3-settings-page">
    <PageIntro index="Workspace control" title="Settings" copy="Identity, access, notifications, and the people from your company who use this portal." />
    <div className="v3-settings-index"><a href="#profile">Profile</a><a href="#notifications">Notifications</a><a href="#people">Your people</a><a href="#security">Security</a></div>

    <form className="v3-settings-sheet v3-enter" onSubmit={save}>
      <section id="profile">
        <header><span>01</span><div><h2>Your profile</h2><p>Used on approvals, messages, and invoices.</p></div><Avatar name={name} online /></header>
        <div className="v3-field-pair">
          <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} /></label>
        </div>
        <label><span>Email</span><input value={identity.email} disabled /></label>
        {saveError && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{saveError}</div>}
        <Action icon="check" type="submit">{saved ? 'Saved' : 'Save profile'}</Action>
      </section>

      <section id="notifications">
        <header><span>02</span><div><h2>Notifications</h2><p>Choose the updates that deserve your attention.</p></div>{notifyState.done && <em className="v3-saved-flag">Saved</em>}</header>
        {NOTIFY_OPTIONS.map(([key, label, blurb]) => (
          <label className="v3-setting-toggle" key={key}>
            <span><strong>{label}</strong><small>{blurb}</small></span>
            <input type="checkbox" checked={!!notify[key]} onChange={(event) => toggleNotify(key, event.target.checked)} />
            <i />
          </label>
        ))}
      </section>

      <section id="people">
        <header><span>03</span><div><h2>Your partners and team</h2><p>People from your company, not the Clockwrk delivery crew.</p></div><strong>{contacts.length}</strong></header>
        <div className="v3-member-list">
          {!contacts.length && <p className="v3-chat-note">No one else has access yet. Invite a teammate below.</p>}
          {contacts.map((member) => <div key={member.id}>
            <Avatar name={member.name} size="sm" />
            <span><strong>{member.name}</strong><small>{member.email}</small></span>
            <label><input type="checkbox" checked={!!member.can_approve} onChange={(event) => updateContact(member.id, { can_approve: event.target.checked })} />Can approve</label>
            <label><input type="checkbox" checked={!!member.can_bill} onChange={(event) => updateContact(member.id, { can_bill: event.target.checked })} />Billing</label>
            <button type="button" onClick={() => removeContact(member.id)} aria-label={`Remove ${member.name}`}><Icon name="close" size={14} /></button>
          </div>)}
        </div>
        {contactError && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{contactError}</div>}
        <div className="v3-invite">
          <input value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} placeholder="Name (optional)" />
          <input value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="person@yourcompany.com" />
          <button type="button" disabled={!invite.email.includes('@') || contactBusy} onClick={addContact}>{contactBusy ? 'Adding…' : 'Add'}</button>
        </div>
        <p className="v3-section-note">Added contacts are shared with your Clockwrk team so they know who can approve work. Separate portal logins are coming soon.</p>
      </section>

      <section id="security">
        <header><span>04</span><div><h2>Security</h2><p>Change your portal password and review this session.</p></div></header>
        <div className="v3-field-pair">
          <label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPw} onChange={(event) => setCurrentPw(event.target.value)} /></label>
          <label><span>New password</span><input type="password" autoComplete="new-password" value={newPw} onChange={(event) => setNewPw(event.target.value)} /></label>
        </div>
        {pwState.error && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{pwState.error}</div>}
        <footer>
          <button type="button" disabled={pwState.busy} onClick={changePassword}>{pwState.busy ? 'Updating…' : pwState.done ? 'Password updated' : 'Update password'}</button>
          <button type="button" onClick={() => { store.resetToEmpty(); session.signOut(); navigate('/login', { replace: true }); }}>Sign out</button>
        </footer>
      </section>
    </form>
  </div>;
}
