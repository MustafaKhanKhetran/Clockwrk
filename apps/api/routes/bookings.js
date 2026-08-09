import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { autoAssignBooking, sweepUnassignedBookings, rebalanceAllBookings } from '../services/bookingAutoAssign.js';

const router = Router();
const BOOKING_ACCESS = ['owner','admin','head_of_delivery','project_manager','account_manager','sales'];

router.get('/', authenticate, requireRoles(BOOKING_ACCESS), async (req, res) => {
  try {
    const [bookings] = await db.execute(
      `SELECT b.*, e.name AS assignee_name
       FROM bookings b
       LEFT JOIN employees e ON e.id = b.assigned_to
       ORDER BY b.booking_date DESC, b.booking_time DESC`
    );
    return res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', authenticate, requireRoles(BOOKING_ACCESS), async (req, res) => {
  try {
    const [[booking]] = await db.execute(`SELECT b.*, e.name AS assignee_name, e.email AS assignee_email FROM bookings b LEFT JOIN employees e ON e.id=b.assigned_to WHERE b.id=?`, [req.params.id]);
    if (!booking) return res.status(404).json({success:false,message:'Booking not found'});
    return res.json({success:true,booking});
  } catch(err) { console.error(err); return res.status(500).json({success:false,message:'Server error'}); }
});

router.patch('/:id', authenticate, requireRoles(BOOKING_ACCESS), async (req, res) => {
  const { status, assigned_to, notes, booking_date, booking_time } = req.body;
  const fields = []; const params = [];
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  if (booking_date !== undefined) { fields.push('booking_date = ?'); params.push(booking_date); }
  if (booking_time !== undefined) { fields.push('booking_time = ?'); params.push(booking_time); }
  if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
  params.push(req.params.id);
  try {
    await db.execute(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`, params);
    const [[booking]] = await db.execute('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    return res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Manually trigger auto-assign for one booking
router.post('/:id/auto-assign', authenticate, requireRoles(['owner','admin','head_of_delivery']), async (req, res) => {
  try {
    const result = await autoAssignBooking(req.params.id);
    return res.json({ success: true, result });
  } catch (err) {
    console.error('auto-assign error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Sweep all unassigned bookings now
router.post('/auto-assign/sweep', authenticate, requireRoles(['owner','admin']), async (_req, res) => {
  try {
    const updated = await sweepUnassignedBookings();
    return res.json({ success: true, updated });
  } catch (err) {
    console.error('auto-assign sweep error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Rebalance every booking under current rules (overwrites existing assignments)
router.post('/auto-assign/rebalance', authenticate, requireRoles(['owner','admin']), async (_req, res) => {
  try {
    const updated = await rebalanceAllBookings();
    return res.json({ success: true, updated });
  } catch (err) {
    console.error('rebalance error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
