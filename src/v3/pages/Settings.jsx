import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { me } from '../../mocks';
import Icon from '../Icon';
import { Action, Avatar, PageIntro } from '../Primitives';

const initialMembers = [
  ['Sardar Khan', 'Workspace owner', true], ['Hira Khan', 'Business partner', true], ['Bilal Ahmed', 'Marketing lead', false], ['Nida Ali', 'Operations', false],
];

export default function Settings() {
  const navigate = useNavigate();
  const [name, setName] = useState(me.name);
  const [company, setCompany] = useState(me.company);
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const save = (event) => { event.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  return <div className="v3-settings-page"><PageIntro index="Workspace control" title="Settings" copy="Identity, access, notifications, and the people from your company who use this portal." />
    <div className="v3-settings-index"><a href="#profile">Profile</a><a href="#brand">Brand kit</a><a href="#notifications">Notifications</a><a href="#people">Your people</a><a href="#security">Security</a></div>
    <form className="v3-settings-sheet v3-enter" onSubmit={save}><section id="profile"><header><span>01</span><div><h2>Your profile</h2><p>Used on approvals, messages, and invoices.</p></div><Avatar name={name} online /></header><div className="v3-field-pair"><label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} /></label></div><label><span>Email</span><input value={me.email} disabled /></label><Action icon="check" type="submit">{saved ? 'Saved' : 'Save profile'}</Action></section>
      <section id="brand"><header><span>02</span><div><h2>Brand kit</h2><p>Shared automatically with every request.</p></div></header><div className="v3-brand-files"><button><strong>M9</strong><span><b>Primary logo</b><small>SVG · updated Jun 22</small></span><Icon name="download" /></button><button><Icon name="plus" /><span><b>Add brand assets</b><small>Logos, fonts, guidelines</small></span></button></div><div className="v3-colors">{['#a0e92a','#090a08','#ffffff','#f4c84b','#e5483f'].map((color) => <button key={color} style={{ backgroundColor: color }} aria-label={`Brand color ${color}`} />)}</div></section>
      <section id="notifications"><header><span>03</span><div><h2>Notifications</h2><p>Choose the updates that deserve your attention.</p></div></header>{['Delivery ready', 'Team message', 'Billing activity', 'Monday summary'].map((item, index) => <label className="v3-setting-toggle" key={item}><span><strong>{item}</strong><small>{index < 2 ? 'Instant notification' : 'Email notification'}</small></span><input type="checkbox" defaultChecked={index !== 2} /><i /></label>)}</section>
      <section id="people"><header><span>04</span><div><h2>Your partners and team</h2><p>People from your company, not the Clockwrk delivery crew.</p></div><strong>{members.length}</strong></header><div className="v3-member-list">{members.map(([member, role, billing], index) => <div key={member}><Avatar name={member} size="sm" /><span><strong>{member}</strong><small>{role}</small></span><label><input type="checkbox" defaultChecked />Can approve</label><label><input type="checkbox" defaultChecked={billing} />Billing</label><button type="button" onClick={() => setMembers(members.filter((_, itemIndex) => itemIndex !== index))}><Icon name="close" size={14} /></button></div>)}</div><div className="v3-invite"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@yourcompany.com" /><button type="button" disabled={!email.includes('@')} onClick={() => { setMembers([...members, [email.split('@')[0], 'Team member', false]]); setEmail(''); }}>Invite</button></div></section>
      <section id="security"><header><span>05</span><div><h2>Security</h2><p>Change portal access and review this session.</p></div></header><div className="v3-field-pair"><label><span>Current access code</span><input type="password" /></label><label><span>New access code</span><input type="password" /></label></div><footer><button type="button">Update access code</button><button type="button" onClick={() => { localStorage.removeItem('portal_demo_authed'); navigate('/login'); }}>Sign out</button></footer></section>
    </form>
  </div>;
}
