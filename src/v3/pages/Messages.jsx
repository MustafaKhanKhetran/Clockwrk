import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import Icon from '../Icon';
import { api, uploadFile } from '../api';
import BookCall from '../BookCall';
import { Avatar, PageIntro, ProjectCode } from '../Primitives';

/** "14:32" for today, "Mon 14:32" within the week, else a short date. */
function formatAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  const days = Math.round((now - date) / 86400000);
  if (days < 7) return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Messages() {
  const { projects } = useStore();
  const [params] = useSearchParams();
  const presetProject = Number(params.get('project')) || null;
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);    // [{ url, name, size, mime }]
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInput = useRef(null);
  const end = useRef(null);

  const pickFiles = () => fileInput.current?.click();
  const onFilesChosen = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setUploadingCount((n) => n + files.length);
    for (const file of files) {
      try {
        const result = await uploadFile(file);
        setAttachments((current) => [...current, { url: result.url, name: result.name, size: result.size, mime: result.mime }]);
      } catch (err) {
        setError(err.message || `Could not attach ${file.name}.`);
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  };
  const removeAttachment = (url) => setAttachments((current) => current.filter((item) => item.url !== url));

  // Re-sync when the seed list is replaced by the client's real projects, or the
  // selection would silently keep pointing at a mock project.
  useEffect(() => {
    if (!projects.length) return;
    const stillValid = channel && projects.some((item) => item.id === channel.id && item.name === channel.name);
    if (!stillValid) setChannel(projects.find((item) => item.id === presetProject) || projects[0]);
  }, [channel, presetProject, projects]);

  const load = useCallback(async (projectId) => {
    try {
      const { messages: rows } = await api.messages(projectId);
      setMessages(rows || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!channel) return undefined;
    setLoading(true);
    load(channel.id);
    // The team replies from the dashboard, so poll while the thread is open.
    const timer = setInterval(() => load(channel.id), 10000);
    return () => clearInterval(timer);
  }, [channel, load]);

  useEffect(() => {
    const pane = end.current?.parentElement;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, channel]);

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    // Allow send if there's text OR at least one attachment.
    if ((!body && attachments.length === 0) || !channel || sending || uploadingCount > 0) return;
    setSending(true);
    setText('');
    const sentAttachments = attachments;
    setAttachments([]);
    // Optimistic: show it immediately, reconcile from the server response.
    const optimisticId = `tmp-${Date.now()}`;
    setMessages((current) => [...current, { id: optimisticId, sender: 'client', content: body, created_at: new Date().toISOString(), attachments: sentAttachments, pending: true }]);
    try {
      const { message } = await api.sendMessage(body, channel.id, sentAttachments);
      setMessages((current) => current.map((item) => item.id === optimisticId ? message : item));
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setError(err.message || 'Message not sent.');
      setText(body);
      setAttachments(sentAttachments);
    } finally {
      setSending(false);
    }
  };

  if (!channel) {
    return <div className="v3-messages-page"><PageIntro index="Project conversations" title="Messages" copy="Decisions stay attached to the work, the people, and the project they belong to." />
      <section className="v3-empty-panel v3-enter"><Icon name="messages" size={26} /><strong>No project to talk about yet</strong><span>Once a project is open, its conversation appears here.</span></section>
    </div>;
  }

  return <div className="v3-messages-page"><PageIntro index="Project conversations" title="Messages" copy="Decisions stay attached to the work, the people, and the project they belong to." />
    <section className="v3-messenger v3-enter"><aside><header><span>Threads</span></header>{projects.map((project) => <button key={project.id} className={project.id === channel.id ? 'is-active' : ''} onClick={() => setChannel(project)}><ProjectCode project={project} /><span><strong>{project.name}</strong><small>{project.tagline || project.description || 'Project workspace'}</small></span></button>)}</aside>
      <div className="v3-conversation"><label className="v3-mobile-thread"><span>Conversation</span><select value={channel.id} onChange={(event) => setChannel(projects.find((project) => project.id === Number(event.target.value)) || projects[0])}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <header><div><ProjectCode project={channel} /><span><strong>{channel.name}</strong><small>Your Clockwrk project team</small></span></div><button onClick={() => setCallOpen(true)}><Icon name="calendar" size={16} />Book a call</button></header>
        <div className="v3-chat">
          {loading && !messages.length && <p className="v3-chat-note">Loading conversation…</p>}
          {error && <p className="v3-chat-note is-error">{error}</p>}
          {!loading && !messages.length && !error && <p className="v3-chat-note">No messages yet — say hello to your project team.</p>}
          {messages.map((message) => {
            const mine = message.sender === 'client';
            return <div key={message.id} className={`${mine ? 'is-me' : ''}${message.pending ? ' is-pending' : ''}`}>
              {!mine && <Avatar name="Clockwrk" size="sm" online />}
              <span><header><strong>{mine ? 'You' : 'Clockwrk'}</strong><small>{message.pending ? 'Sending…' : formatAt(message.created_at)}</small></header>{message.content && <p>{message.content}</p>}{(message.attachments || []).length > 0 && <ul className="v3-msg-attachments">{message.attachments.map((file) => <li key={file.id || file.url}><a href={file.url} target="_blank" rel="noreferrer"><Icon name="attach" size={13} />{file.name}</a></li>)}</ul>}</span>
            </div>;
          })}
          <i ref={end} />
        </div>
        {attachments.length > 0 && <div className="v3-composer-attach-tray">{attachments.map((file) => <span key={file.url}>{file.name}<button type="button" onClick={() => removeAttachment(file.url)} aria-label={`Remove ${file.name}`}><Icon name="close" size={12} /></button></span>)}</div>}
        <form onSubmit={send}>
          <input ref={fileInput} type="file" multiple hidden onChange={onFilesChosen} />
          <button type="button" aria-label="Attach file" onClick={pickFiles} disabled={sending}><Icon name="attach" size={18} /></button>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={uploadingCount > 0 ? `Uploading ${uploadingCount}…` : `Message ${channel.name}`} />
          <button type="submit" disabled={(!text.trim() && attachments.length === 0) || sending || uploadingCount > 0} aria-label="Send message"><Icon name="send" size={18} /></button>
        </form>
      </div></section>
    {callOpen && <BookCall projectId={channel.id} projectName={channel.name} onClose={() => setCallOpen(false)} />}
  </div>;
}
