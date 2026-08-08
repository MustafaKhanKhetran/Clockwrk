import DashLayout from '../components/DashLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const MONITORED_SITES = [
  { id: 'website', label: 'Main Website', url: 'clockwrk.io' },
  { id: 'dashboard', label: 'Dashboard', url: 'dashboard.clockwrk.io' },
  { id: 'api', label: 'API', url: 'api.clockwrk.io' },
];

export default function WebsiteHealth() {
  const checkedAt = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const incidentColumns = [
    { key: 'service', label: 'Service' },
    { key: 'status', label: 'Status' },
    { key: 'started', label: 'Started' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Website Health</h2>
          <p>Uptime and performance monitoring</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary">Run Check</button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {MONITORED_SITES.map(site => (
          <article className="card" key={site.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div className="client-cell-sub">{site.label}</div>
                <div className="client-cell-name" style={{ marginTop: '5px', fontSize: '15px' }}>
                  {site.url}
                </div>
              </div>
              <StatusBadge value="Operational" tone="green" />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '22px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div>
                <div className="stat-label">Last Checked</div>
                <div style={{ marginTop: '5px', fontSize: '13px', color: 'var(--text-1)' }}>{checkedAt}</div>
              </div>
              <div>
                <div className="stat-label">Response Time</div>
                <div style={{ marginTop: '5px', fontSize: '13px', color: 'var(--text-1)' }}>—</div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="card-title">Recent Incidents</div>
      <DataTable
        columns={incidentColumns}
        rows={[]}
        emptyTitle="No incidents recorded"
        emptySubtitle="All monitored services are operating normally."
      />
    </DashLayout>
  );
}
