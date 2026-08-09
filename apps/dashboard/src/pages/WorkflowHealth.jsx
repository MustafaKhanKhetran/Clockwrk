import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, XCircle, ExternalLink } from 'lucide-react';
import DataTable from '../components/DataTable';
import DashLayout from '../components/DashLayout';
import { apiGet } from '../utils/dashboardApi';

const N8N_BASE = 'https://n8n.clockwrk.io/webhook';

const API_WORKFLOWS = [
  { name: 'Alerts',          endpoint: '/api/alerts' },
  { name: 'Bookings',        endpoint: '/api/bookings' },
  { name: 'Calendar',        endpoint: '/api/calendar' },
  { name: 'Clients',         endpoint: '/api/clients' },
  { name: 'Communications',  endpoint: '/api/communications' },
  { name: 'Files',           endpoint: '/api/files' },
  { name: 'Finance',         endpoint: '/api/finance' },
  { name: 'HR',              endpoint: '/api/hr' },
  { name: 'Newsletter',      endpoint: '/api/newsletter' },
  { name: 'Projects',        endpoint: '/api/projects' },
  { name: 'Referrals',       endpoint: '/api/referrals' },
  { name: 'Requests',        endpoint: '/api/requests' },
  { name: 'Stats',           endpoint: '/api/stats' },
  { name: 'Team',            endpoint: '/api/team' },
  { name: 'Time Logs',       endpoint: '/api/time-logs' },
];

const SITE_WORKFLOWS = [
  { name: 'Payment Confirm', endpoint: `${N8N_BASE}/payment-confirm` },
  { name: 'Site Booking',    endpoint: `${N8N_BASE}/booking` },
  { name: 'Site Newsletter', endpoint: `${N8N_BASE}/newsletter` },
  { name: 'Site Referral',   endpoint: `${N8N_BASE}/referral` },
];

const ALL_WORKFLOWS = [
  ...API_WORKFLOWS.map(wf => ({ ...wf, group: 'api' })),
  ...SITE_WORKFLOWS.map(wf => ({ ...wf, group: 'site' })),
];

export default function WorkflowHealth() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [failedExecs, setFailedExecs] = useState([]);
  const [execsLoading, setExecsLoading] = useState(false);

  const fetchFailedExecs = async () => {
    setExecsLoading(true);
    try {
      const data = await apiGet('/api/n8n/executions/failed?limit=50');
      setFailedExecs(data.executions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setExecsLoading(false);
    }
  };

  const apiResults  = results.filter(result => result.group === 'api');
  const siteResults = results.filter(result => result.group === 'site');
  const offlineCount = results.filter(result => !result.online).length;
  const onlineCount = results.filter(result => result.online).length;
  const averageMs = useMemo(() => {
    const responseTimes = results.map(result => result.ms).filter(Boolean);
    if (!responseTimes.length) return null;
    return Math.round(responseTimes.reduce((sum, ms) => sum + ms, 0) / responseTimes.length);
  }, [results]);

  const runChecks = async workflows => {
    setLoading(true);

    const checks = workflows.map(async wf => {
      const startedAt = performance.now();
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);

      try {
        if (wf.group === 'site') {
          // n8n webhooks are POST-only
          const res = await fetch(wf.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ healthcheck: true }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          await apiGet(wf.endpoint, {}, { signal: controller.signal });
        }
        const ms = Math.round(performance.now() - startedAt);
        return { ...wf, online: true, ms, error: null };
      } catch (err) {
        const ms = Math.round(performance.now() - startedAt);
        return {
          ...wf,
          online: false,
          ms,
          error: err?.name === 'AbortError' ? 'Timeout' : 'Failed',
        };
      } finally {
        window.clearTimeout(timeout);
      }
    });

    const settled = await Promise.allSettled(checks);
    const nextResults = settled.map((item, index) => {
      if (item.status === 'fulfilled') return item.value;
      return {
        ...workflows[index],
        online: false,
        ms: null,
        error: 'Failed',
      };
    });

    setResults(nextResults);
    setLastChecked(new Date());
    setLoading(false);
  };

  useEffect(() => {
    runChecks(ALL_WORKFLOWS);
    fetchFailedExecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    {
      key: 'name',
      label: 'Workflow',
      render: row => (
        <strong style={{ color: 'var(--text-1)', fontWeight: 700 }}>{row.name}</strong>
      ),
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      render: row => (
        <span style={{ color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 12 }}>
          {row.endpoint}
        </span>
      ),
    },
    {
      key: 'online',
      label: 'Status',
      render: row => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: loading ? 'var(--text-4)' : row.online ? 'var(--accent)' : 'var(--red)',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: loading ? 'var(--text-4)' : row.online ? 'var(--accent)' : 'var(--red)',
              boxShadow: row.online ? '0 0 6px var(--accent)' : 'none',
            }}
          />
          {row.online ? 'Online' : 'Offline'}
          {!row.online && row.error ? (
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>({row.error})</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'ms',
      label: 'Response',
      render: row => (
        <span
          style={{
            color: row.ms > 2000 ? 'var(--yellow)' : 'var(--text-2)',
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {row.ms ? `${row.ms} ms` : '-'}
        </span>
      ),
    },
    {
      key: 'checked',
      label: 'Checked',
      render: () => (
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
          {lastChecked ? lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
        </span>
      ),
    },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Workflow Health</h2>
          <p>{lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : 'Checking all workflows...'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchFailedExecs}
            disabled={execsLoading}
          >
            <RefreshCw size={18} strokeWidth={2} />
            {execsLoading ? 'Loading...' : 'Reload Failures'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { runChecks(ALL_WORKFLOWS); fetchFailedExecs(); }}
            disabled={loading}
          >
            <RefreshCw size={18} strokeWidth={2} />
            {loading ? 'Checking...' : 'Refresh All'}
          </button>
        </div>
      </div>

      {!loading && offlineCount > 0 ? (
        <div className="wf-alert-banner">
          <AlertTriangle size={18} strokeWidth={2} />
          <span>
            <strong>{offlineCount} workflow{offlineCount === 1 ? '' : 's'} offline</strong>
            {' - check the Express API server and verify the route is available.'}
          </span>
        </div>
      ) : null}

      <div className="wf-summary-strip">
        <div>
          <span>Total</span>
          <strong>{results.length || ALL_WORKFLOWS.length}</strong>
        </div>
        <div>
          <span>Online</span>
          <strong>{onlineCount}</strong>
        </div>
        <div>
          <span>Offline</span>
          <strong>{offlineCount}</strong>
        </div>
        <div>
          <span>Avg response</span>
          <strong>{averageMs ? `${averageMs} ms` : '-'}</strong>
        </div>
      </div>

      <div className="wf-grouped-tables">
        <section className="wf-group-section">
          <div className="wf-group-heading">
            <h3>Dashboard API Routes</h3>
            <span>{loading ? API_WORKFLOWS.length : apiResults.length} checks</span>
          </div>
          <DataTable
            columns={columns}
            rows={loading ? [] : apiResults}
            rowKey="endpoint"
            loading={loading}
            emptyTitle="No API routes checked yet"
            emptySubtitle="Click Refresh to run health checks"
          />
        </section>

        <section className="wf-group-section">
          <div className="wf-group-heading">
            <h3>Site Workflows (n8n)</h3>
            <span>{loading ? SITE_WORKFLOWS.length : siteResults.length} checks</span>
          </div>
          <DataTable
            columns={columns}
            rows={loading ? [] : siteResults}
            rowKey="endpoint"
            loading={loading}
            emptyTitle="No site workflows checked yet"
            emptySubtitle="Click Refresh to run health checks"
          />
        </section>
      </div>

      {/* ── Failed n8n Executions ── */}
      <section className="wf-group-section" style={{ marginTop: 8 }}>
        <div className="wf-group-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <XCircle size={18} strokeWidth={2} color="var(--red)" />
            <h3 style={{ color: 'var(--red)' }}>Failed n8n Executions — Today</h3>
          </div>
          <span>{failedExecs.length} failure{failedExecs.length !== 1 ? 's' : ''} today</span>
        </div>
        <DataTable
          columns={[
            {
              key: 'workflow_name',
              label: 'Workflow',
              render: row => <strong style={{ color: 'var(--text-1)' }}>{row.workflow_name}</strong>,
            },
            {
              key: 'mode',
              label: 'Trigger',
              render: row => (
                <span style={{ color: 'var(--text-3)', fontSize: 13, textTransform: 'capitalize' }}>
                  {row.mode}
                </span>
              ),
            },
            {
              key: 'started_at',
              label: 'When',
              render: row => (
                <span style={{ color: 'var(--text-2)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(row.started_at).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              ),
            },
            {
              key: 'duration',
              label: 'Duration',
              render: row => {
                const ms = row.stopped_at && row.started_at
                  ? new Date(row.stopped_at) - new Date(row.started_at)
                  : null;
                return (
                  <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
                    {ms != null ? `${ms} ms` : '-'}
                  </span>
                );
              },
            },
            {
              key: 'actions',
              label: '',
              render: row => (
                <a
                  href={`https://n8n.clockwrk.io/workflow/${row.workflow_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Open in n8n <ExternalLink size={13} />
                </a>
              ),
            },
          ]}
          rows={failedExecs}
          rowKey="id"
          loading={execsLoading}
          emptyTitle="No failed executions"
          emptySubtitle="All workflows are running clean"
        />
      </section>

      <style>{`
        .wf-alert-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          margin-bottom: 16px;
          border: 1px solid color-mix(in srgb, var(--red) 35%, transparent);
          border-radius: 14px;
          background: color-mix(in srgb, var(--red) 12%, transparent);
          color: var(--red);
          font-size: 14px;
        }

        .wf-alert-banner svg {
          flex-shrink: 0;
        }

        .wf-summary-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .wf-summary-strip > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 62px;
          padding: 14px 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--control-bg);
        }

        .wf-summary-strip span {
          color: var(--text-3);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .wf-summary-strip strong {
          color: var(--text-1);
          font-size: 22px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .wf-grouped-tables {
          display: grid;
          gap: 18px;
        }

        .wf-group-section {
          display: grid;
          gap: 10px;
        }

        .wf-group-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 4px;
        }

        .wf-group-heading h3 {
          margin: 0;
          color: var(--text-1);
          font-size: 18px;
          font-weight: 750;
        }

        .wf-group-heading span {
          color: var(--text-3);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        @media (max-width: 760px) {
          .wf-summary-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .wf-summary-strip {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashLayout>
  );
}
