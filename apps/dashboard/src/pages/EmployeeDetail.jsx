import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashLayout from '../components/DashLayout';
import {
  DetailPage,
  DetailSection,
  ErrorDetail,
  LoadingDetail,
  formatDate,
  humanize,
} from '../components/DetailPage';
import FormModal from '../components/FormModal';
import PillSelect from '../components/PillSelect';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { ROLES, ROLE_LABELS } from '../config/roles';
import { apiFetch, apiGet } from '../utils/dashboardApi';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const load = useCallback(() => {
    setError('');
    apiGet(`/api/team/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <DashLayout><ErrorDetail message={error} onRetry={load} /></DashLayout>;
  if (!data) return <DashLayout><LoadingDetail /></DashLayout>;

  const { employee, requests = [], time_logs: timeLogs = [] } = data;

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/api/team/${id}`, { method: 'PATCH', body: form });
      toast.success('Employee updated');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/team/${id}`, { method: 'PATCH', body: { status: 'inactive' } });
      toast.success('Employee deactivated');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createInvite = async () => {
    setBusy(true);
    try {
      const result = await apiFetch(`/api/team/${id}/invite`, { method: 'POST', body: { dashboard_base_url: window.location.origin } });
      setInviteUrl(result.invite_url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashLayout>
      <DetailPage
        eyebrow="Team member"
        title={employee.name}
        subtitle={`${ROLE_LABELS[employee.role] || humanize(employee.role)} · ${employee.email}`}
        meta={<><StatusBadge value={employee.status} /><span>{employee.department || 'No department'}</span><span>{employee.active_requests} active requests</span></>}
        actions={<><button className="btn btn-ghost" onClick={() => { setForm({ ...employee }); setEditing(true); }}>Edit employee</button>{employee.status === 'inactive' && <button className="btn btn-primary" disabled={busy} onClick={createInvite}>Create setup link</button>}{employee.status !== 'inactive' && <button className="btn btn-danger" disabled={busy} onClick={deactivate}>Deactivate</button>}</>}
      >
        <div className="detail-grid detail-grid-two">
          <DetailSection title="Profile">
            <dl className="definition-grid">
              <div><dt>Role</dt><dd>{ROLE_LABELS[employee.role]}</dd></div>
              <div><dt>Level</dt><dd>{humanize(employee.level)}</dd></div>
              <div><dt>Capacity</dt><dd>{employee.max_capacity || 0} requests</dd></div>
              <div><dt>Joined</dt><dd>{formatDate(employee.joined_date)}</dd></div>
              <div><dt>Phone</dt><dd>{employee.phone || 'Not set'}</dd></div>
              <div><dt>Last active</dt><dd>{formatDate(employee.last_seen_at)}</dd></div>
            </dl>
          </DetailSection>
          <DetailSection title="Recent time">
            {timeLogs.length ? <div className="simple-list">{timeLogs.map((entry) => <div key={entry.id}><strong>{Number(entry.hours)} hours · {entry.project_name || 'General'}</strong><p>{entry.description || entry.request_title}</p><small>{formatDate(entry.log_date)}</small></div>)}</div> : <p className="empty-copy">No time logged yet.</p>}
          </DetailSection>
        </div>
        <DetailSection title="Assigned work">
          {requests.length ? <div className="record-list">{requests.map((request) => <button key={request.id} onClick={() => navigate(`/requests/${request.id}`)}><span><strong>{request.title}</strong><small>{request.client_company} · {request.project_name}</small></span><StatusBadge value={request.status} /></button>)}</div> : <p className="empty-copy">No active assignments.</p>}
        </DetailSection>
        <FormModal
          open={editing}
          title="Edit team member"
          onClose={() => setEditing(false)}
          onSubmit={save}
          actions={<><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>Save employee</button></>}
        >
          <div className="form-row">
            <label className="form-field">Name<input className="dash-input" value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="form-field">Role<PillSelect value={form.role || ''} onChange={(role) => setForm({ ...form, role })} ariaLabel="Employee role" options={ROLES.map(role=>({value:role,label:ROLE_LABELS[role]}))}/></label>
          </div>
          <div className="form-row">
            <label className="form-field">Department<input className="dash-input" value={form.department || ''} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
            <label className="form-field">Capacity<input className="dash-input" type="number" value={form.max_capacity || ''} onChange={(event) => setForm({ ...form, max_capacity: event.target.value })} /></label>
          </div>
          <label className="form-field">Notes<textarea className="dash-input" rows="4" value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </FormModal>
        <FormModal open={Boolean(inviteUrl)} title="Employee setup link" subtitle="This replaces any older invite and expires after 72 hours." onClose={() => setInviteUrl('')} onSubmit={event => event.preventDefault()} actions={<><button type="button" className="btn btn-ghost" onClick={() => setInviteUrl('')}>Done</button><button type="button" className="btn btn-primary" onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => toast.success('Setup link copied'))}>Copy setup link</button></>}><div className="account-setup-flow"><span><b>1</b> Copy the link</span><span><b>2</b> Employee creates a private password</span><span><b>3</b> Their account activates</span></div><div className="secure-link-box"><code>{inviteUrl}</code></div></FormModal>
      </DetailPage>
    </DashLayout>
  );
}
