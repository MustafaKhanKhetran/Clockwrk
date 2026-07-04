import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, ErrorState, Spinner } from '../components/PageState';
import Select from '../components/Select';
import { apiGet, apiUrl, arrayFrom, getToken } from '../utils/api';
import { date } from '../utils/format';

function fileIcon(file) {
  const type = `${file.mime_type || file.type || ''} ${file.name || file.filename || ''}`.toLowerCase();
  if (type.includes('pdf')) return ['PDF', 'bg-danger/10 text-danger'];
  if (type.match(/image|png|jpg|jpeg|gif|webp/)) return ['IMG', 'bg-accent/10 text-accent'];
  if (type.match(/zip|rar|archive/)) return ['ZIP', 'bg-warning/10 text-warning'];
  return ['DOC', 'bg-success/10 text-success'];
}

export default function Files() {
  const [files, setFiles] = useState(null);
  const [project, setProject] = useState('all');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setFiles(arrayFrom(await apiGet('/api/client/files'), 'files')); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const projectOptions = useMemo(() => {
    const names = [...new Set((files || []).map((file) => file.project?.name || file.project_name).filter(Boolean))];
    return [{ value: 'all', label: 'All projects' }, ...names.map((name) => ({ value: name, label: name }))];
  }, [files]);
  const filtered = useMemo(() => (files || []).filter((file) => project === 'all' || (file.project?.name || file.project_name) === project), [files, project]);

  async function download(file) {
    if (file.download_url || file.url) {
      window.open(file.download_url || file.url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const response = await fetch(apiUrl(`/api/client/files/${file.id}/download`), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name || file.filename || 'download';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }

  if (error && !files) return <ErrorState message={error} onRetry={load} />;
  if (!files) return <Spinner />;
  return (
    <div>
      {error && <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      <div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-bold">Files</h2><p className="mt-1 text-sm text-text-secondary">Download assets and documents shared with you.</p></div><Select value={project} onChange={(e) => setProject(e.target.value)} options={projectOptions} className="w-56" /></div>
      {filtered.length ? <div className="grid grid-cols-3 gap-5">{filtered.map((file) => {
        const [label, color] = fileIcon(file);
        return <article key={file.id || file.name} className="rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover"><div className={`flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold ${color}`}>{label}</div><h3 className="mt-4 truncate text-sm font-semibold" title={file.name || file.filename}>{file.name || file.filename}</h3><p className="mt-1 truncate text-xs text-text-secondary">{file.project?.name || file.project_name || 'General'}</p><div className="mt-5 flex items-center justify-between"><span className="text-xs text-text-muted">{date(file.uploaded_at || file.created_at)}</span><button onClick={() => download(file)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-background">Download</button></div></article>;
      })}</div> : <section className="rounded-xl border border-border bg-surface shadow-card"><EmptyState title="No files found" description="Shared files matching this project will appear here." /></section>}
    </div>
  );
}
