import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { API_BASE_URL, getToken } from '../utils/auth';

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

const getBookings = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getApplicationCounts = (payload) => {
  const jobApplications = Array.isArray(payload?.job_applications)
    ? payload.job_applications
    : [];
  const internshipApplications = Array.isArray(payload?.internship_applications)
    ? payload.internship_applications
    : [];

  if (jobApplications.length || internshipApplications.length) {
    return {
      jobs: jobApplications.filter(application => slug(field(application, 'status') || 'new') === 'new').length,
      internships: internshipApplications.filter(application => slug(field(application, 'status') || 'new') === 'new').length,
    };
  }

  const applications = Array.isArray(payload?.applications)
    ? payload.applications
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  return applications.reduce((counts, application) => {
    if (slug(field(application, 'status') || 'new') !== 'new') return counts;
    const type = slug(field(application, 'application_type', 'type', 'job_type'));
    if (type === 'internship' || type === 'intern') counts.internships += 1;
    else counts.jobs += 1;
    return counts;
  }, { jobs: 0, internships: 0 });
};

const fmtDate = (date) => date
  ? new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  : '-';

const fmtTime = (time) => {
  if (!time) return '-';
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
};

const bookingStatus = (booking) => slug(field(booking, 'status', 'booking_status') || 'pending');

export default function Pipeline() {
  const [bookings, setBookings] = useState([]);
  const [applicationCounts, setApplicationCounts] = useState({ jobs: 0, internships: 0 });
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPipeline = async () => {
    setError('');
    setBookingsLoading(true);
    setApplicationsLoading(true);

    const [bookingsResult, hrResult] = await Promise.allSettled([
      fetchWithAuth('/api/bookings'),
      fetchWithAuth('/api/hr'),
    ]);

    if (bookingsResult.status === 'fulfilled') {
      setBookings(getBookings(bookingsResult.value));
    } else {
      console.error(bookingsResult.reason);
      setError('Some pipeline data could not be loaded. Try again.');
      toast.error('Failed to load bookings');
    }
    setBookingsLoading(false);

    if (hrResult.status === 'fulfilled') {
      setApplicationCounts(getApplicationCounts(hrResult.value));
    } else {
      console.error(hrResult.reason);
      setError('Some pipeline data could not be loaded. Try again.');
      toast.error('Failed to load applications');
    }
    setApplicationsLoading(false);
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(booking => bookingStatus(booking) === 'confirmed').length,
    pendingPayment: bookings.filter(booking => {
      const status = bookingStatus(booking);
      const paymentStatus = slug(field(booking, 'payment_status', 'payment'));
      return status === 'pending_payment'
        || paymentStatus === 'pending'
        || paymentStatus === 'pending_payment';
    }).length,
  }), [bookings]);

  const columns = [
    {
      key: 'client',
      label: 'Client Name',
      render: booking => (
        <div>
          <div className="client-cell-name">{field(booking, 'name', 'client_name') || 'Unknown client'}</div>
          {field(booking, 'email', 'client_email') && (
            <div className="client-cell-sub">{field(booking, 'email', 'client_email')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      render: booking => field(booking, 'company', 'company_name') || '-',
    },
    {
      key: 'services',
      label: 'Services',
      render: booking => <span className="table-truncate">{field(booking, 'services', 'service') || '-'}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: booking => fmtDate(field(booking, 'booking_date', 'date')),
    },
    {
      key: 'time',
      label: 'Time',
      render: booking => fmtTime(field(booking, 'booking_time', 'time')),
    },
    {
      key: 'status',
      label: 'Status',
      render: booking => <StatusBadge value={bookingStatus(booking)} />,
    },
    {
      key: 'assigned',
      label: 'Assigned To',
      render: booking => {
        const assigned = field(booking, 'assigned_to', 'assignee_name', 'assigned_name');
        return typeof assigned === 'object'
          ? field(assigned, 'name', 'email') || 'Unassigned'
          : assigned || 'Unassigned';
      },
    },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Pipeline</h2>
          <p>Sales bookings and incoming applications</p>
        </div>
        <div
          className="page-header-actions"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}
        >
          {[
            ['Total Bookings', stats.total, 'badge-blue'],
            ['Confirmed', stats.confirmed, 'badge-green'],
            ['Pending Payment', stats.pendingPayment, 'badge-yellow'],
          ].map(([label, value, tone]) => (
            <div
              className={`badge ${tone}`}
              key={label}
              style={{ gap: '8px', padding: '9px 12px' }}
            >
              <span>{label}</span>
              <strong>{bookingsLoading ? '...' : value}</strong>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={loadPipeline}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="card-title">Bookings</div>
      <DataTable
        columns={columns}
        rows={bookings}
        loading={bookingsLoading}
        emptyTitle="No bookings found"
        emptySubtitle="New sales bookings will appear here."
      />

      <div className="card-title" style={{ marginTop: '24px' }}>New Applications</div>
      <div className="card">
        {applicationsLoading ? (
          <div className="client-cell-sub">Loading application counts...</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--control-bg)',
              }}
            >
              <div className="stat-value">{applicationCounts.jobs}</div>
              <div className="stat-label">New job applications</div>
            </div>
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--control-bg)',
              }}
            >
              <div className="stat-value">{applicationCounts.internships}</div>
              <div className="stat-label">New internship applications</div>
            </div>
          </div>
        )}
      </div>
    </DashLayout>
  );
}
