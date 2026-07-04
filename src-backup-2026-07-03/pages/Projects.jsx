import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/PageState';
import Select from '../components/Select';
import { apiGet, arrayFrom } from '../utils/api';
import { date, statusVariant, titleCase } from '../utils/format';

const filters = ['All', 'Active', 'Completed', 'On Hold'].map((label) => ({ label, value: label.toLowerCase() }));

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setProjects(arrayFrom(await apiGet('/api/client/projects'), 'projects')); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => (projects || []).filter((project) => filter === 'all' || String(project.status).toLowerCase().replace('_', ' ') === filter), [filter, projects]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!projects) return <Spinner />;

  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div><h2 className="text-2xl font-bold">Projects</h2><p className="mt-1 text-sm text-text-secondary">Track the progress and deliverables for your work.</p></div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} options={filters} className="w-48" />
      </div>
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {filtered.length ? (
          <table className="w-full text-left">
            <thead className="border-b border-border bg-background/70 text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium">Start Date</th><th className="px-6 py-3 font-medium">Plan</th><th className="px-6 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((project) => <tr key={project.id || project.name} className="hover:bg-background/60"><td className="px-6 py-4 text-sm font-medium">{project.name}</td><td className="px-6 py-4"><Badge variant={statusVariant(project.status)}>{titleCase(project.status)}</Badge></td><td className="px-6 py-4 text-sm text-text-secondary">{date(project.start_date)}</td><td className="px-6 py-4 text-sm text-text-secondary">{project.plan?.name || project.plan || '—'}</td><td className="px-6 py-4 text-right"><button onClick={() => setSelected(project)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">View</button></td></tr>)}
            </tbody>
          </table>
        ) : <EmptyState title="No projects found" description="Projects matching this filter will appear here." />}
      </section>
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'Project details'} size="max-w-2xl">
        {selected && <div className="space-y-6">
          <div className="flex items-center justify-between"><Badge variant={statusVariant(selected.status)}>{titleCase(selected.status)}</Badge><span className="text-sm text-text-muted">{selected.plan?.name || selected.plan || ''}</span></div>
          <div><h3 className="text-sm font-semibold">Description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{selected.description || selected.notes || 'No description provided.'}</p></div>
          <div><h3 className="text-sm font-semibold">Timeline</h3><div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-background p-4 text-sm"><div><p className="text-xs text-text-muted">Start date</p><p className="mt-1 font-medium">{date(selected.start_date)}</p></div><div><p className="text-xs text-text-muted">Target completion</p><p className="mt-1 font-medium">{date(selected.end_date || selected.due_date)}</p></div></div></div>
          <div><h3 className="text-sm font-semibold">Deliverables</h3>{selected.deliverables?.length ? <ul className="mt-3 space-y-2">{selected.deliverables.map((item, index) => <li key={item.id || index} className="flex gap-2 rounded-lg border border-border p-3 text-sm text-text-secondary"><span className="text-success">✓</span>{item.name || item.title || item}</li>)}</ul> : <p className="mt-2 text-sm text-text-muted">No deliverables listed.</p>}</div>
        </div>}
      </Modal>
    </>
  );
}
