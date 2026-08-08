import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers3,
  Plus,
  Search,
  Pause,
  Users,
  X,
} from 'lucide-react';
import DashLayout from '../components/DashLayout';
import PillSelect from '../components/PillSelect';
import RoleGuard, { hasRole } from '../components/RoleGuard';
import SkeletonBlock from '../components/SkeletonBlock';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import FileList from '../components/FileList';
import CommunicationTimeline from '../components/CommunicationTimeline';
import { apiGet, apiPost } from '../utils/dashboardApi';
import './Clients.css';

const API = '/api/clients';
const RATE_URL = '/api/rate/usd-pkr';
const ELEVATE_RATE_FALLBACK = 275.62;
const PLANS = ['startup', 'business', 'enterprise'];
const BILLINGS = ['weekly', 'monthly'];
const STATUSES = ['active', 'paused', 'cancelled'];
const DRAWER_TABS = ['overview', 'projects', 'files', 'communications', 'billing'];
const EMPTY_FORM = {
  name: '', email: '', company: '', plan: 'startup',
  billing: 'weekly', whitelabel: false, payment_ref: '',
  referral_code: '', notes: ''
};

const initials = (name) => String(name || 'CW')
  .trim()
  .split(/\s+/)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const projectCount = (client) => Number(client.active_projects ?? client.project_count ?? 0);
const requestCount = (client) => Number(client.active_requests ?? client.request_count ?? 0);
const isPast = (date) => Boolean(date && new Date(date).getTime() < Date.now());
const isAtRisk = (client) => ['paused', 'cancelled'].includes(client.status) || isPast(client.next_payment_due);
const overdueDays = (date) => date && isPast(date)
  ? Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
  : 0;
const riskReason = (client) => {
  if (client.status === 'paused') return 'Account paused';
  if (client.status === 'cancelled') return 'Cancelled';
  if (isPast(client.next_payment_due)) return `Payment overdue · ${overdueDays(client.next_payment_due)}d`;
  return 'Needs attention';
};

const fmtDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '-';
const fmtMoney = (amount) => amount === undefined || amount === null
  ? '-'
  : `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const daysAgo = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
const nameToPerson = (name, role) => name ? { name, role } : null;
const assignedManager = (client) => {
  const pm = client.assigned_pm_name || client.project_manager_name || client.pm_name || client.assigned_project_manager;
  const am = client.assigned_am_name || client.account_manager_name || client.am_name || client.assigned_account_manager;
  return [nameToPerson(pm, 'PM'), nameToPerson(am, 'AM')].filter(Boolean);
};
const planDotCount = (plan) => ({ startup: 1, business: 2, enterprise: 3 }[String(plan || '').toLowerCase()] || 0);
const addOns = (client) => {
  const raw = client.addons || client.add_ons || client.active_addons;
  const list = Array.isArray(raw)
    ? raw
    : String(raw || '').split(',').map(item => item.trim()).filter(Boolean);
  if (client.whitelabel || client.white_label) list.unshift('White label');
  if (client.priority_support) list.unshift('Priority support');
  return [...new Set(list)].filter(Boolean);
};

function KpiStrip({ cards }) {
  return (
    <div className="ov-kpi-strip cl-kpi-strip">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article className={`ov-kpi-card ov-tone-${tone}`} key={label}>
          <span className="ov-kpi-icon"><Icon size={21} strokeWidth={1.9} /></span>
          <div className="ov-kpi-copy">
            <strong className={label === 'MRR' ? 'cl-mrr-value' : ''}>{value}</strong>
            <span>{label}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function Avatar({ client, className = 'cl-client-avatar' }) {
  return (
    <span className={className}>
      {initials(client?.name)}
    </span>
  );
}

function TeamPill({ people }) {
  if (!people.length) return <span className="cl-team-pill cl-team-pill-empty">Unassigned</span>;
  const visible = people.length > 3 ? people.slice(0, 2) : people.slice(0, 3);
  return (
    <span className="cl-team-pill">
      <span className="cl-team-stack">
        {visible.map(person => (
          <span className="cl-team-avatar" key={`${person.role}-${person.name}`}>{initials(person.name).slice(0, 1)}</span>
        ))}
        {people.length > 3 && <span className="cl-team-avatar cl-team-overflow">+{people.length - 2}</span>}
      </span>
      <span className="cl-team-label">Managers</span>
      <span className="cl-team-count">{people.length}</span>
      <span className="cl-team-tooltip">
        {people.map(person => (
          <span key={`${person.role}-${person.name}`}>
            <strong>{person.name}</strong>
            <em>{person.role}</em>
          </span>
        ))}
      </span>
    </span>
  );
}

function ClientPill({ client }) {
  return (
    <span className="cl-client-pill">
      <span className="cl-client-pill-avatar">{initials(client?.name)}</span>
      <span className="cl-client-pill-label">{client?.name || '-'}</span>
    </span>
  );
}

function PlanCell({ plan }) {
  const count = planDotCount(plan);
  return (
    <span className="cl-plan-cell">
      <span className="cl-plan-dots" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => <i key={index} />)}
      </span>
      <span>{plan || '-'}</span>
    </span>
  );
}

function AddOnsCell({ client }) {
  const list = addOns(client);
  if (!list.length) return <span className="cl-addon-empty">None</span>;
  return (
    <span className="cl-addon-cell">
      {list.slice(0, 2).map(item => <i key={item}>{item}</i>)}
      {list.length > 2 && <b>+{list.length - 2}</b>}
    </span>
  );
}

function StatusIcon({ status }) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return <Check size={15} strokeWidth={3} />;
  if (normalized === 'paused') return <Pause size={15} strokeWidth={3} />;
  return <X size={15} strokeWidth={3} />;
}

function FilterPillGroup({ label, value, options, onChange, renderOption }) {
  return (
    <div className="cl-filter-pill-group" aria-label={`Filter ${label}`}>
      <div>
        {options.map(option => (
          <button
            type="button"
            className={value === option.value ? 'is-active' : ''}
            key={option.value}
            onClick={() => onChange(value === option.value ? 'all' : option.value)}
          >
            {renderOption ? renderOption(option) : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortHeader({ label, sortKey, sortConfig, onSort, iconSide = 'left' }) {
  const active = sortConfig.key === sortKey;
  const arrows = (
    <span className="cl-sort-arrows">
      <ChevronUp size={11} />
      <ChevronDown size={11} />
    </span>
  );
  return (
    <button
      type="button"
      className={`cl-sort-th icon-${iconSide} ${active ? `is-active ${sortConfig.direction}` : ''}`}
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}`}
    >
      {iconSide === 'left' && arrows}
      <span>{label}</span>
      {iconSide === 'right' && arrows}
    </button>
  );
}

export default function Clients() {
  const { user } = useAuth();
  const isOwnerAdmin = hasRole(user, ['owner', 'admin']);
  const isAssignedManager = hasRole(user, ['project_manager', 'account_manager']);
  const isFinance = user?.role === 'finance';
  const isSales = user?.role === 'sales';
  const canViewFinance = isOwnerAdmin || isFinance;
  const canViewNotes = isOwnerAdmin || isAssignedManager;
  const canOpenDrawer = !isSales;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterBilling, setFilterBilling] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [search, setSearch] = useState('');
  const [elevateRate, setElevateRate] = useState(ELEVATE_RATE_FALLBACK);
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [error, setError] = useState(null);

  const getListPayload = () => {
    if (isOwnerAdmin) return { action: 'list' };
    if (isAssignedManager) return { action: 'list', employee_id: user?.id };
    if (isFinance) return { action: 'list', view: 'billing' };
    if (isSales) return { action: 'list', view: 'leads' };
    return null;
  };

  const fetchClients = () => {
    const payload = getListPayload();
    if (!payload) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiGet(API, payload)
      .then(data => { if (data.success) setClients(data.clients || []); })
      .catch(err => {
        console.error(err);
        setError('Failed to load data. Check your connection and try again.');
        toast.error('Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, [user?.role, user?.id]);
  useEffect(() => { if (selected) setDrawerTab('overview'); }, [selected?.id]);
  useEffect(() => {
    apiGet(RATE_URL)
      .then(data => {
        if (data.success && data.rate) setElevateRate(Number(data.rate));
      })
      .catch(() => {});
  }, []);

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!isOwnerAdmin) return;
    setSubmitting(true);
    try {
      const data = await apiPost(API, { action: 'add', ...form });
      if (data.success) {
        setShowAdd(false);
        setForm(EMPTY_FORM);
        fetchClients();
        toast.success('Client added');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filtered = useMemo(() => {
    const rows = clients.filter(client => {
    if (filterStatus !== 'all' && client.status !== filterStatus) return false;
    if (filterPlan !== 'all' && client.plan !== filterPlan) return false;
    if (filterBilling !== 'all' && client.billing !== filterBilling) return false;
    const query = search.trim().toLowerCase();
    if (query && ![client.name, client.company, client.email].some(value => String(value || '').toLowerCase().includes(query))) return false;
    return true;
    });
    if (!sortConfig.key) return rows;
    const sortValue = (client) => {
      if (sortConfig.key === 'projects') return projectCount(client);
      if (sortConfig.key === 'requests') return requestCount(client);
      if (sortConfig.key === 'last_paid') return Number(client.last_payment_amount || 0);
      if (sortConfig.key === 'due_date') return client.next_payment_due ? new Date(client.next_payment_due).getTime() : 0;
      return 0;
    };
    return [...rows].sort((a, b) => {
      const diff = sortValue(a) - sortValue(b);
      return sortConfig.direction === 'asc' ? diff : -diff;
    });
  }, [clients, filterBilling, filterPlan, filterStatus, search, sortConfig]);

  const metrics = useMemo(() => {
    const active = clients.filter(client => client.status === 'active').length;
    const risk = clients.filter(isAtRisk);
    const newClients = clients.filter(client => client.subscribed_at && daysAgo(client.subscribed_at) <= 30);
    const mrr = clients.reduce((sum, client) => (
      sum + Number(client.last_payment_amount || 0) * (client.billing === 'weekly' ? 4 : 1)
    ), 0);
    const topClient = clients.reduce((top, client) => (
      Number(client.total_revenue || 0) > Number(top?.total_revenue || 0) ? client : top
    ), null);
    const planMix = PLANS.map(plan => ({ plan, count: clients.filter(client => client.plan === plan).length }));
    return {
      active,
      risk,
      newClients,
      mrr,
      topClient: Number(topClient?.total_revenue || 0) > 0 ? topClient : null,
      planMix,
    };
  }, [clients]);

  const openClient = (client) => {
    if (canOpenDrawer) setSelected(client);
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });
  const planFilterOptions = [
    ...PLANS.map(plan => ({ value: plan, label: plan })),
  ];
  const billingFilterOptions = BILLINGS.map(billing => ({ value: billing, label: billing }));
  const statusFilterOptions = [
    { value: 'active', label: 'Active', icon: 'active' },
    { value: 'paused', label: 'Paused', icon: 'paused' },
  ];
  const hasActivePillFilters = filterPlan !== 'all' || filterBilling !== 'all' || filterStatus !== 'all';
  const clearPillFilters = () => {
    setFilterPlan('all');
    setFilterBilling('all');
    setFilterStatus('all');
  };

  const renderList = () => (
    <div className="cl-list">
      <div className="cl-list-head">
        <span>Client</span>
        <span>Plan</span>
        <span>Add-ons</span>
        <span>Billing</span>
        <span>PM/AM</span>
        <SortHeader label="Projects" sortKey="projects" sortConfig={sortConfig} onSort={handleSort} iconSide="left" />
        <SortHeader label="Requests" sortKey="requests" sortConfig={sortConfig} onSort={handleSort} iconSide="right" />
        <SortHeader label="Last paid" sortKey="last_paid" sortConfig={sortConfig} onSort={handleSort} />
        <SortHeader label="Due date" sortKey="due_date" sortConfig={sortConfig} onSort={handleSort} />
        <span>Status</span>
      </div>
      {filtered.map(client => {
        const team = assignedManager(client);
        return (
          <div
            className={`cl-list-row ${canOpenDrawer ? 'is-clickable' : ''}`}
            key={client.id}
            onClick={() => openClient(client)}
          >
            <span className="cl-list-client">
              <ClientPill client={client} />
            </span>
            <span><PlanCell plan={client.plan} /></span>
            <span><AddOnsCell client={client} /></span>
            <span className="cl-list-value">{client.billing || '-'}</span>
            <span><TeamPill people={team} /></span>
            <span className="cl-list-value">{projectCount(client)}</span>
            <span className="cl-list-value">{requestCount(client)}</span>
            <span className="cl-list-payment"><strong>{fmtMoney(client.last_payment_amount)}</strong><small>{fmtDate(client.last_payment_at || client.last_payment_date)}</small></span>
            <span className={`cl-list-due ${isPast(client.next_payment_due) ? 'is-overdue' : ''}`}>{fmtDate(client.next_payment_due)}</span>
            <span><i className={`cl-status-pill ${client.status || 'cancelled'}`} title={client.status || 'cancelled'}><StatusIcon status={client.status} /></i></span>
          </div>
        );
      })}
    </div>
  );

  return (
    <RoleGuard
      roles={['owner', 'admin', 'project_manager', 'account_manager', 'finance', 'sales']}
      fallback={<DashLayout><div className="empty-state"><p>Access denied</p></div></DashLayout>}
    >
      <DashLayout>
        <div className="clients-page">
          <header className="cl-header">
            <div className="cl-header-left">
              <h1 className="cl-greeting">Clients<strong> · {clients.length}</strong></h1>
              <p className="cl-subline">Your client portfolio at a glance.</p>
            </div>
            <div className="cl-header-actions">
              <div className="cl-date"><CalendarDays size={15} /><span>{todayLabel}</span></div>
              {isOwnerAdmin && <button className="cl-add-btn" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Client</button>}
            </div>
          </header>

          {error && (
            <div className="tw-card cl-error">
              <span>{error}</span>
              <button type="button" onClick={fetchClients}>Retry</button>
            </div>
          )}

          <div className="cl-filter-bar">
            <label className="cl-search-wrap">
              <Search size={14} />
              <input className="cl-search" placeholder="Search by name, company or email…" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <FilterPillGroup
              label="Plan"
              value={filterPlan}
              options={planFilterOptions}
              onChange={setFilterPlan}
              renderOption={option => <span className="cl-filter-dot-row">{Array.from({ length: planDotCount(option.value) }).map((_, index) => <i key={index} />)}</span>}
            />
            <FilterPillGroup label="Billing" value={filterBilling} options={billingFilterOptions} onChange={setFilterBilling} />
            <FilterPillGroup
              label="Status"
              value={filterStatus}
              options={statusFilterOptions}
              onChange={setFilterStatus}
              renderOption={option => <StatusIcon status={option.icon} />}
            />
            <button
              type="button"
              className={`cl-clear-filters ${hasActivePillFilters ? 'is-visible' : ''}`}
              onClick={clearPillFilters}
              aria-label="Clear filters"
            >
              <X size={14} />
            </button>
          </div>

          <section className="tw-card cl-list-card">
            {loading ? (
              <SkeletonBlock rows={6} bare />
            ) : filtered.length === 0 ? (
              <div className="cl-list-empty">No clients found</div>
            ) : renderList()}
          </section>

          <section className="cl-bottom-panels">
            <KpiStrip cards={[
              { label: 'Active Clients', value: metrics.active, icon: Users, tone: 'indigo' },
              {
                label: 'MRR',
                value: <>{fmtMoney(metrics.mrr)} <span>· {fmtPKR(metrics.mrr * elevateRate)}</span></>,
                icon: DollarSign,
                tone: 'green'
              },
              { label: 'At Risk', value: metrics.risk.length, icon: Bell, tone: 'red' },
              { label: 'New This Month', value: metrics.newClients.length, icon: Layers3, tone: 'white' },
            ]} />

            <div className="cl-side-column">
              <section className="tw-card cl-side-card cl-top-card">
                <span className="tw-kicker">Top Client</span>
                {metrics.topClient ? (
                  <>
                    <h2>{metrics.topClient.name}</h2>
                    <span className="cl-side-caption">{metrics.topClient.company || 'Client account'}</span>
                    <strong className="cl-big">{fmtMoney(metrics.topClient.total_revenue)}</strong>
                    <span className="cl-side-caption">Lifetime revenue</span>
                    {canOpenDrawer && (
                      <button className="cl-link" type="button" onClick={() => setSelected(metrics.topClient)}>
                        View profile <ArrowRight size={13} />
                      </button>
                    )}
                  </>
                ) : <p className="cl-side-empty">No payment data yet.</p>}
              </section>

              <section className="tw-card cl-side-card cl-plan-mix-card">
                <span className="tw-kicker">Plan Mix</span>
                <h2>Distribution</h2>
                <div className="cl-plan-bars">
                  {metrics.planMix.map(({ plan, count }) => (
                    <div className="cl-plan-bar-row" key={plan}>
                      <span className="cl-plan-bar-label">{plan}</span>
                      <strong className="cl-plan-bar-count">{count}</strong>
                      <span className="cl-plan-bar-track"><i className={`cl-plan-bar-fill ${plan}`} style={{ width: `${clients.length ? (count / clients.length) * 100 : 0}%` }} /></span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="tw-card cl-side-card cl-risk-card">
                <span className="tw-kicker">At Risk</span>
                <h2>{metrics.risk.length} clients need attention</h2>
                <div className="cl-side-list">
                  {metrics.risk.slice(0, 4).map(client => (
                    <button type="button" className="cl-side-row" key={client.id} onClick={() => openClient(client)}>
                      <Avatar client={client} />
                      <span className="cl-side-row-text">
                        <strong>{client.name}</strong>
                        <span>{riskReason(client)}</span>
                      </span>
                      <span className="cl-side-row-meta">{fmtDate(client.next_payment_due)}</span>
                    </button>
                  ))}
                  {!metrics.risk.length && <p className="cl-side-empty">All clients are in good standing.</p>}
                </div>
              </section>

              <section className="tw-card cl-side-card cl-new-card">
                <span className="tw-kicker">Just Joined</span>
                <h2>Last 30 days</h2>
                <div className="cl-side-list">
                  {metrics.newClients.slice(0, 4).map(client => (
                    <button type="button" className="cl-side-row" key={client.id} onClick={() => openClient(client)}>
                      <Avatar client={client} />
                      <span className="cl-side-row-text"><strong>{client.name}</strong><span>{client.company || client.email}</span></span>
                      <span className="cl-side-row-meta">{daysAgo(client.subscribed_at)}d ago</span>
                    </button>
                  ))}
                  {!metrics.newClients.length && <p className="cl-side-empty">No new clients this month.</p>}
                </div>
              </section>
            </div>
          </section>
        </div>

        {selected && (
          <div className="drawer-overlay cl-drawer-overlay" onClick={() => setSelected(null)}>
            <aside className="cl-drawer" onClick={event => event.stopPropagation()}>
              <div className={`cl-drawer-hero ${selected.plan || 'startup'}`}>
                <Avatar client={selected} className="cl-drawer-avatar" />
                <div className="cl-drawer-identity">
                  <h3>{selected.name}</h3>
                  <p>{selected.company || selected.email}</p>
                  <div><span className={`cl-plan-pill ${selected.plan}`}>{selected.plan}</span><span className={`cl-status-pill ${selected.status}`}>{selected.status}</span></div>
                </div>
                <button type="button" className="cl-drawer-close" onClick={() => setSelected(null)}><X size={18} /></button>
              </div>
              <nav className="cl-drawer-tabs">
                {DRAWER_TABS
                  .filter(tab => tab !== 'billing' || canViewFinance)
                  .filter(tab => !isFinance || ['overview', 'billing'].includes(tab))
                  .map(tab => (
                    <button type="button" className={`cl-drawer-tab ${drawerTab === tab ? 'is-active' : ''}`} key={tab} onClick={() => setDrawerTab(tab)}>
                      {tab[0].toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
              </nav>
              <div className="cl-drawer-body">
                {drawerTab === 'overview' && (
                  <>
                    <div className="cl-detail-grid">
                      <span><small>Email</small><strong>{selected.email || '-'}</strong></span>
                      <span><small>Phone</small><strong>{selected.phone || '-'}</strong></span>
                      <span><small>Billing</small><strong>{selected.billing || '-'}</strong></span>
                      <span><small>Subscribed</small><strong>{fmtDate(selected.subscribed_at)}</strong></span>
                      <span><small>Referral</small><strong>{selected.referral_code || '-'}</strong></span>
                      <span><small>White label</small><strong>{selected.whitelabel ? 'Enabled' : 'No'}</strong></span>
                    </div>
                    {canViewNotes && selected.notes && <div className="cl-drawer-note"><small>Notes</small><p>{selected.notes}</p></div>}
                  </>
                )}
                {drawerTab === 'projects' && (
                  <div className="cl-drawer-section">
                    <span className="tw-kicker">Active Work</span>
                    <strong className="cl-project-count">{projectCount(selected)}</strong>
                    <h4>Active projects</h4>
                    <p>Project details will appear here when project records are linked to this client.</p>
                  </div>
                )}
                {drawerTab === 'files' && <FileList entityType="client" entityId={selected.id} canManage={isOwnerAdmin} />}
                {drawerTab === 'communications' && <CommunicationTimeline clientId={selected.id} />}
                {drawerTab === 'billing' && canViewFinance && (
                  <div className="cl-detail-grid">
                    <span><small>Payment ref</small><strong>{selected.payment_ref || '-'}</strong></span>
                    <span><small>Billing amount</small><strong>{fmtMoney(selected.billing_amount || selected.last_payment_amount)}</strong></span>
                    <span><small>Last payment</small><strong>{fmtMoney(selected.last_payment_amount)}</strong></span>
                    <span><small>Last paid</small><strong>{fmtDate(selected.last_payment_date)}</strong></span>
                    <span><small>Next due</small><strong>{fmtDate(selected.next_payment_due)}</strong></span>
                    <span><small>Cycle</small><strong>{selected.billing || '-'}</strong></span>
                    <div className="cl-drawer-note cl-detail-wide"><small>Payment history</small><p>Payment history will appear here when transaction records are available.</p></div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {showAdd && (
          <div className="modal-overlay" onClick={() => setShowAdd(false)}>
            <div className="modal" onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Client</h3>
                <button className="drawer-close" onClick={() => setShowAdd(false)}>×</button>
              </div>
              <form className="modal-form" onSubmit={handleAdd}>
                <div className="form-row">
                  <div className="form-field"><label>Full name *</label><input className="dash-input" required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="John Smith" /></div>
                  <div className="form-field"><label>Email *</label><input className="dash-input" type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="john@company.com" /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Company</label><input className="dash-input" value={form.company} onChange={event => setForm(current => ({ ...current, company: event.target.value }))} placeholder="Company name" /></div>
                  <div className="form-field"><label>Plan *</label><PillSelect value={form.plan} options={PLANS} onChange={plan => setForm(current => ({ ...current, plan }))} ariaLabel="Select plan" /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Billing *</label><PillSelect value={form.billing} options={BILLINGS} onChange={billing => setForm(current => ({ ...current, billing }))} ariaLabel="Select billing" /></div>
                  <div className="form-field"><label>Payment Reference</label><input className="dash-input" value={form.payment_ref} onChange={event => setForm(current => ({ ...current, payment_ref: event.target.value }))} placeholder="CW-MUSTAFA-STARTUP" /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Referral Code</label><input className="dash-input" value={form.referral_code} onChange={event => setForm(current => ({ ...current, referral_code: event.target.value }))} placeholder="CW-XXXXXX" /></div>
                  <div className="form-field form-field-checkbox"><label><input type="checkbox" checked={form.whitelabel} onChange={event => setForm(current => ({ ...current, whitelabel: event.target.checked }))} />White Label add-on</label></div>
                </div>
                <div className="form-field"><label>Notes</label><textarea className="dash-input" rows={3} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Any notes about this client..." /></div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Client'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashLayout>
    </RoleGuard>
  );
}
