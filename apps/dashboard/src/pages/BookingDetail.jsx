import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import { DetailPage, DetailSection, ErrorDetail, LoadingDetail, formatDate } from '../components/DetailPage';
import FormModal from '../components/FormModal';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { apiFetch, apiGet } from '../utils/dashboardApi';

export default function BookingDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const load = useCallback(() => {
    setError('');
    apiGet(`/api/bookings/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <DashLayout><ErrorDetail message={error} onRetry={load} /></DashLayout>;
  if (!data) return <DashLayout><LoadingDetail /></DashLayout>;

  const { booking } = data;
  const setStatus = async (status) => {
    setBusy(true);
    try {
      await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: { status } });
      toast.success('Booking updated');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: { booking_date: form.booking_date, booking_time: form.booking_time, notes: form.notes },
      });
      toast.success('Booking rescheduled');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashLayout>
      <DetailPage
        eyebrow="Booking"
        title={booking.company || booking.name}
        subtitle={`${booking.name} · ${booking.email}`}
        meta={<><StatusBadge value={booking.status} /><span>{formatDate(booking.booking_date)} at {booking.booking_time}</span><span>{booking.assignee_name || 'Unassigned'}</span></>}
        actions={<><button className="btn btn-ghost" onClick={() => { setForm({ booking_date: String(booking.booking_date || '').slice(0, 10), booking_time: booking.booking_time || '', notes: booking.notes || '' }); setEditing(true); }}>Edit schedule</button><button className="btn btn-ghost" disabled={busy} onClick={() => setStatus('cancelled')}>Cancel</button><button className="btn btn-ghost" disabled={busy} onClick={() => setStatus('completed')}>Complete</button><button className="btn btn-primary" disabled={busy} onClick={() => setStatus('confirmed')}>Confirm</button></>}
      >
        <div className="detail-grid detail-grid-two">
          <DetailSection title="Call details">
            <dl className="definition-grid">
              <div><dt>Date</dt><dd>{formatDate(booking.booking_date)}</dd></div>
              <div><dt>Time</dt><dd>{booking.booking_time}</dd></div>
              <div><dt>Contact role</dt><dd>{booking.client_role || 'Not set'}</dd></div>
              <div><dt>Assigned to</dt><dd>{booking.assignee_name || 'Unassigned'}</dd></div>
            </dl>
            {booking.zoom_link && <a className="btn btn-primary inline-button" href={booking.zoom_link} target="_blank" rel="noreferrer">Open meeting link</a>}
          </DetailSection>
          <DetailSection title="What they need">
            <p className="long-copy">{booking.notes || 'No preparation notes were supplied.'}</p>
            <dl className="definition-grid"><div><dt>Services</dt><dd>{booking.services || 'Not specified'}</dd></div><div><dt>Guests</dt><dd>{booking.guests || 'None'}</dd></div></dl>
          </DetailSection>
        </div>
        <FormModal
          open={editing}
          title="Reschedule booking"
          subtitle="Update the date, time or preparation notes."
          onClose={() => setEditing(false)}
          onSubmit={saveSchedule}
          actions={<><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save schedule'}</button></>}
        >
          <div className="form-row">
            <label className="form-field">Date<input required className="dash-input" type="date" value={form.booking_date || ''} onChange={(event) => setForm({ ...form, booking_date: event.target.value })} /></label>
            <label className="form-field">Time<input required className="dash-input" type="time" value={form.booking_time || ''} onChange={(event) => setForm({ ...form, booking_time: event.target.value })} /></label>
          </div>
          <label className="form-field">Preparation notes<textarea className="dash-input" rows="5" value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </FormModal>
      </DetailPage>
    </DashLayout>
  );
}
