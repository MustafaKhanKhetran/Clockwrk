import { useEffect, useState } from 'react';
import DashLayout from '../components/DashLayout';
import PillSelect from '../components/PillSelect';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import InsightStrip from '../components/InsightStrip';
import { apiGet, apiPost, apiFetch } from '../utils/dashboardApi';

const API = '/api/finance';
const RATE_URL = '/api/rate/usd-pkr';
const PKR_RATE = 275.62;

const EXPENSE_CATEGORIES = ['software', 'salary', 'marketing', 'infrastructure', 'misc'];

const EMPTY_EXPENSE = {
  category: 'misc',
  description: '',
  amount: '',
  currency: 'PKR',
  date: new Date().toISOString().split('T')[0],
  notes: ''
};

export default function Finance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  // ElevatePay releases
  const [releaseForm, setReleaseForm] = useState({ amount_usd: '', fee_usd: '30', notes: '' });
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [approvingRelease, setApprovingRelease] = useState(null);
  const [approveForm, setApproveForm] = useState({ exchange_rate: '', fee_usd: '30', screenshot_url: '', rejection_reason: '' });
  const [processingReleaseId, setProcessingReleaseId] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(PKR_RATE);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    apiGet(API)
      .then(d => { if (d.success) setData(d); })
      .catch(err => {
        console.error(err);
        setError('Failed to load data. Check your connection and try again.');
        toast.error('Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    apiGet(RATE_URL)
      .then(result => {
        if (result.success && result.rate) setExchangeRate(Number(result.rate));
      })
      .catch(() => {});
  }, []);

  const openAddExpense = () => {
    setExpenseForm(EMPTY_EXPENSE);
    setShowAddExpense(true);
  };

  const closeExpenseModal = () => {
    setShowAddExpense(false);
    setExpenseForm(EMPTY_EXPENSE);
  };

  const handleConfirmPayment = async (payment) => {
    if (!window.confirm(`Confirm payment from ${payment.name} — $${Number(payment.amount || 0).toFixed(2)} USD? This will activate their account and send a welcome email.`)) return;
    setConfirmingId(payment.id);
    try {
      await apiPost(`${API}/payments/${payment.id}/confirm`, {
        exchange_rate: exchangeRate,
        fee_usd: 30,
      });
      setData(prev => ({
        ...prev,
        payments: prev.payments.map(p =>
          p.id === payment.id ? { ...p, status: 'confirmed', confirmed_at: new Date().toISOString() } : p
        )
      }));
      toast.success('Payment confirmed and client activated');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`${API}/expenses`, { ...expenseForm, currency: expenseForm.currency || 'PKR' });
      closeExpenseModal();
      fetchData();
      toast.success('Expense added');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`${API}/expenses/${editingExpense.id}`, {
        method: 'PATCH',
        body: { ...editingExpense, currency: editingExpense.currency || 'PKR' },
      });
      setEditingExpense(null);
      fetchData();
      toast.success('Expense updated');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    setDeletingId(expenseId);
    try {
      await apiFetch(`${API}/expenses/${expenseId}`, { method: 'DELETE' });
      setData(prev => ({
        ...prev,
        expenses: (prev?.expenses || []).filter(e => e.id !== expenseId)
      }));
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkSalaryPaid = async (employee) => {
    const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const salaryFormatted = 'PKR ' + Number(employee.salary || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
    if (!window.confirm(`Mark salary paid for ${employee.name} — ${salaryFormatted} for ${month}?`)) return;
    try {
      await apiPost(`${API}/expenses`, {
        category: 'salary',
        description: `Salary: ${employee.name} — ${month}`,
        amount: employee.salary,
        currency: 'PKR',
        date: new Date().toISOString().split('T')[0],
        notes: `Employee ID: ${employee.id}`,
      });
      fetchData();
      toast.success('Salary marked as paid');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleRequestRelease = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`${API}/releases`, releaseForm);
      setShowReleaseForm(false);
      setReleaseForm({ amount_usd: '', fee_usd: '30', notes: '' });
      fetchData();
      toast.success('Release request submitted');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessRelease = async (status) => {
    if (!approvingRelease) return;
    if (status === 'approved' && !approveForm.exchange_rate) {
      toast.error('Exchange rate is required to approve');
      return;
    }
    setProcessingReleaseId(approvingRelease.id);
    try {
      const result = await apiFetch(`${API}/releases/${approvingRelease.id}`, {
        method: 'PATCH',
        body: { status, ...approveForm },
      });
      setApprovingRelease(null);
      fetchData();
      toast.success(status === 'approved'
        ? `Approved — ₨${Number(result.received_pkr || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })} PKR released`
        : 'Release rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to process release');
    } finally {
      setProcessingReleaseId(null);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const fmtPKR = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPKRConverted = (n) => '₨' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtUSD = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtAmount = (usd) => (
    <div>
      <div className="amount-primary">{fmtPKRConverted(Number(usd || 0) * exchangeRate)}</div>
      <div className="amount-secondary">{fmtUSD(usd)}</div>
    </div>
  );

  const filteredPayments = (data?.payments || []).filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.company?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredExpenses = (data?.expenses || []).filter(e =>
    !search ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const confirmedPayments = (data?.payments || []).filter(p => p.status === 'confirmed');
  // Revenue: sum received_pkr if available, else convert at the current USD to PKR rate.
  const toRevPkr = (p) => Number(p.received_pkr || 0) > 0
    ? Number(p.received_pkr)
    : (Number(p.amount || 0) - Number(p.fee_usd || 30)) * exchangeRate;
  const thisMonthRevPkr = confirmedPayments
    .filter(p => (p.confirmed_at || p.submitted_at || '').startsWith(thisMonth))
    .reduce((s, p) => s + toRevPkr(p), 0);
  const thisMonthExpPkr = (data?.expenses || [])
    .filter(e => (e.date || '').startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const allTimeRevPkr = confirmedPayments.reduce((s, p) => s + toRevPkr(p), 0);
  const allTimeExpPkr = (data?.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const releasedPkr = (data?.releases || [])
    .filter(r => r.status === 'approved')
    .reduce((s, r) => s + Number(r.received_pkr || 0), 0);
  const summary = {
    monthly_revenue_pkr: thisMonthRevPkr,
    monthly_expenses_pkr: thisMonthExpPkr,
    monthly_profit_pkr: thisMonthRevPkr - thisMonthExpPkr,
    alltime_revenue_pkr: allTimeRevPkr,
    alltime_expenses_pkr: allTimeExpPkr,
    net_profit_pkr: allTimeRevPkr - allTimeExpPkr,
    pending_count: (data?.payments || []).filter(p => p.status === 'pending').length,
    pending_releases: (data?.releases || []).filter(r => r.status === 'pending').length,
    released_pkr: releasedPkr,
  };
  const monthlyRevenue = data?.revenue_chart || [];
  const tabs = ['payments', 'expenses', 'salaries', 'pl', 'elevate'];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Finance</h2>
          <p>Revenue, expenses and payroll</p>
        </div>
        {activeTab === 'expenses' && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openAddExpense}>
              + Add Expense
            </button>
          </div>
        )}
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

      <InsightStrip
        items={[
          { label: 'Revenue flow', value: fmtPKRConverted(summary.monthly_revenue_pkr || 0), dark: true, icon: '↗', bars: [32, 54, 48, 76, 62, 88] },
          { label: 'Expense load', value: fmtPKRConverted(summary.monthly_expenses_pkr || 0), icon: '↓', bars: [28, 42, 64, 52, 46, 58] },
          { label: 'Pending queue', value: summary.pending_count || 0, icon: '●', visual: 'heatmap' },
        ]}
      />

      <div className="stat-grid finance-summary-grid">
        <div className="stat-card">
          <div className="stat-label">This Month Revenue</div>
          <div className="stat-value">{fmtPKRConverted(summary.monthly_revenue_pkr || 0)}</div>
          <div className="stat-sub" style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>after fee, at {exchangeRate}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month Expenses</div>
          <div className="stat-value">{fmtPKR(summary.monthly_expenses_pkr || 0)}</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${(summary.monthly_profit_pkr || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtPKR(summary.monthly_profit_pkr || 0)}
          </div>
          <div className="stat-label">This Month Profit</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">All Time Revenue</div>
          <div className="stat-value">{fmtPKRConverted(summary.alltime_revenue_pkr || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Payments</div>
          <div className={`stat-value ${summary.pending_count > 0 ? 'text-warning' : ''}`}>
            {summary.pending_count || 0}
            {summary.pending_releases > 0 && <span className="tab-badge" style={{ marginLeft: '6px' }}>{summary.pending_releases} releases</span>}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">All Time Net Profit</div>
          <div className={`stat-value ${(summary.net_profit_pkr || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtPKR(summary.net_profit_pkr || 0)}
          </div>
        </div>
      </div>

      <div className="referrals-toolbar finance-toolbar">
        <div className="referrals-tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`referrals-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab); setSearch(''); }}
            >
              {tab === 'pl' ? 'P&L' : tab === 'elevate' ? 'ElevatePay' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'payments' && summary.pending_count > 0 && (
                <span className="tab-badge">{summary.pending_count}</span>
              )}
              {tab === 'elevate' && summary.pending_releases > 0 && (
                <span className="tab-badge">{summary.pending_releases}</span>
              )}
            </button>
          ))}
        </div>
        {activeTab !== 'salaries' && activeTab !== 'pl' && activeTab !== 'elevate' && (
          <input
            className="dash-input referrals-search"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : activeTab === 'payments' ? (
        <div className="card">
          {filteredPayments.length === 0 ? (
            <div className="empty-state"><p>No payments yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Transaction ID</th>
                  <th>Referral</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="client-cell-name">{p.name}</div>
                      <div className="client-cell-sub">{p.company || p.email}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{p.plan} / {p.billing}</td>
                    <td className="table-strong">{fmtAmount(p.amount)}</td>
                    <td className="code-cell">{p.txn_id || '-'}</td>
                    <td>
                      {p.referral_code
                        ? <span className="badge badge-accent code-badge">{p.referral_code}</span>
                        : <span className="muted-dash">-</span>}
                    </td>
                    <td>{fmtDate(p.submitted_at)}</td>
                    <td>
                      <span className={`badge ${p.status === 'confirmed' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={confirmingId === p.id}
                          onClick={() => handleConfirmPayment(p)}
                        >
                          {confirmingId === p.id ? 'Confirming...' : 'Confirm'}
                        </button>
                      )}
                      {p.status === 'confirmed' && (
                        <span className="paid-meta">Confirmed {fmtDate(p.confirmed_at)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'expenses' ? (
        <div className="card">
          {filteredExpenses.length === 0 ? (
            <div className="empty-state"><p>No expenses yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e.id}>
                    <td className="table-strong">{e.description}</td>
                    <td><span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{e.category}</span></td>
                    <td className="table-strong">{fmtPKR(e.amount)}</td>
                    <td>{fmtDate(e.date)}</td>
                    <td style={{ opacity: 0.5, fontSize: '12px' }}>{e.notes || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditingExpense({ ...e, currency: 'PKR' })}>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={deletingId === e.id}
                          onClick={() => handleDeleteExpense(e.id)}
                        >
                          {deletingId === e.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'salaries' ? (
        <div className="card">
          {(data?.employees || []).length === 0 ? (
            <div className="empty-state"><p>No active employees</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Monthly Salary</th>
                  <th>Department</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data?.employees || []).map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="client-cell-name">{e.name}</div>
                      <div className="client-cell-sub">{e.email}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{e.role?.replace('_', ' ')}</td>
                    <td className="table-strong">{e.salary ? fmtPKR(e.salary) : '-'}</td>
                    <td>{e.department || '-'}</td>
                    <td>
                      {e.salary && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleMarkSalaryPaid(e)}
                        >
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          {monthlyRevenue.length === 0 ? (
            <div className="empty-state"><p>No revenue data yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.map((m, i) => {
                  const monthExpenses = (data?.expenses || [])
                    .filter(e => e.date?.startsWith(m.month))
                    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                  const revPkr = Number(m.revenue_pkr || 0) > 0 ? Number(m.revenue_pkr) : Number(m.revenue_usd || m.revenue || 0) * exchangeRate;
                  const profit = revPkr - monthExpenses;
                  return (
                    <tr key={i}>
                      <td className="table-strong">{m.month}</td>
                      <td>{fmtPKR(Number(m.revenue_pkr || 0) > 0 ? m.revenue_pkr : Number(m.revenue_usd || m.revenue || 0) * exchangeRate)}</td>
                      <td>{fmtPKR(monthExpenses)}</td>
                      <td className={`table-strong ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {fmtPKR(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'elevate' && (
        <div>
          {/* Summary bar */}
          <div className="stat-grid" style={{ marginBottom: '16px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-label">Total Released</div>
              <div className="stat-value">{fmtPKR(summary.released_pkr || 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Requests</div>
              <div className={`stat-value ${summary.pending_releases > 0 ? 'text-warning' : ''}`}>{summary.pending_releases || 0}</div>
            </div>
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 16px' }}>
              <button className="btn btn-primary" onClick={() => setShowReleaseForm(true)}>
                + Request Release
              </button>
            </div>
          </div>

          {/* Releases table */}
          <div className="card">
            {(data?.releases || []).length === 0 ? (
              <div className="empty-state"><p>No release requests yet</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requested By</th>
                    <th>Amount (USD)</th>
                    <th>Fee</th>
                    <th>Rate</th>
                    <th>Received (PKR)</th>
                    <th>Notes</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.releases || []).map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="client-cell-name">{r.requester_name || r.requester_email}</div>
                        <div className="client-cell-sub" style={{ textTransform: 'capitalize' }}>{r.requester_role?.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="table-strong">{fmtUSD(r.amount_usd)}</td>
                      <td>{fmtUSD(r.fee_usd || 30)}</td>
                      <td>{r.exchange_rate ? Number(r.exchange_rate).toFixed(2) : '—'}</td>
                      <td className="table-strong">{r.received_pkr ? fmtPKR(r.received_pkr) : '—'}</td>
                      <td style={{ fontSize: '12px', opacity: 0.7 }}>{r.notes || '—'}</td>
                      <td>{fmtDate(r.requested_at)}</td>
                      <td>
                        <span className={`badge ${r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.status === 'pending' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => { setApprovingRelease(r); setApproveForm({ exchange_rate: '', fee_usd: String(r.fee_usd || 30), screenshot_url: '', rejection_reason: '' }); }}
                          >
                            Review
                          </button>
                        )}
                        {r.screenshot_url && (
                          <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ marginLeft: '4px' }}>
                            Screenshot
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Request Release Modal */}
      {showReleaseForm && (
        <div className="modal-overlay" onClick={() => setShowReleaseForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request ElevatePay Release</h3>
              <button className="drawer-close" onClick={() => setShowReleaseForm(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleRequestRelease}>
              <div className="form-row">
                <div className="form-field">
                  <label>Amount to Release (USD) *</label>
                  <input className="dash-input" type="number" step="0.01" min="1" required
                    placeholder="e.g. 5000"
                    value={releaseForm.amount_usd}
                    onChange={e => setReleaseForm(f => ({ ...f, amount_usd: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Expected Fee (USD)</label>
                  <input className="dash-input" type="number" step="0.01"
                    value={releaseForm.fee_usd}
                    onChange={e => setReleaseForm(f => ({ ...f, fee_usd: e.target.value }))} />
                </div>
              </div>
              {releaseForm.amount_usd && (
                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px', marginBottom: '8px' }}>
                  Net after fee: <strong>{fmtUSD(Number(releaseForm.amount_usd) - Number(releaseForm.fee_usd || 30))}</strong>
                  {' · '}Est. PKR @ {exchangeRate}: <strong>{fmtPKR((Number(releaseForm.amount_usd) - Number(releaseForm.fee_usd || 30)) * exchangeRate)}</strong>
                </div>
              )}
              <div className="form-field">
                <label>Notes</label>
                <textarea className="dash-input" rows={2} placeholder="Optional context..."
                  value={releaseForm.notes}
                  onChange={e => setReleaseForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReleaseForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner: Approve/Reject Release Modal */}
      {approvingRelease && (
        <div className="modal-overlay" onClick={() => setApprovingRelease(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Review Release — {fmtUSD(approvingRelease.amount_usd)}</h3>
              <button className="drawer-close" onClick={() => setApprovingRelease(null)}>×</button>
            </div>
            <div className="modal-form">
              <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
                Requested by <strong>{approvingRelease.requester_name}</strong> · {fmtUSD(approvingRelease.amount_usd)} USD
                {approvingRelease.notes && <div style={{ marginTop: '4px', opacity: 0.7 }}>Note: {approvingRelease.notes}</div>}
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Exchange Rate (PKR per USD) *</label>
                  <input className="dash-input" type="number" step="0.01" placeholder="e.g. 278.50"
                    value={approveForm.exchange_rate}
                    onChange={e => setApproveForm(f => ({ ...f, exchange_rate: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Fee Deducted (USD)</label>
                  <input className="dash-input" type="number" step="0.01"
                    value={approveForm.fee_usd}
                    onChange={e => setApproveForm(f => ({ ...f, fee_usd: e.target.value }))} />
                </div>
              </div>
              {approveForm.exchange_rate && (
                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px', marginBottom: '8px' }}>
                  PKR to be released: <strong>{fmtPKR((Number(approvingRelease.amount_usd) - Number(approveForm.fee_usd || 30)) * Number(approveForm.exchange_rate || 0))}</strong>
                </div>
              )}
              <div className="form-field">
                <label>Screenshot URL <span style={{ opacity: 0.5, fontSize: '11px' }}>(optional — paste ElevatePay confirmation link)</span></label>
                <input className="dash-input" type="url" placeholder="https://..."
                  value={approveForm.screenshot_url}
                  onChange={e => setApproveForm(f => ({ ...f, screenshot_url: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Rejection Reason <span style={{ opacity: 0.5, fontSize: '11px' }}>(only if rejecting)</span></label>
                <input className="dash-input" placeholder="Leave blank if approving"
                  value={approveForm.rejection_reason}
                  onChange={e => setApproveForm(f => ({ ...f, rejection_reason: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-danger" disabled={!!processingReleaseId} onClick={() => handleProcessRelease('rejected')}>
                  {processingReleaseId ? '...' : 'Reject'}
                </button>
                <button className="btn btn-ghost" onClick={() => setApprovingRelease(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={!!processingReleaseId} onClick={() => handleProcessRelease('approved')}>
                  {processingReleaseId ? 'Processing...' : 'Approve & Release'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddExpense && (
        <div className="modal-overlay" onClick={closeExpenseModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Expense</h3>
              <button className="drawer-close" onClick={closeExpenseModal}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleAddExpense}>
              <div className="form-row">
                <div className="form-field">
                  <label>Category *</label>
                  <PillSelect
                    value={expenseForm.category}
                    options={EXPENSE_CATEGORIES}
                    onChange={category => setExpenseForm(f => ({ ...f, category }))}
                    ariaLabel="Select expense category"
                  />
                </div>
                <div className="form-field">
                  <label>Date *</label>
                  <input className="dash-input" type="date" required value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="form-field">
                <label>Description *</label>
                <input className="dash-input" required placeholder="e.g. Figma subscription" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Amount *</label>
                  <input className="dash-input" type="number" step="0.01" required placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <div className="currency-lock-pill">PKR</div>
                </div>
              </div>
              <div className="form-field">
                <label>Notes</label>
                <textarea className="dash-input" rows={2} placeholder="Optional notes..." value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeExpenseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingExpense && (
        <div className="modal-overlay" onClick={() => setEditingExpense(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Expense</h3>
              <button className="drawer-close" onClick={() => setEditingExpense(null)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleEditExpense}>
              <div className="form-row">
                <div className="form-field">
                  <label>Category *</label>
                  <PillSelect
                    value={editingExpense.category}
                    options={EXPENSE_CATEGORIES}
                    onChange={category => setEditingExpense(f => ({ ...f, category }))}
                    ariaLabel="Select expense category"
                  />
                </div>
                <div className="form-field">
                  <label>Date *</label>
                  <input
                    className="dash-input"
                    type="date"
                    required
                    value={editingExpense.date ? String(editingExpense.date).split('T')[0] : ''}
                    onChange={e => setEditingExpense(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Description *</label>
                <input
                  className="dash-input"
                  required
                  value={editingExpense.description}
                  onChange={e => setEditingExpense(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Amount *</label>
                  <input
                    className="dash-input"
                    type="number"
                    step="0.01"
                    required
                    value={editingExpense.amount}
                    onChange={e => setEditingExpense(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <div className="currency-lock-pill">PKR</div>
                </div>
              </div>
              <div className="form-field">
                <label>Notes</label>
                <textarea
                  className="dash-input"
                  rows={2}
                  value={editingExpense.notes || ''}
                  onChange={e => setEditingExpense(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingExpense(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
