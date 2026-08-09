import { useEffect, useState } from 'react';
import DashLayout from '../components/DashLayout';
import PillSelect from '../components/PillSelect';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import { apiDelete, apiFetch, apiGet, apiPost } from '../utils/dashboardApi';

const API = '/api/alerts';

const ALERT_ICONS = {
  booking: '📅',
  payment: '💰',
  newsletter: '✉️',
  referral: '🔗',
  application: '📋',
  system: '⚙️',
  error: '🔴',
  support: '🎫',
  message: '💬',
};

const ALERT_COLORS = {
  booking: 'alert-blue',
  payment: 'alert-green',
  newsletter: 'alert-accent',
  referral: 'alert-yellow',
  application: 'alert-blue',
  system: 'alert-muted',
  error: 'alert-red',
  support: 'alert-yellow',
  message: 'alert-accent',
};

// 'support' and 'message' come from the client portal (tickets and messages).
const TYPES = ['booking', 'payment', 'newsletter', 'referral', 'application', 'support', 'message', 'system', 'error'];
const READ_FILTERS = [
  { value: 'all', label: 'All alerts' },
  { value: 'unread', label: 'Unread only' },
  { value: 'read', label: 'Read only' },
];
const TYPE_FILTERS = [{ value: 'all', label: 'All types' }, ...TYPES];

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [error, setError] = useState(null);

  const fetchAlerts = () => {
    setLoading(true);
    setError(null);
    apiGet(API)
      .then(data => {
        if (data.success) {
          setAlerts(data.alerts || []);
          setUnreadCount(data.unread_count || 0);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load data. Check your connection and try again.');
        toast.error('Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleMarkRead = async (alertId) => {
    try {
      await apiFetch(`${API}/${alertId}/read`, { method: 'PATCH' });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: 1 } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPost(`${API}/mark-all-read`);
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
      setUnreadCount(0);
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all read alerts? This cannot be undone.')) return;
    try {
      await apiDelete(`${API}/clear-read`);
      setAlerts(prev => prev.filter(a => !a.is_read));
      toast.success('Read alerts cleared');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filtered = alerts.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterRead === 'unread' && a.is_read) return false;
    if (filterRead === 'read' && !a.is_read) return false;
    return true;
  });

  const readCount = alerts.filter(a => a.is_read).length;

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Alerts</h2>
          <p>{unreadCount} unread · {alerts.length} total</p>
        </div>
        <div className="page-header-actions">
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
          {readCount > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
              Clear read ({readCount})
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={fetchAlerts}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
            <span>!</span>
            <span style={{ fontSize: '13px' }}>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setError(null); fetchAlerts(); }}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="clients-filters alerts-filters">
        <PillSelect value={filterRead} options={READ_FILTERS} onChange={setFilterRead} ariaLabel="Filter read status" />
        <PillSelect value={filterType} options={TYPE_FILTERS} onChange={setFilterType} ariaLabel="Filter alert type" />
      </div>

      {loading ? (
        <SkeletonBlock rows={5} />
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><p>No alerts found</p></div></div>
      ) : (
        <div className="alerts-list-full">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`alert-item ${ALERT_COLORS[a.type] || 'alert-muted'} ${!a.is_read ? 'alert-unread' : ''}`}
              onClick={() => !a.is_read && handleMarkRead(a.id)}
            >
              <div className="alert-item-icon">
                {ALERT_ICONS[a.type] || '🔔'}
              </div>
              <div className="alert-item-body">
                <div className="alert-item-title">
                  {a.title}
                  {!a.is_read && <span className="alert-unread-dot" />}
                </div>
                {a.message && (
                  <div className="alert-item-message">{a.message}</div>
                )}
                <div className="alert-item-meta">
                  <span className="badge badge-muted">{a.type}</span>
                  <span className="alert-item-time">{fmtDate(a.created_at)}</span>
                </div>
              </div>
              <div className="alert-item-actions">
                {a.link && (
                  <a href={a.link} className="btn btn-sm btn-ghost" onClick={e => e.stopPropagation()}>
                    View
                  </a>
                )}
                {!a.is_read && (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={e => { e.stopPropagation(); handleMarkRead(a.id); }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashLayout>
  );
}
