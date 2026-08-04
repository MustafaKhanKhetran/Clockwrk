import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projects } from '../../mocks';
import { store, useStore } from '../../store';
import Icon from '../Icon';
import { Action, Avatar, FileMark, Meter, ProjectCode, Status } from '../Primitives';

export default function RequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { requests } = useStore();
  const request = requests.find((item) => String(item.id) === String(requestId));
  const [comment, setComment] = useState('');
  const [revision, setRevision] = useState(false);
  if (!request) return <section className="v3-missing"><h1>Request not found</h1><Action onClick={() => navigate('/requests')}>Back to requests</Action></section>;
  const project = projects.find((item) => item.id === request.projectId);
  const addComment = (event) => { event.preventDefault(); if (!comment.trim()) return; store.addComment(request.id, comment); setComment(''); };
  return <div className="v3-record-page"><header className="v3-record-head"><button onClick={() => navigate('/requests')}><Icon name="back" /></button><div><span><ProjectCode project={project} />{project?.name} / {request.type}</span><h1>{request.title}</h1><p>{request.brief}</p></div><Status status={request.status} /></header>
    <section className="v3-record-facts"><span><small>Priority</small><strong>{request.priority || 'Normal'}</strong></span><span><small>Started</small><strong>{request.startedAt || 'Not started'}</strong></span><span><small>{request.deliveredAt ? 'Delivered' : 'Expected'}</small><strong>{request.deliveredAt || request.due || 'Not scheduled'}</strong></span><span><small>Revisions</small><strong>{request.revisionsUsed || 0} used</strong></span>{request.progress !== undefined && <Meter value={request.progress} />}</section>
    {request.status === 'review' && <section className="v3-decision-bar"><div><span>Decision needed</span><h2>The team is waiting for your review.</h2><p>Approve to close this request and start the next item, or send it back with exact notes.</p></div><Action icon="check" onClick={() => store.approve(request.id)}>Approve & start next</Action><button onClick={() => setRevision(!revision)}>Request changes</button>{revision && <form onSubmit={(event) => { event.preventDefault(); store.requestRevision(request.id, comment); setComment(''); setRevision(false); }}><textarea autoFocus value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should change? Reference screens, sections, or behavior." /><button type="submit" disabled={!comment.trim()}>Send revision notes <Icon name="send" size={15} /></button></form>}</section>}
    <div className="v3-record-layout"><main><section className="v3-record-section"><header><span>Delivery files</span><strong>{request.deliverables.length}</strong></header>{request.deliverables.length ? <div className="v3-record-files">{request.deliverables.map((file) => <button key={file.id}><FileMark kind={file.kind} /><span><strong>{file.name}</strong><small>{file.size} · delivered {file.at} · version {file.version}</small></span><em>{file.current ? 'Latest version' : 'Previous version'}</em><Icon name="download" /></button>)}</div> : <p className="v3-empty-line">Files appear here as soon as the team delivers a version.</p>}</section>
      <section className="v3-record-section"><header><span>Conversation</span><strong>{request.comments.length}</strong></header><div className="v3-record-comments">{request.comments.map((item, index) => <div key={`${item.at}-${index}`} className={item.who === 'You' ? 'is-you' : ''}><Avatar name={item.who} size="sm" /><span><header><strong>{item.who}</strong><time>{item.at}</time></header><p>{item.text}</p></span></div>)}</div><form onSubmit={addComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write to the project team" /><button disabled={!comment.trim()} aria-label="Send comment"><Icon name="send" /></button></form></section></main>
      <aside><section><span>Timeline</span>{(request.timeline.length ? request.timeline : [{ label: 'Queued', at: `Position ${request.queuePos || 1}`, now: true }]).map((item, index) => <div key={`${item.label}-${index}`} className={item.now ? 'is-now' : item.done ? 'is-done' : ''}><i /><span><strong>{item.label}</strong><small>{item.at}</small></span></div>)}</section><section><span>Latest work note</span>{request.changelog?.length ? request.changelog.slice(0, 2).map((item) => <p key={item.at}><strong>{item.who}</strong>{item.text}<time>{item.at}</time></p>) : <p>No production notes yet.</p>}</section></aside></div>
  </div>;
}
