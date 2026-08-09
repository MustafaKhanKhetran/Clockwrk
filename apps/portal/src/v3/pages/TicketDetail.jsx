import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '../Icon';
import { api } from '../api';
import { usePortalBack } from '../navigation';
import { Action, Avatar, Status } from '../Primitives';

const STATUS_SLUG = { Open: 'active', 'In Progress': 'active', Resolved: 'done', Closed: 'done' };

function formatAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

export default function TicketDetail() {
  const goBack = usePortalBack('/support');
  const { ticketId } = useParams();
  const end = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.ticket(ticketId);
      setTicket(res.ticket);
      setReplies(res.replies || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // The team answers from the dashboard, so keep the thread fresh while open.
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const pane = end.current?.parentElement;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [replies]);

  const send = async (event) => {
    event.preventDefault();
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    setReply('');
    try {
      await api.replyToTicket(ticketId, body);
      await load();
    } catch (err) {
      setError(err.message || 'Reply not sent.');
      setReply(body);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <section className="v3-empty-panel"><span>Loading ticket…</span></section>;
  if (!ticket) return <section className="v3-missing"><h1>{error || 'Ticket not found'}</h1><Action onClick={goBack}>Go back</Action></section>;

  return <div className="v3-ticket-record">
    <header>
      <button onClick={goBack} aria-label="Back to previous page"><Icon name="back" /></button>
      <div>
        <span>CW-{ticket.id} · {ticket.category}<Status status={STATUS_SLUG[ticket.status] || 'queued'}>{ticket.status}</Status></span>
        <h1>{ticket.subject}</h1>
        <small>Opened {formatAt(ticket.created_at)}</small>
      </div>
    </header>

    <section className="v3-ticket-thread">
      <div className="v3-chat">
        <div><Avatar name="You" size="sm" /><span><header><strong>You</strong><small>{formatAt(ticket.created_at)}</small></header><p>{ticket.description}</p></span></div>
        {replies.map((item) => {
          const mine = item.sender === 'client';
          return <div key={item.id} className={mine ? 'is-me' : ''}>
            {!mine && <Avatar name="Clockwrk" size="sm" online />}
            <span><header><strong>{mine ? 'You' : 'Clockwrk'}</strong><small>{formatAt(item.created_at)}</small></header><p>{item.message}</p></span>
          </div>;
        })}
        <i ref={end} />
      </div>

      {error && <p className="v3-chat-note is-error">{error}</p>}

      {['Resolved', 'Closed'].includes(ticket.status)
        ? <p className="v3-chat-note">This ticket is {ticket.status.toLowerCase()}. Replying will reopen it.</p>
        : null}

      <form onSubmit={send}>
        <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to support" />
        <button type="submit" disabled={!reply.trim() || sending} aria-label="Send reply"><Icon name="send" size={18} /></button>
      </form>
    </section>
  </div>;
}
