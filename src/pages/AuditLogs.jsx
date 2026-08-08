import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { API_BASE_URL, getToken } from '../utils/auth';

const field = (item, ...keys) => keys
  .map(key => item?.[key])
  .find(value => value !== undefined && value !== null && value !== '') ?? '';

const getLogs = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.audit_logs)) return payload.audit_logs;
  if (Array.isArray(payload?.logs)) return payload.logs;
  return Array.isArray(payload?.data) ? payload.data : [];
};

const fmtTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getTimestamp = (log) => field(log, 'timestamp', 'created_at', 'createdAt', 'date');

const getUserLabel = (log) => {
  const user = field(log, 'user');
  if (user && typeof user === 'object') {
    return field(user, 'name', 'email') || 'Unknown user';
  }
  return field(log, 'user_name', 'name', 'user_email', 'email') || user || 'Unknown user';
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/audit-logs`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        const data = await response.json().catch(() => ({}));
        setLogs(getLogs(data));
      } catch (err) {
        console.warn('Audit logs are unavailable:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...logs]
      .sort((a, b) => {
        const aTime = new Date(getTimestamp(a)).getTime() || 0;
        const bTime = new Date(getTimestamp(b)).getTime() || 0;
        return bTime - aTime;
      })
      .filter(log => {
        if (!query) return true;
        return String(field(log, 'action', 'event', 'type')).toLowerCase().includes(query)
          || String(getUserLabel(log)).toLowerCase().includes(query);
      });
  }, [logs, search]);

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: log => fmtTimestamp(getTimestamp(log)),
    },
    {
      key: 'user',
      label: 'User',
      render: log => <div className="client-cell-name">{getUserLabel(log)}</div>,
    },
    {
      key: 'action',
      label: 'Action',
      render: log => <StatusBadge value={field(log, 'action', 'event', 'type') || 'unknown'} tone="blue" />,
    },
    {
      key: 'details',
      label: 'Details',
      render: log => {
        const details = field(log, 'details', 'description', 'message', 'metadata');
        return typeof details === 'object' ? JSON.stringify(details) : details || '-';
      },
    },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Audit Logs</h2>
          <p>Review recent account and system activity</p>
        </div>
        <div className="page-header-actions" style={{ minWidth: '280px' }}>
          <input
            className="dash-input"
            type="search"
            placeholder="Search user or action..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredLogs}
        loading={loading}
        emptyTitle="No audit logs found"
      />
    </DashLayout>
  );
}
