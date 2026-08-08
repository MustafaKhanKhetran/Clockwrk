import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { api } from '../api';
import BookCall from '../BookCall';
import { Action, PageIntro, Status } from '../Primitives';

// The DB enum is human-cased; the Status pill keys off lowercase slugs.
const STATUS_SLUG = { Open: 'active', 'In Progress': 'active', Resolved: 'done', Closed: 'done' };
const CATEGORIES = ['Technical Issue', 'Billing Question', 'General Inquiry', 'Revision Request', 'Feature Request'];

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
    <section className="v3-help-route v3-enter"><button onClick={() => setCompose(true)}><Icon name="messages" /><span><strong>Ask the team</strong><small>Typical response in under two hours</small></span><Icon name="arrow" /></button><button onClick={() => setCallOpen(true)}><Icon name="calendar" /><span><strong>Book working time</strong><small>Plan, review, or troubleshoot live</small></span><Icon name="arrow" /></button><button onClick={() => document.getElementById('v3-answers')?.scrollIntoView({ behavior: 'smooth' })}><Icon name="help" /><span><strong>Portal guide</strong><small>Requests, approvals, billing, and access</small></span><Icon name="arrow" /></button></section>

    <section className="v3-ticket-table v3-enter"><header><div><span>Your support threads</span><h2>Open and recent tickets</h2></div><strong>{tickets.length}</strong></header>
      {loading && <p className="v3-chat-note">Loading your tickets…</p>}
      {error && !loading && <p className="v3-chat-note is-error">{error}</p>}
      {!loading && !error && !tickets.length && <p className="v3-chat-note">No tickets yet. Open one and the team will pick it up.</p>}
      {tickets.map((ticket) => <button key={ticket.id} onClick={() => navigate(`/support/${ticket.id}`)}><span>CW-{ticket.id}</span><strong>{ticket.subject}</strong><Status status={STATUS_SLUG[ticket.status] || 'queued'}>{ticket.status}</Status><time>{formatAt(ticket.updated_at || ticket.created_at)}</time><Icon name="arrow" size={15} /></button>)}
    </section>

    <section className="v3-answers v3-enter" id="v3-answers"><header><span>Quick answers</span><h2>The things clients ask most.</h2></header>{[['What happens when I approve a delivery?', 'The next queued request moves into the open production slot automatically.'], ['Can I send unlimited requests?', 'Yes. Your plan limits simultaneous production, not the number of briefs in your queue.'], ['Where are source files stored?', 'Every delivered version stays in Deliverables and remains linked to its request and project.'], ['How do retainers work after launch?', 'Your build can move into ongoing care for monitoring, updates, and small improvements.']].map(([question, answer]) => <details key={question}><summary>{question}<Icon name="plus" size={15} /></summary><p>{answer}</p></details>)}</section>

    {compose && <div className="v3-dialog-layer" onMouseDown={() => setCompose(false)}><form className="v3-ticket-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><span>New support ticket</span><button type="button" onClick={() => setCompose(false)}><Icon name="close" /></button></header><h2>What do you need help with?</h2>
      {formError && <div className="v3-login-error" role="alert"><Icon name="close" size={14} />{formError}</div>}
      <label><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
      <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label><span>Details</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <Action type="submit" icon="send" disabled={sending || !subject.trim() || !message.trim()}>{sending ? 'Sending…' : 'Send to support'}</Action>
    </form></div>}
  {callOpen && <BookCall onClose={() => setCallOpen(false)} />}
  </div>;
}
