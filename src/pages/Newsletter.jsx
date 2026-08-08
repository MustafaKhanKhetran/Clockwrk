import { useEffect, useState } from 'react';
import DashLayout from '../components/DashLayout';
import PillSelect from '../components/PillSelect';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import InsightStrip from '../components/InsightStrip';
import { apiGet, apiPost } from '../utils/dashboardApi';

const API = '/api/newsletter';

const LIST_FILTERS = [
  { value: 'all', label: 'All lists' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'careers', label: 'Careers' },
];
const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
];

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, marketing: 0, careers: 0 });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    html: '',
    list_type: 'marketing'
  });

  const fetchSubscribers = () => {
    setLoading(true);
    setError(null);
    apiGet(API)
      .then(data => {
        if (data.success) {
          setSubscribers(data.subscribers || []);
          setCounts(data.counts || { total: 0, active: 0, marketing: 0, careers: 0 });
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load data. Check your connection and try again.');
        toast.error('Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const handleUnsubscribe = async (email) => {
    if (!window.confirm(`Unsubscribe ${email}?`)) return;
    try {
      await apiPost(API, { action: 'unsubscribe', email });
      setSubscribers(prev => prev.map(s =>
        s.email === email ? { ...s, status: 'unsubscribed' } : s
      ));
      toast.success('Subscriber removed');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.html.trim()) return;
    const recipientCount = subscribers.filter(s =>
      s.status === 'active' && s.type === form.list_type
    ).length;
    if (!window.confirm(`Send to ${recipientCount} active ${form.list_type} subscribers?`)) return;
    setSending(true);
    setSendResult(null);
    try {
      const data = await apiPost(API, { action: 'send', ...form });
      setSendResult(data);
      if (data.success) {
        setForm({ subject: '', html: '', list_type: 'marketing' });
        setShowCompose(false);
        toast.success('Newsletter sent');
      }
    } catch (err) {
      setSendResult({ success: false, message: err.message });
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const filtered = subscribers.filter(s => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (search && !s.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }) : '-';

  const recipientCount = subscribers.filter(s =>
    s.status === 'active' && s.type === form.list_type
  ).length;

  const composeListOptions = [
    { value: 'marketing', label: `Marketing (${counts.marketing} active)` },
    { value: 'careers', label: `Careers (${counts.careers} active)` },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Newsletter</h2>
          <p>{counts.active} active subscribers · {counts.marketing} marketing · {counts.careers} careers</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCompose(true)}>
            + Compose
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
            <span>!</span>
            <span style={{ fontSize: '13px' }}>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setError(null); fetchSubscribers(); }}>
              Retry
            </button>
          </div>
        </div>
      )}

      <InsightStrip
        items={[
          { label: 'Subscriber base', value: counts.total, dark: true, icon: '↗', bars: [40, 62, 54, 76, 68, 86] },
          { label: 'Active readers', value: counts.active, icon: '✓', visual: 'heatmap' },
          { label: 'Marketing list', value: counts.marketing, icon: 'M', bars: [28, 44, 56, 66, 52, 72] },
          { label: 'Careers list', value: counts.careers, icon: 'H', bars: [22, 38, 48, 58, 44, 64] },
        ]}
      />

      <div className="stat-grid newsletter-summary-grid">
        <div className="stat-card">
          <div className="stat-label">Total Subscribers</div>
          <div className="stat-value">{counts.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{counts.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marketing List</div>
          <div className="stat-value">{counts.marketing}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Careers List</div>
          <div className="stat-value">{counts.careers}</div>
        </div>
      </div>

      {sendResult && (
        <div className={`card send-result ${sendResult.success ? 'send-result-success' : 'send-result-error'}`}>
          <p>{sendResult.message || (sendResult.success ? `Sent to ${sendResult.sent} subscribers` : 'Send failed')}</p>
          <button className="btn btn-sm btn-ghost" onClick={() => setSendResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="clients-filters newsletter-filters">
        <input
          className="dash-input clients-search"
          placeholder="Search by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <PillSelect value={filterType} options={LIST_FILTERS} onChange={setFilterType} ariaLabel="Filter newsletter list" />
        <PillSelect value={filterStatus} options={STATUS_FILTERS} onChange={setFilterStatus} ariaLabel="Filter subscriber status" />
      </div>

      <div className="card">
        {loading ? (
          <SkeletonBlock rows={6} bare />
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No subscribers found</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>List</th>
                <th>Source</th>
                <th>Status</th>
                <th>Subscribed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="table-strong">{s.email}</td>
                  <td>
                    <span className={`badge ${s.type === 'marketing' ? 'badge-blue' : 'badge-accent'}`}>
                      {s.type}
                    </span>
                  </td>
                  <td>{s.source || '-'}</td>
                  <td>
                    <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-muted'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>{fmtDate(s.subscribed_at)}</td>
                  <td>
                    {s.status === 'active' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleUnsubscribe(s.email)}
                      >
                        Unsubscribe
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Compose Newsletter</h3>
                <p>Sending to {recipientCount} active {form.list_type} subscribers</p>
              </div>
              <button className="drawer-close" onClick={() => setShowCompose(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleSend}>
              <div className="form-row">
                <div className="form-field">
                  <label>Send to list *</label>
                  <PillSelect
                    value={form.list_type}
                    options={composeListOptions}
                    onChange={list_type => setForm(f => ({ ...f, list_type }))}
                    ariaLabel="Select newsletter list"
                  />
                </div>
                <div className="form-field">
                  <label>Subject line *</label>
                  <input
                    className="dash-input"
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Your subject line..."
                  />
                </div>
              </div>
              <div className="form-field">
                <label>HTML body *</label>
                <textarea
                  className="dash-input newsletter-html-input"
                  required
                  rows={12}
                  value={form.html}
                  onChange={e => setForm(f => ({ ...f, html: e.target.value }))}
                  placeholder="<div>Your email HTML here...</div>"
                />
              </div>
              {form.html && (
                <div className="newsletter-preview">
                  <div className="newsletter-preview-label">Preview</div>
                  <div
                    className="newsletter-preview-body"
                    dangerouslySetInnerHTML={{ __html: form.html }}
                  />
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Sending...' : `Send to ${recipientCount} subscribers`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
