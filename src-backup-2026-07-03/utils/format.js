export const money = (value = 0) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(value) || 0);

export const date = (value, fallback = '—') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? fallback
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
};

export const dateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(parsed);
};

export const titleCase = (value = '') => String(value)
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function statusVariant(status = '') {
  const value = String(status).toLowerCase().replace(/[_-]/g, ' ');
  if (['paid', 'active', 'completed', 'resolved'].includes(value)) return 'success';
  if (['pending', 'on hold', 'in progress', 'high'].includes(value)) return 'warning';
  if (['overdue', 'urgent', 'cancelled'].includes(value)) return 'danger';
  if (['open'].includes(value)) return 'accent';
  return 'default';
}
