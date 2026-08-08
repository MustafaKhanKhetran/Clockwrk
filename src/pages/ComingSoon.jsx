import DashLayout from '../components/DashLayout';
import StatusBadge from '../components/StatusBadge';

const HIDDEN_MODULES = [
  'Pipeline analytics',
  'Workload forecasting',
  'Reports',
  'Website health',
  'Workflow health',
  'Audit logs',
  'Knowledge base',
  'Newsletter',
  'Referrals',
  'Jobs / HR',
  'Database tools',
  'Settings',
];

export default function ComingSoon() {
  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Coming soon</h2>
          <p>These modules are hidden from the launch dashboard until the workflows are fully connected.</p>
        </div>
      </div>

      <section className="card" style={{ padding: 24 }}>
        <div className="card-title">Launch dashboard includes</div>
        <div className="inline-stack" style={{ flexWrap: 'wrap', gap: 10 }}>
          {['Clients', 'Projects', 'Requests', 'Bookings', 'Calendar', 'Finance', 'Files', 'Team', 'Time', 'Alerts'].map(item => (
            <StatusBadge key={item} value={item} tone="green" />
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div className="card-title">Parked until after launch</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {HIDDEN_MODULES.map(item => (
            <div key={item} className="empty-state" style={{ minHeight: 72, padding: 14 }}>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </DashLayout>
  );
}
