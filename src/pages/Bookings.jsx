import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import PillSelect from '../components/PillSelect';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import InsightStrip from '../components/InsightStrip';
import { apiFetch, apiGet } from '../utils/dashboardApi';

const API = '/api/bookings';
const STATUSES = ['confirmed', 'cancelled', 'no-show'];
const STATUS_FILTERS = [{ value: 'all', label: 'All statuses' }, ...STATUSES];

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchBookings = () => {
    setLoading(true);
    setError(null);
    apiGet(API)
      .then(data => { if (data.success) setBookings(data.bookings || []); })
      .catch(err => {
        console.error(err);
        setError('Failed to load data. Check your connection and try again.');
        toast.error('Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleStatusChange = async (bookingId, status) => {
    try {
      await apiFetch(`${API}/${bookingId}`, { method: 'PATCH', body: { status } });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      if (selected?.id === bookingId) setSelected(prev => ({ ...prev, status }));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const filtered = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (search && !b.name?.toLowerCase().includes(search.toLowerCase()) &&
        !b.email?.toLowerCase().includes(search.toLowerCase()) &&
        !b.company?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const fmtTime = (t) => {
    if (!t) return '-';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const getUrgency = (b) => {
    const now = new Date();
    const bookingDT = new Date(`${b.booking_date}T${b.booking_time}`);
    const diffMs = bookingDT - now;
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (b.status === 'cancelled') return { label: 'Cancelled', style: 'urgency-cancelled' };
    if (b.status === 'no-show')   return { label: 'No-show',   style: 'urgency-noshow'    };

    if (diffMs < 0) {
      if (b.status === 'confirmed') return { label: 'Missed', style: 'urgency-missed' };
      return { label: 'Past', style: 'urgency-past' };
    }
    if (diffHrs <= 2)  return { label: 'Now',      style: 'urgency-now'      };
    if (diffHrs <= 24) return { label: 'Today',    style: 'urgency-today'    };
    if (diffHrs <= 48) return { label: 'Tomorrow', style: 'urgency-tomorrow' };
    return { label: 'Scheduled', style: 'urgency-scheduled' };
  };

  const isUpcoming = (b) => new Date(`${b.booking_date}T${b.booking_time}`) > new Date();

  const upcoming = filtered.filter(isUpcoming);
  const past = filtered.filter(b => !isUpcoming(b));
  const todayCount = bookings.filter(b => getUrgency(b).label === 'Today' || getUrgency(b).label === 'Now').length;
  const missedCount = bookings.filter(b => ['Missed', 'No-show'].includes(getUrgency(b).label)).length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

  const renderBookingsTable = (items, isPast = false) => (
    <div className="card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Services</th>
            <th>Date</th>
            <th>Time</th>
            <th>Zoom</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(b => (
            <tr key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className={isPast ? 'is-muted-row' : ''}>
              <td>
                <div className="client-cell">
                  <div className="client-cell-avatar">
                    {b.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="client-cell-name">{b.name}</div>
                    <div className="client-cell-sub">{b.email}</div>
                  </div>
                </div>
              </td>
              <td>{b.company || '-'}</td>
              <td><span className="table-truncate">{b.services || '-'}</span></td>
              <td>{fmtDate(b.booking_date)}</td>
              <td>{fmtTime(b.booking_time)}</td>
              <td onClick={e => e.stopPropagation()}>
                {b.zoom_link
                  ? <a href={b.zoom_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">{isPast ? 'View' : 'Join'}</a>
                  : '-'}
              </td>
              <td>
                <div className="booking-status-stack">
                  <span className={`badge badge-status-${b.status}`}>{b.status}</span>
                  <span className={`badge ${getUrgency(b).style}`}>{getUrgency(b).label}</span>
                </div>
              </td>
              <td onClick={e => e.stopPropagation()}>
                <PillSelect
                  className="clients-status-select"
                  value={b.status}
                  options={STATUSES}
                  onChange={status => handleStatusChange(b.id, status)}
                  ariaLabel={`Change status for ${b.name}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Bookings</h2>
          <p>{bookings.length} total · {bookings.filter(isUpcoming).length} upcoming</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
            <span>!</span>
            <span style={{ fontSize: '13px' }}>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setError(null); fetchBookings(); }}>
              Retry
            </button>
          </div>
        </div>
      )}

      <InsightStrip
        items={[
          { label: 'Upcoming calls', value: upcoming.length, dark: true, icon: '↗', bars: [48, 64, 52, 86, 58, 72] },
          { label: 'Today / now', value: todayCount, icon: '✓', visual: 'heatmap' },
          { label: 'Confirmed', value: confirmedCount, icon: '●', bars: [28, 52, 68, 46, 74, 62] },
          { label: 'Needs follow-up', value: missedCount, icon: '!', bars: [16, 26, 34, 22, 42, 30] },
        ]}
      />

      <div className="clients-filters bookings-filters">
        <input
          className="dash-input clients-search"
          placeholder="Search by name, company or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <PillSelect value={filterStatus} options={STATUS_FILTERS} onChange={setFilterStatus} ariaLabel="Filter booking status" />
      </div>

      {loading ? (
        <SkeletonBlock rows={6} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="bookings-section">
              <div className="bookings-section-label">Upcoming</div>
              {renderBookingsTable(upcoming)}
            </div>
          )}

          {past.length > 0 && (
            <div className="bookings-section">
              <div className="bookings-section-label">Past</div>
              {renderBookingsTable(past, true)}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="card"><div className="empty-state"><p>No bookings found</p></div></div>
          )}
        </>
      )}

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>{selected.name}</h3>
                <p>{selected.email}</p>
              </div>
              <button className="drawer-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="drawer-body">
              <div className="drawer-row"><span>Company</span><strong>{selected.company || '-'}</strong></div>
              <div className="drawer-row"><span>Date</span><strong>{fmtDate(selected.booking_date)}</strong></div>
              <div className="drawer-row"><span>Time</span><strong>{fmtTime(selected.booking_time)}</strong></div>
              <div className="drawer-row">
                <span>Status</span>
                <div className="booking-status-stack">
                  <strong style={{ textTransform: 'capitalize' }}>{selected.status}</strong>
                  <span className={`badge ${getUrgency(selected).style}`}>{getUrgency(selected).label}</span>
                </div>
              </div>
              <div className="drawer-row"><span>Services</span><strong>{selected.services || '-'}</strong></div>
              <div className="drawer-row"><span>Guests</span><strong>{selected.guests || '-'}</strong></div>
              {selected.notes && (
                <div className="drawer-notes"><span>Notes</span><p>{selected.notes}</p></div>
              )}
              {selected.zoom_link && (
                <div className="drawer-row">
                  <span>Zoom</span>
                  <a href={selected.zoom_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">Join meeting</a>
                </div>
              )}
              <div className="drawer-actions">
                {STATUSES.filter(s => s !== selected.status).map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${s === 'cancelled' || s === 'no-show' ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={() => handleStatusChange(selected.id, s)}
                  >
                    Mark as {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
