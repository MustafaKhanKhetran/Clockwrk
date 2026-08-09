import { useMemo, useState } from 'react';
import DashLayout from '../components/DashLayout';

const CATEGORIES = [
  { title: 'Onboarding', icon: '🚀' },
  { title: 'Clients', icon: '👥' },
  { title: 'Projects', icon: '📊' },
  { title: 'Finance', icon: '💰' },
  { title: 'HR', icon: '👤' },
  { title: 'Tools', icon: '🔧' },
];

export default function Knowledge() {
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CATEGORIES;
    return CATEGORIES.filter(category => category.title.toLowerCase().includes(query));
  }, [search]);

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Knowledge Base</h2>
          <p>Documentation, guides, and internal resources</p>
        </div>
        <div className="page-header-actions" style={{ minWidth: '280px' }}>
          <input
            className="dash-input"
            type="search"
            placeholder="Search categories..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="card">
          <div className="empty-state"><p>No categories found</p></div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          {filteredCategories.map(category => (
            <article className="card" key={category.title}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'var(--control-bg)',
                      fontSize: '22px',
                    }}
                  >
                    {category.icon}
                  </span>
                  <div>
                    <div className="client-cell-name" style={{ fontSize: '15px' }}>{category.title}</div>
                    <div className="client-cell-sub" style={{ marginTop: '4px' }}>Browse documentation</div>
                  </div>
                </div>
                <span className="badge badge-muted">0 articles</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashLayout>
  );
}
