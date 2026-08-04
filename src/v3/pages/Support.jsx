import { useState } from 'react';
import { tickets as seed } from '../../mocks';
import Icon from '../Icon';
import { Action, PageIntro, Status } from '../Primitives';

export default function Support() {
  const [tickets, setTickets] = useState(seed);
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const submit = (event) => { event.preventDefault(); if (!subject.trim() || !message.trim()) return; setTickets([{ id: `CW-${Date.now().toString().slice(-4)}`, subject, status: 'open', updatedAt: 'Just now' }, ...tickets]); setSubject(''); setMessage(''); setCompose(false); };
  return <div className="v3-support-page"><PageIntro index="Client support" title="Help" copy="Get an answer, book time, or open a support thread without losing project context." action={<Action icon="plus" onClick={() => setCompose(true)}>Open a ticket</Action>} />
    <section className="v3-help-route v3-enter"><button onClick={() => setCompose(true)}><Icon name="messages" /><span><strong>Ask the team</strong><small>Typical response in under two hours</small></span><Icon name="arrow" /></button><button><Icon name="calendar" /><span><strong>Book working time</strong><small>Plan, review, or troubleshoot live</small></span><Icon name="arrow" /></button><button><Icon name="help" /><span><strong>Portal guide</strong><small>Requests, approvals, billing, and access</small></span><Icon name="arrow" /></button></section>
    <section className="v3-ticket-table v3-enter"><header><div><span>Your support threads</span><h2>Open and recent tickets</h2></div><strong>{tickets.length}</strong></header>{tickets.map((ticket) => <button key={ticket.id}><span>{ticket.id}</span><strong>{ticket.subject}</strong><Status status={ticket.status} /><time>{ticket.updatedAt}</time><Icon name="arrow" size={15} /></button>)}</section>
    <section className="v3-answers v3-enter"><header><span>Quick answers</span><h2>The things clients ask most.</h2></header>{[['What happens when I approve a delivery?', 'The next queued request moves into the open production slot automatically.'], ['Can I send unlimited requests?', 'Yes. Your plan limits simultaneous production, not the number of briefs in your queue.'], ['Where are source files stored?', 'Every delivered version stays in Deliverables and remains linked to its request and project.'], ['How do retainers work after launch?', 'Your build can move into ongoing care for monitoring, updates, and small improvements.']].map(([question, answer]) => <details key={question}><summary>{question}<Icon name="plus" size={15} /></summary><p>{answer}</p></details>)}</section>
    {compose && <div className="v3-dialog-layer" onMouseDown={() => setCompose(false)}><form className="v3-ticket-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><span>New support ticket</span><button type="button" onClick={() => setCompose(false)}><Icon name="close" /></button></header><h2>What do you need help with?</h2><label><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label><span>Details</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label><Action type="submit" icon="send">Send to support</Action></form></div>}
  </div>;
}
