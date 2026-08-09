const STATUS_CLASS = {
  active: 'badge-green',
  completed: 'badge-green',
  approved: 'badge-green',
  healthy: 'badge-green',
  paid: 'badge-green',
  confirmed: 'badge-green',
  open: 'badge-blue',
  in_progress: 'badge-blue',
  in_review: 'badge-blue',
  interview: 'badge-blue',
  pending: 'badge-yellow',
  queue: 'badge-yellow',
  revision: 'badge-yellow',
  paused: 'badge-yellow',
  overdue: 'badge-red',
  urgent: 'badge-red',
  failed: 'badge-red',
  rejected: 'badge-red',
  cancelled: 'badge-red',
  archived: 'badge-muted',
  inactive: 'badge-muted',
  closed: 'badge-muted',
};

const format = (value) => String(value || 'unknown').replace(/_/g, ' ');

export default function StatusBadge({ value, tone }) {
  const key = String(value || '').toLowerCase();
  const className = tone ? `badge-${tone}` : STATUS_CLASS[key] || 'badge-muted';
  return <span className={`badge ${className}`} style={{ textTransform: 'capitalize' }}>{format(value)}</span>;
}
