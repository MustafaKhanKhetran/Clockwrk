import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState, ErrorState, Spinner } from '../components/PageState';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, arrayFrom } from '../utils/api';
import { dateTime } from '../utils/format';

export default function Messages() {
  const [messages, setMessages] = useState(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const { user } = useAuth();

  const load = useCallback(async (quiet = false) => {
    try { setMessages(arrayFrom(await apiGet('/api/client/messages'), 'messages')); }
    catch (err) { if (!quiet) setError(err.message); }
  }, []);
  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(interval);
  }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(event) {
    event.preventDefault();
    const value = content.trim();
    if (!value) return;
    setSending(true);
    setError('');
    try {
      await apiPost('/api/client/messages', { content: value });
      setContent('');
      await load();
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  if (error && !messages) return <ErrorState message={error} onRetry={load} />;
  if (!messages) return <Spinner />;
  return (
    <div>
      <div className="mb-6"><h2 className="text-2xl font-bold">Messages</h2><p className="mt-1 text-sm text-text-secondary">Chat directly with the Clockwrk team.</p></div>
      <section className="flex h-[calc(100vh-12rem)] min-h-[500px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-4"><p className="text-sm font-semibold">Clockwrk Team</p><p className="mt-0.5 text-xs text-success">Usually replies within one business day</p></div>
        <div className="flex-1 overflow-y-auto bg-background/50 p-6">
          {messages.length ? <div className="space-y-5">{messages.map((message, index) => {
            const senderId = message.sender_id || message.user_id;
            const mine = message.is_client ?? (message.sender_type ? message.sender_type === 'client' : senderId === user?.id);
            const name = mine ? (user?.name || 'You') : (message.sender?.name || message.sender_name || 'Clockwrk Team');
            return <div key={message.id || index} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${mine ? 'bg-accent text-white' : 'bg-primary text-white'}`}>{name.charAt(0).toUpperCase()}</div><div className={`max-w-[70%] ${mine ? 'text-right' : ''}`}><div className="mb-1 flex items-center gap-2 text-xs text-text-muted"><span className="font-medium text-text-secondary">{name}</span><span>{dateTime(message.created_at)}</span></div><div className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm leading-6 ${mine ? 'rounded-tr-sm bg-accent text-white' : 'rounded-tl-sm border border-border bg-white text-primary'}`}>{message.content || message.message || message.body}</div></div></div>;
          })}<div ref={bottomRef} /></div> : <EmptyState title="No messages yet" description="Start a conversation with the Clockwrk team below." />}
        </div>
        {error && <div className="bg-danger/10 px-6 py-2 text-xs text-danger">{error}</div>}
        <form onSubmit={send} className="flex gap-3 border-t border-border bg-white p-4"><textarea rows="2" value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} placeholder="Write a message…" className="min-h-11 flex-1 resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" /><button disabled={sending || !content.trim()} className="self-end rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{sending ? 'Sending…' : 'Send'}</button></form>
      </section>
    </div>
  );
}
