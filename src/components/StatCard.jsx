const TONES = ['accent', 'blue', 'green', 'purple', 'teal', 'orange', 'pink'];
const VISUALS = ['bars', 'meter', 'dots'];

const pick = (items, seed = '') => {
  const text = String(seed || '');
  const score = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[score % items.length];
};

export default function StatCard({ label, value, sub, trend, tone, visual, meta }) {
  const resolvedTone = tone || pick(TONES, label);
  const resolvedVisual = visual || pick(VISUALS, `${label}${value}`);
  const bars = Array.isArray(meta?.bars) && meta.bars.length ? meta.bars : [42, 68, 54, 82, 48];

  return (
    <div className={`stat-card stat-card-${resolvedTone} stat-card-visual-${resolvedVisual}`}>
      <div className="stat-card-top">
        <div className="stat-label">{label}</div>
        <span className="stat-card-orb" aria-hidden="true" />
      </div>
      <div className="stat-value">{value}</div>
      {resolvedVisual === 'bars' && (
        <div className="mini-bars" aria-hidden="true">
          {bars.map((bar, index) => (
            <span key={index} style={{ '--bar-h': `${Math.max(12, Math.min(100, Number(bar) || 12))}%` }} />
          ))}
        </div>
      )}
      {resolvedVisual === 'meter' && (
        <div className="mini-meter" aria-hidden="true">
          <span style={{ '--meter': `${Math.max(4, Math.min(100, Number(meta?.percent ?? 62)))}%` }} />
        </div>
      )}
      {resolvedVisual === 'dots' && (
        <div className="mini-dot-grid" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} className={index < Number(meta?.active || 9) ? 'is-active' : ''} />)}
        </div>
      )}
      {(sub || trend) && (
        <div className={`stat-trend ${trend?.direction ? `stat-trend-${trend.direction}` : 'stat-trend-neutral'}`}>
          <span>{trend?.label || sub}</span>
        </div>
      )}
    </div>
  );
}
