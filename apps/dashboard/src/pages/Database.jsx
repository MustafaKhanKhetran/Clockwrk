import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import DashLayout from '../components/DashLayout';
import { useAuth } from '../context/AuthContext';
import { apiFetch, apiGet, apiPost } from '../utils/dashboardApi';

const PAGE_SIZE = 50;
const COLUMN_TYPES = ['VARCHAR(255)', 'TEXT', 'INT', 'DECIMAL(10,2)', 'DATE', 'DATETIME', 'BOOLEAN'];

const emptyColumnForm = {
  name: '',
  type: 'VARCHAR(255)',
  nullable: true,
  default_value: '',
};

const normalizeTables = (payload) => {
  const list = payload?.tables || payload?.data || [];
  return list.map(table => typeof table === 'string' ? table : table.name || table.TABLE_NAME).filter(Boolean);
};

const normalizeSchema = (payload) => {
  const columns = payload?.columns || payload?.schema || payload?.data || [];
  return columns.map(column => ({
    name: column.name || column.COLUMN_NAME,
    type: column.type || column.COLUMN_TYPE || column.DATA_TYPE || 'text',
    isPrimary: Boolean(column.is_primary || column.primary || column.pk || column.COLUMN_KEY === 'PRI'),
    autoIncrement: Boolean(column.auto_increment || String(column.EXTRA || '').includes('auto_increment')),
    nullable: column.nullable ?? column.IS_NULLABLE === 'YES',
  })).filter(column => column.name);
};

const normalizeRows = (payload) => ({
  rows: payload?.rows || payload?.data || [],
  total: Number(payload?.total ?? payload?.row_count ?? payload?.count ?? payload?.rows?.length ?? payload?.data?.length ?? 0),
  page: Number(payload?.page || 1),
  hasNext: Boolean(payload?.has_next ?? payload?.hasNext ?? (payload?.rows || payload?.data || []).length === PAGE_SIZE),
});

const getRowId = (row, pk) => row?.[pk];
const valueToString = (value) => value === null || value === undefined ? '' : String(value);

export default function Database() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [schema, setSchema] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [rowForm, setRowForm] = useState({});
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [columnForm, setColumnForm] = useState(emptyColumnForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchTimer = useRef(null);

  const pkColumn = useMemo(() => schema.find(column => column.isPrimary)?.name || 'id', [schema]);
  const editableColumns = useMemo(() => schema.filter(column => !(column.isPrimary && column.autoIncrement)), [schema]);
  const visibleColumns = useMemo(() => schema.length ? schema : Object.keys(rows[0] || {}).map(name => ({ name, type: 'text', isPrimary: name === pkColumn })), [pkColumn, rows, schema]);
  const selectedRowId = editing ? getRowId(editing.row, pkColumn) : null;

  const loadTables = () => {
    setLoadingTables(true);
    setError('');
    apiGet('/api/db/tables')
      .then(payload => {
        const nextTables = normalizeTables(payload);
        setTables(nextTables);
        setSelectedTable(current => current || nextTables[0] || '');
      })
      .catch(err => setError(err.message || 'Failed to load tables'))
      .finally(() => setLoadingTables(false));
  };

  const loadTable = (table, nextPage = page, nextSearch = search) => {
    if (!table) return;
    setLoadingRows(true);
    setError('');
    Promise.all([
      apiGet(`/api/db/tables/${encodeURIComponent(table)}/schema`),
      apiGet(`/api/db/tables/${encodeURIComponent(table)}/rows`, { page: nextPage, limit: PAGE_SIZE, search: nextSearch }),
    ])
      .then(([schemaPayload, rowsPayload]) => {
        setSchema(normalizeSchema(schemaPayload));
        const normalized = normalizeRows(rowsPayload);
        setRows(normalized.rows);
        setTotalRows(normalized.total);
        setHasNext(normalized.hasNext);
        setPage(nextPage);
      })
      .catch(err => {
        setSchema([]);
        setRows([]);
        setTotalRows(0);
        setHasNext(false);
        setError(err.message || 'Failed to load table');
      })
      .finally(() => setLoadingRows(false));
  };

  useEffect(() => {
    if (user?.role === 'owner') loadTables();
  }, [user?.role]);

  useEffect(() => {
    if (selectedTable) {
      setEditing(null);
      setDeleteTarget(null);
      loadTable(selectedTable, 1, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  useEffect(() => {
    if (!selectedTable) return;
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => loadTable(selectedTable, 1, search), 300);
    return () => window.clearTimeout(searchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const startEdit = (row, column) => {
    if (column.name === pkColumn) return;
    setEditing({ row, column: column.name });
    setEditValue(valueToString(row[column.name]));
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const commitEdit = async () => {
    if (!editing || saving) return;
    const rowId = getRowId(editing.row, pkColumn);
    const oldValue = valueToString(editing.row[editing.column]);
    if (editValue === oldValue) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/db/tables/${encodeURIComponent(selectedTable)}/rows/${encodeURIComponent(rowId)}`, {
        method: 'PUT',
        body: { pk: pkColumn, data: { [editing.column]: editValue } },
      });
      setRows(prev => prev.map(row => getRowId(row, pkColumn) === rowId ? { ...row, [editing.column]: editValue } : row));
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to update cell');
    } finally {
      setSaving(false);
    }
  };

  const openAddRow = () => {
    const nextForm = {};
    editableColumns.forEach(column => {
      nextForm[column.name] = '';
    });
    setRowForm(nextForm);
    setShowAddRow(true);
  };

  const handleAddRow = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiPost(`/api/db/tables/${encodeURIComponent(selectedTable)}/rows`, { data: rowForm });
      setShowAddRow(false);
      loadTable(selectedTable, page, search);
    } catch (err) {
      setError(err.message || 'Failed to add row');
    } finally {
      setSaving(false);
    }
  };

  const handleAddColumn = async (event) => {
    event.preventDefault();
    if (!columnForm.name.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/api/db/tables/${encodeURIComponent(selectedTable)}/columns`, {
        name: columnForm.name.trim(),
        type: columnForm.type,
        nullable: columnForm.nullable,
        default_value: columnForm.default_value || null,
      });
      setShowAddColumn(false);
      setColumnForm(emptyColumnForm);
      loadTable(selectedTable, page, search);
    } catch (err) {
      setError(err.message || 'Failed to add column');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    const rowId = getRowId(row, pkColumn);
    setSaving(true);
    try {
      await apiFetch(`/api/db/tables/${encodeURIComponent(selectedTable)}/rows/${encodeURIComponent(rowId)}`, {
        method: 'DELETE',
        body: { pk: pkColumn },
      });
      setRows(prev => prev.filter(item => getRowId(item, pkColumn) !== rowId));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Failed to delete row');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'owner') {
    return (
      <DashLayout>
        <div className="empty-state"><p>Access denied. Database browser is owner only.</p></div>
      </DashLayout>
    );
  }

  return (
    <DashLayout>
      <div className="db-browser">
        <aside className="db-sidebar">
          <div className="db-sidebar-head">
            <Table2 size={18} strokeWidth={2} />
            <strong>Tables</strong>
          </div>
          <div className="db-table-list">
            {loadingTables ? (
              <span className="db-muted">Loading tables...</span>
            ) : tables.length ? tables.map(table => (
              <button
                type="button"
                key={table}
                className={table === selectedTable ? 'active' : ''}
                onClick={() => setSelectedTable(table)}
              >
                {table}
              </button>
            )) : (
              <span className="db-muted">No tables found</span>
            )}
          </div>
        </aside>

        <main className="db-main">
          <div className="db-toolbar">
            <div>
              <h2>{selectedTable || 'Database'}</h2>
              <p>{totalRows.toLocaleString()} rows · page {page}</p>
            </div>
            <label className="db-search">
              <Search size={16} strokeWidth={2} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search rows..."
              />
            </label>
            <button className="btn btn-ghost" type="button" onClick={() => loadTable(selectedTable, page, search)} disabled={!selectedTable || loadingRows}>
              <RefreshCw size={18} strokeWidth={2} />
              Refresh
            </button>
            <button className="btn btn-primary" type="button" onClick={openAddRow} disabled={!selectedTable}>
              <Plus size={18} strokeWidth={2} />
              Add Row
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowAddColumn(true)} disabled={!selectedTable}>
              <Columns size={18} strokeWidth={2} />
              Add Column
            </button>
          </div>

          {error && <div className="db-error">{error}</div>}

          <div className="db-grid-wrap">
            <table className="db-sheet">
              <thead>
                <tr>
                  {visibleColumns.map(column => (
                    <th key={column.name}>
                      <span>{column.name}</span>
                      <small>{column.isPrimary ? 'PK' : column.type}</small>
                    </th>
                  ))}
                  <th className="db-action-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr><td colSpan={visibleColumns.length + 1} className="db-loading">Loading rows...</td></tr>
                ) : rows.length ? rows.map((row, rowIndex) => {
                  const rowId = getRowId(row, pkColumn);
                  return (
                    <tr key={rowId ?? rowIndex}>
                      {visibleColumns.map(column => {
                        const isEditing = editing?.column === column.name && selectedRowId === rowId;
                        const cellValue = valueToString(row[column.name]);
                        const isLongText = cellValue.length > 100;
                        return (
                          <td
                            key={column.name}
                            className={column.name === pkColumn ? 'db-readonly-cell' : ''}
                            onClick={() => startEdit(row, column)}
                          >
                            {isEditing ? (
                              isLongText ? (
                                <textarea
                                  autoFocus
                                  value={editValue}
                                  onChange={event => setEditValue(event.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={event => {
                                    if (event.key === 'Escape') cancelEdit();
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) commitEdit();
                                  }}
                                />
                              ) : (
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={event => setEditValue(event.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter') commitEdit();
                                    if (event.key === 'Escape') cancelEdit();
                                  }}
                                />
                              )
                            ) : (
                              <span title={cellValue}>{cellValue || <em>null</em>}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="db-action-col">
                        {deleteTarget === rowId ? (
                          <div className="db-confirm-delete">
                            <span>Are you sure?</span>
                            <button type="button" onClick={() => deleteRow(row)} disabled={saving}>Delete</button>
                            <button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="db-trash" type="button" onClick={() => setDeleteTarget(rowId)} aria-label="Delete row">
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={visibleColumns.length + 1} className="db-loading">No rows found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="db-pagination">
            <button type="button" className="btn btn-ghost" disabled={page <= 1 || loadingRows} onClick={() => loadTable(selectedTable, page - 1, search)}>
              <ChevronLeft size={18} strokeWidth={2} />
              Prev
            </button>
            <span>Page {page}</span>
            <button type="button" className="btn btn-ghost" disabled={!hasNext || loadingRows} onClick={() => loadTable(selectedTable, page + 1, search)}>
              Next
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>
        </main>
      </div>

      {showAddRow && (
        <div className="modal-overlay" onClick={() => setShowAddRow(false)}>
          <form className="modal db-modal" onSubmit={handleAddRow} onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Row</h3>
              <button type="button" className="drawer-close" onClick={() => setShowAddRow(false)}>x</button>
            </div>
            <div className="db-form-grid">
              {editableColumns.map(column => (
                <label className="form-field" key={column.name}>
                  <span>{column.name}</span>
                  {String(column.type).toLowerCase().includes('text') ? (
                    <textarea className="dash-input" value={rowForm[column.name] || ''} onChange={event => setRowForm(prev => ({ ...prev, [column.name]: event.target.value }))} />
                  ) : (
                    <input className="dash-input" value={rowForm[column.name] || ''} onChange={event => setRowForm(prev => ({ ...prev, [column.name]: event.target.value }))} />
                  )}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddRow(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>Create Row</button>
            </div>
          </form>
        </div>
      )}

      {showAddColumn && (
        <div className="modal-overlay" onClick={() => setShowAddColumn(false)}>
          <form className="modal db-modal db-column-modal" onSubmit={handleAddColumn} onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Column</h3>
              <button type="button" className="drawer-close" onClick={() => setShowAddColumn(false)}>x</button>
            </div>
            <label className="form-field">
              <span>Column name</span>
              <input className="dash-input" required value={columnForm.name} onChange={event => setColumnForm(prev => ({ ...prev, name: event.target.value }))} />
            </label>
            <label className="form-field">
              <span>Type</span>
              <select className="dash-input" value={columnForm.type} onChange={event => setColumnForm(prev => ({ ...prev, type: event.target.value }))}>
                {COLUMN_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="db-toggle">
              <input type="checkbox" checked={columnForm.nullable} onChange={event => setColumnForm(prev => ({ ...prev, nullable: event.target.checked }))} />
              <span>Nullable</span>
            </label>
            <label className="form-field">
              <span>Default value</span>
              <input className="dash-input" value={columnForm.default_value} onChange={event => setColumnForm(prev => ({ ...prev, default_value: event.target.value }))} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddColumn(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>Create Column</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .db-browser {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 16px;
          min-height: calc(100vh - 150px);
        }

        .db-sidebar,
        .db-main {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: var(--bg-2);
        }

        .db-sidebar {
          align-self: start;
          position: sticky;
          top: 92px;
          max-height: calc(100vh - 120px);
          overflow: hidden;
        }

        .db-sidebar-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-1);
        }

        .db-table-list {
          display: grid;
          gap: 6px;
          max-height: calc(100vh - 180px);
          overflow-y: auto;
          padding: 10px;
        }

        .db-table-list button {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid transparent;
          border-radius: 14px;
          color: var(--text-2);
          background: transparent;
          font-size: 13px;
          font-weight: 650;
          text-align: left;
          cursor: pointer;
          transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
        }

        .db-table-list button:hover,
        .db-table-list button.active {
          border-color: var(--border);
          color: var(--text-1);
          background: var(--bg-3);
        }

        .db-main {
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          gap: 12px;
          padding: 14px;
        }

        .db-toolbar {
          display: grid;
          grid-template-columns: minmax(190px, 1fr) minmax(220px, 340px) auto auto auto;
          gap: 10px;
          align-items: center;
        }

        .db-toolbar h2 {
          margin: 0;
          color: var(--text-1);
          font-size: 24px;
        }

        .db-toolbar p,
        .db-muted {
          color: var(--text-3);
          font-size: 12px;
        }

        .db-search {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          color: var(--text-3);
          background: var(--bg-3);
        }

        .db-search input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          color: var(--text-1);
          background: transparent;
          font: inherit;
        }

        .db-error {
          padding: 12px 14px;
          border: 1px solid color-mix(in srgb, var(--red) 35%, transparent);
          border-radius: 14px;
          color: var(--red);
          background: color-mix(in srgb, var(--red) 10%, transparent);
          font-size: 13px;
        }

        .db-grid-wrap {
          min-height: 480px;
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
        }

        .db-sheet {
          width: 100%;
          min-width: 900px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .db-sheet th {
          position: sticky;
          top: 0;
          z-index: 2;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text-1);
          background: var(--bg-2);
          text-align: left;
          white-space: nowrap;
        }

        .db-sheet th span,
        .db-sheet th small {
          display: block;
        }

        .db-sheet th small {
          margin-top: 2px;
          color: var(--text-3);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .db-sheet td {
          max-width: 320px;
          padding: 9px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text-2);
          font-size: 13px;
          vertical-align: top;
        }

        .db-sheet tbody tr:nth-child(even) td {
          background: color-mix(in srgb, var(--bg-2) 72%, transparent);
        }

        .db-sheet tbody tr:hover td {
          background: var(--bg-3);
        }

        .db-sheet td span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .db-sheet td em {
          color: var(--text-4);
          font-style: normal;
        }

        .db-sheet input,
        .db-sheet textarea {
          width: 100%;
          min-width: 180px;
          border: 1px solid var(--accent);
          border-radius: 10px;
          outline: 0;
          padding: 8px;
          color: var(--text-1);
          background: var(--bg-2);
          font: inherit;
        }

        .db-sheet textarea {
          min-height: 96px;
          resize: vertical;
        }

        .db-readonly-cell {
          color: var(--text-4) !important;
          background: color-mix(in srgb, var(--bg-3) 70%, transparent);
          cursor: not-allowed;
        }

        .db-action-col {
          width: 88px;
          min-width: 88px;
          text-align: right;
        }

        .db-trash {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--red);
          background: var(--bg-2);
          cursor: pointer;
        }

        .db-confirm-delete {
          display: grid;
          gap: 5px;
          justify-items: end;
          color: var(--text-2);
          font-size: 11px;
        }

        .db-confirm-delete button {
          border: 0;
          color: var(--text-1);
          background: transparent;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .db-confirm-delete button:first-of-type {
          color: var(--red);
        }

        .db-loading {
          height: 220px;
          color: var(--text-3);
          text-align: center;
          vertical-align: middle !important;
        }

        .db-pagination {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          color: var(--text-3);
          font-size: 13px;
        }

        .db-modal {
          width: min(720px, calc(100vw - 28px));
        }

        .db-column-modal {
          width: min(440px, calc(100vw - 28px));
        }

        .db-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          max-height: 55vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .db-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-2);
          font-size: 13px;
        }

        @media (max-width: 1040px) {
          .db-browser {
            grid-template-columns: 1fr;
          }

          .db-sidebar {
            position: static;
            max-height: 240px;
          }

          .db-toolbar {
            grid-template-columns: 1fr;
          }

          .db-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashLayout>
  );
}
