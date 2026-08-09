import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import DetailDrawer, { DrawerRow } from '../components/DetailDrawer';
import FormModal from '../components/FormModal';
import PillSelect from '../components/PillSelect';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import FileList from '../components/FileList';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../config/roles';
import { apiFetch, apiGet, callDashboardApi, getList } from '../utils/dashboardApi';

const API = '/api/requests';
const TYPES = ['design', 'development', 'bug', 'revision', 'support', 'content', 'meeting', 'admin'];
const STATUSES = ['queue', 'in_progress', 'in_review', 'revision', 'completed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const EMPTY_REQUEST = {
  title: '',
  client: '',
  project: '',
  type: 'design',
  status: 'queue',
  priority: 'normal',
  assigned_to: '',
  collaborators: '',
  estimated_hours: '',
  logged_hours: '',
  due_date: '',
  request_brief: '',
  client_instructions: '',
  internal_notes: '',
  approval_status: 'pending',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const field = (item, ...keys) => keys.map(k => item?.[k]).find(v => v !== undefined && v !== null && v !== '') || '';

export default function Requests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage = canWrite(user?.role, 'requests');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_REQUEST);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [type, setType] = useState('all');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownParts, setBreakdownParts] = useState([]);
  const [breakdownBusy, setBreakdownBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const projectContext = searchParams.get('project_id');

  // Reorder breakdown parts, then clear any dependency that would now point to
  // a later part (a part can only depend on an earlier one — the API enforces
  // the same rule, and the "Starts after" dropdown only shows earlier parts).
  const movePart = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    setBreakdownParts(parts => {
      const next = [...parts];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((item, idx) => {
        const dep = Number(item.depends_on_position);
        return { ...item, position: idx + 1, depends_on_position: dep && dep <= idx ? dep : '' };
      });
    });
  };

  const fetchRequests = () => {
    setLoading(true);
    setError(null);
    callDashboardApi(API, 'list')
      .then(data => setRequests(getList(data, ['requests'])))
      .catch(err => {
        console.error(err);
        setError('Could not load requests from the dashboard API.');
        toast.error('Failed to load requests');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);
  useEffect(() => {
    Promise.all([apiGet('/api/clients'), apiGet('/api/projects'), apiGet('/api/team')])
      .then(([clientData, projectData, teamData]) => { setClients(clientData.clients || []); setProjects(projectData.projects || []); setTeam(teamData.employees || []); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (searchParams.get('create') !== '1' || !canManage) return;
    const project = projects.find(item => String(item.id) === String(projectContext));
    if (projectContext && !project) return;
    setEditing(null);
    setForm({
      ...EMPTY_REQUEST,
      project: projectContext || '',
      client: project?.client_id || '',
    });
    setShowForm(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [canManage, projectContext, projects, searchParams, setSearchParams]);

  const isOverdue = (r) => field(r, 'due_date') && new Date(field(r, 'due_date')) < new Date() && field(r, 'status') !== 'completed';
  const dueToday = (r) => {
    if (!field(r, 'due_date')) return false;
    const due = new Date(field(r, 'due_date')).toDateString();
    return due === new Date().toDateString();
  };

  const filtered = useMemo(() => requests.filter(request => {
    const reqStatus = field(request, 'status') || 'queue';
    const reqPriority = field(request, 'priority') || 'normal';
    const reqType = field(request, 'type') || 'design';
    const haystack = [
      field(request, 'title'),
      field(request, 'client_name'),
      field(request, 'project_name'),
      field(request, 'assigned_to'),
    ].join(' ').toLowerCase();
    if (projectContext && String(request.project_id) !== String(projectContext)) return false;
    if (view === 'my_tasks' && field(request, 'assigned_to') !== user?.name && field(request, 'assigned_to') !== user?.email) return false;
    if (view === 'overdue' && !isOverdue(request)) return false;
    if (view === 'today' && !dueToday(request)) return false;
    if (view === 'review' && reqStatus !== 'in_review') return false;
    if (status !== 'all' && reqStatus !== status) return false;
    if (priority !== 'all' && reqPriority !== priority) return false;
    if (type !== 'all' && reqType !== type) return false;
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return true;
  }), [requests, search, status, priority, type, view, user, projectContext]);

  const moveQueuedRequest = async (request, direction) => {
    const queue = requests
      .filter(item => field(item, 'status') === 'queue' && Number(item.client_id) === Number(request.client_id) && field(item, 'request_kind') !== 'parent')
      .sort((a, b) => (Number(a.queue_position) || Number.MAX_SAFE_INTEGER) - (Number(b.queue_position) || Number.MAX_SAFE_INTEGER));
    const index = queue.findIndex(item => item.id === request.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= queue.length) return;
    [queue[index], queue[target]] = [queue[target], queue[index]];
    try {
      await apiFetch(`${API}/queue/reorder`, {
        method: 'POST',
        body: { client_id: request.client_id, ordered_ids: queue.map(item => item.id) },
      });
      toast.success('Queue order updated');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Could not reorder the queue');
    }
  };

  const stats = {
    open: requests.filter(r => field(r, 'request_kind') !== 'parent' && !['completed', 'cancelled'].includes(field(r, 'status'))).length,
    overdue: requests.filter(isOverdue).length,
    today: requests.filter(dueToday).length,
    review: requests.filter(r => field(r, 'status') === 'in_review').length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_REQUEST);
    setShowForm(true);
  };

  const openEdit = (request) => {
    setEditing(request);
    setForm({ ...EMPTY_REQUEST, ...request, client: request.client_id || '', project: request.project_id || '', request_brief: request.description || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    try {
      await callDashboardApi(API, editing ? 'update' : 'create', { request_id: editing?.id, ...form });
      toast.success(editing ? 'Request updated' : 'Request created');
      setShowForm(false);
      fetchRequests();
    } catch (err) {
      toast.error('Request backend action failed. Check dashboard-requests.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (request, nextStatus) => {
    if (!canManage) return;
    try {
      await callDashboardApi(API, 'update_status', { request_id: request.id, status: nextStatus });
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: nextStatus } : r));
      if (selected?.id === request.id) setSelected(prev => ({ ...prev, status: nextStatus }));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Status update needs dashboard-requests backend support.');
    }
  };

  const handleAddComment = async (request) => {
    const content = window.prompt('Add request comment');
    if (!content?.trim()) return;
    try {
      await callDashboardApi(API, 'add_comment', { request_id: request.id, content });
      toast.success('Comment added');
      fetchRequests();
    } catch (err) {
      toast.error('Add comment needs dashboard-requests backend support.');
    }
  };

  const handleLogTime = async (request) => {
    const hours = window.prompt('Hours to log');
    if (!hours || Number.isNaN(Number(hours))) return;
    try {
      await callDashboardApi(API, 'log_time', { request_id: request.id, hours: Number(hours) });
      toast.success('Time logged');
      fetchRequests();
    } catch (err) {
      toast.error('Log time needs dashboard-requests backend support.');
    }
  };

  const handleApproval = async (request, approval_status) => {
    try {
      await callDashboardApi(API, 'update', { request_id: request.id, approval_status });
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, approval_status } : r));
      if (selected?.id === request.id) setSelected(prev => ({ ...prev, approval_status }));
      toast.success(`Request ${approval_status}`);
    } catch (err) {
      toast.error('Approval update needs dashboard-requests backend support.');
    }
  };

  const startScopeReview = async (request) => {
    if (!canManage) return;
    setBreakdownBusy(true);
    try {
      const { request: updated } = await apiFetch(`${API}/${request.id}/scope/start`, { method: 'POST' });
      setSelected({ ...request, ...updated });
      toast.success('Request moved to scope review');
      fetchRequests();
    } catch (err) { toast.error(err.message); } finally { setBreakdownBusy(false); }
  };

  const openBreakdown = async (request) => {
    setBreakdownBusy(true);
    try {
      const data = await apiFetch(`${API}/${request.id}/breakdown`);
      const rows = data.parts?.length ? data.parts : [
        { title: `${request.title} · Foundation`, description: '', type: request.type || 'development', priority: request.priority || 'normal', depends_on_position: '' },
        { title: `${request.title} · Completion`, description: '', type: request.type || 'development', priority: request.priority || 'normal', depends_on_position: 1 },
      ];
      setBreakdownParts(rows.map((part, index) => ({
        title: part.title || '', description: part.description || '', type: part.type || request.type || 'development',
        priority: part.priority || 'normal', depends_on_position: part.depends_on_position || '', position: index + 1,
      })));
      setSelected({ ...request, ...data.request });
      setBreakdownOpen(true);
    } catch (err) { toast.error(err.message); } finally { setBreakdownBusy(false); }
  };

  const saveBreakdown = async (event) => {
    event.preventDefault();
    if (breakdownParts.length < 2 || breakdownParts.some(part => !part.title.trim())) return;
    setBreakdownBusy(true);
    try {
      await apiFetch(`${API}/${selected.id}/breakdown`, { method: 'PUT', body: { parts: breakdownParts } });
      toast.success('Breakdown sent to the client for approval');
      setBreakdownOpen(false);
      setSelected(null);
      fetchRequests();
    } catch (err) { toast.error(err.message); } finally { setBreakdownBusy(false); }
  };

  const returnToQueue = async (request) => {
    setBreakdownBusy(true);
    try {
      await apiFetch(`${API}/${request.id}/scope/normal`, { method: 'POST' });
      toast.success('Request returned to the production queue');
      setSelected(null);
      fetchRequests();
    } catch (err) { toast.error(err.message); } finally { setBreakdownBusy(false); }
  };

  const columns = [
    { key: 'title', label: 'Request', render: r => (
      <div>
        <div className="client-cell-name">{field(r, 'title') || 'Untitled request'}</div>
        <div className="client-cell-sub">{field(r, 'request_kind') === 'child' ? `Part ${field(r, 'part_number')} · ${field(r, 'parent_title')}` : field(r, 'request_kind') === 'parent' ? `Scope group · ${field(r, 'proposed_part_count', 'child_count') || 0} parts` : `${field(r, 'client_name') || 'No client'} · ${field(r, 'project_name') || 'No project'}`}</div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: r => <StatusBadge value={field(r, 'type') || 'design'} tone="blue" /> },
    { key: 'status', label: 'Status', render: r => <StatusBadge value={field(r, 'status') || 'queue'} /> },
    { key: 'priority', label: 'Priority', render: r => <StatusBadge value={field(r, 'priority') || 'normal'} /> },
    { key: 'assigned_to', label: 'Assigned', render: r => field(r, 'assigned_to') || '-' },
    { key: 'hours', label: 'Hours', render: r => `${Number(field(r, 'logged_hours') || 0)} / ${field(r, 'estimated_hours') || 0}` },
    { key: 'due_date', label: 'Due', render: r => <span className={isOverdue(r) ? 'text-danger' : ''}>{fmtDate(field(r, 'due_date'))}</span> },
    { key: 'actions', label: '', stopClick: true, render: r => canManage ? (
      <div className="table-actions">
        {field(r, 'status') === 'queue' && <button className="btn btn-sm btn-ghost" aria-label="Move request up" onClick={() => moveQueuedRequest(r, -1)}>Up</button>}
        {field(r, 'status') === 'queue' && <button className="btn btn-sm btn-ghost" aria-label="Move request down" onClick={() => moveQueuedRequest(r, 1)}>Down</button>}
        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(r)}>Edit</button>
        {field(r, 'status') !== 'completed' && <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(r, 'completed')}>Complete</button>}
      </div>
    ) : <span className="backend-note">Read only</span> },
  ];

  // A parent request's children are live rows already in the list — no extra
  // fetch needed, and their statuses stay current as production moves.
  const childrenOf = (parent) => requests
    .filter(r => field(r, 'parent_request_id') !== '' && String(field(r, 'parent_request_id')) === String(parent?.id))
    .sort((a, b) => (Number(field(a, 'part_number')) || 0) - (Number(field(b, 'part_number')) || 0));

  const isParentSelected = field(selected, 'request_kind') === 'parent';
  const selectedChildren = isParentSelected ? childrenOf(selected) : [];
  const deliveredCount = selectedChildren.filter(k => field(k, 'status') === 'completed').length;
  const parentOfSelected = field(selected, 'request_kind') === 'child'
    ? requests.find(r => String(r.id) === String(field(selected, 'parent_request_id')))
    : null;

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Requests</h2>
          <p>{stats.open} open · {stats.overdue} overdue · {stats.review} in review</p>
        </div>
        <div className="page-header-actions">
          {canManage && <button className="btn btn-primary" onClick={openCreate}>+ Create Request</button>}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchRequests}>Retry</button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Open Requests" value={stats.open} sub={`${requests.length} total`} />
        <StatCard label="Overdue" value={stats.overdue} trend={{ direction: stats.overdue ? 'down' : 'neutral', label: stats.overdue ? 'Needs attention' : 'No overdue work' }} />
        <StatCard label="Due Today" value={stats.today} sub="Today’s delivery queue" />
        <StatCard label="In Review" value={stats.review} sub="Awaiting approval" />
      </div>

      <div className="ops-tabs">
        {[
          ['all', 'All'],
          ['my_tasks', 'My Tasks'],
          ['overdue', 'Overdue'],
          ['today', 'Due Today'],
          ['review', 'In Review'],
        ].map(([key, label]) => (
          <button key={key} className={`ops-tab ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>

      <div className="ops-toolbar">
        <input className="dash-input" placeholder="Search requests, clients, projects..." value={search} onChange={e => setSearch(e.target.value)} />
        <PillSelect value={status} options={[{ value: 'all', label: 'All statuses' }, ...STATUSES]} onChange={setStatus} ariaLabel="Filter status" />
        <PillSelect value={priority} options={[{ value: 'all', label: 'All priorities' }, ...PRIORITIES]} onChange={setPriority} ariaLabel="Filter priority" />
        <PillSelect value={type} options={[{ value: 'all', label: 'All types' }, ...TYPES]} onChange={setType} ariaLabel="Filter type" />
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={request => navigate(`/requests/${request.id}`)} emptyTitle="No requests found" emptySubtitle="Client portal requests will appear here as soon as they are submitted." />

      <DetailDrawer
        open={selected}
        title={field(selected, 'title') || 'Request'}
        subtitle={`${field(selected, 'client_name') || 'No client'} · ${field(selected, 'project_name') || 'No project'}`}
        onClose={() => setSelected(null)}
        actions={canManage && (
          <>
            <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit request</button>
            {field(selected, 'request_kind') === 'child' && parentOfSelected && <button className="btn btn-ghost" onClick={() => setSelected(parentOfSelected)}>View parent request</button>}
            {field(selected, 'request_kind') !== 'child' && field(selected, 'status') === 'queue' && field(selected, 'request_kind') !== 'parent' && <button className="btn btn-ghost" disabled={breakdownBusy} onClick={() => startScopeReview(selected)}>Scope as multiple parts</button>}
            {field(selected, 'request_kind') === 'parent' && field(selected, 'scope_status') !== 'approved' && <button className="btn btn-primary" disabled={breakdownBusy} onClick={() => openBreakdown(selected)}>{field(selected, 'scope_status') === 'proposed' ? 'Edit proposed breakdown' : 'Build breakdown'}</button>}
            {field(selected, 'request_kind') === 'parent' && field(selected, 'scope_status') !== 'approved' && <button className="btn btn-ghost" disabled={breakdownBusy} onClick={() => returnToQueue(selected)}>Keep as one request</button>}
            <button className="btn btn-ghost" onClick={() => handleLogTime(selected)}>Log time</button>
            <button className="btn btn-ghost" onClick={() => handleAddComment(selected)}>Add comment</button>
            <button className="btn btn-ghost" onClick={() => handleApproval(selected, 'approved')}>Approve</button>
            <button className="btn btn-danger" onClick={() => handleApproval(selected, 'rejected')}>Reject</button>
          </>
        )}
      >
        {isParentSelected ? (
          <>
            {/* A request group is an overview, never a production job — real child
                statuses, not a fabricated completion percentage. */}
            <DrawerRow label="Structure" value={`Request group · ${field(selected, 'scope_status') || 'proposed'}`} />
            <DrawerRow label="Progress" value={`${deliveredCount} / ${selectedChildren.length} delivered`} />
            <DrawerRow label="Priority"><StatusBadge value={field(selected, 'priority') || 'normal'} /></DrawerRow>
            <DrawerRow label="Requested" value={fmtDate(field(selected, 'created_at'))} />
            <div className="drawer-notes"><span>Original brief</span><p>{field(selected, 'request_brief', 'description') || 'No brief added yet.'}</p></div>
            <div className="drawer-notes">
              <span>Parts · {selectedChildren.length}</span>
              {selectedChildren.length === 0
                ? <p className="backend-note">{field(selected, 'scope_status') === 'approved' ? 'No linked parts found.' : 'Parts are created once the client approves the proposed breakdown.'}</p>
                : (
                  <div className="drawer-parts">
                    {selectedChildren.map(child => (
                      <button type="button" key={child.id} className="drawer-part-row" onClick={() => setSelected(child)}>
                        <span className="drawer-part-num">{field(child, 'part_number') || '·'}</span>
                        <span className="drawer-part-title">{field(child, 'title') || 'Untitled part'}</span>
                        <StatusBadge value={field(child, 'status') || 'queue'} />
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <div className="drawer-notes">
              <span>Activity</span>
              <ul className="drawer-activity">
                {field(selected, 'created_at') && <li><span className="drawer-activity-dot" />Client submitted request<em>{fmtDate(field(selected, 'created_at'))}</em></li>}
                {field(selected, 'breakdown_approved_at') && <li><span className="drawer-activity-dot" />Breakdown approved · {selectedChildren.length} parts created<em>{fmtDate(field(selected, 'breakdown_approved_at'))}</em></li>}
                {deliveredCount > 0 && <li><span className="drawer-activity-dot" />{deliveredCount} of {selectedChildren.length} parts delivered</li>}
              </ul>
            </div>
            <FileList entityType="request" entityId={selected?.id} canManage={canManage} />
          </>
        ) : (
          <>
            <DrawerRow label="Status"><StatusBadge value={field(selected, 'status') || 'queue'} /></DrawerRow>
            <DrawerRow label="Structure" value={field(selected, 'request_kind') === 'child' ? `Part ${field(selected, 'part_number')} of ${field(selected, 'parent_title')}` : 'Single request'} />
            {field(selected, 'dependency_title') && <DrawerRow label="Dependency" value={field(selected, 'dependency_title')} />}
            <DrawerRow label="Priority"><StatusBadge value={field(selected, 'priority') || 'normal'} /></DrawerRow>
            <DrawerRow label="Type" value={field(selected, 'type') || 'design'} />
            <DrawerRow label="Assigned To" value={field(selected, 'assigned_to')} />
            <DrawerRow label="Collaborators" value={field(selected, 'collaborators')} />
            <DrawerRow label="Due Date" value={fmtDate(field(selected, 'due_date'))} />
            <DrawerRow label="Hours" value={`${Number(field(selected, 'logged_hours') || 0)} logged / ${field(selected, 'estimated_hours') || 0} estimated`} />
            <DrawerRow label="Completion" value={`${Number(field(selected, 'completion_percent') || 0)}%`} />
            <DrawerRow label="Approval" value={field(selected, 'approval_status') || 'pending'} />
            <div className="drawer-notes"><span>Brief</span><p>{field(selected, 'request_brief') || 'No brief added yet.'}</p></div>
            <div className="drawer-notes"><span>Client Instructions</span><p>{field(selected, 'client_instructions') || 'No client instructions yet.'}</p></div>
            <div className="drawer-notes"><span>Internal Notes</span><p>{field(selected, 'internal_notes') || 'No internal notes yet.'}</p></div>
            <div className="drawer-notes"><span>Revision Notes</span><p>{field(selected, 'revision_notes') || 'No revision notes yet.'}</p></div>
            <FileList entityType="request" entityId={selected?.id} canManage={canManage} />
          </>
        )}
      </DetailDrawer>

      <FormModal
        open={showForm}
        title={editing ? 'Edit Request' : 'Create Request'}
        subtitle="Create internal requests or follow up on client portal work."
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        size="modal-lg"
        actions={<><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={submitting || !canManage}>{submitting ? 'Saving...' : 'Save Request'}</button></>}
      >
        <div className="form-row">
          <div className="form-field"><label>Title *</label><input className="dash-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="form-field"><label>Client *</label><PillSelect value={form.client} onChange={client => setForm(f => ({ ...f, client, project: '' }))} ariaLabel="Choose client" options={[{value:'',label:'Choose client'},...clients.map(client=>({value:String(client.id),label:client.company||client.name}))]}/></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Project *</label><PillSelect value={form.project} onChange={project => setForm(f => ({ ...f, project }))} ariaLabel="Choose project" options={[{value:'',label:'Choose project'},...projects.filter(project=>!form.client||Number(project.client_id)===Number(form.client)).map(project=>({value:String(project.id),label:project.name}))]}/></div>
          <div className="form-field"><label>Assigned To</label><PillSelect value={form.assigned_to || ''} onChange={assigned_to => setForm(f => ({ ...f, assigned_to }))} ariaLabel="Assign request" options={[{value:'',label:'Unassigned'},...team.map(member=>({value:String(member.id),label:member.name}))]}/></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Type</label><PillSelect value={form.type} options={TYPES} onChange={type => setForm(f => ({ ...f, type }))} ariaLabel="Request type" /></div>
          <div className="form-field"><label>Status</label><PillSelect value={form.status} options={STATUSES} onChange={status => setForm(f => ({ ...f, status }))} ariaLabel="Request status" /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Priority</label><PillSelect value={form.priority} options={PRIORITIES} onChange={priority => setForm(f => ({ ...f, priority }))} ariaLabel="Request priority" /></div>
          <div className="form-field"><label>Due Date</label><input className="dash-input" type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Estimated Hours</label><input className="dash-input" type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} /></div>
          <div className="form-field"><label>Logged Hours</label><input className="dash-input" type="number" value={form.logged_hours} onChange={e => setForm(f => ({ ...f, logged_hours: e.target.value }))} /></div>
        </div>
        <div className="form-field"><label>Request Brief</label><textarea className="dash-input" rows={3} value={form.request_brief} onChange={e => setForm(f => ({ ...f, request_brief: e.target.value }))} /></div>
        <div className="form-field"><label>Internal Notes</label><textarea className="dash-input" rows={2} value={form.internal_notes} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} /></div>
      </FormModal>

      <FormModal
        open={breakdownOpen}
        title="Build the request breakdown"
        subtitle="Parts become real linked requests only after the client approves this proposal."
        onClose={() => setBreakdownOpen(false)}
        onSubmit={saveBreakdown}
        size="modal-lg"
        actions={<><button type="button" className="btn btn-ghost" onClick={() => setBreakdownOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={breakdownBusy || breakdownParts.length < 2 || breakdownParts.some(part => !part.title.trim())}>{breakdownBusy ? 'Sending...' : 'Send breakdown for approval'}</button></>}
      >
        <div className="drawer-notes"><span>Original request</span><p>{field(selected, 'title')} · {field(selected, 'client_name')} · {field(selected, 'project_name')}</p></div>
        {breakdownParts.map((part, index) => <div
          className={`card breakdown-part ${dragIndex === index ? 'is-dragging' : ''}`}
          style={{ padding: '16px', marginBottom: '12px' }}
          key={`part-${index}`}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
          onDrop={event => { event.preventDefault(); movePart(dragIndex, index); setDragIndex(null); }}
        >
          <div className="inline-stack" style={{ marginBottom: '12px' }}>
            <button
              type="button"
              className="breakdown-drag-handle"
              draggable
              onDragStart={event => { setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => setDragIndex(null)}
              aria-label={`Drag part ${index + 1}`}
              title="Drag to reorder"
            >≡</button>
            <strong>Part {index + 1}</strong>
            <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} disabled={breakdownParts.length <= 2} onClick={() => setBreakdownParts(parts => parts.filter((_, itemIndex) => itemIndex !== index).map((item, position) => ({ ...item, position: position + 1, depends_on_position: Number(item.depends_on_position) > position ? '' : item.depends_on_position })))}>Remove</button>
          </div>
          <div className="form-field"><label>Title *</label><input className="dash-input" value={part.title} onChange={event => setBreakdownParts(parts => parts.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></div>
          <div className="form-field"><label>Scope</label><textarea className="dash-input" rows={2} value={part.description} onChange={event => setBreakdownParts(parts => parts.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} /></div>
          <div className="form-row">
            <div className="form-field"><label>Priority</label><PillSelect value={part.priority} options={PRIORITIES} onChange={value => setBreakdownParts(parts => parts.map((item, itemIndex) => itemIndex === index ? { ...item, priority: value } : item))} ariaLabel={`Part ${index + 1} priority`} /></div>
            <div className="form-field"><label>Starts after</label><PillSelect value={String(part.depends_on_position||'')} onChange={depends_on_position => setBreakdownParts(parts => parts.map((item,itemIndex)=>itemIndex===index?{...item,depends_on_position}:item))} ariaLabel={`Part ${index+1} dependency`} options={[{value:'',label:'No dependency'},...breakdownParts.slice(0,index).map((dependency,dependencyIndex)=>({value:String(dependencyIndex+1),label:`Part ${dependencyIndex+1} · ${dependency.title||'Untitled'}`}))]}/></div>
          </div>
        </div>)}
        <button type="button" className="btn btn-ghost" onClick={() => setBreakdownParts(parts => [...parts, { title: '', description: '', type: selected?.type || 'development', priority: 'normal', depends_on_position: parts.length, position: parts.length + 1 }])}>+ Add another part</button>
      </FormModal>
    </DashLayout>
  );
}
