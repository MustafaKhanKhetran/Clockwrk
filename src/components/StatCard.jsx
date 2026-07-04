export default function StatCard({ icon, label, value, trend }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
          {trend && <p className="mt-1 text-xs text-text-muted">{trend}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-xl text-accent">{icon}</div>
      </div>
    </div>
  );
}
