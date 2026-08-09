import { useAuth } from '../context/AuthContext';
import { PAGE_ACCESS, canWrite } from '../config/roles';

export const ROLE_GROUPS = {
  owner: ['owner'],
  leadership: ['owner', 'admin'],
  delivery: ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager'],
  creative: ['designer', 'motion_designer', 'illustrator', 'copywriter', 'video_editor', 'frontend_developer', 'backend_developer', 'fullstack_developer', 'mobile_developer', 'devops', 'qa_engineer'],
  finance: ['owner', 'admin', 'finance'],
  hr: ['owner', 'admin', 'hr'],
  sales: ['owner', 'admin', 'sales', 'account_manager'],
  allStaff: ['owner', 'admin', 'head_of_delivery', 'head_of_design', 'head_of_development', 'project_manager', 'account_manager', 'designer', 'motion_designer', 'illustrator', 'copywriter', 'video_editor', 'frontend_developer', 'backend_developer', 'fullstack_developer', 'mobile_developer', 'devops', 'qa_engineer', 'sales', 'marketing_manager', 'finance', 'hr', 'support', 'viewer'],
};

const PERMISSION_GROUPS = {
  client_access: PAGE_ACCESS.clients,
  project_access: PAGE_ACCESS.projects,
  request_access: PAGE_ACCESS.requests,
  booking_access: PAGE_ACCESS.bookings,
  finance_access: PAGE_ACCESS.finance,
  people_access: PAGE_ACCESS.team,
  hr_access: PAGE_ACCESS.jobs,
  comms_access: PAGE_ACCESS.newsletter,
  sales_access: ROLE_GROUPS.sales,
  system_access: ROLE_GROUPS.allStaff,
  managers: ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager'],
  delivery_heads: ['owner', 'admin', 'head_of_delivery'],
  workers: PAGE_ACCESS.requests,
};

const expandRoles = (roles = []) => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return roleList.flatMap(r => ROLE_GROUPS[r] || PERMISSION_GROUPS[r] || [r]);
};

export const hasRole = (user, roles = []) => {
  if (!user) return false;
  const allowed = expandRoles(roles);
  return allowed.length === 0 || allowed.includes(user.role);
};

export default function RoleGuard({ children, roles = [], area, fallback = null }) {
  const { user } = useAuth();
  if (!user) return fallback;

  if (area) return canWrite(user.role, area) ? children : fallback;
  if (!hasRole(user, roles)) return fallback;
  return children;
}
