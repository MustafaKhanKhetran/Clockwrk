import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, CreditCard, MessageSquare, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/dashboardApi';

const date=value=>value?new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'No date';
const openStatus=new Set(['queue','in_progress','in_review','revision']);

export default function Overview(){
  const navigate=useNavigate();const {user}=useAuth();const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const load=()=>{
    setLoading(true);
    setError('');
    const available = request => request.catch(() => ({}));
    Promise.all([
      available(apiGet('/api/requests')),
      available(apiGet('/api/clients')),
      available(apiGet('/api/bookings')),
      available(apiGet('/api/alerts')),
      available(apiGet('/api/finance/subscription-changes')),
    ])
      .then(([requests,clients,bookings,alerts,changes])=>setData({requests:requests.requests||[],clients:clients.clients||[],bookings:bookings.bookings||[],alerts:alerts.alerts||[],changes:changes.changes||[]}))
      .catch(err=>{setError(err.message);toast.error('Could not load overview');})
      .finally(()=>setLoading(false));
  };
  useEffect(load,[]);
  const model=useMemo(()=>{const requests=data?.requests||[];const now=Date.now();const upcoming=(data?.bookings||[]).filter(b=>new Date(`${String(b.booking_date).slice(0,10)}T${b.booking_time}`)>=new Date()).slice(0,5);return {newRequests:requests.filter(r=>r.status==='queue'&&r.request_kind!=='parent'),review:requests.filter(r=>r.status==='in_review'),revision:requests.filter(r=>r.status==='revision'),scope:requests.filter(r=>r.request_kind==='parent'&&['reviewing','proposed'].includes(r.scope_status)),inProgress:requests.filter(r=>r.status==='in_progress'),queue:requests.filter(r=>r.status==='queue'&&r.request_kind!=='parent'),overdue:requests.filter(r=>r.due_date&&new Date(r.due_date).getTime()<now&&r.status!=='completed'),upcoming,alerts:(data?.alerts||[]).filter(a=>!a.is_read).slice(0,6),changes:(data?.changes||[]).filter(c=>['payment_reported','partially_paid'].includes(c.status)),activeClients:(data?.clients||[]).filter(c=>c.status==='active').length};},[data]);
  if(loading)return <DashLayout><div className="overview-loading">Loading today’s operations...</div></DashLayout>;
  return <DashLayout><div className="launch-overview">
    <header className="overview-header"><div><span className="page-eyebrow">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span><h1>{user?.name?.split(' ')[0]||'Clockwrk'}, here is what needs attention.</h1><p>Real client work, approvals, payments and bookings. Nothing estimated.</p></div><button className="btn btn-ghost" onClick={load}><RefreshCw size={16}/> Refresh</button></header>
    {error&&<div className="operational-alert danger"><strong>Overview could not refresh</strong><span>{error}</span></div>}
    <section className="attention-band"><header><div><span className="page-eyebrow">Needs attention</span><h2>{model.revision.length+model.review.length+model.scope.length+model.changes.length+model.overdue.length} items require a decision</h2></div></header><div className="attention-grid"><button onClick={()=>navigate('/requests?status=revision')}><strong>{model.revision.length}</strong><span>Client revisions</span><small>Exact changes requested</small></button><button onClick={()=>navigate('/requests?status=in_review')}><strong>{model.review.length}</strong><span>Client reviews</span><small>Delivered and awaiting approval</small></button><button onClick={()=>navigate('/requests?scope=review')}><strong>{model.scope.length}</strong><span>Scope reviews</span><small>Draft or client approval</small></button><button onClick={()=>navigate('/finance')}><strong>{model.changes.length}</strong><span>Transfers to verify</span><small>Billing changes reported paid</small></button><button onClick={()=>navigate('/requests?overdue=1')}><strong>{model.overdue.length}</strong><span>Overdue requests</span><small>Past their stored due date</small></button></div></section>
    <div className="overview-columns"><section className="overview-work"><header><div><span className="page-eyebrow">Current work</span><h2>Production board</h2></div><button className="text-action" onClick={()=>navigate('/requests')}>Open all requests <ArrowRight size={15}/></button></header><div className="work-columns"><WorkColumn title="In progress" items={model.inProgress} empty="No work in progress." navigate={navigate}/><WorkColumn title="Needs review" items={model.review} empty="No deliveries waiting." navigate={navigate}/><WorkColumn title="Up next" items={model.queue} empty="The queue is clear." navigate={navigate}/></div></section><aside className="overview-side"><section><header><Calendar size={18}/><div><span className="page-eyebrow">Upcoming</span><h2>Bookings</h2></div></header>{model.upcoming.length?<div className="overview-list">{model.upcoming.map(b=><button key={b.id} onClick={()=>navigate(`/bookings/${b.id}`)}><span><strong>{b.company||b.name}</strong><small>{date(b.booking_date)} · {b.booking_time}</small></span><ArrowRight size={15}/></button>)}</div>:<p className="empty-copy">No upcoming bookings.</p>}</section><section><header><MessageSquare size={18}/><div><span className="page-eyebrow">Unread</span><h2>Alerts</h2></div></header>{model.alerts.length?<div className="overview-list">{model.alerts.map(a=><button key={a.id} onClick={()=>navigate(a.link||'/alerts')}><span><strong>{a.title}</strong><small>{a.message}</small></span></button>)}</div>:<p className="empty-copy">No unread alerts.</p>}</section></aside></div>
    <section className="overview-account-strip"><div><span>Active clients</span><strong>{model.activeClients}</strong></div><div><span>New queued requests</span><strong>{model.newRequests.length}</strong></div><div><span>In production</span><strong>{model.inProgress.length}</strong></div><div><span>Awaiting client</span><strong>{model.review.length+model.scope.filter(r=>r.scope_status==='proposed').length}</strong></div></section>
  </div></DashLayout>;
}

function WorkColumn({title,items,empty,navigate}){return <div className="work-column"><header><h3>{title}</h3><span>{items.length}</span></header>{items.length?items.slice(0,6).map(item=><button key={item.id} onClick={()=>navigate(`/requests/${item.id}`)}><strong>{item.title}</strong><small>{item.client_company||item.client_name} · {item.project_name}</small><span><StatusBadge value={item.priority}/>{item.due_date&&<em>{date(item.due_date)}</em>}</span></button>):<p className="empty-copy">{empty}</p>}</div>}
