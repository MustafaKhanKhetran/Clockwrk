import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const HR_ACCESS = ['owner', 'admin', 'hr'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeDate = val => {
  if (!val) return null;
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(val)) return val;
  return null;
};

// ─── PUBLIC: Job application ──────────────────────────────────────────────────
// POST /api/hr/apply/job
router.post('/apply/job', async (req, res) => {
  const {
    job_id, full_name, email, phone, location,
    availability_type, availability_start, experience_yrs,
    seniority_level, current_role, remote_experience, has_shipped_work,
    linkedin_url, additional_links, resume_url, skills,
    best_work_description, hardest_part, why_clockwrk,
    strongest_skill, improvement_area, work_style, extra_note,
  } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ success: false, message: 'full_name and email are required' });
  }

  try {
    await db.execute(
      `INSERT INTO job_applications (
        id, job_id, full_name, email, phone, location,
        availability_type, availability_start, experience_yrs,
        seniority_level, current_role, remote_experience, has_shipped_work,
        linkedin_url, additional_links, resume_url, skills,
        best_work_description, hardest_part, why_clockwrk,
        strongest_skill, improvement_area, work_style, extra_note, status
      ) VALUES (
        UUID(), ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, 'new'
      )`,
      [
        job_id || null, full_name, email, phone || null, location || null,
        availability_type || null, safeDate(availability_start), experience_yrs || null,
        seniority_level || null, current_role || null, remote_experience || null, has_shipped_work || null,
        linkedin_url || null, additional_links || null, resume_url || null, skills || null,
        best_work_description || null, hardest_part || null, why_clockwrk || null,
        strongest_skill || null, improvement_area || null, work_style || null, extra_note || null,
      ]
    );
    return res.json({ success: true, message: 'Application received' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUBLIC: Internship application ──────────────────────────────────────────
// POST /api/hr/apply/internship
router.post('/apply/internship', async (req, res) => {
  const {
    job_id, full_name, email, phone, location,
    university, program, enrollment_status, graduation_year, year_of_study,
    area_of_interest, portfolio_url, linkedin_url, resume_url,
    availability_start, availability_duration, hours_per_week,
    skills, referral_source,
    why_clockwrk, strongest_skill, improvement_area, work_style, extra_note,
  } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ success: false, message: 'full_name and email are required' });
  }

  try {
    await db.execute(
      `INSERT INTO internship_applications (
        id, job_id, full_name, email, phone, location,
        university, program, enrollment_status, graduation_year, year_of_study,
        area_of_interest, portfolio_url, linkedin_url, resume_url,
        availability_start, availability_duration, hours_per_week,
        skills, referral_source,
        why_clockwrk, strongest_skill, improvement_area, work_style, extra_note, status
      ) VALUES (
        UUID(), ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, 'new'
      )`,
      [
        job_id || null, full_name, email, phone || null, location || null,
        university || null, program || null, enrollment_status || null,
        graduation_year || null, year_of_study || null,
        area_of_interest || null, portfolio_url || null, linkedin_url || null, resume_url || null,
        safeDate(availability_start), availability_duration || null, hours_per_week || null,
        skills || null, referral_source || null,
        why_clockwrk || null, strongest_skill || null, improvement_area || null,
        work_style || null, extra_note || null,
      ]
    );
    return res.json({ success: true, message: 'Application received' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET: All listings + both application types ───────────────────────────────
// GET /api/hr
router.get('/', authenticate, requireRoles(HR_ACCESS), async (req, res) => {
  try {
    const [listings] = await db.execute(
      `SELECT jl.*,
        (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jl.id) AS job_applicant_count,
        (SELECT COUNT(*) FROM internship_applications ia WHERE ia.job_id = jl.id) AS internship_applicant_count
       FROM job_listings jl ORDER BY jl.created_at DESC`
    );
    const [jobApplications] = await db.execute(
      `SELECT ja.*, jl.title AS job_title, jl.department, 'job' AS application_type
       FROM job_applications ja LEFT JOIN job_listings jl ON jl.id = ja.job_id
       ORDER BY ja.applied_at DESC`
    );
    const [internshipApplications] = await db.execute(
      `SELECT ia.*, jl.title AS job_title, jl.department, 'internship' AS application_type
       FROM internship_applications ia LEFT JOIN job_listings jl ON jl.id = ia.job_id
       ORDER BY ia.applied_at DESC`
    );
    return res.json({ success: true, listings, job_applications: jobApplications, internship_applications: internshipApplications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH: Update application status ────────────────────────────────────────
// PATCH /api/hr/applications/:id   body: { status, notes, application_type: 'job' | 'internship' }
router.patch('/applications/:id', authenticate, requireRoles(HR_ACCESS), async (req, res) => {
  const { status, notes, application_type = 'job' } = req.body;
  const table = application_type === 'internship' ? 'internship_applications' : 'job_applications';

  try {
    const [[app]] = await db.execute(`SELECT status FROM \`${table}\` WHERE id = ?`, [req.params.id]);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    await db.execute(
      `UPDATE \`${table}\` SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?`,
      [status, notes || '', req.params.id]
    );
    await db.execute(
      `INSERT INTO application_status_log (id, application_id, application_type, old_status, new_status, changed_at, changed_by)
       VALUES (UUID(), ?, ?, ?, ?, NOW(), ?)`,
      [req.params.id, application_type, app.status, status, req.user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE: Remove application ───────────────────────────────────────────────
// DELETE /api/hr/applications/:id?type=job|internship
router.delete('/applications/:id', authenticate, requireRoles(['owner', 'admin', 'hr']), async (req, res) => {
  const table = req.query.type === 'internship' ? 'internship_applications' : 'job_applications';
  try {
    await db.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST: Create listing ─────────────────────────────────────────────────────
router.post('/listings', authenticate, requireRoles(HR_ACCESS), async (req, res) => {
  const { title, department, description, requirements, type, location } = req.body;
  try {
    await db.execute(
      `INSERT INTO job_listings (id, title, department, description, requirements, type, status, location, is_active)
       VALUES (UUID(), ?, ?, ?, ?, ?, 'open', ?, 1)`,
      [title, department || '', description || '', requirements || '', type || 'full-time', location || 'Remote']
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH: Update listing ────────────────────────────────────────────────────
router.patch('/listings/:id', authenticate, requireRoles(HR_ACCESS), async (req, res) => {
  const { title, department, description, requirements, type, status, location } = req.body;
  try {
    await db.execute(
      `UPDATE job_listings SET title = ?, department = ?, description = ?, requirements = ?, type = ?, status = ?, location = ? WHERE id = ?`,
      [title, department || '', description || '', requirements || '', type || 'full-time', status || 'open', location || 'Remote', req.params.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PATCH: Toggle listing open/closed ───────────────────────────────────────
router.patch('/listings/:id/toggle', authenticate, requireRoles(HR_ACCESS), async (req, res) => {
  try {
    const [[listing]] = await db.execute('SELECT is_active, status FROM job_listings WHERE id = ?', [req.params.id]);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    const nowActive = listing.is_active ? 0 : 1;
    const nowStatus = nowActive ? 'open' : 'closed';
    await db.execute(
      `UPDATE job_listings SET is_active = ?, status = ?, closed_at = ? WHERE id = ?`,
      [nowActive, nowStatus, nowActive ? null : new Date(), req.params.id]
    );
    return res.json({ success: true, is_active: nowActive, status: nowStatus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE: Remove listing and its applications ──────────────────────────────
router.delete('/listings/:id', authenticate, requireRoles(['owner', 'admin']), async (req, res) => {
  try {
    await db.execute('DELETE FROM job_applications WHERE job_id = ?', [req.params.id]);
    await db.execute('DELETE FROM internship_applications WHERE job_id = ?', [req.params.id]);
    await db.execute('DELETE FROM job_listings WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
