import { useState, useRef, useEffect } from 'react';
import { messages as seed, team } from '../mocks';
import { Avatar } from '../components/ui';

export default function Messages() {
  const [msgs, setMsgs] = useState(seed);
  const [text, setText] = useState('');
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMsgs([...msgs, { id: Date.now(), who: 'me', at: 'Just now', text: text.trim() }]);
    setText('');
  };

  return (
    <>
      <header className="page-head anim-rise">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-sub">One thread, your whole team. We usually reply within a few hours.</p>
        </div>
        <div style={{ display: 'flex' }}>
          {team.map((t, i) => (
            <span key={t.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={t.name} size={30} online={t.online} /></span>
          ))}
        </div>
      </header>

      <section className="pcard anim-rise" style={{ animationDelay: '0.08s', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)', minHeight: 420 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
              <div className={`chat-bubble ${m.who === 'me' ? 'is-me' : 'is-them'}`}>{m.text}</div>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, padding: '0 6px' }}>
                {m.who === 'me' ? 'You' : m.name} · {m.at}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid var(--line)' }}>
          <input className="input" placeholder="Write a message…" value={text} onChange={(e) => setText(e.target.value)} style={{ height: 44 }} />
          <button type="submit" className="btn btn-primary" disabled={!text.trim()} style={{ opacity: text.trim() ? 1 : 0.4 }}>Send</button>
        </form>
      </section>
    </>
  );
}
