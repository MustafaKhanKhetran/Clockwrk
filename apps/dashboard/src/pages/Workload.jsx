import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { API_BASE_URL, getToken } from '../utils/auth';

const TERMINAL_STATUSES = ['completed', 'cancelled'];

const field = (item, ...keys) => keys
  .map(key => item?.[key])
  .find(value => value !== undefined && value !== null && value !== '') ?? '';

const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const fetchWithAuth = async (path) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
};

const getList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(payload?.data) ? payload.data : [];
};

const getEmployeeId = (employee) => field(employee, 'id', 'employee_id', 'user_id');

const getAssignedId = (request) => {
  const assigned = field(request, 'assigned_to', 'assigned_to_id', 'assignee_id');
  if (assigned && typeof assigned === 'object') {
    return field(assigned, 'id', 'employee_id', 'user_id');
  }
  return assigned;
};

const isAssignedTo = (request, employee) => {
  const assignedId = getAssignedId(request);
  const employeeId = getEmployeeId(employee);
  return assignedId !== '' && employeeId !== '' && String(assignedId) === String(employeeId);
};

const fmtDate = (date) => date
  ? new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  : '-';

const getInitials = (name) => String(name || '')
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || 'CW';

const formatLabel = (value) => String(value || '-')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase());

const PriorityBadge = ({ value }) => {
  const priority = slug(value || 'normal');
  if (priority === 'high') {
    return (
      <span
        className="badge"
        style={{ color: 'var(--orange)', background: 'var(--orange-dim)', textTransform: 'capitalize' }}
      >
        high
      </span>
    );
  }
  const tone = priority === 'urgent' ? 'red' : priority === 'normal' ? 'blue' : 'muted';
  return <StatusBadge value={priority || 'normal'} tone={tone} />;
};

export default function Workload() {
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWorkload = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamData, requestData] = await Promise.all([
        fetchWithAuth('/api/team'),
        fetchWithAuth('/api/requests'),
      ]);
      setEmployees(getList(teamData, ['employees', 'team']));
      setRequests(getList(requestData, ['requests']));
    } catch (err) {
      console.error(err);
      setError('Failed to load team workload. Check your connection and try again.');
      toast.error('Failed to load workload');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkload();
  }, []);

  const activeRequests = useMemo(
    () => requests
      .filter(request => !TERMINAL_STATUSES.includes(slug(field(request, 'status'))))
      .sort((a, b) => {
        const aDate = field(a, 'due_date');
        const bDate = field(b, 'due_date');
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      }),
    [requests],
  );

  const teamWorkload = useMemo(
    () => employees.map(employee => ({
      employee,
      requestCount: activeRequests.filter(request => isAssignedTo(request, employee)).length,
    })),
    [activeRequests, employees],
  );

  const employeeById = useMemo(
    () => new Map(employees.map(employee => [String(getEmployeeId(employee)), employee])),
    [employees],
  );

  const stats = {
    totalTeam: employees.length,
    activeRequests: activeRequests.length,
    overloaded: teamWorkload.filter(item => item.requestCount > 3).length,
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: request => (
        <div className="client-cell-name">{field(request, 'title') || 'Untitled request'}</div>
      ),
    },
    {
      key: 'project',
      label: 'Project Name',
      render: request => field(request, 'job_title', 'project', 'project_name') || '-',
    },
    {
      key: 'assigned',
      label: 'Assigned To',
      render: request => {
        const assigned = field(request, 'assigned_to');
        const employee = employeeById.get(String(getAssignedId(request)));
        if (employee) return field(employee, 'name') || 'Unnamed employee';
        if (assigned && typeof assigned === 'object') return field(assigned, 'name') || 'Unassigned';
        return 'Unassigned';
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: request => <PriorityBadge value={field(request, 'priority') || 'normal'} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: request => <StatusBadge value={field(request, 'status') || 'queue'} />,
    },
    {
      key: 'due',
      label: 'Due Date',
      render: request => fmtDate(field(request, 'due_date')),
    },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Workload</h2>
          <p>Team capacity and active request distribution</p>
        </div>
        <div
          className="page-header-actions"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}
        >
          {[
            ['Total Team', stats.totalTeam, 'badge-blue'],
            ['Active Requests', stats.activeRequests, 'badge-green'],
            ['Overloaded', stats.overloaded, 'badge-red'],
          ].map(([label, value, tone]) => (
            <div className={`badge ${tone}`} key={label} style={{ gap: '8px', padding: '9px 12px' }}>
              <span>{label}</span>
              <strong>{loading ? '...' : value}</strong>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={loadWorkload}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="card-title">Team Capacity</div>
      {loading ? (
        <div className="card">
          <div className="client-cell-sub">Loading team capacity...</div>
        </div>
      ) : teamWorkload.length === 0 ? (
        <div className="card">
          <div className="empty-state"><p>No team members found</p></div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {teamWorkload.map(({ employee, requestCount }) => {
            const percentage = Math.min(100, (requestCount / 5) * 100);
            const capacityColor = requestCount <= 2
              ? 'var(--green)'
              : requestCount <= 4
                ? 'var(--yellow)'
                : 'var(--red)';

            return (
              <article className="card" key={getEmployeeId(employee) || field(employee, 'email', 'name')}>
                <div className="client-cell">
                  <div className="client-cell-avatar">{getInitials(field(employee, 'name'))}</div>
                  <div>
                    <div className="client-cell-name">{field(employee, 'name') || 'Unnamed employee'}</div>
                    <div className="client-cell-sub">{formatLabel(field(employee, 'role'))}</div>
                  </div>
                  <StatusBadge value={field(employee, 'department') || 'operations'} tone="blue" />
                </div>

                <div style={{ marginTop: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span className="client-cell-sub">Active requests</span>
                    <strong style={{ fontSize: '13px' }}>{requestCount} / 5</strong>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      overflow: 'hidden',
                      borderRadius: '999px',
                      background: 'var(--control-bg)',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        background: capacityColor,
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="card-title">All Active Requests</div>
      <DataTable
        columns={columns}
        rows={activeRequests}
        loading={loading}
        emptyTitle="No active requests"
        emptySubtitle="Active team requests will appear here."
      />
    </DashLayout>
  );
}
