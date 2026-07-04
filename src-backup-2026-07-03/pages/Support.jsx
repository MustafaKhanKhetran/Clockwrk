import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/PageState';
import Select from '../components/Select';
import { apiGet, apiPost, arrayFrom, objectFrom } from '../utils/api';
import { date, dateTime, statusVariant, titleCase } from '../utils/format';

const categories = ['Technical Issue', 'Billing Question', 'General Inquiry', 'Revision Request', 'Feature Request'].map((label) => ({ label, value: label }));
const priorities = ['Low', 'Normal', 'High', 'Urgent'].map((label) => ({ label, value: label.toLowerCase() }));
const initialForm = { subject: '', category: 'Technical Issue', priority: 'normal', description: '' };

export default function Support() {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    try { setTickets(arrayFrom(await apiGet('/api/client/tickets'), 'tickets')); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createTicket(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/api/client/tickets', form);
      setCreateOpen(false);
      setForm(initialForm);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function openTicket(ticket) {
    setSelected(ticket);
    setDetail(null);
    try { setDetail(objectFrom(await apiGet(`/api/client/tickets/${ticket.id}`), 'ticket')); }
    catch (err) { setError(err.message); setSelected(null); }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    setReplying(true);
    try {
      await apiPost(`/api/client/tickets/${selected.id}/replies`, { content: reply.trim() });
      setReply('');
      setDetail(objectFrom(await apiGet(`/api/client/tickets/${selected.id}`), 'ticket'));
    } catch (err) { setError(err.message); }
    finally { setReplying(false); }
  }

  if (error && !tickets) return <ErrorState message={error} onRetry={load} />;
  if (!tickets) return <Spinner />;
  return (
    <>
      {error && <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}<button onClick={() => setError('')} className="float-right">×</button></div>}
      <div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-bold">Support</h2><p className="mt-1 text-sm text-text-secondary">Create and follow up on support requests.</p></div><button onClick={() => setCreateOpen(true)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">New Ticket</button></div>
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {tickets.length ? <table className="w-full text-left"><thead className="border-b border-border bg-background/70 text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-5 py-3 font-medium">#</th><th className="px-5 py-3 font-medium">Subject</th><th className="px-5 py-3 font-medium">Category</th><th className="px-5 py-3 font-medium">Priority</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Created</th><th className="px-5 py-3 font-medium">Updated</th></tr></thead><tbody className="divide-y divide-border">
          {tickets.map((ticket) => <tr key={ticket.id} onClick={() => openTicket(ticket)} className="cursor-pointer hover:bg-background"><td className="px-5 py-4 text-sm text-text-muted">{ticket.number || ticket.id}</td><td className="px-5 py-4 text-sm font-medium">{ticket.subject}</td><td className="px-5 py-4 text-sm text-text-secondary">{titleCase(ticket.category)}</td><td className="px-5 py-4"><Badge variant={statusVariant(ticket.priority)}>{titleCase(ticket.priority)}</Badge></td><td className="px-5 py-4"><Badge variant={statusVariant(ticket.status)}>{titleCase(ticket.status)}</Badge></td><td className="px-5 py-4 text-sm text-text-secondary">{date(ticket.created_at)}</td><td className="px-5 py-4 text-sm text-text-secondary">{date(ticket.updated_at)}</td></tr>)}
        </tbody></table> : <EmptyState title="No support tickets" description="Create a ticket when you need help from the Clockwrk team." />}
      </section>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New support ticket">
        <form onSubmit={createTicket} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Subject</span><input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" /></label>
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={categories} />
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={priorities} />
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Description</span><textarea required rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" /></label>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancel</button><button disabled={submitting} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit ticket'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(selected)} onClose={() => { setSelected(null); setDetail(null); }} title={selected?.subject || 'Ticket details'} size="max-w-2xl">
        {!detail ? <Spinner /> : <div className="space-y-6">
          <div className="flex gap-2"><Badge variant={statusVariant(detail.status)}>{titleCase(detail.status)}</Badge><Badge variant={statusVariant(detail.priority)}>{titleCase(detail.priority)}</Badge></div>
          <div><p className="text-xs text-text-muted">{titleCase(detail.category)} · Created {date(detail.created_at)}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{detail.description}</p></div>
          <div className="border-t border-border pt-5"><h3 className="text-sm font-semibold">Conversation</h3><div className="mt-4 space-y-4">{arrayFrom(detail, 'messages', 'replies', 'thread').map((message, index) => <div key={message.id || index} className="rounded-lg bg-background p-4"><div className="flex justify-between text-xs"><span className="font-medium text-primary">{message.author?.name || message.sender_name || message.name || 'Clockwrk team'}</span><span className="text-text-muted">{dateTime(message.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{message.content || message.message || message.body}</p></div>)}</div></div>
          <form onSubmit={sendReply}><textarea rows="3" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" /><div className="mt-3 text-right"><button disabled={replying || !reply.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{replying ? 'Sending…' : 'Send Reply'}</button></div></form>
        </div>}
      </Modal>
    </>
  );
}
