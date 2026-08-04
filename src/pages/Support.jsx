import { useState } from 'react';
import { tickets as seed } from '../mocks';
import { Icon, StatusPill, SiteCta } from '../components/ui';
import ScheduleCall from '../components/ScheduleCall';

const FAQS = [
  ['How fast is a request delivered?', 'Most requests arrive in 2–3 business days. Larger work is divided into visible milestones.'],
  ['What counts as one request?', 'One focused deliverable, feature, page, deck, or asset. Larger outcomes are broken into clear request-sized stages.'],
  ['Are revisions unlimited?', 'Yes. Your team iterates until the agreed request outcome is approved.'],
  ['Can I pause my plan?', 'Yes. Pause from Billing while keeping your projects, files, conversations, and queue intact.'],
];

export default function Support() {
  const [tickets, setTickets] = useState(seed);
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [openFaq, setOpenFaq] = useState(0);

  const submit = (event) => {
    event.preventDefault();
    if (!subject.trim()) return;
    setTickets([{ id: `T-${47 + tickets.length}`, subject: subject.trim(), status: 'open', at: 'Just now', replies: 0 }, ...tickets]);
    setSubject('');
    setBody('');
    setComposerOpen(false);
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div><span className="kicker">Client care</span><h1 className="page-title">Help center</h1><p className="page-sub">Answers, account support, and direct access to the Clockwrk team.</p></div>
        <SiteCta className="site-cta-compact" icon={<Icon.plus />} onClick={() => setComposerOpen(true)}>New ticket</SiteCta>
      </header>

      <section className="help-contact-grid anim-rise">
        <button onClick={() => setComposerOpen(true)}><span><Icon.chat /></span><div><strong>Message support</strong><small>Account, billing, or portal help</small></div><i><Icon.arrow /></i></button>
        <ScheduleCall className="help-schedule" label="Book a support call" />
        <button><span><Icon.clock /></span><div><strong>Response time</strong><small>Usually within two business hours</small></div><em>Online</em></button>
      </section>

      {composerOpen && (
        <form onSubmit={submit} className="help-ticket-composer anim-pop">
          <div className="help-ticket-head"><div><span className="kicker">New support ticket</span><h2>What can we help with?</h2></div><button type="button" onClick={() => setComposerOpen(false)}><Icon.x /></button></div>
          <label><span>Subject</span><input placeholder="A short summary of the issue" value={subject} onChange={(event) => setSubject(event.target.value)} autoFocus /></label>
          <label><span>Details</span><textarea placeholder="Include what happened, what you expected, and any useful links." value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <button type="button" className="help-attachment"><Icon.clip /><span><strong>Add screenshots or files</strong><small>PNG, JPG, PDF, or video</small></span><i>Optional</i></button>
          <div className="help-ticket-actions"><span>Replies will also be sent to your account email.</span><SiteCta type="submit" className="site-cta-compact" disabled={!subject.trim()}>Submit ticket</SiteCta></div>
        </form>
      )}

      <div className="help-workspace">
        <section className="help-tickets anim-rise">
          <div className="help-section-head"><div><span className="kicker">Support history</span><h2>Your tickets</h2></div><span>{tickets.length}</span></div>
          <div className="help-ticket-list">
            {tickets.map((ticket, index) => (
              <button key={ticket.id} style={{ '--ticket-delay': `${index * 55}ms` }}>
                <span><Icon.help /></span>
                <div><small>{ticket.id} · {ticket.at}</small><strong>{ticket.subject}</strong><i>{ticket.replies} team replies</i></div>
                <StatusPill status={ticket.status} />
                <em><Icon.arrow /></em>
              </button>
            ))}
          </div>
        </section>

        <section className="help-faq anim-rise">
          <div className="help-section-head"><div><span className="kicker">Knowledge base</span><h2>Quick answers</h2></div></div>
          <div className="help-faq-list">
            {FAQS.map(([question, answer], index) => (
              <article key={question} className={openFaq === index ? 'is-open' : ''}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><i><Icon.plus /></i></button>
                <div><p>{answer}</p></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
