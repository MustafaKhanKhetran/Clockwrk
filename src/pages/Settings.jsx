import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me } from '../mocks';
import { Avatar, Icon, SiteCta } from '../components/ui';

const BRAND_COLORS = ['#a0e92a', '#0a0a0b', '#f7f7f5', '#383838'];
const CLIENT_MEMBERS = [
  { id: 'client-1', name: 'Sardar Khan', role: 'Workspace owner', canApprove: true, billing: true, online: true },
  { id: 'client-2', name: 'Hira Khan', role: 'Business partner', canApprove: true, billing: true, online: false },
  { id: 'client-3', name: 'Bilal Ahmed', role: 'Marketing lead', canApprove: true, billing: false, online: true },
  { id: 'client-4', name: 'Nida Ali', role: 'Operations', canApprove: false, billing: false, online: false },
];

function Toggle({ on, onClick }) {
  return <button type="button" className={`settings-toggle ${on ? 'is-on' : ''}`} onClick={onClick} aria-pressed={on}><span /></button>;
}

export default function Settings() {
  const navigate = useNavigate();
  const [name, setName] = useState(me.name);
  const [company, setCompany] = useState(me.company);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ delivery: true, comments: true, billing: false, weekly: true });
  const [members, setMembers] = useState(CLIENT_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState(me.email);

  const save = (event) => {
    event.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div><span className="kicker">Workspace preferences</span><h1 className="page-title">Settings</h1><p className="page-sub">Manage your account, brand system, security, and notifications.</p></div>
        <span className="settings-saved-state" aria-live="polite">{saved ? 'Changes saved' : 'Workspace up to date'}</span>
      </header>

      <div className="settings-layout">
        <aside className="settings-nav anim-rise">
          {[
            [Icon.home, 'Profile', 'Personal details'],
            [Icon.spark, 'Brand kit', 'Assets and colors'],
            [Icon.bolt, 'Notifications', 'Delivery updates'],
            [Icon.gear, 'Security', 'Access and sessions'],
          ].map(([ItemIcon, label, sub], index) => <a key={label} href={`#settings-${label.toLowerCase().replace(' ', '-')}`} className={index === 0 ? 'is-active' : ''}><span><ItemIcon /></span><div><strong>{label}</strong><small>{sub}</small></div></a>)}
        </aside>

        <div className="settings-content">
          <form id="settings-profile" className="settings-section anim-rise" onSubmit={save}>
            <div className="settings-section-head"><div><span className="kicker">Account</span><h2>Profile information</h2><p>Used for approvals, messages, and billing records.</p></div><Avatar name={name} size={52} online /></div>
            <div className="settings-form-grid">
              <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label><span>Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} /></label>
              <label className="is-wide"><span>Email address</span><input value={me.email} disabled /></label>
            </div>
            <div className="settings-section-actions"><span>Your email is managed through portal access.</span><SiteCta type="submit" className="site-cta-compact" icon={<Icon.check />}>{saved ? 'Saved' : 'Save changes'}</SiteCta></div>
          </form>

          <section id="settings-brand-kit" className="settings-section anim-rise">
            <div className="settings-section-head"><div><span className="kicker">Creative defaults</span><h2>Brand kit</h2><p>These assets are automatically available on every request.</p></div><span className="settings-count-pill">4 colors</span></div>
            <div className="settings-brand-row">
              <div className="settings-brand-logo"><strong>{company.slice(0, 2).toUpperCase()}</strong><span><b>Primary logo</b><small>SVG · updated Jun 22</small></span><button><Icon.download /></button></div>
              <div className="settings-swatches">{BRAND_COLORS.map((color) => <button key={color} title={color} style={{ '--swatch': color }}><span /></button>)}<button className="is-add"><Icon.plus /></button></div>
            </div>
            <button className="settings-upload"><Icon.clip /><span><strong>Add logos, fonts, or guidelines</strong><small>SVG, PNG, PDF, OTF, or TTF</small></span><i>Browse files</i></button>
          </section>

          <section id="settings-notifications" className="settings-section anim-rise">
            <div className="settings-section-head"><div><span className="kicker">Communication</span><h2>Notifications</h2><p>Choose which updates should reach your inbox.</p></div></div>
            <div className="settings-option-list">
              {[
                ['delivery', 'Request delivered', 'When a file or build is ready for review'],
                ['comments', 'Team messages', 'Questions, decisions, and request comments'],
                ['billing', 'Billing activity', 'Invoices, add-ons, and subscription changes'],
                ['weekly', 'Weekly summary', 'A concise progress report every Monday'],
              ].map(([key, label, description]) => <div key={key}><span><strong>{label}</strong><small>{description}</small></span><Toggle on={notifications[key]} onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })} /></div>)}
            </div>
          </section>

          <section id="settings-security" className="settings-section anim-rise">
            <div className="settings-section-head"><div><span className="kicker">Access</span><h2>Security</h2><p>Update your portal code and review the current session.</p></div><span className="settings-secure"><i /> Secure</span></div>
            <div className="settings-security-grid">
              <label><span>Current access code</span><input type="password" placeholder="••••••••" /></label>
              <label><span>New access code</span><input type="password" placeholder="At least 8 characters" /></label>
            </div>
            <div className="settings-section-actions"><button className="settings-text-button">Update access code</button><button className="settings-signout" onClick={() => { localStorage.removeItem('portal_demo_authed'); navigate('/login'); }}>Sign out of portal</button></div>
          </section>

          <section className="settings-section anim-rise">
            <div className="settings-section-head"><div><span className="kicker">Client workspace</span><h2>Partners and team members</h2><p>Invite people from your company and control their portal permissions.</p></div><span className="settings-count-pill">{members.length} members</span></div>
            <div className="settings-member-list">
              {members.map((member) => <div key={member.id}><Avatar name={member.name} size={36} online={member.online} /><span><strong>{member.name}</strong><small>{member.role}</small></span><label><input type="checkbox" checked={member.canApprove} onChange={(event) => setMembers(members.map((item) => item.id === member.id ? { ...item, canApprove: event.target.checked } : item))} />Approvals</label><label><input type="checkbox" checked={member.billing} onChange={(event) => setMembers(members.map((item) => item.id === member.id ? { ...item, billing: event.target.checked } : item))} />Billing</label></div>)}
            </div>
            <div className="settings-invite"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="partner@yourcompany.com" /><button disabled={!inviteEmail.includes('@')} onClick={() => { setMembers([...members, { id: `client-${Date.now()}`, name: inviteEmail.split('@')[0], role: 'Client team member', canApprove: false, billing: false, online: false }]); setInviteEmail(''); }}>Invite member</button></div>
          </section>

          <section className="settings-section anim-rise">
            <div className="settings-section-head"><div><span className="kicker">Billing</span><h2>Billing contacts</h2><p>Invoices and renewal notices are sent to this address.</p></div></div>
            <div className="settings-invite"><input type="email" value={billingEmail} onChange={(event) => setBillingEmail(event.target.value)} /><button onClick={() => setSaved(true)}>Save contact</button></div>
          </section>
        </div>
      </div>
    </>
  );
}
