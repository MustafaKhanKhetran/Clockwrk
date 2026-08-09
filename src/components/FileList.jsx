import { useEffect, useState } from 'react';
import { Download, File, Trash2 } from 'lucide-react';
import { apiDelete, apiGet } from '../utils/dashboardApi';
import { toast } from './Toast';

const API = '/api/files/records';

export default function FileList({ entityType, entityId, canManage = false }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!entityId) return;
    setLoading(true);
    apiGet(API, { [`${entityType}_id`]: entityId })
      .then(data => setFiles(data.files || []))
      .catch(err => toast.error(err.message || 'Could not load files'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [entityType, entityId]);

  const remove = async file => {
    if (!window.confirm(`Delete ${file.file_name}?`)) return;
    try { await apiDelete(`${API}/${file.id}`); load(); toast.success('File deleted'); }
    catch (err) { toast.error(err.message || 'Delete failed'); }
  };

  if (loading) return <p className="empty-copy">Loading files...</p>;
  if (!files.length) return <p className="empty-copy">No files have been linked yet.</p>;
  return <div className="record-file-list">
    {files.map(file => <div className="record-file-row" key={file.id}>
      <span className="file-type-icon"><File size={18} /></span>
      <span><strong>{file.file_name}</strong><small>{file.category || 'file'} · {file.version || 'Latest'}</small></span>
      <a className="icon-action" href={file.file_url} target="_blank" rel="noreferrer" aria-label={`Open ${file.file_name}`}><Download size={17} /></a>
      {canManage && <button className="icon-action danger" onClick={() => remove(file)} aria-label={`Delete ${file.file_name}`}><Trash2 size={17} /></button>}
    </div>)}
  </div>;
}
