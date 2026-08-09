import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { api } from '../api';
import BookCall from '../BookCall';
import { Action, PageIntro, Status } from '../Primitives';
import { RESTART_ONBOARDING_EVENT } from '../OnboardingTour';

// The DB enum is human-cased; the Status pill keys off lowercase slugs.
const STATUS_SLUG = { Open: 'active', 'In Progress': 'active', Resolved: 'done', Closed: 'done' };
const CATEGORIES = ['Technical Issue', 'Billing Question', 'General Inquiry', 'Revision Request', 'Feature Request'];
const FAQS = [
  ['What happens when I approve a delivery?', 'The request closes, its final files remain in Deliverables, and the next eligible queued request moves into an open production slot.'],
  ['Can I send unlimited requests?', 'Yes. Your plan limits how many requests can be in production at once, not how many briefs you can keep in the queue.'],
  ['Where are source files stored?', 'Every delivered version stays in Deliverables and remains linked to its request and project, so context and version history stay together.'],
  ['How do retainers work after launch?', 'A shipped build can move to an ongoing Care retainer for monitoring, updates, fixes, and smaller improvements measured against included hours.'],
  ['How do I change the order of queued work?', 'Open Requests and use the queue controls to move an item. Dependency-blocked work will wait until the request it relies on is complete.'],
  ['What counts as one active request?', 'A request counts only while the team is actively producing it. Queued work, request groups being scoped, and completed work do not consume a slot.'],
  ['What if a request is too large for one slot?', 'The team can propose a clear breakdown. You approve the parts once, then each part enters the normal queue as a linked request.'],
  ['How do I request changes to delivered work?', 'Open the delivered request, choose Request changes, and leave exact notes. You can include screen names, sections, expected behavior, or references.'],
  ['Can I invite colleagues to the portal?', 'Add your partners or team members from Settings. You can identify who may approve work and who should have billing visibility.'],
  ['How are calls booked?', 'Choose Book working time, select a live available date and time, and add anything the team should prepare. The joining link is sent by email.'],
  ['Where can I see invoices and transfer details?', 'Billing contains your current plan, cadence, add-ons, next transfer date, bank details, and downloadable invoice history.'],
  ['What should I do if production is paused?', 'Open Billing from the account alert. Your queue and files remain safe while you resolve a pending transfer or resume a pause you requested.'],
];

function formatAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Support() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [callOpen, setCallOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);

  const load = useCallback(async () => {
    try {
      const { tickets: rows } = await api.tickets();
      setTickets(rows || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;
    setSending(true);
    setFormError('');
    try {
      await api.createTicket({ subject: subject.trim(), category, description: message.trim(), priority: 'Normal' });
      setSubject('');
      setMessage('');
      setCategory(CATEGORIES[0]);
      setCompose(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not send your ticket.');
    } finally {
      setSending(false);
    }
  };

  return <div className="v3-support-page"><PageIntro index="Client support" title="Help" copy="Get an answer, book time, or open a support thread without losing project context." action={<Action icon="plus" onClick={() => setCompose(true)}>Open a ticket</Action>} />
    <section className="v3-help-route v3-enter"><button onClick={() => setCompose(true)}><Icon name="messages" /><span><strong>Ask the team</strong><small>Typical response in under two hours</small></span><Icon name="arrow" /></button><button onClick={() => setCallOpen(true)}><Icon name="calendar" /><span><strong>Book working time</strong><small>Plan, review, or troubleshoot live</small></span><Icon name="arrow" /></button><button onClick={() => window.dispatchEvent(new CustomEvent(RESTART_ONBOARDING_EVENT))}><Icon name="help" /><span><strong>Replay portal tour</strong><small>A quick guide to the complete workspace</small></span><Icon name="arrow" /></button></section>

    <section className="v3-ticket-table v3-enter"><header><div><span>Your support threads</span><h2>Open and recent tickets</h2></div><strong>{tickets.length}</strong></header>
      {loading && <p className="v3-chat-note">Loading your tickets…</p>}
      {error && !loading && <p className="v3-chat-note is-error">{error}</p>}
      {!loading && !error && !tickets.length && <div className="v3-empty-panel v3-enter" style={{ marginTop: 12 }}>
        <Icon name="messages" size={26} />
        <strong>No support threads yet</strong>
        <span>Open a ticket when something needs the team&rsquo;s attention — a question, a bug, an unclear brief.</span>
        <Action icon="plus" onClick={() => setCompose(true)}>Open your first ticket</Action>
      </div>}
      {tickets.map((ticket) => <button key={ticket.id} onClick={() => navigate(`/support/${ticket.id}`)}><span>CW-{ticket.id}</span><strong>{ticket.subject}</strong><Status status={STATUS_SLUG[ticket.status] || 'queued'}>{ticket.status}</Status><time>{formatAt(ticket.updated_at || ticket.created_at)}</time><Icon name="arrow" size={15} /></button>)}
    </section>

    <section className="v3-answers v3-enter" id="v3-answers"><header><span>Quick answers</span><h2>The things clients ask most.</h2></header><div className="v3-faq-list">{FAQS.map(([question, answer], index) => <article key={question} className={openFaq === index ? 'is-open' : ''}><button type="button" aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{question}</strong><i><Icon name="plus" size={16} /></i></button><div id={`faq-answer-${index}`}><p>{answer}</p></div></article>)}</div></section>

    {compose && <div className="v3-dialog-layer" onMouseDown={() => setCompose(false)}><form className="v3-ticket-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><span>New support ticket</span><button type="button" onClick={() => setCompose(false)} aria-label="Close"><Icon name="close" /></button></header><div className="v3-dialog-body"><span className="v3-dialog-kicker">Support request</span><h2>What do you need help with?</h2><p className="v3-dialog-copy">Give the team enough context to route this to the right person.</p>
      {formError && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{formError}</div>}
      <label><span>Subject</span><input autoFocus value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A short summary" /></label>
      <label><span>Category</span><div className={`v3-custom-select ${categoryOpen ? 'is-open' : ''}`}><button type="button" aria-haspopup="listbox" aria-expanded={categoryOpen} onClick={() => setCategoryOpen(!categoryOpen)}><span>{category}</span><Icon name="down" size={15} /></button>{categoryOpen && <div role="listbox" aria-label="Ticket category">{CATEGORIES.map((item) => <button type="button" role="option" aria-selected={category === item} key={item} className={category === item ? 'is-active' : ''} onClick={() => { setCategory(item); setCategoryOpen(false); }}>{item}{category === item && <Icon name="check" size={14} />}</button>)}</div>}</div></label>
      <label><span>Details</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What happened, what did you expect, and which project is affected?" /></label>
      <Action type="submit" icon="send" disabled={sending || !subject.trim() || !message.trim()}>{sending ? 'Sending…' : 'Send to support'}</Action>
    </div></form></div>}
  {callOpen && <BookCall onClose={() => setCallOpen(false)} />}
  </div>;
}
