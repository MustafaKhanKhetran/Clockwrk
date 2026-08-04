import { useState } from 'react';
import { Icon, SiteCta } from './ui';

const SLOTS = ['Tomorrow 11:00', 'Tomorrow 15:30', 'Mon 10:00', 'Mon 14:00'];

export default function ScheduleCall({ label = 'Book a call', className = '' }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState('');
  return (
    <div className={`schedule-call ${className}`}>
      <button type="button" className="schedule-trigger" onClick={() => setOpen(!open)}><Icon.cal />{slot ? `Booked · ${slot}` : label}</button>
      {open && <div className="schedule-panel anim-pop"><div><strong>Book a Clockwrk call</strong><small>30 minutes · Asia/Karachi (PKT)</small></div><div>{SLOTS.map((item) => <button type="button" key={item} className={slot === item ? 'is-active' : ''} onClick={() => setSlot(item)}>{item}</button>)}</div><SiteCta className="site-cta-compact" disabled={!slot} icon={<Icon.check />} onClick={() => setOpen(false)}>Confirm</SiteCta></div>}
    </div>
  );
}
