export default function SkeletonBlock({ rows = 5, variant = 'table', bare = false }) {
  if (variant === 'stats') {
    return (
      <div className="stat-grid">
        {[...Array(rows)].map((_, i) => (
          <div className="stat-card skeleton-stat-card" key={i}>
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-value" />
            <span className="skeleton-pill" />
          </div>
        ))}
      </div>
    );
  }

  const content = (
    <>
      {[...Array(rows)].map((_, i) => (
        <div className="skeleton-table-row" key={i}>
          <span className="skeleton-line skeleton-wide" />
          <span className="skeleton-line" />
          <span className="skeleton-pill" />
        </div>
      ))}
    </>
  );

  if (bare) return <div className="skeleton-table-card">{content}</div>;
  return <div className="card table-surface skeleton-table-card">{content}</div>;
}
