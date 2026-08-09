import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { usePortalBack } from '../navigation';
import { Action, Avatar, FileMark, Meter, ProjectCode, Status } from '../Primitives';

export default function RequestDetail() {
  const navigate = useNavigate();
  const goBack = usePortalBack('/requests');
  const { requestId } = useParams();
  const { requests, projects } = useStore();
  const request = requests.find((item) => String(item.id) === String(requestId));
  const [comment, setComment] = useState('');
  const [revision, setRevision] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  if (!request) return <section className="v3-missing"><h1>Request not found</h1><Action onClick={goBack}>Go back</Action></section>;
  const project = projects.find((item) => item.id === request.projectId);
  const run = async (label, fn) => {
    setBusy(label);
    setError('');
    try { await fn(); } catch (err) { setError(err.message || 'Something went wrong.'); } finally { setBusy(''); }
  };
  const addComment = (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (!text) return;
    run('comment', async () => { await store.addComment(request.id, text); setComment(''); });
  };
  return <div className="v3-record-page"><header className="v3-record-head"><button onClick={goBack} aria-label="Back to previous page"><Icon name="back" /></button><div><span><ProjectCode project={project} />{request.isChild ? <button className="v3-parent-link" onClick={() => navigate(`/requests/${request.parentRequestId}`)}>{request.parentTitle} / Part {request.partNumber} of {request.partCount}</button> : `${project?.name} / ${request.isParent ? 'Request group' : request.type}`}</span><h1>{request.title}</h1><p>{request.brief}</p></div><Status status={request.status}>{request.isParent ? request.scopeStatus === 'proposed' ? 'Approval needed' : request.scopeStatus === 'reviewing' ? 'Being scoped' : 'Request group' : undefined}</Status></header>
    <section className="v3-record-facts"><span><small>Priority</small><strong>{request.priority || 'Normal'}</strong></span><span><small>Started</small><strong>{request.startedAt || 'Not started'}</strong></span><span><small>{request.deliveredAt ? 'Delivered' : 'Expected'}</small><strong>{request.deliveredAt || request.due || 'Not scheduled'}</strong></span><span><small>Revisions</small><strong>{request.revisionsUsed || 0} used</strong></span>{request.progress !== undefined && <Meter value={request.progress} />}</section>
    {request.isParent && <section className={`v3-breakdown-panel is-${request.scopeStatus}`}>
      <header><div><span>{request.scopeStatus === 'proposed' ? 'Your approval' : 'Oversized request'}</span><h2>{request.scopeStatus === 'reviewing' ? 'The team is preparing the production plan.' : request.scopeStatus === 'proposed' ? 'One outcome, split into clear parts.' : 'The linked production plan.'}</h2><p>{request.scopeStatus === 'reviewing' ? 'This group does not consume a production slot while the team confirms the cleanest scope and sequence.' : request.scopeStatus === 'proposed' ? 'Approve once to create every linked request in the correct order. You can discuss changes below before deciding.' : 'Each part moves through the normal queue independently while staying connected to this group.'}</p></div>{request.scopeStatus === 'proposed' && <Action icon="check" disabled={!!busy} onClick={() => run('breakdown', () => store.approveBreakdown(request.id))}>{busy === 'breakdown' ? 'Creating requests…' : `Approve ${request.breakdown.length} parts`}</Action>}</header>
      {error && <p className="v3-inline-error">{error}</p>}
      <ol>{(request.scopeStatus === 'approved' ? request.children : request.breakdown).map((part, index) => <li key={part.id || index}><em>{String(part.partNumber || part.position || index + 1).padStart(2, '0')}</em><span><strong>{part.title}</strong><small>{part.description || (part.dependsOnPosition ? `Starts after part ${part.dependsOnPosition}` : index ? 'Queued after the previous part' : 'First production part')}</small></span>{part.status ? <Status status={part.status} /> : <span className={`v3-priority is-${part.priority || 'normal'}`}><i />{part.priority || 'Normal'}</span>}{part.childRequestId || (request.scopeStatus === 'approved' && part.id) ? <button onClick={() => navigate(`/requests/${part.childRequestId || part.id}`)} aria-label={`Open ${part.title}`}><Icon name="arrow" size={15} /></button> : null}</li>)}</ol>
    </section>}
    {request.status === 'review' && <section className="v3-decision-bar"><div><span>Decision needed</span><h2>The team is waiting for your review.</h2><p>Approve to close this request and start the next item, or send it back with exact notes.</p>{error && <p className="v3-inline-error">{error}</p>}</div><Action icon="check" disabled={!!busy} onClick={() => run('approve', () => store.approve(request.id))}>{busy === 'approve' ? 'Approving…' : 'Approve & start next'}</Action><button disabled={!!busy} onClick={() => setRevision(!revision)}>Request changes</button>{revision && <form onSubmit={(event) => { event.preventDefault(); const note = comment.trim(); if (!note) return; run('revision', async () => { await store.requestRevision(request.id, note); setComment(''); setRevision(false); }); }}><textarea autoFocus value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should change? Reference screens, sections, or behavior." /><button type="submit" disabled={!comment.trim() || !!busy}>{busy === 'revision' ? 'Sending…' : <>Send revision notes <Icon name="send" size={15} /></>}</button></form>}</section>}
    {(request.attachments || []).length > 0 && <section className="v3-record-section"><header><span>Attached by you</span><strong>{request.attachments.length}</strong></header><div className="v3-record-files">{request.attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" download><FileMark kind={(file.mime || '').startsWith('image/') ? 'png' : 'file'} /><span><strong>{file.name}</strong><small>Attached {file.at || 'just now'}</small></span><Icon name="download" /></a>)}</div></section>}
    <div className="v3-record-layout"><main><section className="v3-record-section"><header><span>Delivery files</span><strong>{request.deliverables.length}</strong></header>{request.deliverables.length ? <div className="v3-record-files">{request.deliverables.map((file) => <a key={file.id} href={file.url || undefined} target="_blank" rel="noreferrer" download className={file.url ? '' : 'is-unavailable'}><FileMark kind={file.kind} /><span><strong>{file.name}</strong><small>{file.size ? `${file.size} · ` : ''}delivered {file.at} · version {file.version}</small></span><em>{file.current ? 'Latest version' : 'Previous version'}</em><Icon name="download" /></a>)}</div> : <p className="v3-empty-line">Files appear here as soon as the team delivers a version.</p>}</section>
      <section className="v3-record-section"><header><span>Conversation</span><strong>{request.comments.length}</strong></header><div className="v3-record-comments">{request.comments.map((item, index) => <div key={`${item.at}-${index}`} className={item.who === 'You' ? 'is-you' : ''}><Avatar name={item.who} size="sm" /><span><header><strong>{item.who}</strong><time>{item.at}</time></header><p>{item.text}</p></span></div>)}</div><form onSubmit={addComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write to the project team" /><button disabled={!comment.trim() || !!busy} aria-label="Send comment"><Icon name="send" /></button></form></section></main>
      <aside><section><span>Timeline</span>{(request.timeline.length ? request.timeline : [{ label: 'Queued', at: `Position ${request.queuePos || 1}`, now: true }]).map((item, index) => <div key={`${item.label}-${index}`} className={item.now ? 'is-now' : item.done ? 'is-done' : ''}><i /><span><strong>{item.label}</strong><small>{item.at}</small></span></div>)}</section><section><span>Latest work note</span>{request.changelog?.length ? request.changelog.slice(0, 2).map((item) => <p key={item.at}><strong>{item.who}</strong>{item.text}<time>{item.at}</time></p>) : <p>No production notes yet.</p>}</section></aside></div>
  </div>;
}
