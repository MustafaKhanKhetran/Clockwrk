import { useCallback, useEffect, useState } from 'react';
import Badge from '../components/Badge';
import { ErrorState, Spinner } from '../components/PageState';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { apiGet, arrayFrom, objectFrom } from '../utils/api';
import { date, money, statusVariant, titleCase } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const { user, updateUser } = useAuth();

  const load = useCallback(async () => {
    try {
      const [meResponse, dashboardResponse] = await Promise.all([
        apiGet('/api/client/me'),
        apiGet('/api/client/dashboard'),
      ]);
      const me = objectFrom(meResponse, 'user');
      setProfile(me);
      updateUser(me);
      setData(objectFrom(dashboardResponse, 'dashboard'));
    } catch (err) {
      setError(err.message);
    }
  }, [updateUser]);

  useEffect(() => { load(); }, [load]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  const stats = data.stats || data;
  const projects = arrayFrom(data, 'recent_projects', 'projects').slice(0, 3);
  const invoices = arrayFrom(data, 'recent_invoices', 'invoices').slice(0, 3);
  const name = profile?.name || profile?.full_name || user?.name || 'there';
  const company = profile?.company || profile?.company_name || user?.company || '';
  const plan = profile?.plan?.name || profile?.plan_name || profile?.plan || user?.plan || 'Client';
  const unpaidCount = stats.unpaid_invoices?.count ?? stats.unpaid_invoice_count ?? 0;
  const unpaidTotal = stats.unpaid_invoices?.total ?? stats.unpaid_invoice_total ?? 0;

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between rounded-xl bg-primary p-6 text-white">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {name}</h2>
          <p className="mt-1 text-sm text-white/60">{company || 'Here is the latest from your Clockwrk workspace.'}</p>
        </div>
        <Badge variant="accent">{plan}</Badge>
      </section>
      <section className="grid grid-cols-4 gap-5">
        <StatCard icon="▦" label="Active Projects" value={stats.active_projects ?? stats.active_project_count ?? 0} trend="Currently in progress" />
        <StatCard icon="?" label="Open Tickets" value={stats.open_tickets ?? stats.open_ticket_count ?? 0} trend="Awaiting resolution" />
        <StatCard icon="$" label="Unpaid Invoices" value={unpaidCount} trend={money(unpaidTotal)} />
        <StatCard icon="✓" label="Last Payment" value={date(stats.last_payment?.date || stats.last_payment_date)} trend={stats.last_payment?.amount ? money(stats.last_payment.amount) : 'Most recent payment'} />
      </section>
      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-5 text-lg font-semibold">Recent Projects</h2>
          <div className="space-y-4">
            {projects.length ? projects.map((project) => (
              <div key={project.id || project.name} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div><p className="text-sm font-medium">{project.name}</p><p className="mt-1 text-xs text-text-muted">{date(project.start_date || project.created_at)}</p></div>
                <Badge variant={statusVariant(project.status)}>{titleCase(project.status)}</Badge>
              </div>
            )) : <p className="py-6 text-center text-sm text-text-muted">No recent projects</p>}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-5 text-lg font-semibold">Recent Invoices</h2>
          <div className="space-y-4">
            {invoices.length ? invoices.map((invoice) => (
              <div key={invoice.id || invoice.number} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div><p className="text-sm font-medium">{invoice.number || invoice.invoice_number || `Invoice #${invoice.id}`}</p><p className="mt-1 text-xs text-text-muted">{money(invoice.amount || invoice.total)}</p></div>
                <Badge variant={statusVariant(invoice.status)}>{titleCase(invoice.status)}</Badge>
              </div>
            )) : <p className="py-6 text-center text-sm text-text-muted">No recent invoices</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
