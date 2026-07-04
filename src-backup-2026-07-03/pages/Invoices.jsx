import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../components/Badge';
import { EmptyState, ErrorState, Spinner } from '../components/PageState';
import Select from '../components/Select';
import { apiGet, apiUrl, arrayFrom, getToken } from '../utils/api';
import { date, money, statusVariant, titleCase } from '../utils/format';

const filters = ['All', 'Paid', 'Pending', 'Overdue'].map((label) => ({ label, value: label.toLowerCase() }));

export default function Invoices() {
  const [invoices, setInvoices] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setInvoices(arrayFrom(await apiGet('/api/client/invoices'), 'invoices')); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => (invoices || []).filter((invoice) => filter === 'all' || String(invoice.status).toLowerCase() === filter), [filter, invoices]);
  const totals = useMemo(() => (invoices || []).reduce((sum, invoice) => {
    const key = String(invoice.status).toLowerCase() === 'paid' ? 'paid' : 'pending';
    sum[key] += Number(invoice.amount || invoice.total) || 0;
    return sum;
  }, { paid: 0, pending: 0 }), [invoices]);

  async function download(invoice) {
    const directUrl = invoice.pdf_url || invoice.download_url;
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/client/invoices/${invoice.id}/pdf`), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.number || invoice.invoice_number || `invoice-${invoice.id}`}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!invoices) return <Spinner />;
  return (
    <div>
      <div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-bold">Invoices</h2><p className="mt-1 text-sm text-text-secondary">Review billing history and download invoices.</p></div><Select value={filter} onChange={(e) => setFilter(e.target.value)} options={filters} className="w-48" /></div>
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {filtered.length ? <table className="w-full text-left"><thead className="border-b border-border bg-background/70 text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-6 py-3 font-medium">Invoice #</th><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 font-medium">Description</th><th className="px-6 py-3 font-medium">Amount</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 text-right font-medium">Action</th></tr></thead><tbody className="divide-y divide-border">
          {filtered.map((invoice) => <tr key={invoice.id || invoice.number} className="hover:bg-background/60"><td className="px-6 py-4 text-sm font-medium">{invoice.number || invoice.invoice_number || `#${invoice.id}`}</td><td className="px-6 py-4 text-sm text-text-secondary">{date(invoice.date || invoice.created_at)}</td><td className="max-w-xs truncate px-6 py-4 text-sm text-text-secondary">{invoice.description || 'Services'}</td><td className="px-6 py-4 text-sm font-semibold">{money(invoice.amount || invoice.total)}</td><td className="px-6 py-4"><Badge variant={statusVariant(invoice.status)}>{titleCase(invoice.status)}</Badge></td><td className="px-6 py-4 text-right"><button disabled={!invoice.id && !invoice.pdf_url && !invoice.download_url} onClick={() => download(invoice)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background disabled:cursor-not-allowed disabled:opacity-40">Download</button></td></tr>)}
        </tbody></table> : <EmptyState title="No invoices found" description="Invoices matching this filter will appear here." />}
        <div className="flex justify-end gap-10 border-t border-border bg-background/50 px-6 py-4 text-sm"><div><span className="text-text-muted">Total paid</span><strong className="ml-3">{money(totals.paid)}</strong></div><div><span className="text-text-muted">Total pending</span><strong className="ml-3">{money(totals.pending)}</strong></div></div>
      </section>
    </div>
  );
}
