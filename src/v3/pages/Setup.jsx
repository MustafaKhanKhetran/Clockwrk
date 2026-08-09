import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../Icon';
import { api, uploadSetupAvatar } from '../api';
import { session } from '../session';

const STEPS = [
  ['Profile', 'How you appear in Clockwrk'],
  ['Account', 'Confirm the workspace details'],
  ['People', 'Add anyone who works with you'],
  ['Security', 'Create your private password'],
];

const pretty = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Setup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const inputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({ name: '', company: '', phone: '', avatar_url: '', password: '', confirm: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [teammates, setTeammates] = useState([]);
  const [state, setState] = useState({ loading: true, busy: false, error: '' });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, busy: false, error: 'This setup link is missing its secure token.' });
      return;
    }
    api.setupDetails(token).then(({ client: account }) => {
      setClient(account);
      setForm((current) => ({ ...current, name: account.name || '', company: account.company || '', phone: account.phone || '', avatar_url: account.avatar_url || '' }));
      setAvatarPreview(account.avatar_url || '');
      setState({ loading: false, busy: false, error: '' });
    }).catch((error) => setState({ loading: false, busy: false, error: error.message || 'This setup link is unavailable.' }));
  }, [token]);

  useEffect(() => () => {
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const chooseAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setState((current) => ({ ...current, error: 'Choose a JPG, PNG, WebP, GIF, or SVG image.' }));
      return;
    }
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setState((current) => ({ ...current, error: '' }));
  };

  const canContinue = step === 0 ? form.name.trim().length >= 2
    : step === 1 ? form.company.trim().length >= 2
      : step === 2 ? teammates.every((person) => !person.email || person.email.includes('@'))
        : form.password.length >= 10 && form.password === form.confirm;

  const next = async () => {
    if (!canContinue || state.busy) return;
    setState((current) => ({ ...current, error: '' }));
    if (step === 0 && avatarFile && !form.avatar_url) {
      setState((current) => ({ ...current, busy: true }));
      try {
        const { url } = await uploadSetupAvatar(token, avatarFile);
        setForm((current) => ({ ...current, avatar_url: url }));
      } catch (error) {
        setState((current) => ({ ...current, busy: false, error: error.message || 'Could not upload that picture.' }));
        return;
      }
      setState((current) => ({ ...current, busy: false }));
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const finish = async (event) => {
    event.preventDefault();
    if (!canContinue || state.busy) return;
    setState((current) => ({ ...current, busy: true, error: '' }));
    try {
      const result = await api.completeSetup({
        token,
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        avatar_url: form.avatar_url,
        password: form.password,
        teammates: teammates.filter((person) => person.email.trim()).map((person) => ({ name: person.name.trim(), email: person.email.trim(), role: person.role.trim() || 'Team member' })),
      });
      session.signIn(result.token, result.client);
      navigate('/home', { replace: true });
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: error.message || 'Could not finish setup.' }));
    }
  };

  const addTeammate = () => setTeammates((current) => [...current, { name: '', email: '', role: 'Team member' }]);
  const changeTeammate = (index, key, value) => setTeammates((current) => current.map((person, personIndex) => personIndex === index ? { ...person, [key]: value } : person));
  const removeTeammate = (index) => setTeammates((current) => current.filter((_, personIndex) => personIndex !== index));

  if (state.loading) return <main className="v3-setup-loading"><span><i /><i /><i /></span><p>Opening your workspace</p></main>;

  if (!client) return <main className="v3-setup-invalid">
    <img src="/brand/cw-logo.png" alt="Clockwrk" />
    <span>Setup link unavailable</span>
    <h1>Ask Clockwrk for a fresh invitation.</h1>
    <p>{state.error}</p>
    <button type="button" onClick={() => navigate('/login')}>Back to sign in <Icon name="arrow" size={16} /></button>
  </main>;

  return <main className="v3-setup-page">
    <aside>
      <header><img src="/brand/cw-logo.png" alt="Clockwrk" /><span>Client workspace setup</span></header>
      <div className="v3-setup-welcome"><span>Welcome to Clockwrk</span><h1>Make the workspace yours.</h1><p>Confirm who you are, bring in your people, and secure the account. This link works once.</p></div>
      <ol>{STEPS.map(([label, copy], index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}>
        <i>{index < step ? <Icon name="check" size={14} /> : String(index + 1).padStart(2, '0')}</i>
        <span><strong>{label}</strong><small>{copy}</small></span>
      </li>)}</ol>
      <footer><Icon name="clock" size={15} />Setup link expires {new Date(client.setup_expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</footer>
    </aside>

    <form onSubmit={finish}>
      <header><span>{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span><strong>{STEPS[step][0]}</strong></header>
      <div className="v3-setup-stage" key={step}>
        {step === 0 && <>
          <div className="v3-setup-heading"><span>Your profile</span><h2>How should we address you?</h2><p>This name and picture appear beside your approvals and messages.</p></div>
          <div className="v3-avatar-picker">
            <button type="button" onClick={() => inputRef.current?.click()} aria-label="Choose profile picture">{avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span>{form.name.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?'}</span>}<i><Icon name="image" size={17} /></i></button>
            <div><strong>Profile picture</strong><p>Optional. Square images work best.</p><button type="button" onClick={() => inputRef.current?.click()}>{avatarPreview ? 'Change picture' : 'Add picture'}</button></div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={chooseAvatar} />
          </div>
          <label><span>Full name</span><input autoFocus autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your full name" /></label>
        </>}

        {step === 1 && <>
          <div className="v3-setup-heading"><span>Account details</span><h2>Make sure everything is right.</h2><p>Your email and plan came from the Clockwrk agreement. You can correct your company and phone here.</p></div>
          <div className="v3-setup-facts"><span><small>Email</small><strong>{client.email}</strong><i><Icon name="check" size={14} /></i></span><span><small>Plan</small><strong>{pretty(client.plan)}</strong><i>{pretty(client.billing)}</i></span></div>
          <div className="v3-setup-fields"><label><span>Company</span><input autoFocus autoComplete="organization" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label><label><span>Phone (optional)</span><input autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 555 000 0000" /></label></div>
        </>}

        {step === 2 && <>
          <div className="v3-setup-heading"><span>Your people</span><h2>Who else should we know?</h2><p>Add partners or teammates who may review work. You can skip this and add them later in Settings.</p></div>
          <div className="v3-setup-team">
            {!teammates.length && <button type="button" className="v3-setup-team-empty" onClick={addTeammate}><i><Icon name="plus" /></i><span><strong>Add a teammate</strong><small>Share their name, email, and role</small></span><Icon name="arrow" /></button>}
            {teammates.map((person, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><label><small>Name</small><input autoFocus={index === teammates.length - 1} value={person.name} onChange={(event) => changeTeammate(index, 'name', event.target.value)} placeholder="Teammate name" /></label><label><small>Email</small><input type="email" value={person.email} onChange={(event) => changeTeammate(index, 'email', event.target.value)} placeholder="name@company.com" /></label><label><small>Role</small><input value={person.role} onChange={(event) => changeTeammate(index, 'role', event.target.value)} /></label><button type="button" onClick={() => removeTeammate(index)} aria-label="Remove teammate"><Icon name="close" size={15} /></button></div>)}
          </div>
          {!!teammates.length && teammates.length < 10 && <button type="button" className="v3-setup-add" onClick={addTeammate}><Icon name="plus" size={16} />Add another person</button>}
        </>}

        {step === 3 && <>
          <div className="v3-setup-heading"><span>Secure the account</span><h2>Create your password.</h2><p>Use at least 10 characters. Your setup link is deleted as soon as the workspace opens.</p></div>
          <div className="v3-setup-fields"><label><span>Password</span><input autoFocus type="password" autoComplete="new-password" minLength="10" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label><span>Confirm password</span><input type="password" autoComplete="new-password" minLength="10" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} /></label></div>
          <div className="v3-password-checks"><span className={form.password.length >= 10 ? 'is-done' : ''}><i><Icon name="check" size={12} /></i>10 or more characters</span><span className={form.confirm && form.password === form.confirm ? 'is-done' : ''}><i><Icon name="check" size={12} /></i>Passwords match</span></div>
        </>}
      </div>

      {state.error && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{state.error}</div>}
      <footer>{step > 0 ? <button type="button" onClick={() => { setState((current) => ({ ...current, error: '' })); setStep((current) => current - 1); }}><Icon name="back" size={15} />Back</button> : <span />}{step < STEPS.length - 1 ? <button type="button" className="is-primary" disabled={!canContinue || state.busy} onClick={next}><span>{state.busy ? 'Uploading…' : step === 2 && !teammates.length ? 'Skip for now' : 'Continue'}</span><i><Icon name="arrow" size={16} /></i></button> : <button type="submit" className="is-primary" disabled={!canContinue || state.busy}><span>{state.busy ? 'Opening workspace…' : 'Finish setup'}</span><i><Icon name="check" size={16} /></i></button>}</footer>
    </form>
  </main>;
}
