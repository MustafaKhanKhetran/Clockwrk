import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const N8N_URL    = process.env.N8N_URL    || 'http://host.docker.internal:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

const n8nHeaders = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json',
};

// ─── Get failed executions (today only) ──────────────────────────────────────
// GET /api/n8n/executions/failed
router.get('/executions/failed', authenticate, async (req, res) => {
  try {
    // Fetch last 200 failed executions + all workflows in parallel
    const [execRes, wfRes] = await Promise.all([
      fetch(`${N8N_URL}/api/v1/executions?status=error&limit=200`, { headers: n8nHeaders }),
      fetch(`${N8N_URL}/api/v1/workflows?limit=100`, { headers: n8nHeaders }),
    ]);

    const [execData, wfData] = await Promise.all([execRes.json(), wfRes.json()]);

    // Build workflowId → name map
    const wfMap = {};
    for (const wf of (wfData.data || [])) wfMap[wf.id] = wf.name;

    // Filter to today's date only (server local date)
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const executions = (execData.data || [])
      .filter(e => e.startedAt && e.startedAt.slice(0, 10) === todayStr)
      .map(e => ({
        id:            e.id,
        workflow_id:   e.workflowId,
        workflow_name: wfMap[e.workflowId] || e.workflowId,
        status:        e.status,
        mode:          e.mode,
        started_at:    e.startedAt,
        stopped_at:    e.stoppedAt,
        n8n_url:       `https://n8n.clockwrk.io/workflow/${e.workflowId}`,
      }));

    return res.json({ success: true, executions, total: executions.length, date: todayStr });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get all workflows + their last execution status ──────────────────────────
// GET /api/n8n/workflows
router.get('/workflows', authenticate, async (req, res) => {
  try {
    const [wfRes, execRes] = await Promise.all([
      fetch(`${N8N_URL}/api/v1/workflows?limit=100`, { headers: n8nHeaders }),
      fetch(`${N8N_URL}/api/v1/executions?limit=100`, { headers: n8nHeaders }),
    ]);

    const [wfData, execData] = await Promise.all([wfRes.json(), execRes.json()]);

    // For each workflow, find the most recent execution
    const latestByWorkflow = {};
    for (const e of (execData.data || [])) {
      if (!latestByWorkflow[e.workflowId]) latestByWorkflow[e.workflowId] = e;
    }

    const workflows = (wfData.data || []).map(wf => {
      const latest = latestByWorkflow[wf.id];
      return {
        id:          wf.id,
        name:        wf.name,
        active:      wf.active,
        last_status: latest?.status || null,
        last_run:    latest?.startedAt || null,
        n8n_url:     `https://n8n.clockwrk.io/workflow/${wf.id}`,
      };
    });

    return res.json({ success: true, workflows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
