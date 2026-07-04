import { useState } from 'react';
import Sheet from './Sheet';
import FileViewer, { FileTag, FileThumb } from './FileViewer';
import { Icon, StatusPill, Confetti, Avatar, CatChip } from './ui';
import { projects } from '../mocks';
import { store, useStore } from '../store';

/* Rich revision composer: notes + file drop + voice note + meeting */
function RevisionComposer({ request, onClose }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [over, setOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);
  const [meetOpen, setMeetOpen] = useState(false);
  const [meeting, setMeeting] = useState(null);

  const SLOTS = ['Tomorrow 11:00', 'Tomorrow 15:30', 'Mon 10:00', 'Mon 14:00'];
  const canSend = text.trim() || files.length || voiceNote;

  const drop = (e) => {
    e.preventDefault(); setOver(false);
    const dropped = [...(e.dataTransfer?.files || [])].map((f) => f.name);
    setFiles((prev) => [...prev, ...(dropped.length ? dropped : ['reference-01.png'])]);
  };

  return (
    <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea className="input" style={{ minHeight: 110 }} autoFocus
        placeholder="What should we change? Reference specific screens or sections — be as picky as you like."
        value={text} onChange={(e) => setText(e.target.value)} />

      <div className={`dropzone ${over ? 'is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        onClick={() => setFiles((prev) => [...prev, `annotated-${prev.length + 1}.png`])}>
        Drop screenshots or annotated files here — or click to attach
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {files.map((f, i) => (
            <span key={i} className="pill pill-soft anim-pop" style={{ textTransform: 'none', fontSize: 11.5, padding: '6px 12px', letterSpacing: 0 }}>
              {f}
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ border: 0, background: 'none', color: 'var(--muted)', marginLeft: 4, fontSize: 13 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {!voiceNote && !recording && (
          <button className="btn btn-ghost btn-sm" onClick={() => setRecording(true)}>
            <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.mic /></span> Record voice note
          </button>
        )}
        {recording && (
          <span className="anim-pop" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, border: '1.5px solid var(--danger)', fontSize: 12.5, fontWeight: 600 }}>
            <span className="rec-dot" /> Recording…
            <span className="wave">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</span>
            <button style={{ border: 0, background: 'var(--ink)', color: 'var(--bg)', borderRadius: 99, padding: '4px 12px', fontSize: 11.5, fontWeight: 700 }}
              onClick={() => { setRecording(false); setVoiceNote('0:12'); }}>Stop</button>
          </span>
        )}
        {voiceNote && (
          <span className="anim-pop" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'var(--soft)', fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.mic /></span> Voice note · {voiceNote}
            <button onClick={() => setVoiceNote(null)} style={{ border: 0, background: 'none', color: 'var(--muted)', fontSize: 14 }}>×</button>
          </span>
        )}
        {!meeting && (
          <button className="btn btn-ghost btn-sm" onClick={() => setMeetOpen(!meetOpen)}>
            <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.cal /></span> Talk it through instead
          </button>
        )}
        {meeting && (
          <span className="anim-pop" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'var(--lime-soft)', border: '1px solid var(--lime)', fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.video /></span> Call booked · {meeting}
            <button onClick={() => setMeeting(null)} style={{ border: 0, background: 'none', color: 'var(--muted)', fontSize: 14 }}>×</button>
          </span>
        )}
      </div>
      {meetOpen && !meeting && (
        <div className="anim-rise" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SLOTS.map((s) => (
            <button key={s} className="btn btn-ghost btn-sm" onClick={() => { setMeeting(s); setMeetOpen(false); }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary btn-sm" disabled={!canSend} style={{ opacity: canSend ? 1 : 0.4 }}
          onClick={() => {
            const parts = [text.trim(), files.length && `${files.length} file(s) attached`, voiceNote && `voice note (${voiceNote})`, meeting && `call booked for ${meeting}`].filter(Boolean);
            store.requestRevision(request.id, parts.join(' · '));
            onClose();
          }}>
          Send revision request
        </button>
      </div>
    </div>
  );
}

function Rating({ request }) {
  const [stars, setStars] = useState(request.rating?.stars || 0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState(request.rating?.feedback || '');
  const [publish, setPublish] = useState(request.rating?.published ?? true);
  const [saved, setSaved] = useState(!!request.rating);

  return (
    <div style={{ padding: 20, borderRadius: 16, background: 'var(--soft)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong style={{ fontSize: 15 }}>How did we do?</strong>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Rate this delivery — great reviews can feature on clockwrk.io.</div>
        </div>
        <span className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={`star-btn ${(hover || stars) >= n ? 'is-on' : ''}`}
              onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
              onClick={() => { setStars(n); setSaved(false); }}>★</button>
          ))}
        </span>
      </div>
      {stars > 0 && !saved && (
        <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea className="input" style={{ minHeight: 80 }} placeholder="A line or two about this delivery (optional)…"
            value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} style={{ accentColor: 'var(--lime)' }} />
            Allow clockwrk to publish this as a testimonial on the main site
          </label>
          <button className="btn btn-lime btn-sm" style={{ alignSelf: 'flex-start' }}
            onClick={() => { store.rate(request.id, stars, feedback, publish); setSaved(true); }}>Submit rating</button>
        </div>
      )}
      {saved && stars > 0 && (
        <span className="anim-pop" style={{ fontSize: 13, fontWeight: 600 }}>
          {'★'.repeat(stars)} — thank you! {publish ? 'Cleared for the wall of love on clockwrk.io.' : 'Kept private, just for the team.'}
        </span>
      )}
    </div>
  );
}

function FileRow({ file, dim, onView }) {
  return (
    <div className="req-row" style={{ opacity: dim ? 0.65 : 1 }} onClick={() => onView(file)}>
      <FileThumb kind={file.kind} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</strong>
          <FileTag kind={file.kind} />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{file.at}{file.size && file.size !== '—' ? ` · ${file.size}` : ''}</span>
      </div>
      <span className={`pill ${file.current ? 'pill-lime' : 'pill-soft'}`}>v{file.version}{file.current ? ' · latest' : ''}</span>
      <button className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>
        <span style={{ width: 14, height: 14, display: 'grid' }}><Icon.download /></span>
      </button>
    </div>
  );
}

export default function RequestSheet({ requestId, onClose }) {
  const { requests } = useStore();
  const r = requests.find((x) => x.id === requestId);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [justApproved, setJustApproved] = useState(false);
  const [promoted, setPromoted] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showOld, setShowOld] = useState(false);

  if (!r) return null;
  const project = projects.find((p) => p.id === r.projectId);
  const currentFiles = r.deliverables.filter((d) => d.current);
  const oldFiles = r.deliverables.filter((d) => !d.current);
  const crew = project ? [{ ...project.pm, lead: 'PM' }, { ...project.am, lead: 'AM' }, ...project.members] : [];

  const approve = () => {
    store.approve(r.id);
    setPromoted(store.get().promoted);
    setJustApproved(true);
  };

  const header = (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', paddingRight: 50 }}>
      <CatChip category={r.category} size={48} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          <StatusPill status={justApproved ? 'done' : r.status} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {r.category} · {r.type} {project && <>· in <strong style={{ color: 'var(--ink)' }}>{project.name}</strong></>}
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(18px, 2.2vw, 23px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{r.title}</h2>
      </div>
      {r.status === 'active' && (
        <div style={{ minWidth: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
            <span>Progress</span><strong style={{ color: 'var(--ink)' }}>{r.progress}%</strong>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: 'var(--soft)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r.progress}%`, background: 'var(--lime)', borderRadius: 99, transition: 'width 0.8s var(--ease-out)' }} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Sheet onClose={onClose} header={header}>
        {/* brief + facts */}
        <div className="sheet-section" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 18 }} data-sheet-cols>
          <div>
            <span className="kicker">Brief</span>
            <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 8, color: 'var(--ink-dim)' }}>{r.brief}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignContent: 'start' }}>
            {[r.startedAt && ['Started', r.startedAt], r.due && ['Delivery', r.due],
              r.deliveredAt && ['Delivered', r.deliveredAt], r.approvedAt && ['Approved', r.approvedAt],
              r.status === 'queued' && ['Queue position', `#${r.queuePos}`],
              ['Revisions', `${r.revisionsUsed || 0} of ∞`]]
              .filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ padding: '11px 14px', borderRadius: 11, background: 'var(--soft)' }}>
                  <span className="kicker" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{k}</span>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap' }}>{String(v)}</div>
                </div>
              ))}
          </div>
        </div>

        {/* review actions */}
        {r.status === 'review' && !justApproved && (
          <div className="sheet-section">
            <div style={{ padding: 18, borderRadius: 16, border: '1.5px solid var(--lime)', background: 'var(--lime-soft)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong style={{ fontSize: 15 }}>This delivery is waiting on you</strong>
                <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 3 }}>Approve to close it out — the next queued request starts immediately. Or send it back with notes.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-lime" onClick={approve}>
                  <span style={{ width: 15, height: 15, display: 'grid' }}><Icon.check /></span> Approve & start next
                </button>
                <button className="btn btn-ghost" onClick={() => setRevisionOpen(!revisionOpen)}>Request changes</button>
              </div>
              {revisionOpen && <RevisionComposer request={r} onClose={onClose} />}
            </div>
          </div>
        )}
        {justApproved && (
          <div className="sheet-section">
            <div className="anim-pop" style={{ position: 'relative', padding: 20, borderRadius: 16, background: 'var(--ink)', color: 'var(--bg)', textAlign: 'center' }}>
              <Confetti trigger />
              <strong style={{ fontSize: 15.5 }}>Approved — nice one!</strong>
              <p style={{ fontSize: 12.5, opacity: 0.75, marginTop: 5 }}>
                {promoted ? `"${promoted}" just moved into the freed slot — work starts now.` : 'Deliverables are saved to your library.'}
              </p>
            </div>
          </div>
        )}
        {(r.status === 'done' || justApproved) && <div className="sheet-section"><Rating request={r} /></div>}

        {/* live preview */}
        {r.preview && (
          <div className="sheet-section">
            <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>Live preview</span>
            <div className="preview-frame">
              <div className="preview-bar">
                <span className="dot" style={{ background: '#ff5f57' }} />
                <span className="dot" style={{ background: '#febc2e' }} />
                <span className="dot" style={{ background: '#28c840' }} />
                <span className="preview-url">🔒 {r.preview.url}</span>
                <a className="btn btn-ghost btn-sm" href={r.preview.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Open ↗</a>
              </div>
              <iframe title="preview" src={r.preview.url} style={{ width: '100%', height: 300, border: 0, display: 'block', background: '#fff' }} />
            </div>
          </div>
        )}

        {/* files */}
        {r.deliverables.length > 0 && (
          <div className="sheet-section">
            <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>
              Delivered files · click to view in portal
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {currentFiles.map((d) => <FileRow key={d.id} file={d} onView={setViewing} />)}
              {oldFiles.length > 0 && !showOld && (
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowOld(true)}>
                  Show {oldFiles.length} previous version{oldFiles.length > 1 ? 's' : ''}
                </button>
              )}
              {showOld && oldFiles.map((d) => <FileRow key={d.id} file={d} dim onView={setViewing} />)}
            </div>
          </div>
        )}

        {/* team — individual members, quiet and even */}
        {crew.length > 0 && (
          <div className="sheet-section">
            <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>Working on this · {crew.length}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {crew.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14 }}>
                  <Avatar name={m.name} size={36} online={m.online} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{m.role}</div>
                  </div>
                  {m.lead && <span className="role-pill">{m.lead}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* timeline — every delivery and every revision */}
        <div className="sheet-section">
          <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>
            Timeline · {r.timeline.filter((t) => t.kind === 'delivery').length} deliveries · {r.timeline.filter((t) => t.kind === 'revision').length} revisions
          </span>
          <div className="tl" style={{ maxWidth: 560 }}>
            {(r.timeline.length ? r.timeline : [{ label: `Queued — position ${r.queuePos}`, at: 'Moves into a slot automatically', now: true }]).map((t, i) => (
              <div key={i} className={`tl-item ${t.done ? 'is-done' : ''} ${t.now ? 'is-now' : ''} ${t.kind === 'delivery' ? 'is-delivery' : ''} ${t.kind === 'revision' ? 'is-revision' : ''}`}>
                <span className="tl-dot" />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {t.label}
                    {t.kind && <span className={`tl-tag ${t.kind}`}>{t.kind}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{t.at}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* changes */}
        {r.changelog.length > 0 && (
          <div className="sheet-section">
            <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>Updates from the team</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {r.changelog.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 14, border: '1px solid var(--line)' }}>
                  <Avatar name={c.who} size={30} />
                  <div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 3 }}><strong style={{ color: 'var(--ink)' }}>{c.who}</strong> · {c.at}</div>
                    <p style={{ fontSize: 13, lineHeight: 1.55 }}>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* comments */}
        <div className="sheet-section">
          <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>Comments</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 }}>
            {r.comments.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Anything you write here lands straight with the team.</p>}
            {r.comments.map((c, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: c.who === 'You' ? 'flex-end' : 'flex-start' }}>
                <div className={`chat-bubble ${c.who === 'You' ? 'is-me' : 'is-them'}`} style={{ maxWidth: '88%' }}>{c.text}</div>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, padding: '0 6px' }}>{c.who} · {c.at}</span>
              </div>
            ))}
            <form style={{ display: 'flex', gap: 8, marginTop: 4 }} onSubmit={(e) => { e.preventDefault(); store.addComment(r.id, comment); setComment(''); }}>
              <input className="input" placeholder="Write to the team…" style={{ height: 44 }} value={comment} onChange={(e) => setComment(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={!comment.trim()} style={{ opacity: comment.trim() ? 1 : 0.4 }}>Send</button>
            </form>
          </div>
        </div>

        <style>{`@media (max-width: 760px) { [data-sheet-cols] { grid-template-columns: 1fr !important; } }`}</style>
      </Sheet>

      {viewing && <FileViewer file={{ ...viewing, request: r.title }} onClose={() => setViewing(null)} />}
    </>
  );
}
