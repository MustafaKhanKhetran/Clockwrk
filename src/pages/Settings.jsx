import { useState } from 'react';
import DashLayout from '../components/DashLayout';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../utils/dashboardApi';

const API = '/api/query';

export default function Settings() {
  const { user } = useAuth();
  const [query, setQuery] = useState('SELECT * FROM referrers;');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(null);

  const QUICK_QUERIES = [
    { label: 'All referrers',        sql: 'SELECT * FROM referrers;' },
    { label: 'All referrals',        sql: 'SELECT * FROM referrals;' },
    { label: 'All clients',          sql: 'SELECT * FROM clients;' },
    { label: 'All payments',         sql: 'SELECT * FROM payments;' },
    { label: 'All bookings',         sql: 'SELECT * FROM bookings ORDER BY booking_date DESC;' },
    { label: 'All employees',        sql: 'SELECT id, name, email, role, status, joined_date FROM employees;' },
    { label: 'All newsletter subs',  sql: 'SELECT * FROM newsletter_subscribers;' },
    { label: 'All alerts',           sql: 'SELECT * FROM dashboard_alerts ORDER BY created_at DESC;' },
    { label: 'All requests',         sql: 'SELECT * FROM requests ORDER BY created_at DESC;' },
    { label: 'All projects',         sql: 'SELECT * FROM projects;' },
    { label: 'All job listings',     sql: 'SELECT * FROM job_listings;' },
    { label: 'All applications',     sql: 'SELECT * FROM applications ORDER BY created_at DESC;' },
    { label: 'Show all tables',      sql: 'SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = \'agency_db\' ORDER BY table_name;' },
  ];

  const runQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setRowCount(null);
    try {
      const data = await apiPost(API, { query: query.trim() });
      if (data.success) {
        setResults(data.results || []);
        setRowCount(data.results?.length ?? 0);
      } else {
        setError(data.error || 'Query failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  };

  const columns = results && results.length > 0 ? Object.keys(results[0]) : [];

  if (user?.role !== 'owner') {
    return (
      <DashLayout>
        <div className="empty-state"><p>Access restricted to owner only.</p></div>
      </DashLayout>
    );
  }

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Settings</h2>
          <p>SQL query runner · owner only</p>
        </div>
      </div>

      <div className="sql-layout">
        <div className="sql-sidebar">
          <div className="sql-sidebar-label">Quick queries</div>
          {QUICK_QUERIES.map((q, i) => (
            <button
              key={i}
              className={`sql-quick-btn ${query === q.sql ? 'active' : ''}`}
              onClick={() => setQuery(q.sql)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="sql-main">
          <div className="card sql-editor-card">
            <div className="sql-editor-header">
              <span className="sql-editor-label">SQL Query</span>
              <span className="sql-editor-hint">Cmd + Enter to run</span>
            </div>
            <textarea
              className="sql-textarea"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              rows={6}
              placeholder="SELECT * FROM clients;"
            />
            <div className="sql-editor-footer">
              <button
                className="btn btn-primary"
                onClick={runQuery}
                disabled={loading}
              >
                {loading ? 'Running...' : 'Run query'}
              </button>
              {rowCount !== null && !error && (
                <span className="sql-row-count">{rowCount} row{rowCount !== 1 ? 's' : ''} returned</span>
              )}
            </div>
          </div>

          {error && (
            <div className="card sql-error">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          )}

          {results && results.length === 0 && !error && (
            <div className="card"><div className="empty-state"><p>Query returned no rows</p></div></div>
          )}

          {results && results.length > 0 && (
            <div className="card sql-results-card">
              <div className="sql-results-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i}>
                        {columns.map(col => (
                          <td key={col} className="sql-result-cell">
                            {row[col] === null ? <span className="sql-null">null</span> : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashLayout>
  );
}
