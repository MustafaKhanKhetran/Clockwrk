import { useEffect, useRef, useState } from 'react';
import { messages as seed, projects, team } from '../mocks';
import { Avatar, Icon, SiteCta } from '../components/ui';
import ScheduleCall from '../components/ScheduleCall';

const channels = projects.map((project, index) => ({
  id: project.id,
  name: project.name,
  preview: index === 0 ? 'Checkout wireframes are ready...' : index === 1 ? 'Brand package approved.' : 'Campaign stream is paused.',
  at: index === 0 ? '09:15' : index === 1 ? 'Yesterday' : 'Jun 18',
  unread: index === 0 ? 2 : 0,
}));

export default function Messages() {
  const [messages, setMessages] = useState(seed);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState(channels[0]);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, channel]);

  const send = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setMessages([...messages, { id: Date.now(), who: 'me', at: 'Just now', text: text.trim() }]);
    setText('');
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div><span className="kicker">Communication</span><h1 className="page-title">Messages</h1><p className="page-sub">Project conversations, decisions, and team updates.</p></div>
        <div className="message-team-stack">{team.map((member, index) => <span key={member.id} style={{ zIndex: team.length - index }}><Avatar name={member.name} size={31} online={member.online} /></span>)}</div>
      </header>

      <section className="message-console anim-rise">
        <aside className="message-channels">
          <div className="message-channels-head"><span>Project threads</span><button aria-label="New message"><Icon.plus /></button></div>
          <label className="message-search"><Icon.eye /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" /></label>
          <div className="message-channel-list">
            {channels.filter((item) => `${item.name} ${item.preview}`.toLowerCase().includes(query.toLowerCase())).map((item) => (
              <button key={item.id} className={channel.id === item.id ? 'is-active' : ''} onClick={() => setChannel(item)}>
                <span>{item.name.slice(0, 2).toUpperCase()}</span>
                <div><strong>{item.name}</strong><small>{item.preview}</small></div>
                <i>{item.unread || item.at}</i>
              </button>
            ))}
            {query && !channels.some((item) => `${item.name} ${item.preview}`.toLowerCase().includes(query.toLowerCase())) && <p className="message-empty">No matching project threads.</p>}
          </div>
          <div className="message-response-note"><i /><span><strong>Team online</strong><small>Typical reply within 2 hours</small></span></div>
        </aside>

        <div className="message-conversation">
          <header>
            <div><span>{channel.name.slice(0, 2).toUpperCase()}</span><div><strong>{channel.name}</strong><small>{team.length} team members · project thread</small></div></div>
            <div className="message-header-actions">
              <ScheduleCall label="Book a call" />
              <button aria-label="Conversation details"><Icon.layers /></button>
            </div>
          </header>
          <div className="message-day"><span>Today</span></div>
          <div className="message-thread">
            {messages.map((message, index) => (
              <div key={message.id} className={`message-row ${message.who === 'me' ? 'is-me' : ''}`} style={{ '--message-delay': `${index * 45}ms` }}>
                {message.who !== 'me' && <Avatar name={message.name} size={32} online />}
                <div>
                  <span><strong>{message.who === 'me' ? 'You' : message.name}</strong><small>{message.at}</small></span>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form className="message-compose" onSubmit={send}>
            <div className="message-compose-tools">
              <button type="button" aria-label="Attach file"><Icon.clip /></button>
              <button type="button" aria-label="Record voice note"><Icon.mic /></button>
            </div>
            <input placeholder={`Message ${channel.name} team`} value={text} onChange={(event) => setText(event.target.value)} />
            <SiteCta type="submit" className="site-cta-compact" disabled={!text.trim()}>Send</SiteCta>
          </form>
        </div>
      </section>
    </>
  );
}
