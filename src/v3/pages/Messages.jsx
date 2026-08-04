import { useEffect, useRef, useState } from 'react';
import { messages as initialMessages, projects, team } from '../../mocks';
import Icon from '../Icon';
import { Action, Avatar, PageIntro, ProjectCode } from '../Primitives';

export default function Messages() {
  const [channel, setChannel] = useState(projects[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [callOpen, setCallOpen] = useState(false);
  const end = useRef(null);
  useEffect(() => {
    const pane = end.current?.parentElement;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, channel]);
  const send = (event) => { event.preventDefault(); if (!text.trim()) return; setMessages([...messages, { id: Date.now(), who: 'me', at: 'Just now', text: text.trim() }]); setText(''); };
  return <div className="v3-messages-page"><PageIntro index="Project conversations" title="Messages" copy="Decisions stay attached to the work, the people, and the project they belong to." />
    <section className="v3-messenger v3-enter"><aside><header><span>Threads</span><button><Icon name="plus" size={16} /></button></header>{projects.map((project) => <button key={project.id} className={project.id === channel.id ? 'is-active' : ''} onClick={() => setChannel(project)}><ProjectCode project={project} /><span><strong>{project.name}</strong><small>{project.id === 1 ? 'Checkout wireframes are ready.' : project.tagline}</small></span>{project.id === 1 && <i>2</i>}</button>)}<footer><span>{team.filter((person) => person.online).length} people online</span><div>{team.slice(0, 4).map((person) => <Avatar key={person.id} name={person.name} online={person.online} size="xs" />)}</div></footer></aside><div className="v3-conversation"><label className="v3-mobile-thread"><span>Conversation</span><select value={channel.id} onChange={(event) => setChannel(projects.find((project) => project.id === Number(event.target.value)) || projects[0])}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><header><div><ProjectCode project={channel} /><span><strong>{channel.name}</strong><small>{channel.members.length + 2} people in this project</small></span></div><button onClick={() => setCallOpen(true)}><Icon name="calendar" size={16} />Book a call</button></header><div className="v3-chat"><time>Today</time>{messages.map((message) => <div key={message.id} className={message.who === 'me' ? 'is-me' : ''}>{message.who !== 'me' && <Avatar name={message.name} size="sm" online />}<span><header><strong>{message.who === 'me' ? 'You' : message.name}</strong><small>{message.at}</small></header><p>{message.text}</p></span></div>)}<i ref={end} /></div><form onSubmit={send}><button type="button" aria-label="Attach file"><Icon name="attach" size={18} /></button><input value={text} onChange={(event) => setText(event.target.value)} placeholder={`Message ${channel.name}`} /><button type="submit" disabled={!text.trim()} aria-label="Send message"><Icon name="send" size={18} /></button></form></div></section>
    {callOpen && <div className="v3-dialog-layer" onMouseDown={() => setCallOpen(false)}><section className="v3-call-dialog" onMouseDown={(event) => event.stopPropagation()}><header><span>Book a call</span><button onClick={() => setCallOpen(false)}><Icon name="close" size={16} /></button></header><h2>Pick a time with the team.</h2><p>Calls are attached to {channel.name}, so the right people and context are included.</p><div>{['Tomorrow · 11:00', 'Tomorrow · 15:30', 'Thursday · 10:00', 'Friday · 14:00'].map((time) => <button key={time} onClick={() => setCallOpen(false)}><Icon name="calendar" size={15} />{time}<Icon name="arrow" size={14} /></button>)}</div><Action onClick={() => setCallOpen(false)}>Confirm selected time</Action></section></div>}
  </div>;
}
