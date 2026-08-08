import { useEffect, useState } from 'react';
import { toast } from './Toast';
import { callDashboardApi, getList } from '../utils/dashboardApi';

const API = '/api/files';

const EMPTY_LINK = {
  file_name: '',
  file_url: '',
  category: 'reference',
  version: '1',
  notes: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

export default function FileList({ entityType, entityId, canManage }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_LINK);
  const [submitting, setSubmitting] = useState(false);

  const fetchFiles = () => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    callDashboardApi(API, 'list', { entity_type: entityType, entity_id: entityId })
      .then(data => setFiles(getList(data, ['files'])))
      .catch(err => {
        console.error(err);
        setError('Files backend required: dashboard-files.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, [entityType, entityId]);

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!entityId) return;
    setSubmitting(true);
    try {
      await callDashboardApi(API, 'create_link', {
        entity_type: entityType,
        entity_id: entityId,
        ...form,
      });
      toast.success('File link added');
      setForm(EMPTY_LINK);
      setShowAdd(false);
      fetchFiles();
    } catch (err) {
      toast.error('File link needs dashboard-files backend support.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="linked-panel">
      <div className="linked-panel-header">
        <span>Files</span>
        {canManage && <button className="btn btn-xs btn-ghost" onClick={() => setShowAdd(v => !v)}>Add file link</button>}
      </div>

      {showAdd && (
        <form className="linked-form" onSubmit={handleAddLink}>
          <input className="dash-input" required placeholder="File name" value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} />
          <input className="dash-input" required placeholder="https://..." value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} />
          <input className="dash-input" placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <textarea className="dash-input" rows={2} placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="inline-stack">
            <button className="btn btn-sm btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Save link'}</button>
            <span className="form-hint">Storage upload is not faked. This only links an existing file URL.</span>
          </div>
        </form>
      )}

      {loading ? (
        <p className="form-hint">Loading files...</p>
      ) : error ? (
        <p className="form-hint">{error}</p>
      ) : files.length ? (
        <div className="linked-list">
          {files.map(file => (
            <a key={file.id || file.file_url} className="linked-item" href={file.file_url} target="_blank" rel="noreferrer">
              <strong>{file.file_name || file.name || 'File'}</strong>
              <span>{file.category || 'reference'} · v{file.version || 1} · {fmtDate(file.created_at)}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="form-hint">No linked files yet.</p>
      )}
    </div>
  );
}
