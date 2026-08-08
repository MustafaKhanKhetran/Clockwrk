import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { API_BASE_URL, getToken } from '../utils/auth';

const field = (item, ...keys) => keys
  .map(key => item?.[key])
  .find(value => value !== undefined && value !== null && value !== '') ?? '';

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

const getClients = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.clients)) return payload.clients;
  return Array.isArray(payload?.data) ? payload.data : [];
};

const fmtUSD = (amount) => `$${Number(amount || 0).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})}`;

const fmtPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})}`;

const fmtDate = (date) => date
  ? new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  : '-';

function RevenueChart({ data }) {
  if (!data.length) {
    return <div className="empty-state"><p>No revenue data available</p></div>;
  }

  const chartWidth = Math.max(720, data.length * 100);
  const chartHeight = 300;
  const margin = { top: 26, right: 20, bottom: 62, left: 20 };
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const slotWidth = (chartWidth - margin.left - margin.right) / data.length;
  const barWidth = Math.min(56, slotWidth * 0.58);
  const maxRevenue = Math.max(...data.map(item => Number(field(item, 'revenue', 'amount') || 0)), 1);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Monthly revenue bar chart"
        style={{ display: 'block', width: `${chartWidth}px`, maxWidth: 'none', height: '300px' }}
      >
        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={chartWidth - margin.right}
          y2={margin.top + plotHeight}
          stroke="var(--border-2)"
        />
        {data.map((item, index) => {
          const revenue = Number(field(item, 'revenue', 'amount') || 0);
          const height = revenue > 0 ? Math.max(4, (revenue / maxRevenue) * plotHeight) : 2;
          const x = margin.left + (index * slotWidth) + ((slotWidth - barWidth) / 2);
          const y = margin.top + plotHeight - height;
          const center = x + (barWidth / 2);

          return (
            <g key={`${field(item, 'month', 'label')}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="7"
                fill="var(--accent)"
                opacity="0.9"
              />
              <text
                x={center}
                y={Math.max(14, y - 9)}
                textAnchor="middle"
                fill="var(--text-2)"
                fontSize="11"
                fontWeight="600"
              >
                {fmtUSD(revenue)}
              </text>
              <text
                x={center}
                y={chartHeight - 28}
                textAnchor="middle"
                fill="var(--text-3)"
                fontSize="11"
              >
                {field(item, 'month', 'label') || '-'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Reports() {
  const [finance, setFinance] = useState({ payments: [], expenses: [], revenue_chart: [] });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [financeData, clientData] = await Promise.all([
        fetchWithAuth('/api/finance'),
        fetchWithAuth('/api/clients'),
      ]);
      setFinance({
        payments: Array.isArray(financeData?.payments) ? financeData.payments : [],
        expenses: Array.isArray(financeData?.expenses) ? financeData.expenses : [],
        revenue_chart: Array.isArray(financeData?.revenue_chart) ? financeData.revenue_chart : [],
      });
      setClients(getClients(clientData));
    } catch (err) {
      console.error(err);
      setError('Failed to load report data. Check your connection and try again.');
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const stats = useMemo(() => ({
    revenue: finance.payments
      .filter(payment => String(field(payment, 'status')).toLowerCase() === 'confirmed')
      .reduce((sum, payment) => sum + Number(field(payment, 'amount') || 0), 0),
    expenses: finance.expenses
      .reduce((sum, expense) => sum + Number(field(expense, 'amount') || 0), 0),
    activeClients: clients
      .filter(client => String(field(client, 'status')).toLowerCase() === 'active').length,
  }), [clients, finance]);

  const topClients = useMemo(
    () => [...clients].sort((a, b) => {
      const aDate = field(a, 'last_payment_date', 'last_payment_at');
      const bDate = field(b, 'last_payment_date', 'last_payment_at');
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }),
    [clients],
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: client => (
        <div>
          <div className="client-cell-name">{field(client, 'name', 'client_name') || 'Unnamed client'}</div>
          {field(client, 'email') && <div className="client-cell-sub">{field(client, 'email')}</div>}
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      render: client => field(client, 'company', 'company_name') || '-',
    },
    {
      key: 'plan',
      label: 'Plan',
      render: client => <StatusBadge value={field(client, 'plan') || 'startup'} tone="purple" />,
    },
    {
      key: 'status',
      label: 'Status',
      render: client => <StatusBadge value={field(client, 'status') || 'inactive'} />,
    },
    {
      key: 'nextPayment',
      label: 'Next Payment Due',
      render: client => fmtDate(field(client, 'next_payment_due', 'next_due_date')),
    },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Reports</h2>
          <p>Revenue, expenses, and client performance</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary">Export Report</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={loadReports}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatCard
          label="Total Revenue"
          value={loading ? '...' : fmtUSD(stats.revenue)}
          sub="Confirmed payments"
          tone="green"
        />
        <StatCard
          label="Total Expenses"
          value={loading ? '...' : fmtPKR(stats.expenses)}
          sub="All recorded expenses"
          tone="orange"
        />
        <StatCard
          label="Active Clients"
          value={loading ? '...' : stats.activeClients}
          sub={`${clients.length} total clients`}
          tone="blue"
        />
      </div>

      <div className="card">
        <div className="card-title">Monthly Revenue</div>
        {loading
          ? <div className="client-cell-sub">Loading revenue chart...</div>
          : <RevenueChart data={finance.revenue_chart} />}
      </div>

      <div className="card-title" style={{ marginTop: '24px' }}>Top Clients</div>
      <DataTable
        columns={columns}
        rows={topClients}
        loading={loading}
        emptyTitle="No clients found"
        emptySubtitle="Client reporting data will appear here."
      />
    </DashLayout>
  );
}
