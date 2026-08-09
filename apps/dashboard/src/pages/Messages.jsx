import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Bell, FileText, Folder, MessageCircle, Search } from 'lucide-react';
import DashLayout from '../components/DashLayout';
import { toast } from '../components/Toast';
import { apiGet, apiPost } from '../utils/dashboardApi';
import './Messages.css';

const API = '/api/communications/messages';

const fmtTime = value => value ? new Date(value).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : '';

const initials = value => String(value || 'Client')
  .split(/\s+/)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

export default function Messages() {
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadChannels = () => {
    setLoadingChannels(true);
    apiGet(API)
      .then(data => setChannels(data.channels || []))
      .catch(error => toast.error(error.message || 'Could not load conversations'))
      .finally(() => setLoadingChannels(false));
  };

  useEffect(loadChannels, []);

  const visibleChannels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return channels;
    return channels.filter(channel => [channel.client_name, channel.client_company, channel.client_email, channel.title, channel.latest_content]
      .join(' ')
      .toLowerCase()
      .includes(query));
  }, [channels, search]);

  useEffect(() => {
    if (!selectedChannelId && channels.length) setSelectedChannelId(channels[0].id);
    if (selectedChannelId && !channels.some(channel => channel.id === selectedChannelId)) {
      setSelectedChannelId(channels[0]?.id || null);
    }
  }, [channels, selectedChannelId]);

  const selectedChannel = channels.find(channel => channel.id === selectedChannelId);

  useEffect(() => {
    if (!selectedChannel) {
      setMessages([]);
      return undefined;
    }
    let active = true;
    const loadMessages = async (quiet = false) => {
      if (!quiet) setLoadingMessages(true);
      try {
        const data = await apiGet(API, {
          client_id: selectedChannel.client_id,
          project_id: selectedChannel.project_id || undefined,
        });
        if (active) {
          setMessages(data.messages || []);
          if (data.channels?.length) setChannels(data.channels);
        }
      } catch (error) {
        if (active && !quiet) toast.error(error.message || 'Could not load this conversation');
      } finally {
        if (active && !quiet) setLoadingMessages(false);
      }
    };
    loadMessages();
    const timer = window.setInterval(() => loadMessages(true), 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedChannel?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedChannelId, messages.length]);

  const send = async event => {
    event.preventDefault();
    if (!selectedChannel || !draft.trim() || sending) return;
    setSending(true);
    try {
      const data = await apiPost(API, {
        client_id: selectedChannel.client_id,
        project_id: selectedChannel.project_id,
        content: draft.trim(),
      });
      setMessages(current => [...current, data.message]);
      setDraft('');
      setChannels(current => current.map(channel => channel.id === selectedChannel.id
        ? { ...channel, latest_content: data.message.content, latest_sender: 'team', latest_at: data.message.created_at }
        : channel));
    } catch (error) {
      toast.error(error.message || 'Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashLayout>
      <div className="messages-page">
        <header className="messages-heading">
          <div>
            <span className="page-eyebrow">Client communications</span>
            <h1>Messages</h1>
            <p>Account support and every project conversation, kept in their own channels.</p>
          </div>
          <span className="messages-total">{channels.length} channels</span>
        </header>

        <section className="messages-workspace">
          <aside className="messages-inbox" aria-label="Client conversations">
            <label className="messages-search">
              <Search size={17} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a client or project" />
            </label>
            <div className="messages-thread-list">
              {loadingChannels && <div className="messages-state">Loading channels...</div>}
              {!loadingChannels && !visibleChannels.length && <div className="messages-state">No channels found.</div>}
              {visibleChannels.map(channel => (
                <button
                  type="button"
                  key={channel.id}
                  className={`messages-thread ${channel.id === selectedChannelId ? 'is-active' : ''}`}
                  onClick={() => setSelectedChannelId(channel.id)}
                >
                  <span className={`messages-channel-icon is-${channel.type}`}>
                    {channel.type === 'team' ? <Bell size={16} /> : <Folder size={16} />}
                  </span>
                  <span className="messages-thread-copy">
                    <span><strong>{channel.title}</strong><time>{fmtTime(channel.latest_at)}</time></span>
                    <b>{channel.client_company || channel.client_name}</b>
                    <small>{channel.latest_sender === 'client' ? 'Client: ' : channel.latest_sender === 'team' ? 'Team: ' : ''}{channel.latest_content}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <article className="messages-conversation">
            {selectedChannel ? (
              <>
                <header className="messages-conversation-head">
                  <span className="messages-avatar is-large">{initials(selectedChannel.client_company || selectedChannel.client_name)}</span>
                  <span>
                    <strong>{selectedChannel.title}</strong>
                    <small>{selectedChannel.client_company || selectedChannel.client_name} · {selectedChannel.type === 'team' ? 'Account channel' : 'Project channel'}</small>
                  </span>
                </header>
                <div className="messages-stream">
                  {loadingMessages && !messages.length && <div className="messages-state">Loading conversation...</div>}
                  {!loadingMessages && !messages.length && <div className="messages-state">No messages in this channel yet.</div>}
                  {messages.map(message => {
                    const system = message.sender === 'system';
                    return (
                      <div className={`message-row ${message.sender === 'team' ? 'is-team' : message.sender === 'client' ? 'is-client' : 'is-system'}`} key={message.id}>
                        <div className="message-bubble">
                          <span className="message-byline">
                            <strong>{system ? message.event_title || 'Account update' : message.sender === 'team' ? 'Clockwrk team' : selectedChannel.client_name}</strong>
                            {message.project_name && <em>{message.project_name}</em>}
                          </span>
                          {message.content && <p>{message.content}</p>}
                          {message.attachments?.length > 0 && (
                            <div className="message-files">
                              {message.attachments.map(file => (
                                <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>
                                  <FileText size={15} /> {file.name}
                                </a>
                              ))}
                            </div>
                          )}
                          <time>{fmtTime(message.created_at)}</time>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <form className="messages-composer" onSubmit={send}>
                  <textarea
                    rows="2"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    placeholder={`Reply in ${selectedChannel.title}`}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
                    <ArrowUp size={18} />
                  </button>
                </form>
              </>
            ) : (
              <div className="messages-empty">
                <MessageCircle size={28} />
                <strong>No conversation selected</strong>
                <span>Account and project channels will appear here.</span>
              </div>
            )}
          </article>
        </section>
      </div>
    </DashLayout>
  );
}
