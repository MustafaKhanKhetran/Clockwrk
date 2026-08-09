const DEFAULT_BARS = [42, 68, 36, 84, 58, 72];

export default function InsightStrip({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="insight-strip">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={`insight-tile ${item.dark ? 'insight-tile-dark' : ''}`}>
          <div className="insight-tile-head">
            <span>{item.label}</span>
            <span className={`icon-bubble ${item.dark ? '' : 'icon-bubble-dark'}`}>{item.icon || '↗'}</span>
          </div>
          <strong>{item.value}</strong>
          {item.visual === 'heatmap' ? (
            <div className="insight-heatmap" aria-hidden="true">
              {Array.from({ length: 15 }, (_, i) => <i key={i} />)}
            </div>
          ) : (
            <div className="insight-bars" aria-hidden="true">
              {(item.bars || DEFAULT_BARS).map((bar, i) => (
                <i key={i} style={{ '--h': `${Math.max(12, Math.min(100, Number(bar) || 12))}%` }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
