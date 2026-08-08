import { useEffect, useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';
import DetailDrawer, { DrawerRow } from '../components/DetailDrawer';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import { apiGet } from '../utils/dashboardApi';

const API = '/api/calendar';

const TYPE_LABELS = {
  booking: 'Booking',
  request_due: 'Request Due',
  payment_due: 'Payment Due',
  project_due: 'Project Due',
};

const TYPE_META = {
  booking: { label: 'Bookings', tone: 'blue', icon: '↗' },
  request_due: { label: 'Requests', tone: 'green', icon: '✓' },
  payment_due: { label: 'Payments', tone: 'yellow', icon: '$' },
  project_due: { label: 'Projects', tone: 'purple', icon: '◆' },
};

const fmtDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  return new Date(`${value}T00:00:00`);
};

const fmtDate = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
};

const fmtTime = (time) => {
  if (!time) return null;
  const [h, m] = String(time).split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${ap}`;
};

const daysBetween = (eventDate) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const date = parseDate(eventDate);
  if (!date) return 0;
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((start - target) / 86400000);
};

const isOverdue = (event) => {
  const diff = daysBetween(event.event_date);
  return diff > 0 && event.status !== 'completed' && event.status !== 'paid' && event.status !== 'confirmed_done';
};

const eventClass = (event) => {
  if (isOverdue(event)) return 'calendar-event-overdue';
  return `calendar-event-${event.event_type || 'default'}`;
};

const sortEvents = (events = []) => [...events].sort((a, b) => {
  const dateCompare = String(a.event_date || '').localeCompare(String(b.event_date || ''));
  if (dateCompare !== 0) return dateCompare;
  return String(a.event_time || '99:99').localeCompare(String(b.event_time || '99:99'));
});

export default function Calendar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => fmtDateKey(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchCalendar = () => {
    setLoading(true);
    setError(null);
    apiGet(API)
      .then(payload => {
        if (!payload.success) throw new Error(payload.message || 'Calendar request failed');
        setData(payload);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load calendar events. Check dashboard-calendar and try again.');
        toast.error('Failed to load calendar');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCalendar(); }, []);

  const eventsByDate = data?.events_by_date || {};
  const summary = data?.summary || {};
  const allEvents = data?.events || [];
  const selectedDayEvents = sortEvents(eventsByDate[selectedDate] || []);
  const typeCounts = useMemo(() => Object.keys(TYPE_META).reduce((acc, type) => ({
    ...acc,
    [type]: allEvents.filter(event => event.event_type === type).length,
  }), {}), [allEvents]);

  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = fmtDateKey(date);
      return {
        date,
        key,
        inMonth: date.getMonth() === month,
        isToday: key === fmtDateKey(new Date()),
        events: sortEvents(eventsByDate[key] || []),
      };
    });
  }, [monthDate, eventsByDate]);

  const goMonth = (offset) => {
    setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const renderEventList = (events, empty, mode = 'normal') => (
    events?.length ? (
      <div className="calendar-agenda-list">
        {sortEvents(events).map((event, index) => (
          <button
            key={`${event.event_type}-${event.event_date}-${event.title}-${index}`}
            className={`calendar-agenda-item ${mode === 'overdue' || isOverdue(event) ? 'is-overdue' : ''}`}
            onClick={() => setSelectedEvent(event)}
          >
            <span className={`calendar-agenda-dot ${eventClass(event)}`} />
            <span>
              <strong>{event.title}</strong>
              <small>
                {fmtDate(event.event_date)}
                {event.event_time ? ` · ${fmtTime(event.event_time)}` : ''}
                {mode === 'overdue' || isOverdue(event) ? ` · ${daysBetween(event.event_date)}d overdue` : ''}
              </small>
            </span>
          </button>
        ))}
      </div>
    ) : (
      <p className="form-hint">{empty}</p>
    )
  );

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Calendar</h2>
          <p>Bookings, request deadlines, payment due dates, and project deadlines in one operating calendar.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={fetchCalendar}>Refresh</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="inline-stack" style={{ color: '#f87171' }}>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchCalendar}>Retry</button>
          </div>
        </div>
      )}

      <div className="stat-grid calendar-summary-grid">
        <StatCard label="Total Events" value={summary.total ?? allEvents.length ?? 0} sub="All calendar items" tone="inverse" visual="bars" meta={{ bars: [38, 72, 44, 86, 58] }} />
        <StatCard label="Today" value={summary.today ?? data?.today?.length ?? 0} sub="Scheduled today" tone="green" visual="meter" meta={{ percent: Math.min(100, ((summary.today ?? data?.today?.length ?? 0) / Math.max(1, allEvents.length)) * 100) }} />
        <StatCard label="Upcoming 7 Days" value={summary.upcoming ?? data?.upcoming_7_days?.length ?? 0} sub="Next seven days" tone="blue" visual="dots" meta={{ active: Math.min(18, summary.upcoming ?? data?.upcoming_7_days?.length ?? 0) }} />
        <StatCard label="Overdue" value={summary.overdue ?? data?.overdue?.length ?? 0} tone="orange" visual="meter" meta={{ percent: Math.min(100, ((summary.overdue ?? data?.overdue?.length ?? 0) / Math.max(1, allEvents.length)) * 100) }} trend={{ direction: summary.overdue ? 'down' : 'neutral', label: summary.overdue ? 'Needs attention' : 'No overdue events' }} />
      </div>

      {loading ? (
        <SkeletonBlock rows={4} />
      ) : !allEvents.length ? (
        <div className="card">
          <div className="empty-state">
            <p>No calendar events yet</p>
            <span>Events appear here automatically from bookings, request deadlines, payment due dates, and project deadlines.</span>
          </div>
        </div>
      ) : (
        <div className="calendar-type-strip">
          {Object.entries(TYPE_META).map(([type, meta]) => (
            <button
              key={type}
              className={`calendar-type-card visual-card visual-card-${meta.tone}`}
              onClick={() => {
                const firstEvent = allEvents.find(event => event.event_type === type);
                if (firstEvent?.event_date) setSelectedDate(String(firstEvent.event_date).slice(0, 10));
              }}
            >
              <span className={`icon-bubble ${meta.tone === 'yellow' ? 'icon-bubble-dark' : ''}`}>{meta.icon}</span>
              <span>
                <strong>{typeCounts[type] || 0}</strong>
                <small>{meta.label}</small>
              </span>
              <span className="tile-link">↗</span>
            </button>
          ))}
        </div>
      )}

      {!loading && allEvents.length > 0 && (
        <div className="calendar-layout">
          <div className="calendar-left">
            <div className="card calendar-card visual-card">
              <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={() => goMonth(-1)}>←</button>
                <div>
                  <h3>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                  <span>{allEvents.length} events across this operating calendar</span>
                </div>
                <button className="calendar-nav-btn" onClick={() => goMonth(1)}>→</button>
              </div>
              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid">
                {calendarDays.map(day => (
                  <button
                    key={day.key}
                    className={`calendar-day ${day.inMonth ? '' : 'is-outside'} ${day.isToday ? 'is-today' : ''} ${selectedDate === day.key ? 'is-selected' : ''}`}
                    onClick={() => setSelectedDate(day.key)}
                  >
                    <span className="calendar-day-head">
                      <span className="calendar-day-number">{day.date.getDate()}</span>
                      {day.events.length > 0 && <span className="calendar-day-count">{day.events.length}</span>}
                    </span>
                    <span className="calendar-day-events">
                      {day.events.slice(0, 3).map((event, index) => (
                        <span key={`${event.title}-${index}`} className={`calendar-event-pill ${eventClass(event)}`}>
                          {event.title}
                        </span>
                      ))}
                      {day.events.length > 3 && <span className="calendar-more">+{day.events.length - 3} more</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card calendar-day-panel visual-card-dark">
              <div className="calendar-section-head">
                <h3>{fmtDate(selectedDate)}</h3>
                <span>{selectedDayEvents.length} events</span>
              </div>
              {renderEventList(selectedDayEvents, 'No events scheduled for this day')}
            </div>
          </div>

          <div className="calendar-right">
            <div className="card calendar-side-section visual-card visual-card-green">
              <div className="calendar-section-head"><h3>Today's Agenda</h3><span>{data?.today?.length || 0}</span></div>
              {renderEventList(data?.today || [], 'Nothing scheduled today')}
            </div>
            <div className="card calendar-side-section visual-card visual-card-red">
              <div className="calendar-section-head"><h3>Overdue</h3><span>{data?.overdue?.length || 0}</span></div>
              {renderEventList(data?.overdue || [], 'No overdue events', 'overdue')}
            </div>
            <div className="card calendar-side-section visual-card visual-card-blue">
              <div className="calendar-section-head"><h3>Upcoming 7 Days</h3><span>{data?.upcoming_7_days?.length || 0}</span></div>
              {renderEventList(data?.upcoming_7_days || [], 'No upcoming events in the next 7 days')}
            </div>
          </div>
        </div>
      )}

      <DetailDrawer
        open={selectedEvent}
        title={selectedEvent?.title || 'Calendar event'}
        subtitle={`${TYPE_LABELS[selectedEvent?.event_type] || 'Event'} · ${fmtDate(selectedEvent?.event_date)}${selectedEvent?.event_time ? ` · ${fmtTime(selectedEvent.event_time)}` : ''}`}
        onClose={() => setSelectedEvent(null)}
        actions={selectedEvent?.zoom_link && <a className="btn btn-primary" href={selectedEvent.zoom_link} target="_blank" rel="noreferrer">Join Zoom</a>}
      >
        <DrawerRow label="Type" value={TYPE_LABELS[selectedEvent?.event_type] || selectedEvent?.event_type} />
        <DrawerRow label="Client" value={selectedEvent?.client_name} />
        <DrawerRow label="Company" value={selectedEvent?.company} />
        <DrawerRow label="Status"><StatusBadge value={selectedEvent?.status || 'scheduled'} /></DrawerRow>
        {selectedEvent?.priority && <DrawerRow label="Priority"><StatusBadge value={selectedEvent.priority} /></DrawerRow>}
        {selectedEvent?.event_type === 'booking' && (
          <>
            <DrawerRow label="Time" value={fmtTime(selectedEvent.event_time)} />
            <DrawerRow label="Services" value={selectedEvent.services} />
            <div className="drawer-notes"><span>Notes</span><p>{selectedEvent.notes || 'No booking notes.'}</p></div>
          </>
        )}
        {selectedEvent?.event_type === 'request_due' && (
          <>
            <DrawerRow label="Project" value={selectedEvent.project || selectedEvent.project_name} />
            <DrawerRow label="Assigned To" value={selectedEvent.assigned_to} />
          </>
        )}
        {selectedEvent?.event_type === 'payment_due' && (
          <>
            <DrawerRow label="Plan" value={selectedEvent.plan} />
            <DrawerRow label="Billing" value={selectedEvent.billing} />
            <DrawerRow label="Amount Due" value={selectedEvent.amount_due || selectedEvent.amount} />
          </>
        )}
        {selectedEvent?.event_type === 'project_due' && (
          <>
            <DrawerRow label="Health" value={selectedEvent.health_status} />
            <DrawerRow label="Priority"><StatusBadge value={selectedEvent.priority || 'normal'} /></DrawerRow>
          </>
        )}
      </DetailDrawer>
    </DashLayout>
  );
}
