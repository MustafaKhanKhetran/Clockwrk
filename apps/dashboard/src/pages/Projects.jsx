import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  FolderOpen,
  Pause,
  Plus,
  Search,
  X,
} from 'lucide-react';
import DashLayout from '../components/DashLayout';
import FileList from '../components/FileList';
import PillSelect from '../components/PillSelect';
import RoleGuard from '../components/RoleGuard';
import SkeletonBlock from '../components/SkeletonBlock';
import { toast } from '../components/Toast';
import { canWrite } from '../config/roles';
import { useAuth } from '../context/AuthContext';
import { apiGet, callDashboardApi, getList } from '../utils/dashboardApi';
import './Projects.css';

const API = '/api/projects';
const STATUSES = ['active', 'paused', 'completed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const TYPES = ['website', 'branding', 'web_app', 'automation', 'support', 'internal'];
const DRAWER_TABS = ['overview', 'activity', 'requests', 'files', 'links'];

const EMPTY_PROJECT = {
  project_name: '',
  client: '',
  plan: 'business',
  project_type: 'website',
  status: 'active',
  priority: 'normal',
  start_date: '',
  due_date: '',
  assigned_project_manager: '',
  assigned_designers: '',
  assigned_developers: '',
  support_person: '',
  github_repo: '',
  staging_link: '',
  live_link: '',
  tech_stack: '',
  progress: 0,
  health_status: 'healthy',
  brief: '',
  notes: '',
};

const PRIORITY_RANK = { urgent: 4, high: 3, normal: 2, low: 1 };
const ACTIVE_STATUSES = ['active', 'in_progress', 'in_review'];
const DONE_STATUSES = ['completed', 'archived'];
const HEALTHS = ['healthy', 'warning', 'critical'];
const COLOR_PALETTE = ['#d9e7ff', '#e8d7ff', '#d7f5e5', '#fff1c8', '#f8d7da', '#d9dee7'];

const field = (item, ...keys) => keys.map(key => item?.[key]).find(value => value !== undefined && value !== null && value !== '') || '';
const projectName = project => field(project, 'name', 'project_name', 'title') || 'Untitled project';
const clientName = project => field(project, 'client_name', 'client_company', 'client', 'company') || 'No client linked';
const statusOf = project => field(project, 'status') || 'planning';
const priorityOf = project => field(project, 'priority') || 'normal';
const healthOf = project => field(project, 'health_status') || 'healthy';
const progressOf = project => Math.max(0, Math.min(100, Number(field(project, 'progress_percent', 'progress') || 0)));
const activeRequestsOf = project => Number(field(project, 'active_requests', 'request_count', 'linked_requests') || 0);
const logsOf = project => Number(field(project, 'total_logs', 'logged_hours', 'actual_hours') || 0);
const estimatedHoursOf = project => Number(field(project, 'estimated_hours') || 0);
const typeOf = project => field(project, 'project_type', 'type') || 'website';

const initials = name => String(name || 'CW')
  .trim()
  .split(/\s+/)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const nameColor = name => {
  const text = String(name || 'Clockwrk');
  const hash = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
};

const fmtDate = date => date
  ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '-';

const fmtShortDate = date => date
  ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : '-';

const normalizeDate = date => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const daysToDeadline = project => {
  const due = normalizeDate(field(project, 'due_date'));
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / 86400000);
};

const isOverdue = project => {
  const days = daysToDeadline(project);
  return days !== null && days < 0 && !DONE_STATUSES.includes(statusOf(project));
};

const isAtRisk = project => healthOf(project) === 'critical' || isOverdue(project) || priorityOf(project) === 'urgent';

const deadlineLabel = project => {
  const days = daysToDeadline(project);
  if (days === null) return 'No deadline';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
};

const riskReason = project => {
  if (isOverdue(project)) return `Overdue · ${Math.abs(daysToDeadline(project))} days`;
  if (healthOf(project) === 'critical') return 'Critical health';
  if (priorityOf(project) === 'urgent') return 'Urgent priority';
  return 'Needs attention';
};

const relativeTime = date => {
  const parsed = date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return 'No activity';
  const diff = Date.now() - parsed.getTime();
  const days = Math.max(0, Math.floor(diff / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return fmtShortDate(date);
};

const human = value => String(value || '-').replace(/_/g, ' ');

const splitPeople = value => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : field(item, 'name', 'full_name', 'employee_name', 'email')))
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const assignedTeam = project => {
  const people = [];
  const add = (name, role) => {
    if (!name) return;
    const parts = Array.isArray(name) ? name : splitPeople(name);
    parts.forEach(person => {
      const key = `${person.toLowerCase()}-${role}`;
      if (!people.some(existing => `${existing.name.toLowerCase()}-${existing.role}` === key)) {
        people.push({ name: person, role });
      }
    });
  };
  add(field(project, 'assigned_project_manager', 'project_manager_name', 'pm_name', 'project_manager'), 'PM');
  add(field(project, 'assigned_account_manager', 'account_manager_name', 'am_name', 'account_manager'), 'AM');
  add(field(project, 'assigned_designers', 'designer_name', 'designers', 'designer'), 'Designer');
  add(field(project, 'assigned_developers', 'developer_name', 'developers', 'developer'), 'Developer');
  add(field(project, 'assigned_designer_devs', 'designer_dev_name', 'designer_devs'), 'Design Dev');
  add(field(project, 'support_person', 'support_name', 'support'), 'Support');
  add(project.assigned_team || project.team_members || project.team, 'Team');
  return people;
};

function KpiStrip({ cards }) {
  return (
    <div className="ov-kpi-strip pj-kpi-strip">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article className={`ov-kpi-card ov-tone-${tone}`} key={label}>
          <span className="ov-kpi-icon"><Icon size={21} strokeWidth={1.9} /></span>
          <div className="ov-kpi-copy">
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProjectAvatar({ project, size = 'md' }) {
  const name = projectName(project);
  return (
    <span className={`pj-avatar pj-avatar-${size}`} style={{ background: nameColor(name) }}>
      {initials(name)}
    </span>
  );
}

function ProjectPill({ project }) {
  return (
    <span className="pj-project-pill">
      <span className="pj-project-pill-avatar">{initials(projectName(project))}</span>
      <span className="pj-project-pill-label">{projectName(project)}</span>
      <span className="pj-project-tooltip">
        <span>
          <strong>{clientName(project)}</strong>
          <em>Client</em>
        </span>
        {field(project, 'client_company', 'company') && (
          <span>
            <strong>{field(project, 'client_company', 'company')}</strong>
            <em>Company</em>
          </span>
        )}
      </span>
    </span>
  );
}

function TeamPill({ people }) {
  if (!people.length) return <span className="pj-team-pill pj-team-pill-empty">Unassigned</span>;
  const visible = people.length > 3 ? people.slice(0, 2) : people.slice(0, 3);
  return (
    <span className="pj-team-pill">
      <span className="pj-team-stack">
        {visible.map(person => (
          <span className="pj-team-avatar" key={`${person.role}-${person.name}`}>{initials(person.name).slice(0, 1)}</span>
        ))}
        {people.length > 3 && <span className="pj-team-avatar pj-team-overflow">+{people.length - 2}</span>}
      </span>
      <span className="pj-team-label">Team</span>
      <span className="pj-team-count">{people.length}</span>
      <span className="pj-team-tooltip">
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

function TypeCell({ value }) {
  const normalized = human(value);
  return (
    <span className="pj-type-cell">
      <span className="pj-type-dots" aria-hidden="true">
        {Array.from({ length: Math.max(1, TYPES.indexOf(value) % 3 + 1) }).map((_, index) => <i key={index} />)}
      </span>
      <span>{normalized}</span>
    </span>
  );
}

function StatusPill({ value, type = 'status' }) {
  return <i className={`pj-pill pj-${type}-${value || 'unknown'}`}>{human(value)}</i>;
}

function StatusIcon({ status }) {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'in_progress', 'completed'].includes(normalized)) return <Check size={15} strokeWidth={3} />;
  if (['paused', 'archived'].includes(normalized)) return <Pause size={15} strokeWidth={3} />;
  return <X size={15} strokeWidth={3} />;
}

function FilterPillGroup({ label, value, options, onChange, renderOption }) {
  return (
    <div className="pj-filter-pill-group" aria-label={`Filter ${label}`}>
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
    <span className="pj-sort-arrows">
      <ChevronUp size={11} />
      <ChevronDown size={11} />
    </span>
  );
  return (
    <button
      type="button"
      className={`pj-sort-th icon-${iconSide} ${active ? `is-active ${sortConfig.direction}` : ''}`}
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}`}
    >
      {iconSide === 'left' && arrows}
      <span>{label}</span>
      {iconSide === 'right' && arrows}
    </button>
  );
}

function ProgressCubes({ value }) {
  const active = Math.round(value / 10);
  return (
    <span className="pj-progress-cubes" aria-label={`${value}% progress`}>
      {Array.from({ length: 10 }).map((_, index) => (
        <i className={index < active ? 'is-filled' : ''} key={index} />
      ))}
      <b>{value}%</b>
    </span>
  );
}

function ProgressBar({ value }) {
  return (
    <span className="pj-progress">
      <i style={{ width: `${value}%` }} />
    </span>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage = canWrite(user?.role, 'projects');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const clientContext = searchParams.get('client_id');

  const fetchProjects = () => {
    setLoading(true);
    setError(null);
    callDashboardApi(API, 'list')
      .then(data => setProjects(getList(data, ['projects'])))
      .catch(err => {
        console.error(err);
        setError('Failed to load projects. Check your connection and try again.');
        toast.error('Failed to load projects');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => {
    Promise.all([apiGet('/api/clients'), apiGet('/api/team')])
      .then(([clientData, teamData]) => { setClients(clientData.clients || []); setTeam(teamData.employees || []); })
      .catch(() => {});
  }, []);
  useEffect(() => { if (selected) setDrawerTab('overview'); }, [selected?.id]);
  useEffect(() => {
    if (searchParams.get('create') !== '1' || !canManage) return;
    setEditing(null);
    setForm({ ...EMPTY_PROJECT, client_id: clientContext || '' });
    setShowForm(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [canManage, clientContext, searchParams, setSearchParams]);

  const handleSort = key => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = projects.filter(project => {
      if (clientContext && String(project.client_id) !== String(clientContext)) return false;
      if (status !== 'all' && statusOf(project) !== status) return false;
      if (priority !== 'all' && priorityOf(project) !== priority) return false;
      if (!query) return true;
      const haystack = [
        projectName(project),
        clientName(project),
        field(project, 'tech_stack'),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
    const sortValue = project => {
      if (sortConfig.key === 'progress') return progressOf(project);
      if (sortConfig.key === 'due_date') return normalizeDate(field(project, 'due_date'))?.getTime() ?? 0;
      if (sortConfig.key === 'requests') return activeRequestsOf(project);
      const priorityRank = PRIORITY_RANK[priorityOf(project)] || 0;
      return priorityRank;
    };
    return [...rows].sort((a, b) => {
      const defaultPriorityDiff = (PRIORITY_RANK[priorityOf(b)] || 0) - (PRIORITY_RANK[priorityOf(a)] || 0);
      const defaultDueDiff = (normalizeDate(field(a, 'due_date'))?.getTime() ?? Number.MAX_SAFE_INTEGER)
        - (normalizeDate(field(b, 'due_date'))?.getTime() ?? Number.MAX_SAFE_INTEGER);
      if (!sortConfig.key) return defaultPriorityDiff || defaultDueDiff;
      const aValue = sortValue(a);
      const bValue = sortValue(b);
      const diff = typeof aValue === 'string'
        ? aValue.localeCompare(bValue)
        : aValue - bValue;
      return sortConfig.direction === 'asc' ? diff : -diff;
    });
  }, [projects, search, status, priority, sortConfig, clientContext]);

  const metrics = useMemo(() => {
    const active = projects.filter(project => ACTIVE_STATUSES.includes(statusOf(project))).length;
    const averageProgress = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + progressOf(project), 0) / projects.length)
      : 0;
    const risk = projects.filter(isAtRisk);
    const now = new Date();
    const dueThisMonth = projects.filter(project => {
      const due = normalizeDate(field(project, 'due_date'));
      return due && due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
    });
    const topProject = projects.reduce((top, project) => progressOf(project) > progressOf(top || {}) ? project : top, null);
    const healthMix = HEALTHS.map(health => ({ health, count: projects.filter(project => healthOf(project) === health).length }));
    const recent = [...projects]
      .sort((a, b) => new Date(field(b, 'updated_at', 'start_date') || 0) - new Date(field(a, 'updated_at', 'start_date') || 0))
      .slice(0, 4);
    return { active, averageProgress, risk, dueThisMonth, topProject, healthMix, recent };
  }, [projects]);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });
  const statusFilterOptions = [
    { value: 'active', label: 'Active', icon: 'active' },
    { value: 'paused', label: 'Paused', icon: 'paused' },
    { value: 'completed', label: 'Completed', icon: 'completed' },
  ];
  const priorityFilterOptions = PRIORITIES.map(value => ({ value, label: human(value) }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PROJECT);
    setShowForm(true);
  };

  const openEdit = project => {
    setEditing(project);
    setForm({
      ...EMPTY_PROJECT,
      ...project,
      project_name: projectName(project),
      client: clientName(project),
      client_id: project.client_id,
      project_type: field(project, 'project_type', 'type') || 'website',
      project_manager_id: project.project_manager_id || '',
      progress: progressOf(project),
      staging_link: field(project, 'staging_link', 'staging_url'),
      live_link: field(project, 'live_link', 'live_url'),
    });
    setShowForm(true);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    try {
      const action = editing ? 'update' : 'create';
      await callDashboardApi(API, action, { project_id: editing?.id, ...form });
      toast.success(editing ? 'Project updated' : 'Project created');
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error('Project action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderList = () => {
    const grouped = filtered.reduce((acc, project) => {
      const client = clientName(project);
      if (!acc[client]) acc[client] = [];
      acc[client].push(project);
      return acc;
    }, {});

    return (
      <div className="pj-lineup">
        {Object.entries(grouped).map(([client, rows]) => (
          <section className="pj-client-lineup" key={client}>
            <div className="pj-client-lineup-head">
              <h2>{client}</h2>
              <span>{rows.length}</span>
            </div>
            <div className="pj-lineup-row">
              {rows.map(project => {
                const team = assignedTeam(project);
                const progress = progressOf(project);
                const dueDate = field(project, 'due_date');
                const overdue = isOverdue(project);
                return (
                  <button
                    className={`pj-lineup-card ${overdue ? 'is-overdue' : ''}`}
                    type="button"
                    key={project.id || projectName(project)}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="pj-lineup-top">
                      <span className="pj-lineup-type"><i>{initials(typeOf(project)).slice(0, 1)}</i>{human(typeOf(project))}</span>
                      <span className={`pj-lineup-date ${overdue ? 'is-overdue' : ''}`}>
                        <CalendarDays size={14} />
                        {fmtShortDate(dueDate)}
                      </span>
                    </div>

                    <h3>{projectName(project)}</h3>

                    <div className="pj-lineup-bottom">
                      <span className="pj-lineup-progress">
                        <strong>{progress}%</strong>
                        <small>{human(statusOf(project))}</small>
                      </span>
                      <span className="pj-lineup-team" aria-label="Assigned team">
                        {team.slice(0, 3).map(person => (
                          <i key={`${person.role}-${person.name}`} style={{ background: nameColor(person.name) }}>
                            {initials(person.name).slice(0, 1)}
                          </i>
                        ))}
                        {team.length > 3 && <b>+{team.length - 3}</b>}
                        {!team.length && <i>?</i>}
                      </span>
                    </div>
                  </button>
                );
              })}
              {canManage && (
                <button className="pj-lineup-add" type="button" onClick={openCreate}>
                  <Plus size={20} />
                  <span>Add Project</span>
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderDrawerTab = () => {
    if (!selected) return null;
    const progress = progressOf(selected);
    const requestUrl = `/requests?project_id=${selected.id}`;
    const links = [
      { label: 'GitHub', url: field(selected, 'github_repo') },
      { label: 'Staging', url: field(selected, 'staging_url', 'staging_link') },
      { label: 'Live', url: field(selected, 'live_url', 'live_link') },
    ].filter(link => link.url);

    if (drawerTab === 'overview') {
      return (
        <>
          <div className="pj-detail-grid">
            <span><small>Project Name</small><strong>{projectName(selected)}</strong></span>
            <span><small>Client</small><strong>{clientName(selected)}</strong></span>
            <span><small>Start</small><strong>{fmtDate(field(selected, 'start_date'))}</strong></span>
            <span><small>Due</small><strong>{fmtDate(field(selected, 'due_date'))}</strong></span>
            <span><small>Priority</small><strong>{human(priorityOf(selected))}</strong></span>
            <span><small>Status</small><strong>{human(statusOf(selected))}</strong></span>
            <span><small>Est Hours</small><strong>{estimatedHoursOf(selected) || '-'}</strong></span>
            <span><small>Tech Stack</small><strong>{field(selected, 'tech_stack') || '-'}</strong></span>
            <div className="pj-drawer-note pj-detail-wide">
              <small>Notes</small>
              <p>{field(selected, 'notes', 'brief') || 'No notes added yet.'}</p>
            </div>
          </div>
        </>
      );
    }

    if (drawerTab === 'activity') {
      return (
        <div className="pj-drawer-section">
          <span className="tw-kicker">Delivery Pulse</span>
          <div className="pj-activity-progress">
            <strong>{progress}%</strong>
            <ProgressBar value={progress} />
          </div>
          <p>{activeRequestsOf(selected)} requests · {logsOf(selected)} logs</p>
          <div className="pj-drawer-note">
            <small>Recent time logs</small>
            <p>Recent logs will appear here when linked time log records are available.</p>
          </div>
        </div>
      );
    }

    if (drawerTab === 'requests') {
      return (
        <div className="pj-drawer-section">
          <span className="tw-kicker">Requests</span>
          <strong className="pj-drawer-count">{activeRequestsOf(selected)}</strong>
          <p>Active requests connected to this project.</p>
          <a className="pj-link-button" href={requestUrl}>Open requests <ArrowRight size={14} /></a>
        </div>
      );
    }

    if (drawerTab === 'files') {
      return <FileList entityType="project" entityId={selected?.id} canManage={canManage} />;
    }

    return (
      <div className="pj-drawer-section">
        <span className="tw-kicker">Links</span>
        <div className="pj-link-list">
          {links.map(link => (
            <a className="pj-link-button" href={link.url} key={link.label} target="_blank" rel="noreferrer">
              {link.label} <ExternalLink size={14} />
            </a>
          ))}
          {!links.length && <p>No project links yet.</p>}
        </div>
      </div>
    );
  };

  return (
    <RoleGuard
      roles={['owner', 'admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'support', 'viewer']}
      fallback={<DashLayout><div className="empty-state"><p>Access denied</p></div></DashLayout>}
    >
      <DashLayout>
        <div className="projects-page">
          <header className="pj-header">
            <div>
              <h1 className="pj-greeting">Projects<strong> · {projects.length}</strong></h1>
              <p className="pj-subline">Active builds across the agency.</p>
            </div>
            <div className="pj-header-actions">
              <div className="pj-date"><CalendarDays size={15} /><span>{todayLabel}</span></div>
              {canManage && <button className="pj-add-btn" type="button" onClick={openCreate}><Plus size={15} /> New Project</button>}
            </div>
          </header>

          <KpiStrip cards={[
            { label: 'Active Projects', value: metrics.active, icon: FolderOpen, tone: 'indigo' },
            { label: 'Average Progress', value: `${metrics.averageProgress}%`, icon: ArrowUpRight, tone: 'green' },
            { label: 'At Risk', value: metrics.risk.length, icon: Bell, tone: 'red' },
            { label: 'Due This Month', value: metrics.dueThisMonth.length, icon: CalendarDays, tone: 'blue' },
          ]} />

          {error && (
            <div className="tw-card pj-error">
              <span>{error}</span>
              <button type="button" onClick={fetchProjects}>Retry</button>
            </div>
          )}

          <div className="pj-grid">
            <main className="pj-main-column">
              <div className="pj-filter-bar">
                <label className="pj-search-wrap">
                  <Search size={14} />
                  <input className="pj-search" placeholder="Search by project, client or stack..." value={search} onChange={event => setSearch(event.target.value)} />
                </label>
                <FilterPillGroup
                  label="Status"
                  value={status}
                  options={statusFilterOptions}
                  onChange={setStatus}
                  renderOption={option => <StatusIcon status={option.icon} />}
                />
                <FilterPillGroup label="Priority" value={priority} options={priorityFilterOptions} onChange={setPriority} />
              </div>

              <section className="tw-card pj-list-card">
                {loading ? (
                  <SkeletonBlock rows={8} bare />
                ) : filtered.length === 0 ? (
                  <div className="pj-empty">
                    <FileText size={28} />
                    <strong>No projects found</strong>
                    <span>Try another filter or create a new project.</span>
                  </div>
                ) : renderList()}
              </section>
            </main>

            <aside className="pj-side-column">
              <section className="tw-card pj-side-card pj-top-card">
                <span className="tw-kicker">Top Performer</span>
                {metrics.topProject ? (
                  <>
                    <h2>{projectName(metrics.topProject)}</h2>
                    <span className="pj-side-caption">{clientName(metrics.topProject)}</span>
                    <strong className="pj-big">{progressOf(metrics.topProject)}%</strong>
                    <span className="pj-side-caption">On track · finishes {fmtDate(field(metrics.topProject, 'due_date'))}</span>
                    <button className="pj-link" type="button" onClick={() => navigate(`/projects/${metrics.topProject.id}`)}>
                      View project <ArrowRight size={13} />
                    </button>
                  </>
                ) : <p className="pj-side-empty">No project data yet.</p>}
              </section>

              <section className="tw-card pj-side-card pj-risk-card">
                <span className="tw-kicker">At Risk</span>
                <h2>{metrics.risk.length} need attention</h2>
                <div className="pj-side-list">
                  {metrics.risk.slice(0, 4).map(project => (
                    <button className="pj-side-row" type="button" key={project.id || projectName(project)} onClick={() => navigate(`/projects/${project.id}`)}>
                      <ProjectAvatar project={project} size="sm" />
                      <span className="pj-side-row-text">
                        <strong>{projectName(project)}</strong>
                        <span>{riskReason(project)}</span>
                      </span>
                      <span className="pj-side-row-meta">{fmtShortDate(field(project, 'due_date'))}</span>
                    </button>
                  ))}
                  {!metrics.risk.length && <p className="pj-side-empty">Everything is on track.</p>}
                </div>
              </section>

              <section className="tw-card pj-side-card">
                <span className="tw-kicker">Health Mix</span>
                <h2>Distribution</h2>
                <div className="pj-health-bars">
                  {metrics.healthMix.map(({ health, count }) => (
                    <div className="pj-health-bar-row" key={health}>
                      <span>{human(health)}</span>
                      <strong>{count}</strong>
                      <i><em className={health} style={{ width: `${projects.length ? (count / projects.length) * 100 : 0}%` }} /></i>
                    </div>
                  ))}
                </div>
              </section>

              <section className="tw-card pj-side-card">
                <span className="tw-kicker">Recent Activity</span>
                <div className="pj-side-list">
                  {metrics.recent.map(project => (
                    <button className="pj-side-row" type="button" key={project.id || projectName(project)} onClick={() => navigate(`/projects/${project.id}`)}>
                      <ProjectAvatar project={project} size="sm" />
                      <span className="pj-side-row-text"><strong>{projectName(project)}</strong><span>{clientName(project)}</span></span>
                      <span className="pj-side-row-meta">{relativeTime(field(project, 'updated_at', 'start_date'))}</span>
                    </button>
                  ))}
                  {!metrics.recent.length && <p className="pj-side-empty">No recent project activity.</p>}
                </div>
              </section>
            </aside>
          </div>
        </div>

        {selected && (
          <div className="drawer-overlay pj-drawer-overlay" onClick={() => setSelected(null)}>
            <aside className="pj-drawer" onClick={event => event.stopPropagation()}>
              <div className={`pj-drawer-hero ${healthOf(selected)}`}>
                <ProjectAvatar project={selected} size="lg" />
                <div className="pj-drawer-identity">
                  <h3>{projectName(selected)}</h3>
                  <p>{clientName(selected)}</p>
                  <div><StatusPill value={statusOf(selected)} /><StatusPill value={priorityOf(selected)} type="priority" /></div>
                </div>
                <button className="pj-drawer-close" type="button" onClick={() => setSelected(null)}><X size={18} /></button>
              </div>
              <nav className="pj-drawer-tabs">
                {DRAWER_TABS.map(tab => (
                  <button className={`pj-drawer-tab ${drawerTab === tab ? 'is-active' : ''}`} type="button" key={tab} onClick={() => setDrawerTab(tab)}>
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
              <div className="pj-drawer-body">{renderDrawerTab()}</div>
              {canManage && (
                <footer className="pj-drawer-foot">
                  <button className="pj-add-btn" type="button" onClick={() => openEdit(selected)}>Edit project</button>
                </footer>
              )}
            </aside>
          </div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal pj-modal" onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <h3>{editing ? 'Edit Project' : 'Add Project'}</h3>
                <button className="drawer-close" type="button" onClick={() => setShowForm(false)}>x</button>
              </div>
              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-field"><label>Project name *</label><input className="dash-input" required value={form.project_name} onChange={event => setForm(current => ({ ...current, project_name: event.target.value }))} /></div>
                  <div className="form-field"><label>Client *</label><PillSelect value={String(form.client_id || '')} onChange={client_id => setForm(current => ({ ...current, client_id }))} ariaLabel="Choose client" options={[{value:'',label:'Choose client'},...clients.map(client=>({value:String(client.id),label:client.company||client.name}))]}/></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Type</label><PillSelect value={form.project_type} options={TYPES} onChange={project_type => setForm(current => ({ ...current, project_type }))} ariaLabel="Project type" /></div>
                  <div className="form-field"><label>Status</label><PillSelect value={form.status} options={STATUSES} onChange={status => setForm(current => ({ ...current, status }))} ariaLabel="Project status" /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Priority</label><PillSelect value={form.priority} options={PRIORITIES} onChange={priority => setForm(current => ({ ...current, priority }))} ariaLabel="Project priority" /></div>
                  <div className="form-field"><label>Progress</label><input className="dash-input" type="number" min="0" max="100" value={form.progress} onChange={event => setForm(current => ({ ...current, progress: event.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Start date</label><input className="dash-input" type="date" value={form.start_date || ''} onChange={event => setForm(current => ({ ...current, start_date: event.target.value }))} /></div>
                  <div className="form-field"><label>Due date</label><input className="dash-input" type="date" value={form.due_date || ''} onChange={event => setForm(current => ({ ...current, due_date: event.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>Project manager</label><PillSelect value={String(form.project_manager_id || '')} onChange={project_manager_id => setForm(current => ({ ...current, project_manager_id }))} ariaLabel="Choose project manager" options={[{value:'',label:'Unassigned'},...team.map(member=>({value:String(member.id),label:member.name}))]}/></div>
                  <div className="form-field"><label>Tech stack</label><input className="dash-input" value={form.tech_stack} onChange={event => setForm(current => ({ ...current, tech_stack: event.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-field"><label>GitHub repo</label><input className="dash-input" value={form.github_repo} onChange={event => setForm(current => ({ ...current, github_repo: event.target.value }))} /></div>
                  <div className="form-field"><label>Staging link</label><input className="dash-input" value={form.staging_link} onChange={event => setForm(current => ({ ...current, staging_link: event.target.value }))} /></div>
                </div>
                <div className="form-field"><label>Live link</label><input className="dash-input" value={form.live_link} onChange={event => setForm(current => ({ ...current, live_link: event.target.value }))} /></div>
                <div className="form-field"><label>Brief</label><textarea className="dash-input" rows={3} value={form.brief} onChange={event => setForm(current => ({ ...current, brief: event.target.value }))} /></div>
                <div className="form-field"><label>Notes</label><textarea className="dash-input" rows={3} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-primary" type="submit" disabled={submitting || !canManage}>{submitting ? 'Saving...' : 'Save Project'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashLayout>
    </RoleGuard>
  );
}
