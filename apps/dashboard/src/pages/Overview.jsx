import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Crown,
  DollarSign,
  ExternalLink,
  FileText,
  ListFilter,
  GraduationCap,
  Layers3,
  Mail,
  Plus,
  ReceiptText,
  Sun,
  Moon,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import DashLayout from '../components/DashLayout';
import { hasRole } from '../components/RoleGuard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch, apiGet, apiPost } from '../utils/dashboardApi';
import './Overview.css';

const STATS_URL = '/api/stats';
const CALENDAR_URL = '/api/calendar';
const REQUESTS_URL = '/api/requests';
const RATE_URL = '/api/rate/usd-pkr';
const ELEVATE_RATE_FALLBACK = 275.62;

const WEBHOOKS = [
  { label: 'Alerts', url: '/api/alerts' },
  { label: 'Bookings', url: '/api/bookings' },
  { label: 'Calendar', url: CALENDAR_URL },
  { label: 'Clients', url: '/api/clients' },
  { label: 'Communications', url: '/api/communications' },
  { label: 'Files', url: '/api/files' },
  { label: 'Finance', url: '/api/finance' },
  { label: 'HR', url: '/api/hr' },
  { label: 'Newsletter', url: '/api/newsletter' },
  { label: 'Projects', url: '/api/projects' },
  { label: 'Referrals', url: '/api/referrals' },
  { label: 'Requests', url: REQUESTS_URL },
  { label: 'Stats', url: STATS_URL },
  { label: 'Team', url: '/api/team' },
  { label: 'Time Logs', url: '/api/time-logs' },
];

const STATUS_BADGE = {
  queue: 'queue',
  in_progress: 'in-progress',
  in_review: 'in-review',
  revision: 'revision',
  completed: 'completed',
};

const ALERT_COLORS = {
  booking: 'blue',
  payment: 'green',
  newsletter: 'purple',
  referral: 'amber',
  application: 'blue',
  system: 'slate',
  error: 'red',
};

const ALERT_ICONS = {
  booking: CalendarDays,
  payment: CircleDollarSign,
  newsletter: Mail,
  referral: UsersRound,
  application: BriefcaseBusiness,
  system: Activity,
  error: Bell,
};

const KPI_ICONS = {
  users: UsersRound,
  layers: Layers3,
  clock: Clock3,
  bell: Bell,
  person: UserRound,
  briefcase: BriefcaseBusiness,
  dollar: DollarSign,
  profit: WalletCards,
};

const field = (item, ...keys) => keys.map(key => item?.[key]).find(value => value !== undefined && value !== null && value !== '') || '';
const isSameUser = (value, user) => value && [user?.id, user?.name, user?.email].filter(Boolean).includes(value);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const timeAgo = (date) => {
  if (!date) return 'just now';
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return 'just now';
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const dateKey = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const fmtDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
const fmtTime = (time) => time ? String(time).slice(0, 5) : 'All day';
const fmtNum = (number) => Number(number || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtUSD = (number) => number === undefined || number === null ? '—' : `$${fmtNum(number)}`;
const fmtPKR = (number) => number === undefined || number === null ? '—' : `PKR ${fmtNum(number)}`;
const fmtCompactUSD = (number) => `$${Number(number || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}`;
const fmtCompactPKR = (number) => `PKR ${Number(number || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}`;

const EmptyState = ({ icon: EmptyIcon = FileText, message }) => (
  <div className="ov-empty">
    <span className="ov-empty-icon"><EmptyIcon size={24} strokeWidth={1.8} /></span>
    <p>{message}</p>
  </div>
);

const KpiStrip = ({ cards }) => (
  <div className="ov-kpi-strip">
    {cards.map((card, index) => {
      const KpiIcon = KPI_ICONS[card.icon] || Layers3;
      return (
        <article
          className={`ov-kpi-card ov-tone-${card.tone || 'indigo'}`}
          key={card.label}
          style={{ animationDelay: `${index * 55}ms` }}
        >
          <span className="ov-kpi-icon"><KpiIcon size={21} strokeWidth={1.9} /></span>
          <div className="ov-kpi-copy">
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </div>
        </article>
      );
    })}
  </div>
);

function MiniCalendar({ eventsByDate, selectedDate, onSelectDate }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  const todayKey = dateKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = dateKey(day);
    return { day, key, inMonth: day.getMonth() === month, hasEvents: Boolean(eventsByDate[key]?.length) };
  });

  const goMonth = (offset) => setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <div className="ov-mini-calendar">
      <div className="ov-mini-cal-head">
        <button type="button" onClick={() => goMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <strong>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" onClick={() => goMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <div className="ov-mini-weekdays">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="ov-mini-days">
        {days.map(({ day, key, inMonth, hasEvents }) => (
          <button
            type="button"
            key={key}
            className={`${!inMonth ? 'is-muted' : ''} ${key === todayKey ? 'is-today' : ''} ${key === selectedDate ? 'is-selected' : ''}`}
            onClick={() => onSelectDate(key)}
          >
            <span>{day.getDate()}</span>
            {hasEvents && <i />}
          </button>
        ))}
      </div>
    </div>
  );
}

const RequestTable = memo(function RequestTable({ rows, title = 'Active Requests', badge = 'Live', highlightOverdue = true, overdueRequest }) {
  return (
    <section className="ov-card ov-requests-card">
      <div className="ov-card-head">
        <div className="ov-section-title"><Layers3 size={16} /><span>{title}</span></div>
        <span className="ov-pill">{badge}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Layers3} message="No active requests yet" />
      ) : (
        <div className="ov-scroll ov-table-scroll">
          <table className="ov-table">
            <thead><tr><th>Request</th><th>Client</th><th>Assigned</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((request, index) => (
                <tr key={request.id || index} className={highlightOverdue && overdueRequest?.(request) ? 'is-overdue' : ''}>
                  <td><strong>{field(request, 'title', 'request_title') || '-'}</strong></td>
                  <td>{field(request, 'client_name', 'client') || '-'}</td>
                  <td>{field(request, 'assigned_to', 'assignee_name') || 'Unassigned'}</td>
                  <td>{fmtDate(field(request, 'due_date', 'deadline'))}</td>
                  <td><span className={`status-badge ${STATUS_BADGE[field(request, 'status')] || 'muted'}`}>{field(request, 'status')?.replace('_', ' ') || 'unknown'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

const Agenda = memo(function Agenda({ events, limit = 5, emptyMessage = 'Nothing scheduled today' }) {
  const sortedEvents = events
    .slice()
    .sort((a, b) => String(a.event_time || '').localeCompare(String(b.event_time || '')))
    .slice(0, limit);

  if (!sortedEvents.length) return <EmptyState icon={CalendarDays} message={emptyMessage} />;

  return (
    <div className="ov-agenda-list ov-scroll">
      {sortedEvents.map((event, index) => (
        <div className="ov-agenda-item" key={`${event.id || event.title}-${index}`}>
          <span className="ov-time-pill">{fmtTime(event.event_time)}</span>
          <strong>{event.title}</strong>
          {event.zoom_link && (
            <a className="ov-join" href={event.zoom_link} target="_blank" rel="noreferrer">
              Join <ExternalLink size={11} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
});

const ActivityFeed = memo(function ActivityFeed({ alerts, unreadAlerts }) {
  const visibleAlerts = alerts.slice(0, 5);
  return (
    <section className="ov-card ov-activity-card">
      <div className="ov-card-head">
        <div className="ov-section-title"><Bell size={16} /><span>Activity Feed</span></div>
        {unreadAlerts > 0 && <span className="ov-count-badge">{unreadAlerts}</span>}
      </div>
      {!visibleAlerts.length ? <EmptyState icon={Bell} message="No alerts yet" /> : (
        <>
          <div className="ov-feed-list">
            {visibleAlerts.map((alert, index) => {
              const AlertIcon = ALERT_ICONS[alert.type] || Bell;
              return (
                <div key={alert.id || alert.created_at || index} className="ov-alert-row">
                  <span className={`ov-alert-icon ov-alert-${ALERT_COLORS[alert.type] || 'slate'}`}>
                    <AlertIcon size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>{alert.title}</strong>
                    <small>{timeAgo(alert.created_at)}</small>
                  </div>
                </div>
              );
            })}
          </div>
          {alerts.length > 5 && <a className="ov-view-all" href="/alerts">View all activity <ChevronRight size={14} /></a>}
        </>
      )}
    </section>
  );
});

const RecentClients = memo(function RecentClients({ clients }) {
  return (
    <section className="ov-card">
      <div className="ov-card-head">
        <div className="ov-section-title"><UsersRound size={16} /><span>Recent Clients</span></div>
      </div>
      {!clients.length ? <EmptyState icon={UsersRound} message="No clients yet" /> : (
        <div className="ov-row-list">
          {clients.map((client, index) => (
            <div key={client.id || index} className="ov-client-row">
              <div className={`ov-avatar ov-avatar-${index % 5}`}>{(client.name || client.company || 'CW').split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{client.name || client.company}</strong>
                <small>{client.company || client.email}</small>
              </div>
              <span className={`plan-badge ${client.plan || 'muted'}`}>{client.plan || 'plan'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

const TodayAgendaCard = memo(function TodayAgendaCard({ events, title = "Today's Events" }) {
  return (
    <section className="ov-card">
      <div className="ov-card-head">
        <div className="ov-section-title"><CalendarDays size={16} /><span>{title}</span></div>
        <span className="ov-pill">{events.length}</span>
      </div>
      <Agenda events={events} limit={6} />
    </section>
  );
});

const SimpleList = memo(function SimpleList({ title, badge, rows, empty, primary, secondary }) {
  return (
    <section className="ov-card">
      <div className="ov-card-head">
        <div className="ov-section-title"><FileText size={16} /><span>{title}</span></div>
        {badge && <span className="ov-pill">{badge}</span>}
      </div>
      {!rows?.length ? <EmptyState icon={FileText} message={empty} /> : (
        <div className="ov-row-list">
          {rows.map((row, index) => (
            <div className="ov-simple-row" key={row.id || index}>
              <strong>{primary(row)}</strong>
              <small>{secondary(row)}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

const CONFIRMED_COLOR = '#a0e92a';
const EXP_COLOR       = '#101012';

/* ── smooth cubic-bezier path through points ── */
function smoothPath(pts, maxY) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  const clampY = y => maxY != null ? Math.min(y, maxY) : y;
  const t = 0.2;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) * t);
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) * t);
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const MoneyLineChart = memo(function MoneyLineChart({
  series,
  predictions,
  showPredictions,
  view,
  period,
  exchangeRate,
  target,
}) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [series, view, period]);

  const points = useMemo(() => {
    const rate = Number(exchangeRate) || 284.5;
    const result = [];
    if (view === 'monthly') {
      const y = period.getFullYear();
      const m = period.getMonth();
      const days = new Date(y, m + 1, 0).getDate();
      for (let day = 1; day <= days; day++) {
        let revUsd = 0, expPkr = 0, predUsd = 0;
        (series || []).forEach(item => {
          const d = new Date(item.date);
          if (d.getFullYear() !== y || d.getMonth() !== m || d.getDate() !== day) return;
          if (item.type === 'revenue') revUsd += Number(item.revenue || 0);
          else if (item.type === 'expense') expPkr += Number(item.expense_pkr || 0);
        });
        if (showPredictions) {
          (predictions || []).forEach(prediction => {
            const d = new Date(prediction.predicted_date);
            const status = String(prediction.status || 'pending').toLowerCase();
            if (status !== 'pending' || d.getFullYear() !== y || d.getMonth() !== m || d.getDate() !== day) return;
            predUsd += Number(prediction.predicted_amount || 0);
          });
        }
        result.push({
          label: String(day),
          tipLabel: new Date(y, m, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revUsd,
          predUsd,
          expPkr,
          expUsd: expPkr / rate,
        });
      }
    } else {
      const y = period.getFullYear();
      for (let mi = 0; mi < 12; mi++) {
        let revUsd = 0, expPkr = 0, predUsd = 0;
        (series || []).forEach(item => {
          const d = new Date(item.date);
          if (d.getFullYear() !== y || d.getMonth() !== mi) return;
          if (item.type === 'revenue') revUsd += Number(item.revenue || 0);
          else if (item.type === 'expense') expPkr += Number(item.expense_pkr || 0);
        });
        if (showPredictions) {
          (predictions || []).forEach(prediction => {
            const d = new Date(prediction.predicted_date);
            const status = String(prediction.status || 'pending').toLowerCase();
            if (status !== 'pending' || d.getFullYear() !== y || d.getMonth() !== mi) return;
            predUsd += Number(prediction.predicted_amount || 0);
          });
        }
        result.push({
          label: new Date(y, mi, 1).toLocaleDateString('en-US', { month: 'short' }),
          tipLabel: new Date(y, mi, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          revUsd,
          predUsd,
          expPkr,
          expUsd: expPkr / rate,
        });
      }
    }
    return result;
  }, [series, predictions, showPredictions, view, period, exchangeRate]);

  const H = 240;
  const padL = 14, padR = 14, padT = 24, padB = 30;
  const innerW = Math.max(1, w - padL - padR);
  const innerH = H - padT - padB;

  const peak = Math.max(
    ...points.map(point => Math.max(point.revUsd, point.expUsd, point.predUsd)),
    Number(target) || 0,
    1,
  );
  // round max up to a nice number for headroom
  const niceMax = (() => {
    const mag = Math.pow(10, Math.floor(Math.log10(peak)));
    const n = Math.ceil(peak / mag) * mag;
    return n * 1.1; // 10% headroom
  })();

  const xAt = (i) => padL + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v) => padT + innerH - (Math.max(0, v) / niceMax) * innerH;

  const revPts = points.map((p, i) => [xAt(i), yAt(p.revUsd)]);
  const expPts = points.map((p, i) => [xAt(i), yAt(p.expUsd)]);
  const predPts = points.map((p, i) => [xAt(i), yAt(p.predUsd)]);

  const baselineY = padT + innerH;
  const revLine = smoothPath(revPts, baselineY);
  const expLine = smoothPath(expPts, baselineY);
  const predLine = smoothPath(predPts, baselineY);
  const revArea = points.length > 1
    ? `${revLine} L ${xAt(points.length - 1)} ${baselineY} L ${xAt(0)} ${baselineY} Z`
    : '';
  const expArea = points.length > 1
    ? `${expLine} L ${xAt(points.length - 1)} ${baselineY} L ${xAt(0)} ${baselineY} Z`
    : '';

  // X tick indices
  const numTicks = view === 'monthly' ? Math.min(7, points.length) : 12;
  const tickIdx = [];
  for (let i = 0; i < numTicks; i++) {
    tickIdx.push(Math.round((points.length - 1) * (i / Math.max(1, numTicks - 1))));
  }

  const handleMove = (e) => {
    if (!wrapRef.current || !points.length) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest = 0, minDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(xAt(i) - px);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    setHover(nearest);
  };

  const hasPredictions = showPredictions && points.some(point => point.predUsd > 0);
  const hasData = points.some(p => p.revUsd > 0 || p.expUsd > 0 || p.predUsd > 0);
  const activeIdx = hover;

  return (
    <div className="mc-chart" ref={wrapRef}
         onMouseMove={handleMove}
         onMouseLeave={() => {
           setHover(null);
         }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="mcRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CONFIRMED_COLOR} stopOpacity="0.32"/>
            <stop offset="100%" stopColor={CONFIRMED_COLOR} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="mcExpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EXP_COLOR} stopOpacity="0.14"/>
            <stop offset="100%" stopColor={EXP_COLOR} stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map(r => {
          const y = padT + innerH * r;
          return <line key={r} x1={padL} x2={w - padR} y1={y} y2={y}
                       stroke="#eef2f6" strokeWidth="1" />;
        })}

        {hasData && (
          <g key={animKey} className="mc-chart-anim">
            {target > 0 && (
              <line x1={padL} x2={w - padR}
                    y1={yAt(target)} y2={yAt(target)}
                    stroke="#7b8495" strokeWidth="1"
                    strokeDasharray="4 4" opacity="0.7"
                    vectorEffect="non-scaling-stroke" />
            )}
            {target > 0 && (
              <text x={w - padR - 4} y={yAt(target) - 4}
                    textAnchor="end" fontSize="10" fontWeight="600" fill="#7b8495">
                Target {fmtUSD(target)}
              </text>
            )}
            {/* areas */}
            <path d={expArea} fill="url(#mcExpGrad)" className="mc-area-anim" />
            <path d={revArea} fill="url(#mcRevGrad)" className="mc-area-anim" />

            {/* lines */}
            <path d={expLine} fill="none" stroke={EXP_COLOR}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength="1"
                  className="mc-line-anim mc-line-anim--exp" />
            <path d={revLine} fill="none" stroke={CONFIRMED_COLOR}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength="1"
                  className="mc-line-anim mc-line-anim--rev" />
            {hasPredictions && (
              <path d={predLine} fill="none" stroke="#6366f1"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="6 6"
                    vectorEffect="non-scaling-stroke" />
            )}

            {/* hover guide */}
            {activeIdx != null && hasData && (
              <>
                <line x1={xAt(activeIdx)} x2={xAt(activeIdx)}
                      y1={padT} y2={padT + innerH}
                      stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke" />
                {points[activeIdx].expUsd > 0 && (
                  <circle cx={xAt(activeIdx)} cy={yAt(points[activeIdx].expUsd)}
                          r="5" fill="#fff" stroke={EXP_COLOR} strokeWidth="2"
                          vectorEffect="non-scaling-stroke" />
                )}
                {points[activeIdx].revUsd > 0 && (
                  <circle cx={xAt(activeIdx)} cy={yAt(points[activeIdx].revUsd)}
                          r="5" fill="#fff" stroke={CONFIRMED_COLOR} strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke" />
                )}
                {hasPredictions && points[activeIdx].predUsd > 0 && (
                  <circle cx={xAt(activeIdx)} cy={yAt(points[activeIdx].predUsd)}
                          r="5" fill="#fff" stroke="#6366f1" strokeWidth="2"
                          vectorEffect="non-scaling-stroke" />
                )}
              </>
            )}
          </g>
        )}

        {/* X-axis labels */}
        {tickIdx.map((i, k) => points[i] && (
          <text key={k} x={xAt(i)} y={H - 10}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="500"
                fill="#94a3b8">
            {points[i].label}
          </text>
        ))}

        {!hasData && (
          <text x={w / 2} y={padT + innerH / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#cbd5e1">
            No activity in this period
          </text>
        )}
      </svg>

      {activeIdx != null && points[activeIdx] && hasData && (() => {
        const TIP_W = 164;
        const rawLeft = xAt(activeIdx) - TIP_W / 2;
        const clampedLeft = Math.max(0, Math.min(rawLeft, w - TIP_W));
        return (
        <div className="mc-tip"
             style={{ left: `${clampedLeft}px` }}>
          <div className="mc-tip-date">{points[activeIdx].tipLabel}</div>
          <div className="mc-tip-row">
            <span className="mc-tip-dot is-rev" />
            <span>Revenue</span>
            <b>{fmtUSD(points[activeIdx].revUsd)}</b>
          </div>
          <div className="mc-tip-row">
            <span className="mc-tip-dot is-exp" />
            <span>Expense</span>
            <b>₨{fmtNum(Math.round(points[activeIdx].expPkr))}</b>
          </div>
          {hasPredictions && points[activeIdx].predUsd > 0 && (
            <div className="mc-tip-row">
              <span className="mc-tip-dot is-pred" />
              <span>Predicted</span>
              <b>{fmtUSD(points[activeIdx].predUsd)}</b>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
});

const sparklinePoints = (series, key, view, period) => {
  const out = [];
  if (view === 'monthly') {
    const y = period.getFullYear();
    const m = period.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d += 1) {
      const value = (series || []).filter(item => {
        const date = new Date(item.date);
        return date.getFullYear() === y
          && date.getMonth() === m
          && date.getDate() === d
          && item.type === key;
      }).reduce((sum, item) => sum + Number(item[key === 'revenue' ? 'revenue' : 'expense_pkr'] || 0), 0);
      out.push(value);
    }
  } else {
    const y = period.getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const value = (series || []).filter(item => {
        const date = new Date(item.date);
        return date.getFullYear() === y && date.getMonth() === month && item.type === key;
      }).reduce((sum, item) => sum + Number(item[key === 'revenue' ? 'revenue' : 'expense_pkr'] || 0), 0);
      out.push(value);
    }
  }
  return out;
};

const Sparkline = memo(function Sparkline({ values, color }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const width = 56;
  const height = 16;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1 || 1)) * width;
    const y = height - (value / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mc-spark">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

const MoneyCard = memo(function MoneyCard({
  revenue,
  previousRevenue,
  outstanding,
  overdue,
  expenses,
  exchangeRate,
  predictions,
}) {
  const [view, setView] = useState('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [chartSeries, setChartSeries] = useState([]);
  const [showPredictions, setShowPredictions] = useState(true);
  const [topSource, setTopSource] = useState(null);

  useEffect(() => {
    if (view === 'monthly') {
      const y = selectedPeriod.getFullYear();
      const m = selectedPeriod.getMonth() + 1;
      apiGet(`/api/stats/chart?year=${y}&month=${m}`)
        .then(data => { if (data.success) setChartSeries(data.series); })
        .catch(() => {});
    } else {
      // yearly — fetch all 12 months in parallel
      const y = selectedPeriod.getFullYear();
      Promise.all(Array.from({ length: 12 }, (_, mi) =>
        apiGet(`/api/stats/chart?year=${y}&month=${mi + 1}`).catch(() => ({ success: false }))
      )).then(results => {
        const merged = results.flatMap(r => (r?.success ? r.series : []));
        setChartSeries(merged);
      });
    }
  }, [selectedPeriod, view]);

  useEffect(() => {
    const year = selectedPeriod.getFullYear();
    if (view === 'monthly') {
      const month = selectedPeriod.getMonth() + 1;
      apiGet(`/api/stats/top-source?year=${year}&month=${month}`)
        .then(data => { if (data?.success) setTopSource(data.top); })
        .catch(() => setTopSource(null));
    } else {
      apiGet(`/api/stats/top-source?year=${year}`)
        .then(data => { if (data?.success) setTopSource(data.top); })
        .catch(() => setTopSource(null));
    }
  }, [view, selectedPeriod]);

  const current   = Number(revenue || 0);
  const revenuePkr = current * Number(exchangeRate || 0);
  const previous  = Number(previousRevenue || 0);
  const change    = previous ? ((current - previous) / previous) * 100 : null;
  const positive  = change === null || change >= 0;
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
  const periodLabel = view === 'monthly'
    ? selectedPeriod.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : String(selectedPeriod.getFullYear());
  const changePeriod = direction => {
    setSelectedPeriod(prev => view === 'monthly'
      ? new Date(prev.getFullYear(), prev.getMonth() + direction, 1)
      : new Date(prev.getFullYear() + direction, prev.getMonth(), 1));
  };
  const headingLabel = view === 'monthly' ? 'Revenue this month' : 'Revenue this year';
  const expensesUsdEquivalent = Number(expenses || 0) / Number(exchangeRate || 1);
  const netProfitUsd = current - expensesUsdEquivalent;
  const marginPct = current > 0 ? (netProfitUsd / current) * 100 : null;
  const monthlyTarget = previous > 0 ? previous * 1.10 : 40000;
  const targetUsd = view === 'monthly' ? monthlyTarget : monthlyTarget * 12;
  const goalProgressPct = targetUsd > 0 ? Math.min(100, (current / targetUsd) * 100) : 0;
  const revSpark = sparklinePoints(chartSeries, 'revenue', view, selectedPeriod);
  const expSpark = sparklinePoints(chartSeries, 'expense', view, selectedPeriod);

  return (
    <section className="tw-card mc-card">
      <header className="mc-head">
        <div className="mc-head-left">
          <span className="mc-kicker"><Banknote size={14} /> Money</span>
          <h2>{headingLabel}</h2>
        </div>
        <div className="mc-head-right">
          <div className="mc-view-toggle">
            <button type="button" className={view === 'monthly' ? 'is-active' : ''} onClick={() => setView('monthly')}>Monthly</button>
            <button type="button" className={view === 'yearly'  ? 'is-active' : ''} onClick={() => setView('yearly')}>Yearly</button>
          </div>
          <div className="mc-period">
            <button type="button" onClick={() => changePeriod(-1)} aria-label="Previous"><ChevronLeft size={13} /></button>
            <strong>{periodLabel}</strong>
            <button type="button" onClick={() => changePeriod(1)} aria-label="Next"><ChevronRight size={13} /></button>
          </div>
        </div>
      </header>

      <div className="mc-summary">
        <div className="mc-amount">
          <strong>{fmtUSD(revenue)}</strong>
          <span className="mc-amount-sub">{fmtPKR(revenuePkr)}</span>
        </div>
        {change !== null && (
          <span className={`mc-trend ${positive ? 'is-positive' : 'is-negative'}`}>
            <TrendIcon size={13} />
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mc-meta mc-meta-rail">
        <div className="mc-meta-item">
          <span className="mc-meta-label">Unpaid</span>
          <span className="mc-meta-val">{fmtUSD(outstanding)}</span>
          {overdue > 0 && <span className="mc-meta-bad">{overdue} overdue</span>}
        </div>
        <div className="mc-meta-item">
          <span className="mc-meta-label">Expenses</span>
          <span className="mc-meta-val" style={{ color: '#e53e3e' }}>₨{fmtNum(expenses || 0)}</span>
          <Sparkline values={expSpark} color="#101012" />
        </div>
        <div className="mc-meta-item">
          <span className="mc-meta-label">Net profit</span>
          <span className="mc-meta-val" style={{ color: netProfitUsd >= 0 ? '#16a36a' : '#e44939' }}>
            {fmtUSD(netProfitUsd)}
          </span>
          <Sparkline values={revSpark} color="#a0e92a" />
        </div>
        <div className="mc-meta-item">
          <span className="mc-meta-label">Margin</span>
          <span className="mc-meta-val">{marginPct === null ? '—' : `${marginPct.toFixed(1)}%`}</span>
        </div>
        {topSource && (
          <div className="mc-meta-item mc-meta-source">
            <span className="mc-meta-label">Top source</span>
            <span className="mc-meta-val">{topSource.name}</span>
            <span className="mc-meta-sub">{fmtUSD(topSource.amount)} · {Math.round(topSource.share)}%</span>
          </div>
        )}
        <label className="mc-prediction-toggle">
          <span>Predictions</span>
          <input type="checkbox" checked={showPredictions} onChange={event => setShowPredictions(event.target.checked)} />
          <i aria-hidden="true" />
        </label>
      </div>

      <div className="mc-chart-wrap">
        <div className="mc-chart-overlay">
          <div className="mc-goal-chip">
            <span>{Math.round(goalProgressPct)}% of goal</span>
            <i style={{ width: `${goalProgressPct}%` }} />
          </div>
        </div>
        <MoneyLineChart
          series={chartSeries}
          predictions={predictions}
          showPredictions={showPredictions}
          view={view}
          period={selectedPeriod}
          exchangeRate={exchangeRate}
          target={targetUsd}
        />
      </div>
    </section>
  );
});

const CashCard = memo(function CashCard({ balance, payrollDate, payrollAmount }) {
  return (
    <section className="tw-card tw-compact-card tw-cash-card">
      <div className="tw-card-heading">
        <div>
          <span className="tw-kicker"><WalletCards size={15} /> Cash</span>
          <h2>Cash</h2>
        </div>
      </div>
      <div className="tw-split-stats">
        <div><strong>{fmtPKR(balance)}</strong><span>Bank balance</span></div>
        <div><strong>{fmtPKR(payrollAmount)}</strong><span>Payroll · {payrollDate ? fmtDate(payrollDate) : 'Not scheduled'}</span></div>
      </div>
    </section>
  );
});

const OperationsCard = memo(function OperationsCard({ clientAlerts, internalMeetings, externalMeetings, paymentAlertCount, pendingAmount }) {
  const nextInternal = internalMeetings[0];
  const nextExternal = externalMeetings[0];
  const latestClientAlert = clientAlerts[0];

  return (
    <section className="tw-card tw-compact-card tw-operations-card" aria-label="Live operations">
      <div className="tw-operations-grid">
        <div className="tw-operation-stat">
          <span className="tw-operation-copy">
            <small>Client alerts</small>
            <strong>{fmtNum(clientAlerts.length)}</strong>
            <em>{latestClientAlert?.title || 'No client action needed'}</em>
          </span>
        </div>
        <div className="tw-operation-stat">
          <span className="tw-operation-copy">
            <small>Internal meetings</small>
            <strong>{fmtNum(internalMeetings.length)}</strong>
            <em>{nextInternal ? `${nextInternal.title || 'Team meeting'} · ${fmtTime(nextInternal.event_time)}` : 'Nothing scheduled'}</em>
          </span>
        </div>
        <div className="tw-operation-stat">
          <span className="tw-operation-copy">
            <small>External meetings</small>
            <strong>{fmtNum(externalMeetings.length)}</strong>
            <em>{nextExternal ? `${nextExternal.title || 'Client meeting'} · ${fmtTime(nextExternal.event_time)}` : 'Nothing scheduled'}</em>
          </span>
        </div>
        <div className={`tw-operation-stat tw-payment-alerts ${paymentAlertCount > 0 ? 'has-alerts' : ''}`}>
          <span className="tw-operation-copy">
            <small>Payment alerts</small>
            <strong>{fmtNum(paymentAlertCount)}</strong>
            <em>{paymentAlertCount > 0 ? `${fmtCompactPKR(pendingAmount)} awaiting action` : 'All payments are clear'}</em>
          </span>
        </div>
      </div>
    </section>
  );
});

const STATUS_LABEL = {
  queue: 'Queue',
  in_progress: 'In progress',
  in_review: 'In review',
  revision: 'Revision',
};

const PRIORITY_DOT = {
  urgent: '#e44939',
  high: '#ef7d2e',
  medium: '#f4b042',
  low: '#c1c6cf',
};

const daysBetween = (a, b) => Math.floor((b - a) / (1000 * 60 * 60 * 24));

const JobsCard = memo(function JobsCard({ requests, overdueRequest }) {
  const [filter, setFilter] = useState('overdue');

  const active = useMemo(
    () => (requests || []).filter(request => !['completed', 'cancelled'].includes(field(request, 'status'))),
    [requests],
  );
  const overdue = useMemo(() => active.filter(overdueRequest), [active, overdueRequest]);
  const inReview = useMemo(() => active.filter(request => field(request, 'status') === 'in_review'), [active]);

  const now = new Date();
  const enriched = useMemo(() => active.map(request => {
    const due = field(request, 'due_date', 'deadline');
    const dueDate = due ? new Date(due) : null;
    const daysLate = dueDate ? daysBetween(dueDate, now) : null;
    return { ...request, _due: dueDate, _daysLate: daysLate, _overdue: overdueRequest(request) };
  }), [active, now, overdueRequest]);

  const sorted = useMemo(() => {
    const copy = [...enriched];
    copy.sort((a, b) => {
      if (a._overdue !== b._overdue) return a._overdue ? -1 : 1;
      if (a._overdue && b._overdue) return (b._daysLate ?? 0) - (a._daysLate ?? 0);
      const aTime = a._due ? a._due.getTime() : Infinity;
      const bTime = b._due ? b._due.getTime() : Infinity;
      return aTime - bTime;
    });
    return copy;
  }, [enriched]);

  const filtered = useMemo(() => {
    if (filter === 'overdue') return sorted.filter(request => request._overdue);
    if (filter === 'review') return sorted.filter(request => field(request, 'status') === 'in_review');
    return sorted;
  }, [sorted, filter]);

  const filters = [
    { key: 'overdue', label: 'Overdue', count: overdue.length, danger: true },
    { key: 'active', label: 'Active', count: active.length },
    { key: 'review', label: 'In review', count: inReview.length },
  ];

  return (
    <section className="tw-card tw-bottom-card jc-card">
      <header className="jc-head">
        <div className="jc-head-left">
          <span className="tw-kicker"><BriefcaseBusiness size={14} /> Jobs</span>
          <h2>Delivery</h2>
        </div>
        <div className="jc-summary">
          <span><b>{active.length}</b> active</span>
          <span className={overdue.length ? 'is-danger' : ''}><b>{overdue.length}</b> overdue</span>
          <span><b>{inReview.length}</b> in&nbsp;review</span>
        </div>
      </header>

      <div className="jc-tabs">
        {filters.map(item => (
          <button
            key={item.key}
            type="button"
            className={`jc-tab ${filter === item.key ? 'is-active' : ''} ${item.danger && item.count ? 'is-danger' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            <i>{item.count}</i>
          </button>
        ))}
      </div>

      <div className="jc-list">
        {filtered.length === 0 && (
          <EmptyState icon={BriefcaseBusiness} message="Nothing in this view" />
        )}
        {filtered.slice(0, 7).map(request => {
          const status = field(request, 'status');
          const priority = String(field(request, 'priority') || 'low').toLowerCase();
          const due = request._due;
          const isLate = request._overdue;
          const isToday = due && due.toDateString() === now.toDateString();
          return (
            <div className="jc-row" key={request.id}>
              <span className="jc-dot" style={{ background: PRIORITY_DOT[priority] || PRIORITY_DOT.low }} />
              <div className="jc-row-main">
                <strong>{field(request, 'title', 'request_title') || 'Untitled job'}</strong>
                <small>
                  {field(request, 'client_name', 'client') || 'No client'}
                  {field(request, 'assigned_to') && <> · {field(request, 'assigned_to')}</>}
                </small>
              </div>
              <span className={`jc-status jc-status-${status?.replace(/_/g, '-') || 'queue'}`}>
                {STATUS_LABEL[status] || status || 'Queue'}
              </span>
              <span className={`jc-due ${isLate ? 'is-late' : ''} ${isToday ? 'is-today' : ''}`}>
                {due ? fmtDate(due) : 'No date'}
                {isLate && request._daysLate > 0 && <em> · {request._daysLate}d late</em>}
                {isToday && <em> · today</em>}
              </span>
            </div>
          );
        })}
      </div>

      {filtered.length > 7 && (
        <a className="jc-more" href="/requests">Show all {filtered.length}</a>
      )}
    </section>
  );
});

const TEAM_COLORS = ['#f4d35e', '#1ec38b', '#f7a072', '#d6f0e0', '#e3d7ff', '#ffd6e0', '#d0e0ff'];

const nameColor = (name) => {
  const hash = String(name || '').split('').reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return TEAM_COLORS[hash % TEAM_COLORS.length];
};

const isTeamMemberActive = (person) => (
  person?.is_online === true
  || Number(person?.is_online) === 1
  || ['clocked_in', 'online'].includes(String(field(person, 'clock_status', 'attendance_status')).toLowerCase())
  || Number(field(person, 'hours_logged_today')) > 0
);

const teamMemberType = (person) => {
  const type = String(field(person, 'employment_type', 'employee_type', 'type', 'role') || '').toLowerCase();
  return type.includes('intern') ? 'intern' : 'employee';
};

const TeamGridCard = memo(function TeamGridCard({ people }) {
  const [teamFilter, setTeamFilter] = useState('all');
  const sortedPeople = useMemo(
    () => (people || [])
      .filter(person => teamFilter === 'all' || teamMemberType(person) === teamFilter)
      .slice()
      .sort((a, b) => Number(isTeamMemberActive(b)) - Number(isTeamMemberActive(a))),
    [people, teamFilter],
  );
  const openMember = (id) => {
    // TODO: navigate to /team/:id when the employee detail route is added.
    console.info('Team member selected:', id);
  };

  return (
    <section className="tw-card mc-team">
      <div className="mc-team-head">
        <h2>Team</h2>
        <div className="mc-team-filters" role="group" aria-label="Filter team members">
          {[
            ['all', 'All'],
            ['intern', 'Interns'],
            ['employee', 'Employees'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={teamFilter === value ? 'is-active' : ''}
              onClick={() => setTeamFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mc-team-scroll">
        <div className="mc-team-grid">
        {sortedPeople.map((person, index) => {
          const name = field(person, 'name') || `Team member ${index + 1}`;
          const nameParts = name.trim().split(/\s+/);
          const firstName = nameParts[0] || name;
          const lastName = nameParts.slice(1).join(' ');
          const online = isTeamMemberActive(person);
          const memberType = teamMemberType(person);
          const initials = name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
          const imageUrl = field(
            person,
            'avatar_url',
            'profile_image',
            'profile_photo',
            'photo_url',
            'image_url',
            'avatar',
            'photo',
          );
          return (
            <button
              type="button"
              className={`mc-team-tile ${imageUrl ? 'has-image' : 'has-initials'}`}
              key={person.id || index}
              onClick={() => openMember(person.id)}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={name}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.nextElementSibling?.classList.add('is-visible');
                  }}
                />
              )}
              <span
                className={`mc-team-initials ${imageUrl ? 'is-image-fallback' : 'is-visible'}`}
                style={{ '--team-color': nameColor(name) }}
              >
                {initials}
              </span>
              <span className="mc-team-name" aria-hidden="true">
                <strong>{firstName}</strong>
                <span>{lastName || memberType}</span>
              </span>
              {teamFilter === 'all' && (
                <span className={`mc-team-type is-${memberType}`} title={memberType === 'intern' ? 'Intern' : 'Employee'}>
                  {memberType === 'intern' ? <GraduationCap size={11} /> : <BriefcaseBusiness size={11} />}
                </span>
              )}
              <span className={`mc-team-status ${online ? 'is-active' : 'is-inactive'}`}>
                <i />
                {online ? 'Active' : 'Inactive'}
              </span>
            </button>
          );
        })}
        </div>
        {!sortedPeople.length && <EmptyState icon={UsersRound} message="No team status available" />}
      </div>
    </section>
  );
});

const EVENT_COLORS = {
  booking: 'is-booking',
  payment_due: 'is-payment',
  request_due: 'is-request',
  project_due: 'is-project',
};

const meetingRoleLabel = (role, fallback) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'account_manager') return 'AM';
  if (normalized === 'project_manager') return 'PM';
  if (normalized === 'admin' || normalized === 'owner') return 'Owner';
  return normalized
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const prettyRole = (raw) => {
  if (!raw) return 'guest';
  const map = {
    account_manager: 'AM',
    project_manager: 'PM',
    head_of_design: 'Head of Design',
    head_of_development: 'Head of Dev',
    head_of_delivery: 'Head of Delivery',
    owner: 'Owner',
    admin: 'Admin',
  };
  if (map[raw]) return map[raw];
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const MeetingSchedulerCard = memo(function MeetingSchedulerCard({
  events,
  eventsByDate,
  selectedDate,
  onSelectDate,
}) {
  const [view, setView] = useState('day');
  const [calendarFilter, setCalendarFilter] = useState('all');
  const [activeWeekSlide, setActiveWeekSlide] = useState(4);
  const [activeMonthSlide, setActiveMonthSlide] = useState(() => new Date(`${selectedDate}T12:00:00`).getMonth());
  const scrollRef = useRef(null);
  const weekSliderRef = useRef(null);
  const weekScrollFrame = useRef(null);
  const monthSliderRef = useRef(null);
  const monthScrollFrame = useRef(null);
  const rowRefs = useRef(new Map());
  const loggedEventIds = useRef(new Set());
  const [hiddenRows, setHiddenRows] = useState({ above: [], below: [] });
  const selected = new Date(`${selectedDate}T12:00:00`);
  const hours = Array.from({ length: 10 }, (_, index) => index + 9);
  const todayKey = dateKey(new Date());
  const matchesCalendarFilter = useCallback(event => {
    if (calendarFilter === 'internal') return Number(event.is_internal) === 1;
    if (calendarFilter === 'client') return Number(event.is_internal) !== 1;
    if (calendarFilter === 'mine') {
      return Array.isArray(event.attendees) && event.attendees.some(attendee =>
        String(attendee?.name || '').trim().toLowerCase() === 'mustafa khan'
      );
    }
    return true;
  }, [calendarFilter]);
  const filteredEvents = useMemo(
    () => (events || []).filter(matchesCalendarFilter),
    [events, matchesCalendarFilter]
  );
  const Initials = ({ name, size = 22 }) => {
    const bg = nameColor(name);
    const letter = (name || '?').trim().charAt(0).toUpperCase();
    return (
      <span className="mc-avatar" style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.45) }}>
        {letter}
      </span>
    );
  };
  const roleLabel = (role, fallback = 'Team') => {
    const normalized = String(role || '').trim().toLowerCase();
    if (!normalized) return fallback;
    if (normalized === 'account_manager') return 'AM';
    if (normalized === 'project_manager') return 'PM';
    if (normalized === 'admin' || normalized === 'owner') return 'Owner';
    if (normalized.startsWith('head_of_')) return 'Head';
    return normalized
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  const avatarStack = (people, type) => {
    const visible = people.length > 3 ? people.slice(0, 2) : people.slice(0, 3);
    return (
      <span className="mc-stack">
        {visible.map((person, personIndex) => (
          person.avatar_url ? (
            <span className="mc-avatar" key={`${person.id || person.email || person.name}-${personIndex}`}>
              <img src={person.avatar_url} alt="" />
            </span>
          ) : (
            <Initials name={person.name || person.email} key={`${person.id || person.email || person.name}-${personIndex}`} />
          )
        ))}
        {people.length > 3 && (
          <span className={`mc-avatar mc-overflow mc-overflow-${type}`}>+{people.length - 2}</span>
        )}
      </span>
    );
  };
  const weekStart = useMemo(() => {
    const start = new Date(selected);
    start.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
    return start;
  }, [selectedDate]);
  const weekSlides = useMemo(() => Array.from({ length: 9 }, (_, slideIndex) => {
    const offset = slideIndex - 4;
    const start = new Date(weekStart);
    start.setDate(weekStart.getDate() + offset * 7);
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const day = new Date(start);
      day.setDate(start.getDate() + dayIndex);
      const key = dateKey(day);
      return { day, key, events: (eventsByDate[key] || []).filter(matchesCalendarFilter) };
    });
    return {
      key: dateKey(start),
      days,
    };
  }), [eventsByDate, matchesCalendarFilter, weekStart]);
  const visibleWeek = weekSlides[activeWeekSlide] || weekSlides[4];
  const visibleWeekStart = visibleWeek?.days[0]?.day || weekStart;
  const visibleWeekEnd = visibleWeek?.days[6]?.day || weekStart;
  const visibleWeekMonths = visibleWeekStart.getMonth() === visibleWeekEnd.getMonth()
    ? visibleWeekStart.toLocaleDateString('en-US', { month: 'short' })
    : `${visibleWeekStart.toLocaleDateString('en-US', { month: 'short' })}–${visibleWeekEnd.toLocaleDateString('en-US', { month: 'short' })}`;
  const handleWeekScroll = event => {
    cancelAnimationFrame(weekScrollFrame.current);
    const slider = event.currentTarget;
    weekScrollFrame.current = requestAnimationFrame(() => {
      if (!slider.clientWidth) return;
      const nextIndex = Math.max(0, Math.min(weekSlides.length - 1, Math.round(slider.scrollLeft / slider.clientWidth)));
      setActiveWeekSlide(nextIndex);
    });
  };
  const calendarYear = selected.getFullYear();
  const monthSlides = useMemo(() => Array.from({ length: 12 }, (_, monthIndex) => {
    const first = new Date(calendarYear, monthIndex, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = dateKey(day);
      return {
        day,
        key,
        inMonth: day.getMonth() === monthIndex && day.getFullYear() === calendarYear,
        events: (eventsByDate[key] || []).filter(matchesCalendarFilter),
      };
    });
    return { monthIndex, days };
  }), [calendarYear, eventsByDate, matchesCalendarFilter]);
  const visibleMonth = monthSlides[activeMonthSlide] || monthSlides[selected.getMonth()];
  const handleMonthScroll = event => {
    cancelAnimationFrame(monthScrollFrame.current);
    const slider = event.currentTarget;
    monthScrollFrame.current = requestAnimationFrame(() => {
      if (!slider.clientWidth) return;
      const nextIndex = Math.max(0, Math.min(11, Math.round(slider.scrollLeft / slider.clientWidth)));
      setActiveMonthSlide(nextIndex);
    });
  };
  const eventsByHour = useMemo(() => {
    const grouped = new Map();
    filteredEvents
      .slice()
      .sort((a, b) => String(a.event_time || '09:00').localeCompare(String(b.event_time || '09:00')))
      .forEach((event, index) => {
        const parsed = Number(String(event.event_time || '09:00').slice(0, 2));
        const hour = Number.isFinite(parsed) ? Math.min(18, Math.max(9, parsed)) : 9;
        const item = { ...event, _rowId: `${event.id || index}-${hour}` };
        grouped.set(hour, [...(grouped.get(hour) || []), item]);
      });
    return grouped;
  }, [filteredEvents]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || view !== 'day') {
      setHiddenRows({ above: [], below: [] });
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      setHiddenRows(current => {
        const above = new Set(current.above);
        const below = new Set(current.below);
        entries.forEach(entry => {
          const id = entry.target.dataset.eventRowId;
          if (!id) return;
          const isAbove = !entry.isIntersecting && entry.rootBounds
            ? entry.boundingClientRect.bottom <= entry.rootBounds.top
            : false;
          const isBelow = !entry.isIntersecting && entry.rootBounds
            ? entry.boundingClientRect.top >= entry.rootBounds.bottom
            : false;
          if (isAbove) above.add(id);
          else above.delete(id);
          if (isBelow) below.add(id);
          else below.delete(id);
        });
        return {
          above: [...above].sort((a, b) => Number(b) - Number(a)),
          below: [...below].sort((a, b) => Number(a) - Number(b)),
        };
      });
    }, { root, threshold: 0 });

    rowRefs.current.forEach(node => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [eventsByHour, view]);

  useEffect(() => {
    const slider = weekSliderRef.current;
    if (view !== 'week' || !slider) return;
    setActiveWeekSlide(4);
    const frame = requestAnimationFrame(() => {
      slider.scrollLeft = slider.clientWidth * 4;
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(weekScrollFrame.current);
    };
  }, [view, selectedDate]);

  useEffect(() => {
    const slider = monthSliderRef.current;
    if (view !== 'month' || !slider) return;
    const initialMonth = selected.getMonth();
    setActiveMonthSlide(initialMonth);
    const frame = requestAnimationFrame(() => {
      slider.scrollLeft = slider.clientWidth * initialMonth;
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(monthScrollFrame.current);
    };
  }, [view, selectedDate]);

  const hiddenMeetingCount = direction => hiddenRows[direction].reduce(
    (total, id) => total + (eventsByHour.get(Number(id))?.length || 0),
    0
  );
  const scrollToHidden = direction => {
    const row = hiddenRows[direction].map(id => rowRefs.current.get(id)).find(Boolean);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const eventKey = (event, index, scope) => [
    scope,
    field(event, 'event_type') || 'event',
    event.id ?? 'no-id',
    event.event_date || selectedDate,
    event.event_time || 'no-time',
    index,
  ].join('-');
  const renderCompactEvent = (event, index) => {
    const title = event.title || 'Calendar event';
    const cancelled = String(event.status).toLowerCase() === 'cancelled';
    const internal = Number(event.is_internal) === 1;
    const projectMeeting = Boolean(event.project_name)
      || event.event_type === 'project_due'
      || event.event_type === 'request_due';
    const meetingTypeClass = internal
      ? 'is-internal-meeting'
      : projectMeeting
        ? 'is-project-meeting'
        : 'is-discovery-meeting';
    return (
      <span
        className={`mc-calendar-event ${meetingTypeClass} ${cancelled ? 'is-cancelled' : ''}`}
        key={eventKey(event, index, 'compact')}
        title={`${title} · ${fmtTime(event.event_time)}`}
      >
        <i />
        <b>{fmtTime(event.event_time)}</b>
        <span>{title}</span>
      </span>
    );
  };
  return (
    <section className="tw-card mc-cal">
      <div className="mc-cal-hero">
        <div className={`mc-cal-date ${view === 'week' ? 'is-week-range' : ''} ${view === 'month' ? 'is-month-label' : ''}`}>
          <strong>
            {view === 'week'
              ? `${visibleWeekStart.getDate()}–${visibleWeekEnd.getDate()}`
              : view === 'month'
                ? new Date(calendarYear, visibleMonth?.monthIndex || 0, 1).toLocaleDateString('en-US', { month: 'long' })
                : selected.getDate()}
          </strong>
          <span>
            {view === 'week'
              ? visibleWeekMonths
              : view === 'month'
                ? `'${String(selected.getFullYear()).slice(-2)}`
                : selected.toLocaleDateString('en-US', { month: 'short' })}
          </span>
        </div>
        <h2>Meeting Scheduler</h2>
        <div className="mc-cal-actions">
          <div className="mc-filter-wrap">
            <button type="button" className="mc-cal-filter">
              <ListFilter size={15} />
              <span>Filter</span>
              <ChevronDown size={13} />
            </button>
            <div className="mc-filter-menu">
              {[
                ['all', 'Show all'],
                ['internal', 'Internal'],
                ['mine', 'Mine'],
                ['client', 'Client meetings'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={calendarFilter === value ? 'is-active' : ''}
                  onClick={() => setCalendarFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="mc-add-event">
            <span>Add event</span>
            <i><Plus size={15} /></i>
          </button>
        </div>
      </div>

      <div className="mc-cal-toolbar">
        <div className="mc-cal-tabs">
          {['day', 'week', 'month'].map(option => (
            <button type="button" key={option} className={view === option ? 'is-active' : ''} onClick={() => setView(option)}>
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={`mc-cal-body ${view === 'week' ? 'is-week-view' : ''}`} ref={scrollRef}>
        {view === 'day' && (
          <div className="mc-slot-list">
            {hiddenRows.above.length > 0 && (
              <button type="button" className="mc-more-later is-above" onClick={() => scrollToHidden('above')}>
                <span>{hiddenMeetingCount('above')} More</span>
                <ChevronUp size={16} />
              </button>
            )}
            {hours.map(hour => {
              const hourEvents = eventsByHour.get(hour) || [];
              return (
                <div
                  className="mc-time-row"
                  key={hour}
                  data-event-row-id={hour}
                  ref={node => {
                    if (hourEvents.length && node) rowRefs.current.set(String(hour), node);
                    else rowRefs.current.delete(String(hour));
                  }}
                >
                  <span className="mc-time-label">{String(hour).padStart(2, '0')}:00</span>
                  <div className="mc-time-track">
                    <div className="mc-event-track">
                    {hourEvents.map((event, index) => {
                      const title = event.title || 'Calendar event';
                      const cancelled = String(event.status).toLowerCase() === 'cancelled';
                      const internal = Number(event.is_internal) === 1;
                      const clients = Array.isArray(event.client_attendees)
                        ? event.client_attendees.filter(client => client?.name || client?.email)
                        : [];
                      const attendees = Array.isArray(event.attendees)
                        ? event.attendees
                          .filter(attendee => attendee?.name)
                          .slice()
                          .sort((a, b) => Number(Boolean(b.is_lead)) - Number(Boolean(a.is_lead)))
                        : [];
                      const eventLogKey = `${event.event_type}-${event.id}-${event.event_date}-${event.event_time}`;
                      const missingExpectedFields = !Array.isArray(event.attendees)
                        || !Array.isArray(event.client_attendees)
                        || attendees.some(attendee => attendee.is_lead === undefined || !('role_in_meeting' in attendee));
                      if (import.meta.env.DEV && missingExpectedFields && !loggedEventIds.current.has(eventLogKey)) {
                        loggedEventIds.current.add(eventLogKey);
                        console.log('Calendar event missing attendee fields:', event);
                      }
                      const ownerIsAttending = attendees.some(attendee =>
                        String(attendee.name || '').trim().toLowerCase() === 'mustafa khan'
                      );
                      return (
                        <div className={`mc-event-group ${cancelled ? 'is-cancelled' : ''} ${ownerIsAttending ? 'has-owner-attending' : ''}`} key={eventKey(event, index, `day-${hour}`)}>
                          <span className={`mc-event-title ${cancelled ? 'mc-title-strike' : ''}`}>{title}</span>
                          {ownerIsAttending && (
                            <span className="mc-owner-attending" title="You are in this meeting" aria-label="You are in this meeting">
                              <Crown size={12} />
                            </span>
                          )}
                          <div className="mc-pill-row">
                            {clients.length > 0 && (
                              <div className={`mc-chip mc-chip-clients ${cancelled ? 'mc-chip-cancelled' : ''}`}>
                                {avatarStack(clients, 'clients')}
                                <span className="mc-chip-label">Clients</span>
                                <span className="mc-chip-count">{clients.length}</span>
                                <span className="mc-chip-tooltip mc-tip">
                                  <div className="mc-tip-title">
                                    {event.title} · {fmtTime(event.event_time)} · {fmtDate(event.event_date)}
                                  </div>
                                  {clients.map((c, clientIndex) => (
                                    <div className="mc-tip-row" key={`${c.email || c.name}-${clientIndex}`}>
                                      <span className="mc-tip-name">{c.name}</span>
                                      <span className="mc-tip-role">
                                        {prettyRole(c.role)}
                                        {c.is_primary && <em> · primary</em>}
                                      </span>
                                    </div>
                                  ))}
                                </span>
                              </div>
                            )}
                            <div className={`mc-chip ${internal ? 'mc-chip-internal' : 'mc-chip-team'} ${cancelled ? 'mc-chip-cancelled' : ''}`}>
                              {attendees.length > 0 && avatarStack(attendees, internal ? 'internal' : 'team')}
                              <span className="mc-chip-label">Team</span>
                              <span className="mc-chip-count">{attendees.length}</span>
                              <span className="mc-chip-tooltip mc-tip">
                                <div className="mc-tip-title">
                                  {event.title} · {fmtTime(event.event_time)} · {fmtDate(event.event_date)}
                                </div>
                                {attendees.length ? attendees.map((a, attendeeIndex) => (
                                  <div className="mc-tip-row" key={`${a.id || a.email || a.name}-${attendeeIndex}`}>
                                    <span className="mc-tip-name">{a.name}</span>
                                    <span className="mc-tip-role">
                                      {a.role_in_meeting || prettyRole(a.role)}
                                      {a.is_lead && <em> · lead</em>}
                                    </span>
                                  </div>
                                )) : (
                                  <div className="mc-tip-row">
                                    <span className="mc-tip-name">Unassigned</span>
                                    <span className="mc-tip-role">Team</span>
                                  </div>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              );
            })}
            {hiddenRows.below.length > 0 && (
              <button type="button" className="mc-more-later is-below" onClick={() => scrollToHidden('below')}>
                <span>{hiddenMeetingCount('below')} More</span>
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        )}
        {view === 'week' && (
          <div className="mc-week-slider" ref={weekSliderRef} onScroll={handleWeekScroll}>
            {weekSlides.map(slide => (
              <div className="mc-calendar-view mc-week-slide" key={slide.key}>
                <div className="mc-week-grid">
                  {slide.days.map(({ day, key, events: dayEvents }) => (
                    <button
                      type="button"
                      className={`mc-week-day ${key === selectedDate ? 'is-selected' : ''} ${key === todayKey ? 'is-today' : ''}`}
                      key={key}
                      onClick={() => {
                        onSelectDate(key);
                        setView('day');
                      }}
                    >
                      <span className="mc-calendar-day-head">
                        <small>{day.toLocaleDateString('en-US', { weekday: 'short' })}</small>
                        <strong>{day.getDate()}</strong>
                      </span>
                      <span className="mc-calendar-events">
                        {dayEvents.slice(0, 4).map(renderCompactEvent)}
                        {dayEvents.length > 4 && <em>+{dayEvents.length - 4} more</em>}
                        {!dayEvents.length && <span className="mc-calendar-empty">No events</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            </div>
        )}
        {view === 'month' && (
          <div className="mc-month-slider" ref={monthSliderRef} onScroll={handleMonthScroll}>
            {monthSlides.map(slide => (
              <div className="mc-calendar-view mc-month-slide" key={`${calendarYear}-${slide.monthIndex}`}>
                <div className="mc-month-weekdays">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
                </div>
                <div className="mc-month-grid">
                  {slide.days.map(({ day, key, inMonth, events: dayEvents }) => (
                    <button
                      type="button"
                      className={`mc-month-cell ${!inMonth ? 'is-muted' : ''} ${key === selectedDate ? 'is-selected' : ''} ${key === todayKey ? 'is-today' : ''}`}
                      key={key}
                      disabled={!inMonth}
                      onClick={() => {
                        onSelectDate(key);
                        setView('day');
                      }}
                    >
                      <span className="mc-month-number">{day.getDate()}</span>
                      <span className="mc-month-dots">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <i
                            className={EVENT_COLORS[field(event, 'event_type')] || 'is-project'}
                            key={eventKey(event, index, `month-${slide.monthIndex}-${key}`)}
                          />
                        ))}
                      </span>
                      {dayEvents.length > 0 && <small>{dayEvents.length}</small>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default function Overview() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [calendarData, setCalendarData] = useState({ today: [], events_by_date: {} });
  const [employeeRequests, setEmployeeRequests] = useState([]);
  const [webhookHealth, setWebhookHealth] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [elevateRate, setElevateRate] = useState(ELEVATE_RATE_FALLBACK);
  const [rateWarning, setRateWarning] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsMenuRef = useRef(null);

  const isOwnerAdmin = hasRole(user, ['owner', 'admin']);
  const isDeliveryLead = hasRole(user, ['head_of_delivery', 'head_of_design', 'head_of_development']);
  const isProjectAccount = hasRole(user, ['project_manager', 'account_manager']);
  const isWorker = hasRole(user, ['creative']);
  const isFinance = hasRole(user, ['finance']) && !isOwnerAdmin;
  const isSalesView = hasRole(user, ['sales']) && !isOwnerAdmin;
  const isHr = hasRole(user, ['hr']) && !isOwnerAdmin;

  useEffect(() => {
    setLoading(true);
    apiGet(STATS_URL, { role: user?.role, user_id: user?.id })
      .then(data => {
        if (data.success) {
          setStats(data.stats || {});
          setAlerts(data.alerts || []);
          setRecentClients(data.recent_clients || []);
          setRecentRequests(data.recent_requests || []);
        }
      })
      .catch(() => {
        setStats({});
        setAlerts([]);
        setRecentClients([]);
        setRecentRequests([]);
      })
      .finally(() => setLoading(false));
  }, [user?.role, user?.id]);

  useEffect(() => {
    apiGet('/api/alerts')
      .then(data => setAlerts(data.alerts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!alertsOpen) return undefined;
    const closeOnOutsideClick = event => {
      if (!alertsMenuRef.current?.contains(event.target)) setAlertsOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setAlertsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [alertsOpen]);

  useEffect(() => {
    apiGet(CALENDAR_URL)
      .then(data => setCalendarData(data.success ? data : { today: [], events_by_date: {} }))
      .catch(() => setCalendarData({ today: [], events_by_date: {} }));
  }, []);

  useEffect(() => {
    const fetchPredictions = () => {
      apiGet('/api/predictions')
        .then(data => {
          if (data.success) setPredictions(data.predictions || []);
        })
        .catch(() => {});
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id || !(isProjectAccount || isWorker)) return;
    apiGet(REQUESTS_URL, { employee_id: user.id })
      .then(data => setEmployeeRequests(data.success ? data.requests || data.data || [] : []))
      .catch(() => setEmployeeRequests([]));
  }, [user?.id, isProjectAccount, isWorker]);

  useEffect(() => {
    apiGet(RATE_URL)
      .then(data => {
        if (data.success && data.rate) {
          setElevateRate(data.rate);
          if (data.warning) setRateWarning(data.warning);
        }
      })
      .catch(() => setRateWarning('Could not fetch live ElevatePay rate — using fallback rate.'));
  }, []);

  useEffect(() => {
    if (!isOwnerAdmin) return;
    let alive = true;
    Promise.all(WEBHOOKS.map(webhook => {
      const start = Date.now();
      return apiGet(webhook.url)
        .then(() => ({ ...webhook, ok: true, ping: Date.now() - start }))
        .catch(() => ({ ...webhook, ok: false, ping: null }));
    })).then(results => {
      if (alive) setWebhookHealth(results);
    });
    return () => { alive = false; };
  }, [isOwnerAdmin]);

  useEffect(() => {
    if (!isOwnerAdmin) return;
    apiGet('/api/team')
      .then(data => setTeamMembers(data?.employees || data?.team || data?.data || []))
      .catch(() => setTeamMembers([]));
  }, [isOwnerAdmin]);

  const unreadAlerts = alerts.length
    ? alerts.filter(alert => !alert.is_read).length
    : Number(stats?.unread_alerts || stats?.unread_alert_count || 0);
  const revenueUsd = stats?.monthly_revenue_usd ?? stats?.monthly_revenue;
  const expensesPkr = stats?.monthly_expenses_pkr ?? stats?.monthly_expenses;
  const revenuePkr = Number(revenueUsd || 0) * elevateRate;
  const netProfitPkr = revenuePkr - Number(expensesPkr || 0);
  const profitMargin = revenuePkr > 0 ? `${((netProfitPkr / revenuePkr) * 100).toFixed(1)}% margin` : 'No revenue yet';
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = user?.name?.split(' ')[0] || 'there';
  const selectedAgenda = calendarData.events_by_date?.[selectedDate] || (selectedDate === dateKey(new Date()) ? calendarData.today || [] : []);
  const teamWorkloadRows = useMemo(
    () => stats?.team?.employees || stats?.team_employees || stats?.team_workload || stats?.workload || [],
    [stats],
  );
  const assignedClients = useMemo(
    () => recentClients.filter(client => isSameUser(field(client, 'owner_id', 'account_manager_id', 'project_manager_id'), user)),
    [recentClients, user],
  );
  const todayBookings = useMemo(
    () => (calendarData.today || []).filter(event => event.event_type === 'booking'),
    [calendarData.today],
  );
  const upcomingCalendarEvents = useMemo(() => {
    const events = Object.values(calendarData.events_by_date || {}).flat();
    const source = events.length ? events : (calendarData.today || []);
    const seen = new Set();
    return source
      .filter(event => {
        const key = `${event.id || ''}-${event.event_date || ''}-${event.event_time || ''}-${event.title || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        const eventDate = event.event_date ? new Date(`${event.event_date}T${event.event_time || '00:00'}`) : new Date();
        return !Number.isNaN(eventDate.getTime()) && eventDate >= new Date(new Date().setHours(0, 0, 0, 0));
      })
      .sort((a, b) => new Date(`${a.event_date || ''}T${a.event_time || '00:00'}`) - new Date(`${b.event_date || ''}T${b.event_time || '00:00'}`));
  }, [calendarData.events_by_date, calendarData.today]);
  const upcomingExternalMeetings = useMemo(
    () => upcomingCalendarEvents.filter(event => {
      const type = String(event.event_type || '').toLowerCase();
      return Number(event.is_internal) !== 1
        && !type.includes('internal')
        && !type.includes('team')
        && (Array.isArray(event.client_attendees) && event.client_attendees.length > 0
          || ['booking', 'client', 'meeting'].some(label => type.includes(label)));
    }),
    [upcomingCalendarEvents],
  );
  const upcomingInternalMeetings = useMemo(
    () => upcomingCalendarEvents.filter(event => {
      const type = String(event.event_type || '').toLowerCase();
      return Number(event.is_internal) === 1 || type.includes('internal') || type.includes('team');
    }),
    [upcomingCalendarEvents],
  );

  const ownerCards = [
    { label: 'Active Clients', icon: 'users', value: fmtNum(stats?.active_clients), tone: 'indigo' },
    { label: 'Pending Payments', icon: 'clock', value: fmtNum(stats?.pending_payments), tone: 'amber' },
    { label: 'Monthly Revenue', icon: 'dollar', value: fmtUSD(revenueUsd), tone: 'blue' },
    { label: 'Net Profit', icon: 'profit', value: fmtPKR(netProfitPkr), tone: netProfitPkr >= 0 ? 'green' : 'red' },
  ];

  const roleCards = useMemo(() => {
    if (isDeliveryLead) return [
      { label: 'Active Requests', icon: 'layers', value: fmtNum(stats?.active_requests), tone: 'indigo' },
      { label: 'Overdue Requests', icon: 'clock', value: fmtNum(stats?.overdue_requests), tone: 'red' },
      { label: 'Team Utilization', icon: 'person', value: `${fmtNum(stats?.team_utilization)}%`, tone: 'blue' },
      { label: 'Clients at Risk', icon: 'users', value: fmtNum(stats?.clients_at_risk), tone: 'amber' },
    ];
    if (isProjectAccount) return [
      { label: 'My Clients', icon: 'users', value: fmtNum(stats?.my_clients), tone: 'indigo' },
      { label: 'My Active Requests', icon: 'layers', value: fmtNum(employeeRequests.length || stats?.my_active_requests), tone: 'blue' },
      { label: 'Requests In Review', icon: 'clock', value: fmtNum(stats?.in_review), tone: 'amber' },
      { label: 'Upcoming Meetings', icon: 'bell', value: fmtNum(stats?.upcoming_bookings), tone: 'green' },
    ];
    if (isFinance) return [
      { label: 'Monthly Revenue', icon: 'dollar', value: fmtUSD(revenueUsd), tone: 'blue' },
      { label: 'Monthly Expenses', icon: 'clock', value: fmtPKR(expensesPkr), tone: 'amber' },
      { label: 'Net Profit', icon: 'profit', value: fmtPKR(netProfitPkr), tone: netProfitPkr >= 0 ? 'green' : 'red' },
      { label: 'Pending Payments', icon: 'bell', value: fmtNum(stats?.pending_payments), tone: 'indigo' },
    ];
    if (isSalesView) return [
      { label: 'Total Bookings', icon: 'briefcase', value: fmtNum(stats?.total_bookings), tone: 'indigo' },
      { label: 'Upcoming Calls', icon: 'clock', value: fmtNum(stats?.upcoming_bookings), tone: 'blue' },
      { label: 'Converted to Client', icon: 'users', value: fmtNum(stats?.converted_clients), tone: 'green' },
      { label: 'Conversion Rate', icon: 'profit', value: `${fmtNum(stats?.conversion_rate)}%`, tone: 'amber' },
    ];
    if (isHr) return [
      { label: 'Open Positions', icon: 'briefcase', value: fmtNum(stats?.open_positions || stats?.open_jobs), tone: 'indigo' },
      { label: 'Total Applications', icon: 'person', value: fmtNum(stats?.total_applications), tone: 'blue' },
      { label: 'Pending Review', icon: 'clock', value: fmtNum(stats?.pending_review), tone: 'amber' },
      { label: 'Interviews Scheduled', icon: 'bell', value: fmtNum(stats?.interviews_scheduled), tone: 'green' },
    ];
    return [
      { label: 'My Active Requests', icon: 'layers', value: fmtNum(employeeRequests.length || stats?.active_requests), tone: 'indigo' },
      { label: 'In Review', icon: 'clock', value: fmtNum(stats?.in_review), tone: 'amber' },
      { label: 'Completed This Week', icon: 'profit', value: fmtNum(stats?.completed_this_week), tone: 'green' },
      { label: 'Hours Logged Today', icon: 'person', value: fmtNum(stats?.hours_logged_today), tone: 'blue' },
    ];
  }, [employeeRequests.length, expensesPkr, isDeliveryLead, isFinance, isHr, isProjectAccount, isSalesView, netProfitPkr, revenueUsd, stats]);

  const myRequests = employeeRequests.length
    ? employeeRequests
    : recentRequests.filter(request => isSameUser(field(request, 'assigned_to', 'assigned_to_id', 'assignee_id', 'assignee_email'), user));

  const overdueRequest = useCallback((request) => {
    const due = field(request, 'due_date', 'deadline');
    return due && new Date(due) < new Date() && field(request, 'status') !== 'completed';
  }, []);

  const pendingPayments = stats?.pending_payments_list || stats?.payments_pending || [];
  const recentAlerts = useMemo(
    () => [...alerts]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6),
    [alerts],
  );
  const clientAlerts = useMemo(
    () => alerts.filter(alert => ['message', 'support', 'client'].includes(String(alert.type || '').toLowerCase()) || String(alert.link || '').startsWith('/clients')),
    [alerts],
  );
  const paymentAlerts = useMemo(
    () => alerts.filter(alert => alert.type === 'payment' || /payment|billing|subscription|add[ -]?on/i.test(`${alert.title || ''} ${alert.message || ''}`)),
    [alerts],
  );
  const confirmedPayments = stats?.recent_confirmed_payments || [];
  const bookings = stats?.recent_bookings || [];
  const applications = stats?.applications_by_status || [];
  const jobs = stats?.open_job_listings || [];
  const outstandingInvoices = pendingPayments.reduce((sum, payment) => sum + Number(field(payment, 'amount') || 0), Number(stats?.outstanding_invoices_total || 0));
  const overdueInvoices = pendingPayments.filter(payment => {
    const due = field(payment, 'due_date', 'payment_due');
    return field(payment, 'status') === 'overdue' || (due && new Date(due) < new Date());
  }).length || Number(stats?.overdue_invoices || 0);
  const payrollDate = stats?.next_payroll_date ?? stats?.payroll_date;
  const payrollAmount = stats?.next_payroll_amount ?? stats?.payroll_due ?? stats?.monthly_payroll;
  const pendingApprovals = stats?.pending_approvals
    ?? recentRequests.filter(request => field(request, 'approval_status') === 'pending' || field(request, 'status') === 'in_review').length;

  const openAlert = async alert => {
    if (!alert.is_read) {
      try {
        await apiFetch(`/api/alerts/${alert.id}/read`, { method: 'PATCH' });
        setAlerts(current => current.map(item => item.id === alert.id ? { ...item, is_read: 1 } : item));
      } catch {}
    }
    setAlertsOpen(false);
    if (alert.link) navigate(alert.link);
  };

  const markAllAlertsRead = async () => {
    try {
      await apiPost('/api/alerts/mark-all-read');
      setAlerts(current => current.map(alert => ({ ...alert, is_read: 1 })));
    } catch {
      // Keep the panel open so the user can retry or open the full alerts page.
    }
  };

  // Keep existing owner health requests intact even though health is no longer rendered here.
  void webhookHealth;
  void teamWorkloadRows;

  return (
    <DashLayout>
      <div className="overview-page">
        <header className="ov-header">
          <div className="ov-header-left">
            <h1 className="ov-greeting">{getGreeting()}, <strong>{firstName}</strong></h1>
            <p className="ov-subline">Here is what is happening at Clockwrk today.</p>
          </div>
          <div className="ov-header-actions">
            <div className="ov-date"><CalendarDays size={15} /><span>{todayLabel}</span></div>
            <div className="ov-alert-menu" ref={alertsMenuRef}>
              <button
                type="button"
                className={`ov-header-action has-indicator ${alertsOpen ? 'is-active' : ''}`}
                aria-label="View recent alerts"
                aria-haspopup="dialog"
                aria-expanded={alertsOpen}
                onClick={() => setAlertsOpen(open => !open)}
              >
                <Bell size={17} />
                {unreadAlerts > 0 && <i />}
              </button>
              {alertsOpen && (
                <section className="ov-alert-panel" aria-label="Recent alerts">
                  <header>
                    <span>
                      <strong>Recent alerts</strong>
                      <small>{unreadAlerts} unread</small>
                    </span>
                    {unreadAlerts > 0 && <button type="button" onClick={markAllAlertsRead}>Mark all read</button>}
                  </header>
                  <div className="ov-alert-list">
                    {recentAlerts.length ? recentAlerts.map(alert => {
                      const AlertIcon = ALERT_ICONS[alert.type] || Bell;
                      return (
                        <button
                          type="button"
                          className={`ov-alert-row ${alert.is_read ? '' : 'is-unread'}`}
                          key={alert.id}
                          onClick={() => openAlert(alert)}
                        >
                          <span className={`ov-alert-type is-${ALERT_COLORS[alert.type] || 'slate'}`}><AlertIcon size={15} /></span>
                          <span className="ov-alert-copy">
                            <strong>{alert.title || 'Dashboard alert'}</strong>
                            <small>{alert.message || 'Open for details'}</small>
                            <time>{timeAgo(alert.created_at)}</time>
                          </span>
                          {!alert.is_read && <i className="ov-alert-unread" />}
                        </button>
                      );
                    }) : (
                      <div className="ov-alert-empty"><Bell size={18} /><span>No alerts yet</span></div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ov-alert-view-all"
                    onClick={() => {
                      setAlertsOpen(false);
                      navigate('/alerts');
                    }}
                  >
                    View all alerts <ExternalLink size={13} />
                  </button>
                </section>
              )}
            </div>
            <button type="button" className="ov-header-action" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {isOwnerAdmin && rateWarning && (
          <div className="ov-rate-warning">
            <Bell size={14} /> ElevatePay rate issue: {rateWarning}
          </div>
        )}

        {isOwnerAdmin && (
          loading ? (
            <div className="tw-dashboard-grid tw-loading-grid">
              <div className="tw-main-column">
                <div className="skeleton-card tw-skeleton-hero" />
                <div className="skeleton-card tw-skeleton-calendar" />
              </div>
              <div className="tw-right-column">
                <div className="tw-side-stack"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
                <div className="skeleton-card tw-skeleton-team" />
              </div>
            </div>
          ) : (
            <div className="tw-dashboard-grid">
              <div className="tw-main-column">
                <MoneyCard
                  revenue={revenueUsd}
                  previousRevenue={stats?.prev_revenue}
                  outstanding={outstandingInvoices}
                  overdue={overdueInvoices}
                  expenses={expensesPkr}
                  exchangeRate={elevateRate}
                  predictions={predictions}
                />
                <TeamGridCard people={teamMembers.length ? teamMembers : teamWorkloadRows} />
              </div>
              <div className="tw-right-column">
                <div className="tw-side-stack">
                  <CashCard
                    balance={stats?.pkr_balance}
                    payrollDate={payrollDate}
                    payrollAmount={payrollAmount}
                  />
                  <OperationsCard
                    clientAlerts={clientAlerts}
                    internalMeetings={upcomingInternalMeetings}
                    externalMeetings={upcomingExternalMeetings}
                    paymentAlertCount={Math.max(paymentAlerts.length, pendingPayments.length, Number(stats?.pending_payments || 0))}
                    pendingAmount={outstandingInvoices}
                  />
                  <JobsCard requests={recentRequests} overdueRequest={overdueRequest} />
                </div>
                <MeetingSchedulerCard
                  events={selectedAgenda}
                  eventsByDate={calendarData.events_by_date || {}}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </div>
            </div>
          )
        )}

        {isDeliveryLead && !isOwnerAdmin && (
          <>
            {!loading && <KpiStrip cards={roleCards.slice(0, 4)} />}
            <div className="overview-grid">
            <RequestTable rows={recentRequests} title="Active Requests" badge="Delivery" overdueRequest={overdueRequest} />
            <TodayAgendaCard events={calendarData.today || []} title="Today's Agenda" />
            </div>
          </>
        )}

        {isProjectAccount && !isOwnerAdmin && (
          <>
            {!loading && <KpiStrip cards={roleCards.slice(0, 4)} />}
            <div className="overview-grid">
              <RequestTable rows={myRequests} title="My Requests" badge="Assigned" overdueRequest={overdueRequest} />
              <div className="overview-right">
                <RecentClients clients={assignedClients} />
                <TodayAgendaCard events={calendarData.today || []} title="Upcoming Meetings" />
              </div>
            </div>
          </>
        )}

        {isWorker && !isOwnerAdmin && !isProjectAccount && (
          <>
            {!loading && <KpiStrip cards={roleCards.slice(0, 4)} />}
            <div className="overview-grid overview-single">
              <RequestTable rows={myRequests} title="My Request Queue" badge="Personal" overdueRequest={overdueRequest} />
            </div>
          </>
        )}

        {isFinance && (
          <>
            {!loading && <KpiStrip cards={roleCards.slice(0, 4)} />}
            <div className="overview-grid">
              <SimpleList title="Pending Payments" badge="Confirm" rows={pendingPayments} empty="No pending payments" primary={payment => payment.name || payment.client_name || 'Payment'} secondary={payment => `${fmtUSD(payment.amount)} · ${payment.status || 'pending'}`} />
              <SimpleList title="Recent Confirmed Payments" badge="Paid" rows={confirmedPayments} empty="No confirmed payments yet" primary={payment => payment.name || payment.client_name || 'Payment'} secondary={payment => `${fmtUSD(payment.amount)} · ${timeAgo(payment.confirmed_at || payment.created_at)}`} />
            </div>
          </>
        )}

        {isSalesView && (
          <>
            {!loading && <KpiStrip cards={roleCards.slice(0, 4)} />}
            <div className="overview-grid">
              <SimpleList title="Upcoming Bookings" badge="Calls" rows={todayBookings} empty="No upcoming calls" primary={booking => booking.title} secondary={booking => `${fmtDate(booking.event_date)} · ${fmtTime(booking.event_time)}`} />
              <SimpleList title="Recent Bookings" badge="Pipeline" rows={bookings} empty="No bookings yet" primary={booking => booking.title || booking.name || 'Booking'} secondary={booking => booking.conversion_status || booking.status || 'No conversion status'} />
            </div>
          </>
        )}

        {isHr && (
          <>
            {!loading && <KpiStrip cards={roleCards.slice(0, 4)} />}
            <div className="overview-grid">
              <SimpleList title="Applications by Status" badge="Hiring" rows={applications} empty="No applications yet" primary={application => application.status || 'Status'} secondary={application => `${fmtNum(application.count)} applications`} />
              <SimpleList title="Open Job Listings" badge="Roles" rows={jobs} empty="No open job listings" primary={job => job.title || job.role || 'Job listing'} secondary={job => job.department || job.status || 'Open'} />
            </div>
          </>
        )}
      </div>
    </DashLayout>
  );
}
