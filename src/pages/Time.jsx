import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import DetailDrawer, { DrawerRow } from '../components/DetailDrawer';
import FormModal from '../components/FormModal';
import PillSelect from '../components/PillSelect';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../config/roles';
import { apiGet, callDashboardApi, getList } from '../utils/dashboardApi';

const API = '/api/time-logs';

const EMPTY_LOG = {
  employee: '',
  client: '',
  project: '',
  request: '',
  log_date: new Date().toISOString().split('T')[0],
  hours: '',
  description: '',
  billable: 'billable',
  employee_id: '', project_id: '', request_id: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const field = (item, ...keys) => keys.map(k => item?.[k]).find(v => v !== undefined && v !== null && v !== '') || '';

export default function Time() {
  const { user } = useAuth();
  const canManage = canWrite(user?.role, 'time');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_LOG);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [billableFilter, setBillableFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [team, setTeam] = useState([]);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    callDashboardApi(API, 'list')
      .then(data => setLogs(getList(data, ['time_logs', 'logs'])))
      .catch(err => {
        console.error(err);
        setError('Time tracking backend is not available yet. Required webhook: dashboard-time-logs.');
        toast.error('Failed to load time logs');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => { Promise.all([apiGet('/api/projects'), apiGet('/api/requests'), apiGet('/api/team')]).then(([p,r,t])=>{setProjects(p.projects||[]);setRequests(r.requests||[]);setTeam(t.employees||[]);}).catch(()=>{}); }, []);

  const filtered = useMemo(() => logs.filter(log => {
    const haystack = [
      field(log, 'employee', 'employee_name'),
      field(log, 'client', 'client_name'),
      field(log, 'project', 'project_name'),
      field(log, 'request', 'request_title'),
      field(log, 'description'),
    ].join(' ').toLowerCase();
    const billable = field(log, 'billable') === true || field(log, 'billable') === 1 || field(log, 'billable') === 'billable' ? 'billable' : 'non_billable';
    if (billableFilter !== 'all' && billable !== billableFilter) return false;
    if (dateFilter && String(field(log, 'log_date', 'date')).slice(0, 10) !== dateFilter) return false;
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return true;
  }), [logs, search, billableFilter, dateFilter]);

  const stats = {
    total: filtered.reduce((sum, log) => sum + Number(field(log, 'hours', 'duration', 'manual_hours') || 0), 0),
    billable: filtered.filter(log => field(log, 'billable') === true || field(log, 'billable') === 1 || field(log, 'billable') === 'billable').reduce((sum, log) => sum + Number(field(log, 'hours', 'duration', 'manual_hours') || 0), 0),
    today: logs.filter(log => String(field(log, 'log_date', 'date')).slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((sum, log) => sum + Number(field(log, 'hours', 'duration', 'manual_hours') || 0), 0),
    entries: filtered.length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_LOG, employee: user?.name || '' });
    setShowForm(true);
  };

  const openEdit = (log) => {
    setEditing(log);
    setForm({
      ...EMPTY_LOG,
      ...log,
      employee: field(log, 'employee', 'employee_name'),
      client: field(log, 'client', 'client_name'),
      project: field(log, 'project', 'project_name'),
      request: field(log, 'request', 'request_title'),
      log_date: field(log, 'log_date', 'date') ? String(field(log, 'log_date', 'date')).slice(0, 10) : EMPTY_LOG.log_date,
      hours: field(log, 'hours', 'duration', 'manual_hours'),
      employee_id: log.employee_id || '', project_id: log.project_id || '', request_id: log.request_id || '',
      billable: field(log, 'billable') === false || field(log, 'billable') === 0 || field(log, 'billable') === 'non_billable' ? 'non_billable' : 'billable',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    try {
      await callDashboardApi(API, editing ? 'update' : 'create', {
        time_log_id: editing?.id,
        ...form,
        billable: form.billable === 'billable',
      });
      toast.success(editing ? 'Time log updated' : 'Time log added');
      setShowForm(false);
      fetchLogs();
    } catch (err) {
      toast.error('Time action needs dashboard-time-logs backend support.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (log) => {
    if (!window.confirm('Delete this time log?')) return;
    try {
      await callDashboardApi(API, 'delete', { time_log_id: log.id });
      setLogs(prev => prev.filter(item => item.id !== log.id));
      toast.success('Time log deleted');
    } catch (err) {
      toast.error('Delete needs dashboard-time-logs backend support.');
    }
  };

  const columns = [
    { key: 'employee', label: 'Employee', render: log => (
      <div>
        <div className="client-cell-name">{field(log, 'employee', 'employee_name') || '-'}</div>
        <div className="client-cell-sub">{field(log, 'client', 'client_name') || 'No client'}</div>
      </div>
    ) },
    { key: 'project', label: 'Project', render: log => field(log, 'project', 'project_name') || '-' },
    { key: 'request', label: 'Request', render: log => field(log, 'request', 'request_title') || '-' },
    { key: 'date', label: 'Date', render: log => fmtDate(field(log, 'log_date', 'date')) },
    { key: 'hours', label: 'Hours', render: log => Number(field(log, 'hours', 'duration', 'manual_hours') || 0).toFixed(2) },
    { key: 'billable', label: 'Type', render: log => <StatusBadge value={(field(log, 'billable') === false || field(log, 'billable') === 0 || field(log, 'billable') === 'non_billable') ? 'non_billable' : 'billable'} tone={(field(log, 'billable') === false || field(log, 'billable') === 0 || field(log, 'billable') === 'non_billable') ? 'muted' : 'green'} /> },
    { key: 'created', label: 'Created', render: log => fmtDate(field(log, 'created_at')) },
    { key: 'actions', label: '', stopClick: true, render: log => canManage ? (
      <div className="table-actions">
        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(log)}>Edit</button>
        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(log)}>Delete</button>
      </div>
    ) : <span className="backend-note">Read only</span> },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Time Tracking</h2>
          <p>{stats.entries} entries · {stats.total.toFixed(1)} filtered hours · {stats.today.toFixed(1)} today</p>
        </div>
        <div className="page-header-actions">
          <span className="backend-note">Webhook: dashboard-time-logs</span>
          {canManage && <button className="btn btn-primary" onClick={openCreate}>+ Add Time</button>}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchLogs}>Retry</button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Filtered Hours" value={stats.total.toFixed(1)} sub="Current filters" />
        <StatCard label="Billable Hours" value={stats.billable.toFixed(1)} sub="Revenue-eligible time" />
        <StatCard label="Today" value={stats.today.toFixed(1)} sub="Logged today" />
        <StatCard label="Entries" value={stats.entries} sub={`${logs.length} total logs`} />
      </div>

      <div className="ops-toolbar">
        <input className="dash-input" placeholder="Search employee, client, project, request..." value={search} onChange={e => setSearch(e.target.value)} />
        <PillSelect value={billableFilter} options={[{ value: 'all', label: 'All time' }, { value: 'billable', label: 'Billable' }, { value: 'non_billable', label: 'Non-billable' }]} onChange={setBillableFilter} ariaLabel="Filter time type" />
        <input className="dash-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <button className="btn btn-ghost" onClick={() => { setSearch(''); setBillableFilter('all'); setDateFilter(''); }}>Clear</button>
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={setSelected} emptyTitle="No time logs found" emptySubtitle="Connect dashboard-time-logs to track employee, project, client, and request time." />

      <DetailDrawer
        open={selected}
        title={`${Number(field(selected, 'hours', 'duration', 'manual_hours') || 0).toFixed(2)} hours`}
        subtitle={`${field(selected, 'employee', 'employee_name') || 'Employee'} · ${fmtDate(field(selected, 'log_date', 'date'))}`}
        onClose={() => setSelected(null)}
        actions={canManage && <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit time</button>}
      >
        <DrawerRow label="Employee" value={field(selected, 'employee', 'employee_name')} />
        <DrawerRow label="Client" value={field(selected, 'client', 'client_name')} />
        <DrawerRow label="Project" value={field(selected, 'project', 'project_name')} />
        <DrawerRow label="Request" value={field(selected, 'request', 'request_title')} />
        <DrawerRow label="Billable" value={(field(selected, 'billable') === false || field(selected, 'billable') === 0 || field(selected, 'billable') === 'non_billable') ? 'No' : 'Yes'} />
        <DrawerRow label="Created" value={fmtDate(field(selected, 'created_at'))} />
        <div className="drawer-notes"><span>Description</span><p>{field(selected, 'description') || 'No description.'}</p></div>
      </DetailDrawer>

      <FormModal
        open={showForm}
        title={editing ? 'Edit Time Log' : 'Add Manual Time'}
        subtitle="Writes to dashboard-time-logs with action create/update."
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        actions={<><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={submitting || !canManage}>{submitting ? 'Saving...' : 'Save Time'}</button></>}
      >
        <div className="form-row">
          <div className="form-field"><label>Employee</label><PillSelect value={String(form.employee_id || user?.id || '')} onChange={employee_id => setForm(f => ({ ...f, employee_id }))} disabled={!['owner','admin'].includes(user?.role)} ariaLabel="Choose employee" options={team.map(member=>({value:String(member.id),label:member.name}))}/></div>
          <div className="form-field"><label>Date *</label><input className="dash-input" required type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Project</label><PillSelect value={String(form.project_id||'')} onChange={project_id=>setForm(f=>({...f,project_id,request_id:''}))} ariaLabel="Choose project" options={[{value:'',label:'No project'},...projects.map(project=>({value:String(project.id),label:`${project.client_company||project.client_name} · ${project.name}`}))]}/></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Request</label><PillSelect value={String(form.request_id||'')} onChange={request_id=>setForm(f=>({...f,request_id}))} ariaLabel="Choose request" options={[{value:'',label:'No request'},...requests.filter(request=>!form.project_id||Number(request.project_id)===Number(form.project_id)).map(request=>({value:String(request.id),label:request.title}))]}/></div>
          <div className="form-field"><label>Hours *</label><input className="dash-input" required type="number" step="0.25" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} /></div>
        </div>
        <div className="form-field"><label>Type</label><PillSelect value={form.billable} options={[{ value: 'billable', label: 'Billable' }, { value: 'non_billable', label: 'Non-billable' }]} onChange={billable => setForm(f => ({ ...f, billable }))} ariaLabel="Time type" /></div>
        <div className="form-field"><label>Description</label><textarea className="dash-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      </FormModal>
    </DashLayout>
  );
}
