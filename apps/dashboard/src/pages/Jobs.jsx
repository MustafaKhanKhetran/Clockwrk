import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import DashLayout from '../components/DashLayout';
import PillSelect from '../components/PillSelect';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch, apiGet, apiPost } from '../utils/dashboardApi';

const API = '/api/hr';
const LISTINGS_API = '/api/hr/listings';
const APPLICATIONS_API = '/api/hr/applications';

const DEPARTMENTS = ['Design', 'Development', 'Marketing', 'Operations', 'HR', 'Sales', 'Other'];
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const JOB_TYPE_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};
const LOCATION_MODES = ['Remote', 'On-site', 'Hybrid'];
const LISTING_STATUSES = ['open', 'closed'];
const APPLICATION_STATUSES = ['new', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected'];

const EMPTY_LISTING = {
  title: '',
  department: 'Design',
  department_other: '',
  type: 'full-time',
  location_mode: 'Remote',
  location_city: '',
  status: 'open',
  description: '',
  requirements: '',
};

const field = (item, ...keys) => keys.map(key => item?.[key]).find(value => value !== undefined && value !== null && value !== '') || '';
const fmtDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const slug = (value) => String(value || '').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
const formatStatus = (value) => String(value || 'new')
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase());

const normalizeListings = (payload) => payload?.listings || payload?.jobs || payload?.job_listings || [];
const normalizeApplications = (payload) => [
  ...(payload?.job_applications || []),
  ...(payload?.internship_applications || []),
  ...(payload?.applications || []),
];
const getListingId = (listing) => field(listing, 'id', 'listing_id', 'job_id');
const getApplicationId = (application) => field(application, 'id', 'application_id');

const parseDepartment = (value) => {
  const department = String(value || '').trim();
  return DEPARTMENTS.includes(department)
    ? { department, department_other: '' }
    : { department: 'Other', department_other: department };
};

const parseLocation = (value) => {
  const location = String(value || 'Remote').trim();
  const match = LOCATION_MODES.find(mode => location.toLowerCase().startsWith(mode.toLowerCase()));
  if (!match) return location.toLowerCase() === 'remote' ? { location_mode: 'Remote', location_city: '' } : { location_mode: 'On-site', location_city: location };
  const city = location
    .slice(match.length)
    .replace(/^[\s·,-]+/, '')
    .trim();
  return { location_mode: match, location_city: city };
};

const composeListingPayload = (form, editing = false) => {
  const department = form.department === 'Other' ? String(form.department_other || '').trim() : form.department;
  const location = form.location_mode === 'Remote'
    ? 'Remote'
    : [form.location_mode, String(form.location_city || '').trim()].filter(Boolean).join(' · ');

  return {
    title: String(form.title || '').trim(),
    department,
    type: form.type,
    location,
    description: String(form.description || '').trim(),
    requirements: String(form.requirements || '').trim(),
    ...(editing ? { status: form.status } : {}),
  };
};

const validateListing = (form) => {
  const errors = {};
  const title = String(form.title || '').trim();
  const department = form.department === 'Other'
    ? String(form.department_other || '').trim()
    : String(form.department || '').trim();
  const location = form.location_mode === 'Remote'
    ? 'Remote'
    : String(form.location_city || '').trim();
  const description = String(form.description || '').trim();
  const requirements = String(form.requirements || '').trim();

  if (!title) errors.title = 'Title is required.';
  else if (title.length < 3) errors.title = 'Title must be at least 3 characters.';
  else if (title.length > 120) errors.title = 'Title must be 120 characters or less.';

  if (!department) errors.department = 'Department is required.';
  else if (department.length > 80) errors.department = 'Department must be 80 characters or less.';

  if (!DEPARTMENTS.includes(form.department)) errors.department = 'Choose a valid department.';
  if (!JOB_TYPES.includes(form.type)) errors.type = 'Choose a valid job type.';
  if (form.status && !LISTING_STATUSES.includes(form.status)) errors.status = 'Choose a valid listing status.';

  if (!LOCATION_MODES.includes(form.location_mode)) errors.location = 'Choose a valid location type.';
  else if (form.location_mode !== 'Remote' && !location) errors.location = 'City is required for on-site or hybrid roles.';
  else if (location.length > 120) errors.location = 'City must be 120 characters or less.';

  if (!description) errors.description = 'Description is required.';
  else if (description.length < 20) errors.description = 'Description must be at least 20 characters.';
  else if (description.length > 5000) errors.description = 'Description must be 5,000 characters or less.';

  if (!requirements) errors.requirements = 'Requirements are required.';
  else if (requirements.length < 10) errors.requirements = 'Requirements must be at least 10 characters.';
  else if (requirements.length > 5000) errors.requirements = 'Requirements must be 5,000 characters or less.';

  return errors;
};

const validateApplicationDraft = (draft) => {
  const errors = {};
  if (!APPLICATION_STATUSES.includes(draft.status)) errors.status = 'Choose a valid application status.';
  if (String(draft.notes || '').length > 3000) errors.notes = 'Notes must be 3,000 characters or less.';
  return errors;
};

const StatusBadge = ({ value, kind = 'application' }) => {
  const normalized = slug(value || (kind === 'listing' ? 'open' : 'new'));
  const isOpen = ['open', 'active'].includes(normalized);
  const tone = kind === 'listing'
    ? isOpen ? 'green' : 'grey'
    : {
        new: 'blue',
        reviewing: 'yellow',
        shortlisted: 'purple',
        interviewed: 'orange',
        offered: 'green',
        rejected: 'red',
      }[normalized] || 'grey';

  return <span className={`jobs-badge jobs-badge-${tone}`}>{formatStatus(value || (kind === 'listing' ? 'open' : 'new'))}</span>;
};

const SelectField = ({ value, onChange, options, label, allLabel }) => (
  <label className="jobs-select">
    {label && <span>{label}</span>}
    <PillSelect value={value} onChange={onChange} ariaLabel={label || allLabel} options={[...(allLabel ? [{ value: 'all', label: allLabel }] : []), ...options.map(option => typeof option === 'string' ? { value: option, label: option } : option)]} />
  </label>
);

export default function Jobs() {
  const { user } = useAuth();
  const canAccess = ['owner', 'admin', 'hr'].includes(user?.role);
  const canDeleteListing = user?.role === 'owner';
  const canDeleteApplication = ['owner', 'admin'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showListingModal, setShowListingModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [listingForm, setListingForm] = useState(EMPTY_LISTING);
  const [listingErrors, setListingErrors] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationDraft, setApplicationDraft] = useState({ status: 'new', notes: '' });
  const [applicationErrors, setApplicationErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState(null);
  const [openListingMenu, setOpenListingMenu] = useState(null);
  const [jobFilter, setJobFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadHr = () => {
    if (!canAccess) return;
    setLoading(true);
    setError('');
    apiGet(API)
      .then(payload => {
        setListings(normalizeListings(payload));
        setApplications(normalizeApplications(payload));
      })
      .catch(err => {
        setError(err.message || 'Failed to load HR data');
        toast.error('Failed to load HR data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  const listingApplicationCounts = useMemo(() => applications.reduce((acc, application) => {
    const listingId = field(application, 'listing_id', 'job_id');
    const title = field(application, 'job_title', 'role', 'job_applied');
    if (listingId) acc[listingId] = (acc[listingId] || 0) + 1;
    if (title) acc[title] = (acc[title] || 0) + 1;
    return acc;
  }, {}), [applications]);

  const stats = useMemo(() => ({
    activeListings: listings.filter(listing => !['closed', 'archived'].includes(slug(field(listing, 'status') || 'open'))).length,
    totalApplications: applications.length,
    newApplications: applications.filter(application => slug(field(application, 'status') || 'new') === 'new').length,
    shortlisted: applications.filter(application => slug(field(application, 'status')) === 'shortlisted').length,
  }), [applications, listings]);

  const jobFilterOptions = useMemo(() => listings.map(listing => ({
    value: String(getListingId(listing) || field(listing, 'title')),
    label: field(listing, 'title') || 'Untitled listing',
  })), [listings]);

  const filteredApplications = useMemo(() => applications.filter(application => {
    const appStatus = slug(field(application, 'status') || 'new');
    const listingId = String(field(application, 'listing_id', 'job_id') || '');
    const jobTitle = field(application, 'job_title', 'role', 'job_applied');
    const haystack = [
      field(application, 'name', 'applicant_name'),
      field(application, 'email'),
      field(application, 'phone'),
      jobTitle,
    ].join(' ').toLowerCase();

    if (jobFilter !== 'all' && listingId !== jobFilter && jobTitle !== jobFilter) return false;
    if (statusFilter !== 'all' && appStatus !== statusFilter) return false;
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return true;
  }), [applications, jobFilter, search, statusFilter]);

  const openNewListing = () => {
    setEditingListing(null);
    setListingForm({ ...EMPTY_LISTING });
    setListingErrors({});
    setShowListingModal(true);
  };

  const openEditListing = (listing) => {
    const departmentParts = parseDepartment(field(listing, 'department') || 'Design');
    const locationParts = parseLocation(field(listing, 'location') || 'Remote');
    setEditingListing(listing);
    setListingForm({
      title: field(listing, 'title'),
      ...departmentParts,
      type: field(listing, 'type') || 'full-time',
      ...locationParts,
      status: slug(field(listing, 'status') || 'open').replace(/_/g, '-'),
      description: field(listing, 'description'),
      requirements: field(listing, 'requirements'),
    });
    setListingErrors({});
    setOpenListingMenu(null);
    setShowListingModal(true);
  };

  const saveListing = async (event) => {
    event.preventDefault();
    const errors = validateListing(listingForm);
    setListingErrors(errors);
    if (Object.keys(errors).length) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    const payload = composeListingPayload(listingForm, Boolean(editingListing));
    setSaving(true);
    try {
      if (editingListing) {
        await apiFetch(`${LISTINGS_API}/${encodeURIComponent(getListingId(editingListing))}`, {
          method: 'PATCH',
          body: payload,
        });
        toast.success('Listing updated');
      } else {
        await apiPost(LISTINGS_API, payload);
        toast.success('Listing created');
      }
      setShowListingModal(false);
      loadHr();
    } catch (err) {
      toast.error(err.message || 'Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  const toggleListing = async (listing) => {
    setSaving(true);
    try {
      await apiFetch(`${LISTINGS_API}/${encodeURIComponent(getListingId(listing))}/toggle`, {
        method: 'PATCH',
        body: {},
      });
      setOpenListingMenu(null);
      loadHr();
      toast.success('Listing status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async (listing) => {
    const id = getListingId(listing);
    setSaving(true);
    try {
      await apiFetch(`${LISTINGS_API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setDeletingListingId(null);
      setOpenListingMenu(null);
      loadHr();
      toast.success('Listing deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete listing');
    } finally {
      setSaving(false);
    }
  };

  const openApplication = (application) => {
    setSelectedApplication(application);
    setApplicationDraft({
      status: slug(field(application, 'status') || 'new'),
      notes: field(application, 'notes', 'internal_notes'),
    });
    setApplicationErrors({});
  };

  const saveApplication = async () => {
    if (!selectedApplication) return;
    const errors = validateApplicationDraft(applicationDraft);
    setApplicationErrors(errors);
    if (Object.keys(errors).length) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`${APPLICATIONS_API}/${encodeURIComponent(getApplicationId(selectedApplication))}`, {
        method: 'PATCH',
        body: { ...applicationDraft, application_type: selectedApplication.application_type || 'job' },
      });
      setApplications(prev => prev.map(application => (
        getApplicationId(application) === getApplicationId(selectedApplication)
          ? { ...application, status: applicationDraft.status, notes: applicationDraft.notes }
          : application
      )));
      setSelectedApplication(prev => ({ ...prev, status: applicationDraft.status, notes: applicationDraft.notes }));
      toast.success('Application updated');
    } catch (err) {
      toast.error(err.message || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  const deleteApplication = async (application) => {
    const id = getApplicationId(application);
    setSaving(true);
    try {
      await apiFetch(`${APPLICATIONS_API}/${encodeURIComponent(id)}?type=${application.application_type || 'job'}`, { method: 'DELETE' });
      setApplications(prev => prev.filter(item => getApplicationId(item) !== id));
      setSelectedApplication(null);
      setDeletingApplicationId(null);
      toast.success('Application deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <DashLayout>
        <div className="empty-state"><p>Access Denied</p></div>
      </DashLayout>
    );
  }

  return (
    <DashLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h2>HR & Careers</h2>
          <p>{stats.activeListings} active listings · {stats.totalApplications} applications</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadHr} disabled={loading}>
            <RefreshCw size={18} strokeWidth={2} />
            Refresh
          </button>
          {activeTab === 'listings' && (
            <button type="button" className="btn btn-primary" onClick={openNewListing}>
              <Plus size={18} strokeWidth={2} />
              New Listing
            </button>
          )}
        </div>
      </div>

      {error && <div className="jobs-error">{error}</div>}

      <div className="jobs-summary">
        <div><span>Active Listings</span><strong>{stats.activeListings}</strong></div>
        <div><span>Total Applications</span><strong>{stats.totalApplications}</strong></div>
        <div><span>New</span><strong>{stats.newApplications}</strong></div>
        <div><span>Shortlisted</span><strong>{stats.shortlisted}</strong></div>
      </div>

      <div className="jobs-tabs">
        <button type="button" className={activeTab === 'listings' ? 'active' : ''} onClick={() => setActiveTab('listings')}>Job Listings</button>
        <button type="button" className={activeTab === 'applications' ? 'active' : ''} onClick={() => setActiveTab('applications')}>Applications</button>
      </div>

      {activeTab === 'listings' ? (
        <div className="jobs-listing-grid">
          {loading ? <div className="jobs-empty">Loading listings...</div> : listings.length ? listings.map(listing => {
            const listingId = getListingId(listing);
            const title = field(listing, 'title') || 'Untitled listing';
            const status = field(listing, 'status') || 'open';
            const count = field(listing, 'applicant_count', 'application_count') || listingApplicationCounts[listingId] || listingApplicationCounts[title] || 0;

            return (
              <article className="jobs-listing-card" key={listingId || title}>
                <div className="jobs-listing-head">
                  <div>
                    <h3>{title}</h3>
                    <p><Briefcase size={14} strokeWidth={2} /> {field(listing, 'department') || 'No department'}</p>
                  </div>
                  <StatusBadge value={status} kind="listing" />
                </div>
                <div className="jobs-listing-meta">
                  <span>{field(listing, 'type') || 'full-time'}</span>
                  <span><MapPin size={14} strokeWidth={2} /> {field(listing, 'location') || 'Remote'}</span>
                  <span>{count} applicants</span>
                  <span>{fmtDate(field(listing, 'created_at', 'created'))}</span>
                </div>
                <div className="jobs-listing-actions">
                  <div className="jobs-card-menu">
                    <button
                      type="button"
                      className="jobs-menu-trigger"
                      onClick={() => setOpenListingMenu(openListingMenu === listingId ? null : listingId)}
                      aria-label={`Actions for ${title}`}
                    >
                      <MoreVertical size={18} strokeWidth={2} />
                    </button>
                    {openListingMenu === listingId && (
                      <div className="jobs-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => openEditListing(listing)}>
                          <Pencil size={16} strokeWidth={2} />
                          Edit listing
                        </button>
                        <button type="button" role="menuitem" onClick={() => toggleListing(listing)} disabled={saving}>
                          <RefreshCw size={16} strokeWidth={2} />
                          {slug(status) === 'closed' ? 'Open listing' : 'Close listing'}
                        </button>
                        {canDeleteListing && (
                          deletingListingId === listingId ? (
                            <div className="jobs-menu-confirm">
                              <span>Delete this listing?</span>
                              <button type="button" onClick={() => deleteListing(listing)} disabled={saving}>Delete</button>
                              <button type="button" onClick={() => setDeletingListingId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button type="button" role="menuitem" className="danger" onClick={() => setDeletingListingId(listingId)}>
                              <Trash2 size={16} strokeWidth={2} />
                              Delete listing
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          }) : <div className="jobs-empty">No job listings yet</div>}
        </div>
      ) : (
        <>
          <div className="jobs-filter-bar">
            <label className="jobs-search">
              <Search size={16} strokeWidth={2} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search applications..." />
            </label>
            <SelectField value={jobFilter} onChange={setJobFilter} options={jobFilterOptions} allLabel="All listings" />
            <SelectField value={statusFilter} onChange={setStatusFilter} options={APPLICATION_STATUSES} allLabel="All statuses" />
          </div>

          <div className="jobs-table-card">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Job Applied</th>
                  <th>Experience</th>
                  <th>Portfolio</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="jobs-empty-cell">Loading applications...</td></tr>
                ) : filteredApplications.length ? filteredApplications.map(application => {
                  const appId = getApplicationId(application);
                  return (
                    <tr key={appId} onClick={() => openApplication(application)}>
                      <td>{field(application, 'full_name', 'name', 'applicant_name') || '-'}</td>
                      <td>{field(application, 'email') || '-'}</td>
                      <td>{field(application, 'phone') || '-'}</td>
                      <td>{field(application, 'job_title', 'role', 'job_applied') || '-'}</td>
                      <td>{field(application, 'experience_yrs', 'experience_years', 'experience') || '-'}</td>
                      <td onClick={event => event.stopPropagation()}>
                        {field(application, 'linkedin_url') ? (
                          <a className="jobs-icon-link" href={field(application, 'linkedin_url')} target="_blank" rel="noreferrer" aria-label="Open LinkedIn">
                            <ExternalLink size={16} strokeWidth={2} />
                          </a>
                        ) : '-'}
                      </td>
                      <td><StatusBadge value={field(application, 'status') || 'new'} /></td>
                      <td>{fmtDate(field(application, 'applied_at', 'created_at'))}</td>
                      <td onClick={event => event.stopPropagation()}>
                        <div className="jobs-table-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openApplication(application)}>View</button>
                          {canDeleteApplication && (
                            deletingApplicationId === appId ? (
                              <div className="jobs-inline-confirm">
                                <span>Delete?</span>
                                <button type="button" onClick={() => deleteApplication(application)} disabled={saving}>Delete</button>
                                <button type="button" onClick={() => setDeletingApplicationId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeletingApplicationId(appId)}>
                                <Trash2 size={16} strokeWidth={2} />
                                Delete
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="9" className="jobs-empty-cell">No applications found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showListingModal && (
        <div className="modal-overlay" onClick={() => setShowListingModal(false)}>
          <form className="modal jobs-modal" onSubmit={saveListing} onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingListing ? 'Edit Listing' : 'New Listing'}</h3>
              <button type="button" className="drawer-close" onClick={() => setShowListingModal(false)} aria-label="Close">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>Title *</span>
                <input
                  className={`dash-input ${listingErrors.title ? 'is-invalid' : ''}`}
                  required
                  maxLength={120}
                  value={listingForm.title}
                  onChange={event => {
                    setListingForm(prev => ({ ...prev, title: event.target.value }));
                    setListingErrors(prev => ({ ...prev, title: '' }));
                  }}
                />
                {listingErrors.title && <small className="jobs-field-error">{listingErrors.title}</small>}
              </label>
              <label className="form-field">
                <span>Department</span>
                <PillSelect
                  className={listingErrors.department ? 'is-invalid' : ''}
                  value={listingForm.department}
                  options={DEPARTMENTS}
                  ariaLabel="Department"
                  onChange={department => {
                    setListingForm(prev => ({ ...prev, department, department_other: department === 'Other' ? prev.department_other : '' }));
                    setListingErrors(prev => ({ ...prev, department: '' }));
                  }}
                />
                {listingForm.department === 'Other' && (
                  <input
                    className={`dash-input ${listingErrors.department ? 'is-invalid' : ''}`}
                    maxLength={80}
                    placeholder="Department name"
                    value={listingForm.department_other}
                    onChange={event => {
                      setListingForm(prev => ({ ...prev, department_other: event.target.value }));
                      setListingErrors(prev => ({ ...prev, department: '' }));
                    }}
                  />
                )}
                {listingErrors.department && <small className="jobs-field-error">{listingErrors.department}</small>}
              </label>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>Type</span>
                <PillSelect
                  className={listingErrors.type ? 'is-invalid' : ''}
                  value={listingForm.type}
                  options={JOB_TYPES.map(type=>({value:type,label:JOB_TYPE_LABELS[type]}))}
                  ariaLabel="Job type"
                  onChange={type => {
                    setListingForm(prev => ({ ...prev, type }));
                    setListingErrors(prev => ({ ...prev, type: '' }));
                  }}
                />
                {listingErrors.type && <small className="jobs-field-error">{listingErrors.type}</small>}
              </label>
              <label className="form-field">
                <span>Location</span>
                <PillSelect
                  className={listingErrors.location ? 'is-invalid' : ''}
                  value={listingForm.location_mode}
                  options={LOCATION_MODES}
                  ariaLabel="Location mode"
                  onChange={location_mode => {
                    setListingForm(prev => ({ ...prev, location_mode, location_city: location_mode === 'Remote' ? '' : prev.location_city }));
                    setListingErrors(prev => ({ ...prev, location: '' }));
                  }}
                />
                {listingForm.location_mode !== 'Remote' && (
                  <input
                    className={`dash-input ${listingErrors.location ? 'is-invalid' : ''}`}
                    maxLength={120}
                    placeholder="City"
                    value={listingForm.location_city}
                    onChange={event => {
                      setListingForm(prev => ({ ...prev, location_city: event.target.value }));
                      setListingErrors(prev => ({ ...prev, location: '' }));
                    }}
                  />
                )}
                {listingErrors.location && <small className="jobs-field-error">{listingErrors.location}</small>}
              </label>
            </div>
            {editingListing && (
              <label className="form-field">
                <span>Status</span>
                <PillSelect
                  className={listingErrors.status ? 'is-invalid' : ''}
                  value={listingForm.status}
                  options={LISTING_STATUSES}
                  ariaLabel="Listing status"
                  onChange={status => {
                    setListingForm(prev => ({ ...prev, status }));
                    setListingErrors(prev => ({ ...prev, status: '' }));
                  }}
                />
                {listingErrors.status && <small className="jobs-field-error">{listingErrors.status}</small>}
              </label>
            )}
            <label className="form-field">
              <span>Description</span>
              <textarea
                className={`dash-input ${listingErrors.description ? 'is-invalid' : ''}`}
                rows={5}
                maxLength={5000}
                value={listingForm.description}
                onChange={event => {
                  setListingForm(prev => ({ ...prev, description: event.target.value }));
                  setListingErrors(prev => ({ ...prev, description: '' }));
                }}
              />
              {listingErrors.description && <small className="jobs-field-error">{listingErrors.description}</small>}
            </label>
            <label className="form-field">
              <span>Requirements</span>
              <textarea
                className={`dash-input ${listingErrors.requirements ? 'is-invalid' : ''}`}
                rows={5}
                maxLength={5000}
                value={listingForm.requirements}
                onChange={event => {
                  setListingForm(prev => ({ ...prev, requirements: event.target.value }));
                  setListingErrors(prev => ({ ...prev, requirements: '' }));
                }}
              />
              {listingErrors.requirements && <small className="jobs-field-error">{listingErrors.requirements}</small>}
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowListingModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} strokeWidth={2} />
                {saving ? 'Saving...' : 'Save Listing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedApplication && (
        <div className="jobs-drawer-overlay" onClick={() => setSelectedApplication(null)}>
          <aside className="jobs-drawer" onClick={event => event.stopPropagation()}>
            <div className="jobs-drawer-head">
              <div>
                <h3>{field(selectedApplication, 'name', 'applicant_name') || 'Application'}</h3>
                <p>{field(selectedApplication, 'job_title', 'role', 'job_applied') || 'No job listed'}</p>
              </div>
              <button type="button" className="drawer-close" onClick={() => setSelectedApplication(null)} aria-label="Close">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="jobs-drawer-body">
              {/* ── Contact ── */}
              <div className="jobs-drawer-section-title"><span>Contact Info</span></div>
              <div className="jobs-detail-grid">
                <div><User size={16} strokeWidth={2} /><span>Name</span><strong>{field(selectedApplication, 'full_name', 'name', 'applicant_name') || '-'}</strong></div>
                <div><Mail size={16} strokeWidth={2} /><span>Email</span><strong>{field(selectedApplication, 'email') || '-'}</strong></div>
                <div><Phone size={16} strokeWidth={2} /><span>Phone</span><strong>{field(selectedApplication, 'phone') || '-'}</strong></div>
                {field(selectedApplication, 'location') && (
                  <div><MapPin size={16} strokeWidth={2} /><span>Location</span><strong>{field(selectedApplication, 'location')}</strong></div>
                )}
              </div>

              {/* ── Role & Experience (job only) ── */}
              {selectedApplication.application_type !== 'internship' && (
                <>
                  <div className="jobs-drawer-section-title"><span>Role & Experience</span></div>
                  <div className="jobs-detail-grid">
                    <div><Briefcase size={16} strokeWidth={2} /><span>Role</span><strong>{field(selectedApplication, 'job_title', 'role', 'job_applied') || '-'}</strong></div>
                    {field(selectedApplication, 'availability_type') && <div><Briefcase size={16} strokeWidth={2} /><span>Availability</span><strong>{selectedApplication.availability_type}</strong></div>}
                    {field(selectedApplication, 'experience_yrs') && <div><Briefcase size={16} strokeWidth={2} /><span>Experience</span><strong>{selectedApplication.experience_yrs} yrs</strong></div>}
                    {field(selectedApplication, 'seniority_level') && <div><Briefcase size={16} strokeWidth={2} /><span>Seniority</span><strong>{selectedApplication.seniority_level}</strong></div>}
                    {field(selectedApplication, 'current_role') && <div><Briefcase size={16} strokeWidth={2} /><span>Current Role</span><strong>{selectedApplication.current_role}</strong></div>}
                    {field(selectedApplication, 'remote_experience') && <div><Briefcase size={16} strokeWidth={2} /><span>Remote Exp.</span><strong>{selectedApplication.remote_experience}</strong></div>}
                    {field(selectedApplication, 'has_shipped_work') && <div><Briefcase size={16} strokeWidth={2} /><span>Shipped Work</span><strong>{selectedApplication.has_shipped_work}</strong></div>}
                    {field(selectedApplication, 'availability_start') && <div><FileText size={16} strokeWidth={2} /><span>Start Date</span><strong>{fmtDate(selectedApplication.availability_start)}</strong></div>}
                    <div><FileText size={16} strokeWidth={2} /><span>Applied</span><strong>{fmtDate(field(selectedApplication, 'applied_at', 'created_at'))}</strong></div>
                  </div>
                </>
              )}

              {/* ── Internship background ── */}
              {selectedApplication.application_type === 'internship' && (
                <>
                  <div className="jobs-drawer-section-title"><span>Background</span></div>
                  <div className="jobs-detail-grid">
                    <div><Briefcase size={16} strokeWidth={2} /><span>Role</span><strong>{field(selectedApplication, 'job_title') || 'Internship'}</strong></div>
                    {field(selectedApplication, 'area_of_interest') && <div><Briefcase size={16} strokeWidth={2} /><span>Area of Interest</span><strong>{selectedApplication.area_of_interest}</strong></div>}
                    {field(selectedApplication, 'university') && <div><Briefcase size={16} strokeWidth={2} /><span>University</span><strong>{selectedApplication.university}</strong></div>}
                    {field(selectedApplication, 'program') && <div><Briefcase size={16} strokeWidth={2} /><span>Program</span><strong>{selectedApplication.program}</strong></div>}
                    {field(selectedApplication, 'enrollment_status') && <div><Briefcase size={16} strokeWidth={2} /><span>Enrollment</span><strong>{selectedApplication.enrollment_status}</strong></div>}
                    {field(selectedApplication, 'year_of_study') && <div><Briefcase size={16} strokeWidth={2} /><span>Year of Study</span><strong>{selectedApplication.year_of_study}</strong></div>}
                    {field(selectedApplication, 'graduation_year') && <div><Briefcase size={16} strokeWidth={2} /><span>Graduation Year</span><strong>{selectedApplication.graduation_year}</strong></div>}
                    {field(selectedApplication, 'availability_start') && <div><FileText size={16} strokeWidth={2} /><span>Available From</span><strong>{fmtDate(selectedApplication.availability_start)}</strong></div>}
                    {field(selectedApplication, 'availability_duration') && <div><FileText size={16} strokeWidth={2} /><span>Duration</span><strong>{selectedApplication.availability_duration}</strong></div>}
                    {field(selectedApplication, 'hours_per_week') && <div><FileText size={16} strokeWidth={2} /><span>Hrs / Week</span><strong>{selectedApplication.hours_per_week}</strong></div>}
                    <div><FileText size={16} strokeWidth={2} /><span>Applied</span><strong>{fmtDate(field(selectedApplication, 'applied_at', 'created_at'))}</strong></div>
                  </div>
                </>
              )}

              {/* ── Links ── */}
              <div className="jobs-link-stack">
                {field(selectedApplication, 'linkedin_url') && (
                  <a href={selectedApplication.linkedin_url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} strokeWidth={2} />LinkedIn
                  </a>
                )}
                {field(selectedApplication, 'resume_url') && (
                  <a href={selectedApplication.resume_url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} strokeWidth={2} />Resume / CV
                  </a>
                )}
                {field(selectedApplication, 'additional_links') &&
                  selectedApplication.additional_links
                    .split('\n')
                    .map(url => url.trim())
                    .filter(url => url.length > 0)
                    .map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} strokeWidth={2} />{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    ))
                }
              </div>

              {/* ── Written answers ── */}
              {(field(selectedApplication, 'why_clockwrk') || field(selectedApplication, 'best_work_description') || field(selectedApplication, 'hardest_part') || field(selectedApplication, 'strongest_skill') || field(selectedApplication, 'improvement_area') || field(selectedApplication, 'work_style') || field(selectedApplication, 'extra_note')) && (
                <>
                  <div className="jobs-drawer-section-title"><span>Written Answers</span></div>
                  {field(selectedApplication, 'why_clockwrk') && (
                    <div className="jobs-drawer-section"><span>Why Clockwrk</span><p>{selectedApplication.why_clockwrk}</p></div>
                  )}
                  {field(selectedApplication, 'best_work_description') && (
                    <div className="jobs-drawer-section"><span>Best Work</span><p>{selectedApplication.best_work_description}</p></div>
                  )}
                  {field(selectedApplication, 'hardest_part') && (
                    <div className="jobs-drawer-section"><span>Hardest Part</span><p>{selectedApplication.hardest_part}</p></div>
                  )}
                  {field(selectedApplication, 'strongest_skill') && (
                    <div className="jobs-drawer-section"><span>Strongest Skill</span><p>{selectedApplication.strongest_skill}</p></div>
                  )}
                  {field(selectedApplication, 'improvement_area') && (
                    <div className="jobs-drawer-section"><span>Improving On</span><p>{selectedApplication.improvement_area}</p></div>
                  )}
                  {field(selectedApplication, 'work_style') && (
                    <div className="jobs-drawer-section"><span>Work Style</span><p>{selectedApplication.work_style}</p></div>
                  )}
                  {field(selectedApplication, 'extra_note') && (
                    <div className="jobs-drawer-section"><span>Extra Note</span><p>{selectedApplication.extra_note}</p></div>
                  )}
                  {field(selectedApplication, 'skills') && (
                    <div className="jobs-drawer-section"><span>Skills</span><p>{selectedApplication.skills}</p></div>
                  )}
                </>
              )}

              <div className="jobs-drawer-section-title">
                <span>Internal Notes</span>
              </div>
              <label className="form-field">
                <span>Status</span>
                <div className={`jobs-status-select jobs-status-select-${applicationDraft.status} ${applicationErrors.status ? 'is-invalid' : ''}`}>
                  <PillSelect
                    value={applicationDraft.status}
                    options={APPLICATION_STATUSES}
                    ariaLabel="Application status"
                    onChange={status => {
                      setApplicationDraft(prev => ({ ...prev, status }));
                      setApplicationErrors(prev => ({ ...prev, status: '' }));
                    }}
                  />
                </div>
                {applicationErrors.status && <small className="jobs-field-error">{applicationErrors.status}</small>}
              </label>

              <label className="form-field">
                <span>Notes</span>
                <textarea
                  className={`dash-input jobs-notes-textarea ${applicationErrors.notes ? 'is-invalid' : ''}`}
                  rows={5}
                  maxLength={3000}
                  value={applicationDraft.notes}
                  onChange={event => {
                    setApplicationDraft(prev => ({ ...prev, notes: event.target.value }));
                    setApplicationErrors(prev => ({ ...prev, notes: '' }));
                  }}
                />
                <small className={applicationErrors.notes ? 'jobs-field-error' : 'jobs-field-help'}>
                  {applicationErrors.notes || `${String(applicationDraft.notes || '').length}/3000 characters`}
                </small>
              </label>

              <div className="jobs-drawer-actions">
                <button type="button" className="btn btn-primary" onClick={saveApplication} disabled={saving}>
                  <Save size={18} strokeWidth={2} />
                  Save changes
                </button>
                {canDeleteApplication && (
                  deletingApplicationId === getApplicationId(selectedApplication) ? (
                    <div className="jobs-inline-confirm">
                      <span>Delete?</span>
                      <button type="button" onClick={() => deleteApplication(selectedApplication)} disabled={saving}>Delete</button>
                      <button type="button" onClick={() => setDeletingApplicationId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-danger" onClick={() => setDeletingApplicationId(getApplicationId(selectedApplication))}>
                      <Trash2 size={18} strokeWidth={2} />
                      Delete
                    </button>
                  )
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .jobs-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .jobs-summary > div {
          min-height: 84px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 20px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--bg-2);
        }

        .jobs-summary span {
          color: var(--text-3);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .jobs-summary strong {
          color: var(--text-1);
          font-size: 30px;
          font-weight: 800;
          line-height: 1;
        }

        .jobs-tabs {
          display: inline-flex;
          gap: 3px;
          padding: 4px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          background: var(--bg-3);
          box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-1) 8%, transparent);
        }

        .jobs-tabs button {
          min-height: 40px;
          padding: 10px 18px;
          border: 0;
          border-radius: var(--pill);
          color: var(--text-2);
          background: transparent;
          font-weight: 750;
          cursor: pointer;
          transition: background 220ms var(--ease), color 220ms var(--ease), transform 220ms var(--ease);
        }

        .jobs-tabs button:hover {
          color: var(--text-1);
          background: color-mix(in srgb, var(--text-1) 7%, transparent);
        }

        .jobs-tabs button.active {
          color: #101012;
          background: var(--accent);
          transform: translateY(-1px);
        }

        .jobs-listing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 14px;
        }

        .jobs-listing-card,
        .jobs-table-card {
          border: 1px solid var(--border);
          border-radius: 22px;
          background: var(--bg-2);
        }

        .jobs-listing-card {
          display: grid;
          gap: 18px;
          padding: 18px;
          transition: transform 180ms ease, border-color 180ms ease;
        }

        .jobs-listing-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-2);
        }

        .jobs-listing-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .jobs-listing-head h3 {
          margin: 0 0 6px;
          color: var(--text-1);
          font-size: 20px;
        }

        .jobs-listing-head p,
        .jobs-listing-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          color: var(--text-3);
          font-size: 13px;
        }

        .jobs-listing-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .jobs-listing-meta span {
          min-height: 28px;
          padding: 4px 10px;
          border-radius: var(--pill);
          background: var(--bg-3);
        }

        .jobs-listing-actions,
        .jobs-drawer-actions,
        .jobs-table-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .jobs-listing-actions {
          justify-content: flex-end;
        }

        .jobs-card-menu {
          position: relative;
        }

        .jobs-menu-trigger {
          width: 40px;
          height: 40px;
          display: inline-grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--text-1);
          background: var(--bg-3);
          cursor: pointer;
          transition: transform 220ms var(--ease), border-color 220ms var(--ease), background 220ms var(--ease);
        }

        .jobs-menu-trigger:hover {
          transform: translateY(-1px);
          border-color: var(--border-2);
          background: color-mix(in srgb, var(--accent) 14%, var(--bg-3));
        }

        .jobs-menu {
          position: absolute;
          right: 0;
          bottom: calc(100% + 8px);
          z-index: 80;
          min-width: 220px;
          display: grid;
          gap: 6px;
          padding: 10px;
          border: 1px solid color-mix(in srgb, var(--text-1) 18%, var(--border));
          border-radius: 22px;
          background: color-mix(in srgb, var(--bg-2) 96%, #101012);
          box-shadow: 0 28px 80px rgba(0,0,0,.5);
          animation: jobs-menu-in 180ms var(--ease) both;
        }

        .jobs-menu button,
        .jobs-menu-confirm button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 13px;
          border: 0;
          border-radius: 15px;
          color: var(--text-1);
          background: transparent;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          text-align: left;
        }

        .jobs-menu button:hover {
          background: var(--bg-3);
        }

        .jobs-menu button.danger {
          color: var(--red);
        }

        .jobs-menu-confirm {
          display: grid;
          gap: 6px;
          padding: 10px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--red) 12%, var(--bg-3));
        }

        .jobs-menu-confirm span {
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
        }

        .jobs-menu-confirm button:first-of-type {
          color: var(--red);
          background: color-mix(in srgb, var(--red) 12%, transparent);
        }

        .jobs-badge {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 5px 10px;
          border-radius: var(--pill);
          color: var(--text-1);
          background: var(--bg-3);
          font-size: 12px;
          font-weight: 800;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .jobs-badge-green { color: #101012; background: var(--accent); }
        .jobs-badge-grey { color: var(--text-3); background: var(--bg-3); }
        .jobs-badge-blue { color: var(--text-1); background: color-mix(in srgb, var(--blue) 35%, var(--bg-3)); }
        .jobs-badge-yellow { color: #101012; background: var(--yellow); }
        .jobs-badge-purple { color: var(--text-1); background: color-mix(in srgb, #a78bfa 52%, var(--bg-3)); }
        .jobs-badge-orange { color: #101012; background: #ffb454; }
        .jobs-badge-red { color: var(--text-1); background: color-mix(in srgb, var(--red) 58%, var(--bg-3)); }

        .jobs-page-actions .btn,
        .page-header-actions .btn,
        .jobs-table-actions .btn,
        .jobs-drawer-actions .btn,
        .jobs-modal .btn {
          min-height: 40px;
          padding: 10px 18px;
        }

        .jobs-filter-bar {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) minmax(180px, 260px) minmax(180px, 240px);
          gap: 10px;
          margin-bottom: 14px;
        }

        .jobs-search,
        .jobs-select {
          position: relative;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          color: var(--text-3);
          background: var(--bg-2);
        }

        .jobs-search input,
        .jobs-select select {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: var(--text-1);
          background: transparent;
          font: inherit;
          appearance: none;
        }

        .jobs-select > svg {
          pointer-events: none;
        }

        .jobs-table-card {
          overflow: auto;
        }

        .jobs-table {
          width: 100%;
          min-width: 1040px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .jobs-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          padding: 13px 14px;
          border-bottom: 1px solid var(--border);
          color: var(--text-3);
          background: var(--bg-2);
          font-size: 11px;
          font-weight: 800;
          text-align: left;
          text-transform: uppercase;
        }

        .jobs-table td {
          padding: 13px 14px;
          border-bottom: 1px solid var(--border);
          color: var(--text-2);
          font-size: 13px;
        }

        .jobs-table tbody tr {
          cursor: pointer;
        }

        .jobs-table tbody tr:nth-child(even) td {
          background: color-mix(in srgb, var(--bg-2) 72%, transparent);
        }

        .jobs-table tbody tr:hover td {
          background: var(--bg-3);
        }

        .jobs-table-actions {
          min-width: 180px;
        }

        .jobs-icon-link {
          color: var(--accent);
        }

        .jobs-empty,
        .jobs-empty-cell {
          min-height: 180px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 22px;
          color: var(--text-3);
          background: var(--bg-2);
        }

        .jobs-empty-cell {
          display: table-cell;
          height: 180px;
          text-align: center;
          vertical-align: middle;
          border: 0;
        }

        .jobs-error {
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid color-mix(in srgb, var(--red) 35%, transparent);
          border-radius: 14px;
          color: var(--red);
          background: color-mix(in srgb, var(--red) 10%, transparent);
          font-size: 13px;
        }

        .jobs-field-error,
        .jobs-field-help {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.35;
        }

        .jobs-field-error {
          color: var(--red);
        }

        .jobs-field-help {
          color: var(--text-3);
        }

        .dash-input.is-invalid {
          border-color: var(--red) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 14%, transparent);
        }

        .jobs-inline-confirm {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 32px;
          padding: 4px 8px;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          color: var(--text-2);
          background: var(--bg-3);
          font-size: 12px;
        }

        .jobs-inline-confirm button {
          border: 0;
          color: var(--text-1);
          background: transparent;
          font-weight: 800;
          cursor: pointer;
        }

        .jobs-inline-confirm button:first-of-type {
          color: var(--red);
        }

        .jobs-modal {
          width: min(960px, calc(100vw - 32px));
          max-height: min(900px, calc(100vh - 56px));
          overflow: auto;
          border: 1px solid color-mix(in srgb, var(--text-1) 16%, var(--border));
          border-radius: 30px;
          background: color-mix(in srgb, var(--bg-2) 97%, #101012);
          box-shadow: 0 36px 120px rgba(0,0,0,.6);
        }

        .modal-overlay:has(.jobs-modal) {
          background: rgba(0,0,0,.78);
          backdrop-filter: blur(18px) saturate(1.05);
        }

        .jobs-modal .modal-header {
          padding: 28px 32px 22px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-2) 92%, #101012);
        }

        .jobs-modal .modal-header h3 {
          color: var(--text-1);
          font-size: 28px;
          font-weight: 850;
          letter-spacing: 0;
        }

        .jobs-modal .drawer-close {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--bg-3);
        }

        .jobs-modal .form-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          padding: 0 32px;
          margin: 0 0 22px;
        }

        .jobs-modal .form-field {
          display: grid;
          gap: 10px;
          align-items: start;
          padding: 0 32px;
          margin-bottom: 22px;
        }

        .jobs-modal .form-row .form-field {
          padding: 0;
          margin-bottom: 0;
        }

        .jobs-modal .form-field > span,
        .jobs-drawer .form-field > span {
          color: var(--text-2);
          font-size: 12px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .jobs-modal .dash-input {
          width: 100%;
          min-height: 56px;
          border: 1px solid color-mix(in srgb, var(--text-1) 12%, var(--border));
          border-radius: var(--pill);
          padding: 0 18px;
          color: #101012;
          background: #f7f7f6;
          font-size: 15px;
          font-weight: 650;
          line-height: 1.25;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.75);
          transition: border-color 220ms var(--ease), box-shadow 220ms var(--ease), transform 220ms var(--ease);
        }

        .jobs-modal .dash-input:hover {
          border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
        }

        .jobs-modal .dash-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent);
          outline: none;
        }

        .jobs-modal textarea.dash-input {
          min-height: 136px;
          padding: 18px;
          border-radius: 26px;
          resize: vertical;
        }

        .jobs-modal .dash-input.is-invalid {
          border-color: var(--red) !important;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--red) 18%, transparent);
        }

        .jobs-modal select.dash-input,
        .jobs-drawer select {
          cursor: pointer;
        }

        .jobs-modal .modal-actions {
          position: sticky;
          bottom: 0;
          z-index: 2;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px 32px;
          border-top: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-2) 98%, #101012);
        }

        .jobs-drawer-overlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          justify-content: flex-end;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(10px);
        }

        .jobs-drawer {
          width: min(520px, 100vw);
          height: 100%;
          overflow-y: auto;
          border-left: 1px solid var(--border);
          background: var(--bg-2);
          box-shadow: -24px 0 80px rgba(0,0,0,.32);
          animation: jobs-drawer-in 360ms var(--ease) both;
        }

        .jobs-drawer-head {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 22px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-2);
        }

        .jobs-drawer-head h3 {
          margin: 0;
          color: var(--text-1);
          font-size: 24px;
        }

        .jobs-drawer-head p {
          margin-top: 4px;
          color: var(--text-3);
          font-size: 13px;
        }

        .jobs-drawer-body {
          display: grid;
          gap: 18px;
          padding: 18px 22px 26px;
        }

        .jobs-drawer .form-field {
          display: grid;
          gap: 8px;
        }

        .jobs-drawer-section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-1);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .02em;
        }

        .jobs-drawer-section-title::after {
          content: '';
          height: 1px;
          flex: 1;
          background: var(--border);
        }

        .jobs-detail-grid {
          display: grid;
          gap: 10px;
        }

        .jobs-detail-grid div {
          display: grid;
          grid-template-columns: auto 90px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg-3);
        }

        .jobs-detail-grid span,
        .jobs-drawer-section span {
          color: var(--text-3);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .jobs-detail-grid strong {
          overflow: hidden;
          color: var(--text-1);
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .jobs-link-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .jobs-link-stack a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          padding: 7px 12px;
          border-radius: var(--pill);
          color: #101012;
          background: var(--accent);
          font-weight: 800;
          font-size: 12px;
        }

        .jobs-drawer-section {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg-3);
        }

        .jobs-drawer-section p {
          margin: 0;
          color: var(--text-2);
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .jobs-status-select {
          position: relative;
          width: 100%;
          min-height: 46px;
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: var(--pill);
          background: var(--bg-3);
          overflow: hidden;
        }

        .jobs-status-select select {
          width: 100%;
          min-height: 46px;
          padding: 0 44px 0 16px;
          border: 0;
          outline: 0;
          color: var(--text-1);
          background: transparent;
          appearance: none;
          font: inherit;
          font-weight: 800;
          text-transform: capitalize;
        }

        .jobs-status-select svg {
          position: absolute;
          right: 16px;
          pointer-events: none;
          color: var(--text-2);
        }

        .jobs-status-select-new { border-color: color-mix(in srgb, var(--blue) 42%, var(--border)); background: color-mix(in srgb, var(--blue) 14%, var(--bg-3)); }
        .jobs-status-select-reviewing { border-color: color-mix(in srgb, var(--yellow) 42%, var(--border)); background: color-mix(in srgb, var(--yellow) 16%, var(--bg-3)); }
        .jobs-status-select-shortlisted { border-color: color-mix(in srgb, #a78bfa 48%, var(--border)); background: color-mix(in srgb, #a78bfa 18%, var(--bg-3)); }
        .jobs-status-select-interviewed { border-color: color-mix(in srgb, #ffb454 48%, var(--border)); background: color-mix(in srgb, #ffb454 18%, var(--bg-3)); }
        .jobs-status-select-offered { border-color: color-mix(in srgb, var(--accent) 48%, var(--border)); background: color-mix(in srgb, var(--accent) 16%, var(--bg-3)); }
        .jobs-status-select-rejected { border-color: color-mix(in srgb, var(--red) 48%, var(--border)); background: color-mix(in srgb, var(--red) 14%, var(--bg-3)); }

        .jobs-status-select.is-invalid {
          border-color: var(--red);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 14%, transparent);
        }

        .jobs-option-new { color: var(--blue); }
        .jobs-option-reviewing { color: #9a6a00; }
        .jobs-option-shortlisted { color: #7c3aed; }
        .jobs-option-interviewed { color: #b45309; }
        .jobs-option-offered { color: #15803d; }
        .jobs-option-rejected { color: var(--red); }

        .jobs-notes-textarea {
          min-height: 100px;
          resize: vertical;
        }

        @keyframes jobs-drawer-in {
          from { transform: translateX(28px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes jobs-menu-in {
          from { transform: translateY(6px) scale(.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        @media (max-width: 920px) {
          .jobs-summary,
          .jobs-filter-bar {
            grid-template-columns: 1fr;
          }

          .jobs-modal .form-row {
            grid-template-columns: 1fr;
          }

          .jobs-modal .form-row,
          .jobs-modal .form-field,
          .jobs-modal .modal-header,
          .jobs-modal .modal-actions {
            padding-left: 22px;
            padding-right: 22px;
          }
        }
      `}</style>
    </DashLayout>
  );
}
