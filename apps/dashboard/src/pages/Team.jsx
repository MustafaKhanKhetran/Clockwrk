import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import DetailDrawer, { DrawerRow } from '../components/DetailDrawer';
import FormModal from '../components/FormModal';
import PillSelect from '../components/PillSelect';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLES, canWrite } from '../config/roles';
import { callDashboardApi, getList } from '../utils/dashboardApi';

const API = '/api/team';
const DEPARTMENTS = ['operations', 'design', 'development', 'finance', 'hr', 'support', 'sales'];
const STATUSES = ['active', 'on_leave', 'inactive'];

const EMPTY_EMPLOYEE = {
  name: '',
  email: '',
  role: 'designer',
  department: 'design',
  salary: '',
  status: 'active',
  joined_date: '',
  assigned_clients: '',
  assigned_projects: '',
  assigned_requests: '',
  permissions: '',
  performance_notes: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const fmtPKR = (n) => n ? 'PKR ' + Number(n).toLocaleString('en-PK') : '-';
const field = (item, ...keys) => keys.map(k => item?.[k]).find(v => v !== undefined && v !== null && v !== '') || '';

export default function Team() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canWrite(user?.role, 'team');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_EMPLOYEE);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [inviteUrl, setInviteUrl] = useState('');

  const fetchTeam = () => {
    setLoading(true);
    setError(null);
    callDashboardApi(API, 'list')
      .then(data => setEmployees(getList(data, ['employees', 'team'])))
      .catch(err => {
        console.error(err);
        setError('Team backend is not available yet. Required webhook: dashboard-team.');
        toast.error('Failed to load team');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeam(); }, []);

  const filtered = useMemo(() => employees.filter(employee => {
    const employeeDepartment = field(employee, 'department') || 'operations';
    const employeeRole = field(employee, 'role') || 'designer';
    const employeeStatus = field(employee, 'status') || 'active';
    const haystack = [field(employee, 'name'), field(employee, 'email'), employeeDepartment, employeeRole].join(' ').toLowerCase();
    if (department !== 'all' && employeeDepartment !== department) return false;
    if (role !== 'all' && employeeRole !== role) return false;
    if (status !== 'all' && employeeStatus !== status) return false;
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return true;
  }), [employees, search, department, role, status]);

  const stats = {
    active: employees.filter(e => (field(e, 'status') || 'active') === 'active').length,
    overloaded: employees.filter(e => Number(field(e, 'workload_percentage') || 0) >= 90).length,
    overdue: employees.reduce((sum, e) => sum + Number(field(e, 'overdue_tasks') || 0), 0),
    hours: employees.reduce((sum, e) => sum + Number(field(e, 'hours_logged_week') || 0), 0),
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_EMPLOYEE);
    setShowForm(true);
  };

  const openEdit = (employee) => {
    setEditing(employee);
    setForm({ ...EMPTY_EMPLOYEE, ...employee });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    try {
      const result = await callDashboardApi(API, editing ? 'update' : 'create', { employee_id: editing?.id, ...form, dashboard_base_url: window.location.origin });
      if (!editing && result.invite_url) setInviteUrl(result.invite_url);
      toast.success(editing ? 'Employee updated' : 'Employee added');
      setShowForm(false);
      fetchTeam();
    } catch (err) {
      toast.error('Team backend action failed. Check dashboard-team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (employee) => {
    if (!canManage) return;
    try {
      await callDashboardApi(API, 'deactivate', { employee_id: employee.id });
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, status: 'inactive' } : e));
      toast.success('Employee deactivated');
    } catch (err) {
      toast.error('Deactivate needs dashboard-team backend support.');
    }
  };

  const columns = [
    { key: 'employee', label: 'Employee', render: e => (
      <div className="client-cell">
        <div className="client-cell-avatar">{field(e, 'name').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CW'}</div>
        <div>
          <div className="client-cell-name">{field(e, 'name') || 'Unnamed employee'}</div>
          <div className="client-cell-sub">{field(e, 'email') || 'No email'}</div>
        </div>
      </div>
    ) },
    { key: 'role', label: 'Role', render: e => ROLE_LABELS[field(e, 'role')] || field(e, 'role') || '-' },
    { key: 'department', label: 'Department', render: e => <StatusBadge value={field(e, 'department') || 'operations'} tone="blue" /> },
    { key: 'status', label: 'Status', render: e => <StatusBadge value={field(e, 'status') || 'active'} /> },
    { key: 'workload', label: 'Workload', render: e => `${Number(field(e, 'workload_percentage') || 0)}%` },
    { key: 'tasks', label: 'Tasks', render: e => `${field(e, 'active_tasks') || 0} active · ${field(e, 'overdue_tasks') || 0} overdue` },
    { key: 'hours', label: 'Week Hours', render: e => Number(field(e, 'hours_logged_week') || 0).toFixed(1) },
    { key: 'actions', label: '', stopClick: true, render: e => canManage ? (
      <div className="table-actions">
        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(e)}>Edit</button>
        {(field(e, 'status') || 'active') !== 'inactive' && <button className="btn btn-sm btn-danger" onClick={() => handleDeactivate(e)}>Deactivate</button>}
      </div>
    ) : <span className="backend-note">Read only</span> },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Team</h2>
          <p>{stats.active} active · {stats.overloaded} overloaded · {stats.hours.toFixed(1)} hours this week</p>
        </div>
        <div className="page-header-actions">
          <span className="backend-note">Webhook: dashboard-team</span>
          {canManage && <button className="btn btn-primary" onClick={openCreate}>+ Add Employee</button>}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchTeam}>Retry</button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Active Employees" value={stats.active} sub={`${employees.length} team records`} />
        <StatCard label="Overloaded" value={stats.overloaded} trend={{ direction: stats.overloaded ? 'down' : 'neutral', label: stats.overloaded ? 'Rebalance workload' : 'Balanced' }} />
        <StatCard label="Overdue Tasks" value={stats.overdue} sub="Across the team" />
        <StatCard label="Hours This Week" value={stats.hours.toFixed(1)} sub="Logged time" />
      </div>

      <div className="ops-toolbar">
        <input className="dash-input" placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)} />
        <PillSelect value={department} options={[{ value: 'all', label: 'All departments' }, ...DEPARTMENTS]} onChange={setDepartment} ariaLabel="Filter department" />
        <PillSelect value={role} options={[{ value: 'all', label: 'All roles' }, ...ROLES]} onChange={setRole} ariaLabel="Filter role" />
        <PillSelect value={status} options={[{ value: 'all', label: 'All statuses' }, ...STATUSES]} onChange={setStatus} ariaLabel="Filter status" />
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={employee => navigate(`/team/${employee.id}`)} emptyTitle="No employees found" emptySubtitle="No team members match these filters." />

      <DetailDrawer
        open={selected}
        title={field(selected, 'name') || 'Employee'}
        subtitle={`${ROLE_LABELS[field(selected, 'role')] || field(selected, 'role') || 'Team'} · ${field(selected, 'department') || 'No department'}`}
        onClose={() => setSelected(null)}
        actions={canManage && <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit employee</button>}
      >
        <DrawerRow label="Email" value={field(selected, 'email')} />
        <DrawerRow label="Status"><StatusBadge value={field(selected, 'status') || 'active'} /></DrawerRow>
        <DrawerRow label="Salary" value={fmtPKR(field(selected, 'salary'))} />
        <DrawerRow label="Joined" value={fmtDate(field(selected, 'joined_date', 'joined_at'))} />
        <DrawerRow label="Assigned Clients" value={field(selected, 'assigned_clients')} />
        <DrawerRow label="Assigned Projects" value={field(selected, 'assigned_projects')} />
        <DrawerRow label="Assigned Requests" value={field(selected, 'assigned_requests')} />
        <DrawerRow label="Active Tasks" value={field(selected, 'active_tasks') || 0} />
        <DrawerRow label="Completed Tasks" value={field(selected, 'completed_tasks') || 0} />
        <DrawerRow label="Overdue Tasks" value={field(selected, 'overdue_tasks') || 0} />
        <DrawerRow label="Hours Week" value={field(selected, 'hours_logged_week') || 0} />
        <DrawerRow label="Hours Month" value={field(selected, 'hours_logged_month') || 0} />
        <DrawerRow label="Permissions" value={field(selected, 'permissions')} />
        <div className="drawer-notes"><span>Performance Notes</span><p>{field(selected, 'performance_notes') || 'No performance notes yet.'}</p></div>
      </DetailDrawer>

      <FormModal
        open={showForm}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        subtitle={editing ? 'Update role, department and account status.' : 'The employee stays inactive until they set a private password from their invite.'}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        size="modal-lg"
        actions={<><button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={submitting || !canManage}>{submitting ? 'Creating...' : editing ? 'Save employee' : 'Create employee & invite'}</button></>}
      >
        <div className="form-row">
          <div className="form-field"><label>Name *</label><input className="dash-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="form-field"><label>Email *</label><input className="dash-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Role</label><PillSelect value={form.role} options={ROLES.filter(r => r !== 'owner')} onChange={role => setForm(f => ({ ...f, role }))} ariaLabel="Employee role" /></div>
          <div className="form-field"><label>Department</label><PillSelect value={form.department} options={DEPARTMENTS} onChange={department => setForm(f => ({ ...f, department }))} ariaLabel="Department" /></div>
        </div>
        <div className="form-row">
          {editing ? <div className="form-field"><label>Status</label><PillSelect value={form.status} options={STATUSES} onChange={status => setForm(f => ({ ...f, status }))} ariaLabel="Employee status" /></div> : <div className="account-invite-note"><strong>Password setup</strong><span>The account remains inactive until the employee opens the invite and creates a password.</span></div>}
          <div className="form-field"><label>Salary</label><input className="dash-input" type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label>Joined Date</label><input className="dash-input" type="date" value={form.joined_date || ''} onChange={e => setForm(f => ({ ...f, joined_date: e.target.value }))} /></div>
          <div className="form-field"><label>Permissions</label><input className="dash-input" value={form.permissions} onChange={e => setForm(f => ({ ...f, permissions: e.target.value }))} /></div>
        </div>
        <div className="form-field"><label>Assigned Clients</label><input className="dash-input" value={form.assigned_clients} onChange={e => setForm(f => ({ ...f, assigned_clients: e.target.value }))} /></div>
        <div className="form-field"><label>Assigned Projects</label><input className="dash-input" value={form.assigned_projects} onChange={e => setForm(f => ({ ...f, assigned_projects: e.target.value }))} /></div>
        <div className="form-field"><label>Assigned Requests</label><input className="dash-input" value={form.assigned_requests} onChange={e => setForm(f => ({ ...f, assigned_requests: e.target.value }))} /></div>
        <div className="form-field"><label>Performance Notes</label><textarea className="dash-input" rows={3} value={form.performance_notes} onChange={e => setForm(f => ({ ...f, performance_notes: e.target.value }))} /></div>
      </FormModal>
      <FormModal open={Boolean(inviteUrl)} title="Employee login is ready" subtitle="Send this private link to the employee. They choose their own password; no default password exists." onClose={()=>setInviteUrl('')} onSubmit={e=>e.preventDefault()} actions={<><button type="button" className="btn btn-ghost" onClick={()=>setInviteUrl('')}>Done</button><button type="button" className="btn btn-primary" onClick={()=>navigator.clipboard.writeText(inviteUrl).then(()=>toast.success('Setup link copied'))}>Copy setup link</button></>}><div className="account-setup-flow"><span><b>1</b> Copy the invite</span><span><b>2</b> Employee opens it within 72 hours</span><span><b>3</b> Employee creates a password and the account activates</span></div><div className="secure-link-box"><code>{inviteUrl}</code></div></FormModal>
    </DashLayout>
  );
}
