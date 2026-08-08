import { useEffect, useState } from 'react';
import { callDashboardApi, getList } from '../utils/dashboardApi';

const API = '/api/communications';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}) : '-';

export default function CommunicationTimeline({ clientId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTimeline = () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    callDashboardApi(API, 'list_by_client', { client_id: clientId })
      .then(data => setItems(getList(data, ['timeline', 'communications', 'logs'])))
      .catch(err => {
        console.error(err);
        setError('Communication timeline backend required: dashboard-communications and communication_logs.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTimeline(); }, [clientId]);

  return (
    <div className="linked-panel">
      <div className="linked-panel-header">
        <span>Communication Timeline</span>
      </div>
      {loading ? (
        <p className="form-hint">Loading timeline...</p>
      ) : error ? (
        <p className="form-hint">{error}</p>
      ) : items.length ? (
        <div className="timeline-list">
          {items.map(item => (
            <div className="timeline-item" key={item.id || `${item.source}-${item.created_at}`}>
              <div className="timeline-dot" />
              <div>
                <strong>{item.title || item.action || item.source || 'Update'}</strong>
                <p>{item.content || item.message || 'No content'}</p>
                <span>{item.user || item.employee_name || item.source || 'system'} · {fmtDate(item.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="form-hint">No timeline activity yet.</p>
      )}
    </div>
  );
}
