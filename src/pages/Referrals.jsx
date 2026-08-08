import { useEffect, useState } from 'react';
import DashLayout from '../components/DashLayout';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import InsightStrip from '../components/InsightStrip';
import { apiGet, apiPost } from '../utils/dashboardApi';

const API = '/api/referrals';

export default function Referrals() {
  const [summary, setSummary] = useState(null);
  const [referrers, setReferrers] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('referrers');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    apiGet(API)
      .then(data => {
        if (data.success) {
          setSummary(data.summary);
          setReferrers(data.referrers || []);
          setConversions(data.conversions || []);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load data. Check your connection and try again.');
        toast.error('Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleMarkPaid = async (referralId) => {
    try {
      await apiPost(API, { action: 'mark_paid', referral_id: referralId });
      setConversions(prev => prev.map(c =>
        c.id === referralId ? { ...c, status: 'paid', rewarded_at: new Date().toISOString() } : c
      ));
      toast.success('Referral marked as paid');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const fmtUSD = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const filteredReferrers = referrers.filter(r =>
    !search ||
    r.referrer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.referrer_email?.toLowerCase().includes(search.toLowerCase()) ||
    r.referral_code?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConversions = conversions.filter(c =>
    !search ||
    c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.client_email?.toLowerCase().includes(search.toLowerCase()) ||
    c.referrer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.referral_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Referrals</h2>
          <p>Track referrers, conversions and commission payouts</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
            <span>!</span>
            <span style={{ fontSize: '13px' }}>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setError(null); fetchData(); }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {summary && (
        <>
          <InsightStrip
            items={[
              { label: 'Referral network', value: Number(summary.total_referrers || 0).toLocaleString(), dark: true, icon: '↗', bars: [42, 58, 64, 76, 54, 88] },
              { label: 'Conversions', value: Number(summary.total_conversions || 0).toLocaleString(), icon: '✓', visual: 'heatmap' },
              { label: 'Commission owed', value: fmtUSD(summary.total_owed), icon: '$', bars: [26, 48, 38, 58, 44, 62] },
            ]}
          />
          <div className="stat-grid referrals-summary-grid">
            <div className="stat-card">
              <div className="stat-label">Total Referrers</div>
              <div className="stat-value">{Number(summary.total_referrers || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Conversions</div>
              <div className="stat-value">{Number(summary.total_conversions || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Commission Owed</div>
              <div className="stat-value">{fmtUSD(summary.total_owed)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Paid Out</div>
              <div className="stat-value">{fmtUSD(summary.total_paid_out)}</div>
            </div>
          </div>
        </>
      )}

      <div className="referrals-toolbar">
        <div className="referrals-tabs">
          <button
            className={`referrals-tab ${activeTab === 'referrers' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrers')}
          >
            Referrers ({referrers.length})
          </button>
          <button
            className={`referrals-tab ${activeTab === 'conversions' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversions')}
          >
            Conversions ({conversions.length})
          </button>
        </div>
        <input
          className="dash-input referrals-search"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : activeTab === 'referrers' ? (
        <div className="card">
          {filteredReferrers.length === 0 ? (
            <div className="empty-state"><p>No referrers yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Referrer</th>
                  <th>Code</th>
                  <th>Verified</th>
                  <th>Conversions</th>
                  <th>Total Earned</th>
                  <th>Pending</th>
                  <th>Paid Out</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrers.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <div className="client-cell-name">{r.referrer_name || '-'}</div>
                      <div className="client-cell-sub">{r.referrer_email}</div>
                    </td>
                    <td>
                      <span className="badge badge-muted code-badge">
                        {r.referral_code}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.is_verified ? 'badge-green' : 'badge-yellow'}`}>
                        {r.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="table-strong">{r.total_conversions || 0}</td>
                    <td className="table-strong">{fmtUSD(r.total_earned)}</td>
                    <td>
                      <span className={Number(r.total_pending) > 0 ? 'text-warning' : ''}>
                        {fmtUSD(r.total_pending)}
                      </span>
                    </td>
                    <td>
                      <span className={Number(r.total_paid) > 0 ? 'text-success' : ''}>
                        {fmtUSD(r.total_paid)}
                      </span>
                    </td>
                    <td>{fmtDate(r.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          {filteredConversions.length === 0 ? (
            <div className="empty-state"><p>No conversions yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Referred by</th>
                  <th>Code</th>
                  <th>Plan</th>
                  <th>Order Amount</th>
                  <th>Commission (5%)</th>
                  <th>Status</th>
                  <th>Converted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredConversions.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="client-cell-name">{c.client_name || '-'}</div>
                      <div className="client-cell-sub">{c.client_email}</div>
                    </td>
                    <td>{c.referrer_name || c.referrer_id || '-'}</td>
                    <td>
                      <span className="badge badge-muted code-badge">
                        {c.referral_code || '-'}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{c.plan_tier}</td>
                    <td>{fmtUSD(c.order_amount)}</td>
                    <td className="table-strong">{fmtUSD(c.reward_amount)}</td>
                    <td>
                      <span className={`badge ${c.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{fmtDate(c.converted_at || c.created_at)}</td>
                    <td>
                      {c.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleMarkPaid(c.id)}
                        >
                          Mark paid
                        </button>
                      )}
                      {c.status === 'paid' && (
                        <span className="paid-meta">
                          Paid {fmtDate(c.rewarded_at)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </DashLayout>
  );
}
