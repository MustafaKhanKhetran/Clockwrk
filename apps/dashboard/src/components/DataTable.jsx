export default function DataTable({ columns, rows, rowKey = 'id', onRowClick, emptyTitle, emptySubtitle, loading }) {
  if (loading) {
    return (
      <div className="card table-surface">
        <table className="data-table data-table-skeleton">
          <thead>
            <tr>
              {columns.map(column => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <td key={column.key}>
                    <span
                      className={colIndex === 0 ? 'skeleton-line skeleton-wide' : 'skeleton-line'}
                      aria-hidden="true"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="card table-surface">
        <div className="empty-state">
          <span className="empty-state-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></svg>
          </span>
          <p>{emptyTitle || 'No records found'}</p>
          {emptySubtitle && <span>{emptySubtitle}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="card table-surface">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(column => <th key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row[rowKey] || index}
              className={onRowClick ? 'clickable' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(column => (
                <td key={column.key} onClick={column.stopClick ? e => e.stopPropagation() : undefined}>
                  {column.render ? column.render(row) : row[column.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
