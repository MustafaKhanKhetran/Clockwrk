import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import SkeletonBlock from '../components/SkeletonBlock';
import StatusBadge from '../components/StatusBadge';
import PillSelect from '../components/PillSelect';
import { toast } from '../components/Toast';
import { API_BASE_URL, getToken, getUser } from '../utils/auth';

const TODAY = new Date().toISOString().split('T')[0];
const EMPTY_TIME_LOG = {
  project_id: '',
  hours: '',
  description: '',
  log_date: TODAY,
};

const field = (item, ...keys) => keys
  .map(key => item?.[key])
  .find(value => value !== undefined && value !== null && value !== '') ?? '';

const getList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const authFetch = async (path, options = {}) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
};

const fmtDate = (date) => date
  ? new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  : 'No due date';

const isSameId = (value, userId) => {
  const assignedId = typeof value === 'object'
    ? field(value, 'id', 'user_id', 'employee_id')
    : value;
  return String(assignedId) === String(userId);
};

const getWeekBounds = () => {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

export default function MyWork() {
  const user = getUser();
  const [requests, setRequests] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogTime, setShowLogTime] = useState(false);
  const [form, setForm] = useState(EMPTY_TIME_LOG);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [requestData, timeData, projectData] = await Promise.all([
        authFetch(`/api/requests?employee_id=${encodeURIComponent(user?.id || '')}`),
        authFetch(`/api/time-logs?employee_id=${encodeURIComponent(user?.id || '')}`),
        authFetch(`/api/projects?employee_id=${encodeURIComponent(user?.id || '')}`),
      ]);
      setRequests(getList(requestData, ['requests']));
      setTimeLogs(getList(timeData, ['time_logs', 'logs', 'entries']));
      setProjects(getList(projectData, ['projects']));
    } catch (err) {
      console.error(err);
      setError('Failed to load your work. Check your connection and try again.');
      toast.error('Failed to load My Work');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const myRequests = useMemo(
    () => requests.filter(request => {
      const status = String(field(request, 'status')).toLowerCase();
      return !['completed', 'cancelled'].includes(status) && isSameId(
        field(request, 'assigned_to', 'assigned_to_id', 'assignee_id'),
        user?.id,
      );
    }),
    [requests, user?.id],
  );

  const weeklyHours = useMemo(() => {
    const { start, end } = getWeekBounds();
    return timeLogs.reduce((total, log) => {
      const rawDate = field(log, 'log_date', 'date');
      if (!rawDate) return total;
      const logDate = new Date(`${String(rawDate).slice(0, 10)}T00:00:00`);
      if (Number.isNaN(logDate.getTime()) || logDate < start || logDate >= end) return total;
      return total + Number(field(log, 'hours', 'duration', 'manual_hours') || 0);
    }, 0);
  }, [timeLogs]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await authFetch('/api/time-logs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          project_id: Number.isNaN(Number(form.project_id)) ? form.project_id : Number(form.project_id),
          hours: Number(form.hours),
        }),
      });
      const createdLog = result.time_log || result.log || result.data;
      if (createdLog && !Array.isArray(createdLog)) {
        setTimeLogs(previous => [createdLog, ...previous]);
      } else {
        const refreshed = await authFetch('/api/time-logs');
        setTimeLogs(getList(refreshed, ['time_logs', 'logs', 'entries']));
      }
      setForm(EMPTY_TIME_LOG);
      setShowLogTime(false);
      toast.success('Time logged');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to log time');
    } finally {
      setSubmitting(false);
    }
  };

  const firstName = field(user, 'name', 'first_name')?.split(' ')[0] || 'there';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Good morning, {firstName}</h2>
          <p>{todayLabel}</p>
        </div>
        <div className="page-header-actions">
          <button
            className={`btn ${showLogTime ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => setShowLogTime(open => !open)}
          >
            {showLogTime ? 'Cancel' : '+ Log Time'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchData}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: 'minmax(220px, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">My Time This Week</div>
          <div className="stat-value">{weeklyHours.toFixed(1)} hrs</div>
          <div className="client-cell-sub">Monday through today</div>
        </div>
      </div>

      {showLogTime && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="card-title">Log Time</div>
          <div className="form-row">
            <div className="form-field">
              <label>Project *</label>
              <PillSelect
                value={String(form.project_id || '')}
                onChange={project_id => setForm(current => ({ ...current, project_id }))}
                ariaLabel="Select a project"
                options={[{ value: '', label: 'Select a project' }, ...projects.map(project => ({ value: String(field(project, 'id', 'project_id')), label: field(project, 'project_name', 'name', 'title') || 'Untitled project' }))]}
              />
            </div>
            <div className="form-field">
              <label>Hours *</label>
              <input
                className="dash-input"
                type="number"
                min="0.25"
                step="0.25"
                required
                value={form.hours}
                onChange={event => setForm(current => ({ ...current, hours: event.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Description *</label>
              <input
                className="dash-input"
                type="text"
                required
                placeholder="What did you work on?"
                value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Date *</label>
              <input
                className="dash-input"
                type="date"
                required
                value={form.log_date}
                onChange={event => setForm(current => ({ ...current, log_date: event.target.value }))}
              />
            </div>
          </div>
          <div className="page-header-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Time'}
            </button>
          </div>
        </form>
      )}

      <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>My Active Requests</span>
        <small>{myRequests.length}</small>
      </div>

      {loading ? (
        <SkeletonBlock rows={4} />
      ) : myRequests.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No active requests assigned to you</p>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {myRequests.map(request => {
            const completion = Math.min(100, Math.max(0, Number(field(request, 'completion_percent') || 0)));
            return (
              <article className="card" key={field(request, 'id', 'request_id')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div className="client-cell-name">{field(request, 'title') || 'Untitled request'}</div>
                    <div className="client-cell-sub">
                      {field(request, 'job_title', 'project', 'project_name') || 'No project'}
                    </div>
                  </div>
                  <StatusBadge value={field(request, 'status') || 'queue'} />
                </div>

                <div style={{ marginTop: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span className="client-cell-sub">Progress</span>
                    <span className="client-cell-sub">{completion}%</span>
                  </div>
                  <div style={{ height: '7px', borderRadius: '999px', overflow: 'hidden', background: 'var(--control-bg)' }}>
                    <div
                      style={{
                        width: `${completion}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        background: 'var(--accent)',
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span className="client-cell-sub">Due date</span>
                  <span style={{ fontSize: '12px' }}>{fmtDate(field(request, 'due_date'))}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashLayout>
  );
}
