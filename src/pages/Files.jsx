import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ChevronRight,
  Download,
  File,
  FileText,
  Film,
  Folder,
  Image,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import DashLayout from '../components/DashLayout';
import { toast } from '../components/Toast';
import { apiFetch, apiGet, apiPost } from '../utils/dashboardApi';

const API = '/api/files';
const DEFAULT_FOLDERS = ['cvs', 'clients', 'projects', 'team', 'internal'];

const cleanPath = (path = '') => String(path).replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
const joinPath = (...parts) => cleanPath(parts.filter(Boolean).join('/'));
const basename = (path = '') => cleanPath(path).split('/').filter(Boolean).pop() || path || 'Files';
const parentPath = (path = '') => cleanPath(path).split('/').filter(Boolean).slice(0, -1).join('/');

const fmtSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const fmtDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getSignedUrl = (payload) => payload?.url || payload?.signed_url || payload?.download_url || payload?.data?.url || '';

const normalizeFolder = (folder, currentFolder) => {
  if (typeof folder === 'string') {
    const path = folder.includes('/') ? cleanPath(folder) : joinPath(currentFolder, folder);
    return { type: 'folder', name: basename(path), path };
  }
  const path = cleanPath(folder?.path || folder?.key || joinPath(currentFolder, folder?.name || folder?.folder_name));
  return {
    ...folder,
    type: 'folder',
    name: folder?.name || folder?.folder_name || basename(path),
    path,
  };
};

const normalizeFile = (file) => {
  const key = cleanPath(file?.key || file?.file_key || file?.path || file?.url || file?.name || file?.file_name);
  return {
    ...file,
    type: 'file',
    key,
    name: file?.name || file?.file_name || basename(key),
    size: file?.size || file?.bytes || file?.content_length,
    last_modified: file?.last_modified || file?.updated_at || file?.created_at,
    content_type: file?.content_type || file?.mime_type || file?.type,
  };
};

const normalizePayload = (payload, currentFolder) => {
  const mixedItems = payload?.items || payload?.contents || payload?.data || [];
  const folders = [
    ...(payload?.folders || []),
    ...mixedItems.filter(item => item?.type === 'folder' || item?.is_folder),
  ].map(folder => normalizeFolder(folder, currentFolder)).filter(folder => folder.path);

  const files = [
    ...(payload?.files || []),
    ...mixedItems.filter(item => item?.type !== 'folder' && !item?.is_folder),
  ].map(normalizeFile).filter(file => file.key);

  return { folders, files };
};

const fileIcon = (file) => {
  const name = String(file.name || file.key || '').toLowerCase();
  const type = String(file.content_type || '').toLowerCase();
  if (type.includes('image') || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(name)) return <Image size={22} strokeWidth={2} />;
  if (type.includes('video') || /\.(mp4|mov|webm|mkv)$/.test(name)) return <Film size={22} strokeWidth={2} />;
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return <Archive size={22} strokeWidth={2} />;
  if (/\.(pdf|docx?|txt|md|csv|xls[x]?)$/.test(name)) return <FileText size={22} strokeWidth={2} />;
  return <File size={22} strokeWidth={2} />;
};

const buildTree = (folders) => {
  const root = {};
  folders.forEach(path => {
    cleanPath(path).split('/').filter(Boolean).reduce((node, part) => {
      node[part] ||= {};
      return node[part];
    }, root);
  });
  return root;
};

function FolderTree({ tree, currentFolder, onSelect, prefix = '' }) {
  return Object.entries(tree).map(([name, children]) => {
    const path = joinPath(prefix, name);
    const active = currentFolder === path;
    return (
      <div className="files-tree-node" key={path}>
        <button type="button" className={active ? 'active' : ''} onClick={() => onSelect(path)}>
          <Folder size={16} strokeWidth={2} />
          <span>{name}</span>
        </button>
        {Object.keys(children).length > 0 && (
          <div className="files-tree-children">
            <FolderTree tree={children} currentFolder={currentFolder} onSelect={onSelect} prefix={path} />
          </div>
        )}
      </div>
    );
  });
}

export default function Files() {
  const uploadInputRef = useRef(null);
  const [currentFolder, setCurrentFolder] = useState('cvs');
  const [knownFolders, setKnownFolders] = useState(DEFAULT_FOLDERS);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [confirmingKey, setConfirmingKey] = useState(null);

  const loadFolder = (folder = currentFolder) => {
    setLoading(true);
    setError('');
    apiGet(API, { folder })
      .then(payload => {
        const normalized = normalizePayload(payload, folder);
        setFolders(normalized.folders);
        setFiles(normalized.files);
        setKnownFolders(prev => Array.from(new Set([
          ...prev,
          folder,
          ...normalized.folders.map(item => item.path),
        ].filter(Boolean))));
      })
      .catch(err => {
        setFolders([]);
        setFiles([]);
        setError(err.message || 'Files are not reachable. R2 may be offline in local dev.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFolder(currentFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const all = [...folders, ...files];
    if (!query) return all;
    return all.filter(item => [item.name, item.path, item.key].join(' ').toLowerCase().includes(query));
  }, [files, folders, search]);

  const breadcrumbs = useMemo(() => cleanPath(currentFolder).split('/').filter(Boolean), [currentFolder]);
  const tree = useMemo(() => buildTree(knownFolders), [knownFolders]);

  const openFile = async (file) => {
    try {
      const payload = await apiGet(`${API}/url`, { key: file.key });
      const url = getSignedUrl(payload);
      if (!url) throw new Error('Signed URL was not returned.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err.message || 'Could not open file');
    }
  };

  const deleteFile = async (file) => {
    try {
      await apiFetch(API, { method: 'DELETE', params: { key: file.key } });
      setConfirmingKey(null);
      setFiles(prev => prev.filter(item => item.key !== file.key));
      toast.success('File deleted');
    } catch (err) {
      toast.error(err.message || 'Could not delete file');
    }
  };

  const createFolder = async () => {
    const name = window.prompt('New folder name');
    const folderName = cleanPath(name || '');
    if (!folderName) return;
    const path = joinPath(currentFolder, folderName);
    try {
      await apiPost(`${API}/folder`, { path });
      setKnownFolders(prev => Array.from(new Set([...prev, path])));
      setFolders(prev => [...prev, { type: 'folder', name: basename(path), path }]);
      toast.success('Folder created');
    } catch (err) {
      toast.error(err.message || 'Could not create folder');
    }
  };

  const uploadFiles = async (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setUploading(true);
    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.append('file', file);
        await apiFetch(`${API}/upload`, {
          method: 'POST',
          params: { folder: currentFolder },
          body: formData,
        });
      }
      toast.success(selected.length === 1 ? 'File uploaded' : 'Files uploaded');
      loadFolder(currentFolder);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Files</h2>
          <p>Manage Cloudflare R2 folders, uploads, and signed downloads</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => loadFolder(currentFolder)} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={() => uploadInputRef.current?.click()} disabled={uploading}>
            <Upload size={18} strokeWidth={2} />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={uploadInputRef} className="files-upload-input" type="file" multiple onChange={uploadFiles} />
        </div>
      </div>

      <div className="files-shell">
        <aside className="files-sidebar">
          <div className="files-sidebar-head">
            <span>Folders</span>
          </div>
          <nav className="files-tree">
            <FolderTree tree={tree} currentFolder={currentFolder} onSelect={setCurrentFolder} />
          </nav>
          <button type="button" className="files-new-folder" onClick={createFolder}>
            <Plus size={18} strokeWidth={2} />
            New Folder
          </button>
        </aside>

        <main className="files-main">
          <div className="files-toolbar">
            <div>
              <div className="files-breadcrumb">
                <button type="button" onClick={() => setCurrentFolder(breadcrumbs[0] || 'cvs')}>{breadcrumbs[0] || 'cvs'}</button>
                {breadcrumbs.slice(1).map((crumb, index) => {
                  const path = breadcrumbs.slice(0, index + 2).join('/');
                  return (
                    <span key={path}>
                      <ChevronRight size={15} strokeWidth={2} />
                      <button type="button" onClick={() => setCurrentFolder(path)}>{crumb}</button>
                    </span>
                  );
                })}
              </div>
              <p>{folders.length} folders · {files.length} files</p>
            </div>

            <div className="files-toolbar-actions">
              <label className="files-search">
                <Search size={16} strokeWidth={2} />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search files..." />
              </label>
              <div className="files-view-toggle" aria-label="File view mode">
                <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
                <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="files-error">
              <strong>Files unavailable</strong>
              <p>{error}</p>
              <button type="button" className="btn btn-ghost" onClick={() => loadFolder(currentFolder)}>Try again</button>
            </div>
          ) : loading ? (
            <div className={viewMode === 'grid' ? 'files-grid' : 'files-list'}>
              {Array.from({ length: 8 }).map((_, index) => <div className="files-skeleton" key={index} />)}
            </div>
          ) : visibleItems.length ? (
            <div className={viewMode === 'grid' ? 'files-grid' : 'files-list'}>
              {visibleItems.map(item => item.type === 'folder' ? (
                <button type="button" className="files-item files-folder" key={item.path} onClick={() => setCurrentFolder(item.path)}>
                  <span className="files-item-icon"><Folder size={24} strokeWidth={2} /></span>
                  <span className="files-item-name">{item.name}</span>
                  <small>Folder</small>
                </button>
              ) : (
                <article className="files-item" key={item.key}>
                  <button type="button" className="files-file-open" onClick={() => openFile(item)}>
                    <span className="files-item-icon">{fileIcon(item)}</span>
                    <span className="files-item-name">{item.name}</span>
                    <small>{fmtSize(item.size)} · {fmtDate(item.last_modified)}</small>
                  </button>
                  <div className="files-actions">
                    <button type="button" onClick={() => openFile(item)} aria-label={`Download ${item.name}`}>
                      <Download size={16} strokeWidth={2} />
                    </button>
                    {confirmingKey === item.key ? (
                      <span className="files-confirm">
                        <button type="button" onClick={() => deleteFile(item)}>Delete</button>
                        <button type="button" onClick={() => setConfirmingKey(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button type="button" className="danger" onClick={() => setConfirmingKey(item.key)} aria-label={`Delete ${item.name}`}>
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="files-empty">
              <Folder size={32} strokeWidth={1.7} />
              <strong>No files here yet</strong>
              <p>Upload files or create a folder inside {currentFolder}.</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .files-upload-input {
          display: none;
        }

        .files-shell {
          min-height: calc(100vh - 220px);
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr);
          gap: 18px;
        }

        .files-sidebar,
        .files-main {
          border: 1px solid var(--border);
          border-radius: 26px;
          background: var(--bg-2);
          box-shadow: 0 18px 60px rgba(0,0,0,.12);
        }

        .files-sidebar {
          display: flex;
          flex-direction: column;
          min-height: 620px;
          overflow: hidden;
        }

        .files-sidebar-head {
          padding: 20px 18px 12px;
          color: var(--text-1);
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .files-tree {
          flex: 1;
          overflow: auto;
          padding: 0 10px 14px;
        }

        .files-tree-node button,
        .files-new-folder {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 0;
          border-radius: 16px;
          color: var(--text-2);
          background: transparent;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          text-align: left;
          transition: background 220ms var(--ease), color 220ms var(--ease), transform 220ms var(--ease);
        }

        .files-tree-node button {
          padding: 0 12px;
        }

        .files-tree-node button:hover,
        .files-tree-node button.active {
          color: #101012;
          background: var(--accent);
        }

        .files-tree-children {
          margin-left: 16px;
          padding-left: 10px;
          border-left: 1px solid var(--border);
        }

        .files-new-folder {
          justify-content: center;
          margin: 12px;
          width: calc(100% - 24px);
          color: var(--text-1);
          background: var(--bg-3);
        }

        .files-new-folder:hover {
          transform: translateY(-1px);
          background: color-mix(in srgb, var(--accent) 18%, var(--bg-3));
        }

        .files-main {
          min-width: 0;
          padding: 18px;
        }

        .files-toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 18px;
        }

        .files-breadcrumb,
        .files-breadcrumb span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .files-breadcrumb button {
          border: 0;
          padding: 0;
          color: var(--text-1);
          background: transparent;
          font: inherit;
          font-size: 24px;
          font-weight: 850;
          cursor: pointer;
        }

        .files-toolbar p {
          margin: 6px 0 0;
          color: var(--text-3);
          font-size: 13px;
        }

        .files-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .files-search {
          min-width: min(320px, 100%);
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          color: var(--text-3);
          background: var(--bg-3);
        }

        .files-search input {
          width: 100%;
          border: 0;
          outline: 0;
          color: var(--text-1);
          background: transparent;
          font: inherit;
        }

        .files-view-toggle {
          display: inline-flex;
          gap: 3px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          background: var(--bg-3);
        }

        .files-view-toggle button {
          min-height: 36px;
          padding: 8px 14px;
          border: 0;
          border-radius: var(--pill);
          color: var(--text-2);
          background: transparent;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .files-view-toggle button.active {
          color: #101012;
          background: var(--accent);
        }

        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 14px;
        }

        .files-list {
          display: grid;
          gap: 10px;
        }

        .files-item {
          min-width: 0;
          min-height: 150px;
          display: grid;
          gap: 14px;
          align-content: space-between;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 22px;
          color: var(--text-1);
          background: var(--bg-3);
          text-align: left;
          transition: transform 220ms var(--ease), border-color 220ms var(--ease), background 220ms var(--ease);
        }

        .files-list .files-item {
          min-height: 72px;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
        }

        button.files-item,
        .files-file-open {
          border: 0;
          font: inherit;
          cursor: pointer;
        }

        .files-file-open {
          min-width: 0;
          display: grid;
          gap: 12px;
          padding: 0;
          color: inherit;
          background: transparent;
          text-align: left;
        }

        .files-item:hover {
          transform: translateY(-2px);
          border-color: var(--border-2);
          background: color-mix(in srgb, var(--accent) 10%, var(--bg-3));
        }

        .files-item-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: #101012;
          background: var(--accent);
        }

        .files-folder .files-item-icon {
          background: #ffd84d;
        }

        .files-item-name {
          overflow: hidden;
          color: var(--text-1);
          font-size: 15px;
          font-weight: 850;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .files-item small {
          color: var(--text-3);
          font-size: 12px;
          font-weight: 700;
        }

        .files-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .files-actions > button,
        .files-confirm button {
          min-width: 36px;
          min-height: 36px;
          display: inline-grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--text-1);
          background: var(--bg-2);
          cursor: pointer;
        }

        .files-actions > button:hover {
          border-color: var(--border-2);
        }

        .files-actions > button.danger,
        .files-confirm button:first-child {
          color: var(--red);
        }

        .files-confirm {
          display: inline-flex;
          gap: 6px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          background: var(--bg-2);
        }

        .files-confirm button {
          width: auto;
          min-width: 58px;
          padding: 0 10px;
          border-radius: var(--pill);
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .files-error,
        .files-empty {
          min-height: 360px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          border: 1px dashed var(--border);
          border-radius: 24px;
          color: var(--text-3);
          background: var(--bg-3);
          text-align: center;
        }

        .files-error strong,
        .files-empty strong {
          color: var(--text-1);
          font-size: 20px;
        }

        .files-error p,
        .files-empty p {
          max-width: 420px;
          margin: 0;
          color: var(--text-3);
        }

        .files-skeleton {
          min-height: 150px;
          border-radius: 22px;
          background: linear-gradient(90deg, var(--bg-3), color-mix(in srgb, var(--text-1) 8%, var(--bg-3)), var(--bg-3));
          background-size: 200% 100%;
          animation: files-shimmer 1.4s ease infinite;
        }

        @keyframes files-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        @media (max-width: 980px) {
          .files-shell {
            grid-template-columns: 1fr;
          }

          .files-sidebar {
            min-height: auto;
          }

          .files-toolbar {
            display: grid;
          }

          .files-toolbar-actions {
            justify-content: stretch;
          }

          .files-search {
            min-width: 100%;
          }
        }
      `}</style>
    </DashLayout>
  );
}
