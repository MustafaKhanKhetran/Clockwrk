import { useEffect, useState } from 'react';
import Icon from './Icon';
import { api } from './api';
import { Action } from './Primitives';

/**
 * Books a real call. Availability comes from the API — weekday working hours
 * minus slots already taken in the bookings table — so nothing offered here is
 * invented, and a slot taken between load and submit returns a clean 409.
 */
export default function BookCall({ projectId = null, projectName = '', onClose }) {
  const [slots, setSlots] = useState([]);
  const [day, setDay] = useState(null);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.availability(8)
      .then(({ slots: rows }) => {
        setSlots(rows || []);
        setDay(rows?.[0]?.date || null);
      })
      .catch((err) => setError(err.message || 'Could not load availability.'))
      .finally(() => setLoading(false));
  }, []);

  const confirm = async () => {
    if (!day || !time || booking) return;
    setBooking(true);
    setError('');
    try {
      await api.createBooking({ date: day, time, notes, project_id: projectId });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not book that slot.');
      // A 409 means someone took it — refresh what is still free.
      if (err.status === 409) {
        const { slots: rows } = await api.availability(8);
        setSlots(rows || []);
        setTime('');
      }
    } finally {
      setBooking(false);
    }
  };

  const dayLabel = (iso) => {
    const date = new Date(`${iso}T00:00:00`);
    return { weekday: date.toLocaleDateString([], { weekday: 'short' }), day: date.getDate(), month: date.toLocaleDateString([], { month: 'short' }) };
  };
  const times = slots.find((s) => s.date === day)?.times || [];

  return <div className="v3-dialog-layer" onMouseDown={onClose}>
    <section className="v3-call-dialog" onMouseDown={(event) => event.stopPropagation()}>
      <header><span>Book a call</span><button onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button></header>

      <main className="v3-dialog-body">{done ? <div className="v3-call-done">
        <i><Icon name="check" size={26} /></i>
        <h2>Call booked</h2>
        <p>{dayLabel(day).weekday} {dayLabel(day).day} {dayLabel(day).month} at {time}. We will send the joining link by email.</p>
        <Action onClick={onClose}>Done</Action>
      </div> : <>
        <h2>Pick a time with the team.</h2>
        <p>{projectName ? <>This call will be attached to <strong>{projectName}</strong>.</> : 'Weekday slots, 30 minutes.'}</p>

        {loading && <p className="v3-chat-note">Loading availability…</p>}
        {error && <p className="v3-chat-note is-error">{error}</p>}

        {!loading && !slots.length && !error && <p className="v3-chat-note">No slots open in the next two weeks — send a message and we will find a time.</p>}

        {!!slots.length && <>
          <div className="v3-day-strip">
            {slots.map((slot) => {
              const label = dayLabel(slot.date);
              return <button key={slot.date} className={day === slot.date ? 'is-active' : ''} onClick={() => { setDay(slot.date); setTime(''); }}>
                <small>{label.weekday}</small><strong>{label.day}</strong><em>{label.month}</em>
              </button>;
            })}
          </div>
          <div className="v3-time-grid">
            {times.map((slot) => <button key={slot} className={time === slot ? 'is-active' : ''} onClick={() => setTime(slot)}>{slot}</button>)}
            {!times.length && <p className="v3-chat-note">Nothing free that day.</p>}
          </div>
          <label className="v3-call-notes"><span>What should we prepare?<em>optional</em></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want covered" /></label>
          <Action icon="check" onClick={confirm} disabled={!time || booking}>{booking ? 'Booking…' : time ? `Book ${dayLabel(day).weekday} at ${time}` : 'Pick a time'}</Action>
        </>}
      </>}</main>
    </section>
  </div>;
}
