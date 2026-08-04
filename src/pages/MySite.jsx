import { useState } from 'react';
import { Icon, SiteCta } from '../components/ui';
import { store, useStore } from '../store';
import { downloadMock } from '../utils/download';

const TABS = ['Hosting', 'Domains', 'Email', 'Security', 'Reports'];
const HOSTING_PLANS = [['shared', 'Shared', 25], ['wordpress', 'WordPress', 45], ['woocommerce', 'WooCommerce', 75], ['vps', 'VPS', 120]];

export default function MySite() {
  const { domains, mailboxes, hosting, securityMonitors, reports } = useStore();
  const [tab, setTab] = useState('Hosting');
  const [domain, setDomain] = useState('');
  const [tld, setTld] = useState('.com');

  return (
    <>
      <header className="page-head anim-rise">
        <div><span className="kicker">Operations</span><h1 className="page-title">My Site</h1><p className="page-sub">Everything running behind your projects, with status and controls in one place.</p></div>
        <span className="site-health"><i /> All systems operational</span>
      </header>
      <nav className="site-tabs anim-rise" aria-label="My Site sections">
        {TABS.map((item) => <button key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {tab === 'Hosting' && <div className="site-tab-panel anim-rise">
        <section className="infra-status-band"><span><i />Live and monitored</span><strong>{hosting.accounts[0]?.uptime}% uptime</strong><small>Last 30 days</small></section>
        <section className="infra-section"><header><div><span className="kicker">Active hosting</span><h2>Environments</h2></div></header>{hosting.accounts.map((account) => <div className="infra-row" key={account.id}><span><Icon.cube /></span><div><strong>{account.domain}</strong><small>{account.plan} · ${account.price}/mo</small></div><i className="pill pill-lime">{account.status}</i></div>)}</section>
        <section className="infra-plan-grid">{HOSTING_PLANS.map(([id, name, price]) => <article key={id}><Icon.cube /><h3>{name}</h3><strong>${price}<small>/mo</small></strong><button onClick={() => store.orderService(id)}>Provision</button></article>)}</section>
        <section className="infra-section"><header><div><span className="kicker">Backups</span><h2>Recovery points</h2></div><button onClick={store.runBackup}>Run backup</button></header>{hosting.backups.map((backup) => <div className="infra-row" key={backup.id}><span><Icon.download /></span><div><strong>{backup.type} backup</strong><small>{backup.createdAt}</small></div><i className="pill pill-soft">{backup.status}</i></div>)}</section>
      </div>}

      {tab === 'Domains' && <div className="site-tab-panel anim-rise">
        <section className="domain-search"><div><Icon.eye /><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="Find your next domain" /><select value={tld} onChange={(event) => setTld(event.target.value)}>{['.com', '.io', '.co', '.net'].map((item) => <option key={item}>{item}</option>)}</select></div><SiteCta className="site-cta-compact" disabled={!domain.trim()} onClick={() => { store.registerDomain(domain, tld); setDomain(''); }}>Register</SiteCta><p>Yearly registration plus $10/mo managed DNS.</p></section>
        <section className="infra-section"><header><div><span className="kicker">Portfolio</span><h2>Your domains</h2></div><span>{domains.length}</span></header>{domains.map((item) => <div className="domain-row" key={item.id}><span><Icon.home /></span><div><strong>{item.name}</strong><small>Renews {item.renewalAt} · privacy included</small></div><label><input type="checkbox" checked={item.autoRenew} onChange={(event) => store.setDomainAutoRenew(item.id, event.target.checked)} /><i />Auto-renew</label><button onClick={() => store.requestService('managed-dns')}>Manage DNS</button></div>)}</section>
      </div>}

      {tab === 'Email' && <div className="site-tab-panel anim-rise">
        <section className="infra-section"><header><div><span className="kicker">Mailboxes</span><h2>Active email</h2></div><button onClick={() => store.toggleService('email-team', true)}>Add mailbox</button></header>{mailboxes.map((mailbox) => <div className="infra-row" key={mailbox.id}><span><Icon.chat /></span><div><strong>{mailbox.address}</strong><small>{mailbox.plan} mailbox</small></div><i className="pill pill-lime">{mailbox.status}</i></div>)}</section>
        <section className="infra-action-grid"><button onClick={() => store.orderService('email-forwarding')}><Icon.arrow /><span><strong>Forwarding and aliases</strong><small>$80 one-time</small></span></button><button onClick={() => store.requestService('email-migration')}><Icon.layers /><span><strong>Email migration</strong><small>Request a scoped quote</small></span></button></section>
      </div>}

      {tab === 'Security' && <div className="site-tab-panel anim-rise">
        <section className="security-score"><div><span><Icon.lock /></span><div><small>Security posture</small><strong>Protected</strong><p>{securityMonitors.filter((item) => item.on).length} of {securityMonitors.length} monitors active</p></div></div><strong>92<small>/100</small></strong></section>
        <section className="infra-section"><header><div><span className="kicker">Monitoring</span><h2>Continuous protection</h2></div></header>{securityMonitors.map((monitor) => <div className="monitor-row" key={monitor.id}><span><Icon.eye /></span><div><strong>{monitor.name}</strong><small>${monitor.price}/mo</small></div><label><input type="checkbox" checked={monitor.on} onChange={(event) => store.toggleMonitor(monitor.id, event.target.checked)} /><i /></label></div>)}</section>
      </div>}

      {tab === 'Reports' && <div className="site-tab-panel anim-rise">
        <section className="infra-section"><header><div><span className="kicker">Downloads</span><h2>Site reports</h2></div><span>{reports.length} reports</span></header>{reports.map((report) => <div className="infra-row" key={report.id}><span><Icon.invoice /></span><div><strong>{report.type}</strong><small>{report.period} · generated {report.generatedAt}</small></div><button onClick={() => downloadMock(`${report.type.toLowerCase().replaceAll(' ', '-')}.pdf`, `${report.type}\n${report.period}\nGenerated ${report.generatedAt}`)}><Icon.download /> Download</button></div>)}</section>
      </div>}
    </>
  );
}
