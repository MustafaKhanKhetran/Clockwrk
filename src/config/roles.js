export const ROLES = [
  'owner',
  'admin',
  'head_of_delivery',
  'head_of_design',
  'head_of_development',
  'project_manager',
  'account_manager',
  'designer',
  'motion_designer',
  'illustrator',
  'copywriter',
  'video_editor',
  'frontend_developer',
  'backend_developer',
  'fullstack_developer',
  'mobile_developer',
  'devops',
  'qa_engineer',
  'developer',
  'designer_dev',
  'marketing_manager',
  'finance',
  'hr',
  'support',
  'sales',
  'viewer',
];

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  head_of_delivery: 'Head of Delivery',
  head_of_design: 'Head of Design',
  head_of_development: 'Head of Development',
  project_manager: 'Project Manager',
  account_manager: 'Account Manager',
  designer: 'Designer',
  motion_designer: 'Motion Designer',
  illustrator: 'Illustrator',
  copywriter: 'Copywriter',
  video_editor: 'Video Editor',
  frontend_developer: 'Frontend Developer',
  backend_developer: 'Backend Developer',
  fullstack_developer: 'Fullstack Developer',
  mobile_developer: 'Mobile Developer',
  devops: 'DevOps',
  qa_engineer: 'QA Engineer',
  developer: 'Developer',
  designer_dev: 'Designer / Developer',
  marketing_manager: 'Marketing Manager',
  finance: 'Finance',
  hr: 'HR',
  support: 'Support',
  sales: 'Sales',
  viewer: 'Viewer',
};

export const PAGE_ACCESS = {
  overview: ROLES,
  clients: ['owner', 'admin', 'project_manager', 'account_manager', 'finance', 'support', 'sales', 'viewer'],
  projects: ['owner', 'admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'support', 'viewer'],
  requests: ['owner', 'admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'support', 'viewer'],
  time: ['owner', 'admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'finance', 'hr', 'viewer'],
  team: ['owner', 'admin', 'project_manager', 'finance', 'hr', 'viewer'],
  finance: ['owner', 'finance'],
  newsletter: ['owner', 'admin', 'project_manager', 'sales'],
  bookings: ['owner', 'admin', 'project_manager', 'support', 'sales'],
  calendar: ['owner', 'admin', 'project_manager', 'finance'],
  referrals: ['owner', 'finance', 'sales'],
  jobs: ['owner', 'admin', 'hr'],
  alerts: ['owner', 'admin'],
  settings: ['owner'],
};

export const WRITE_ACCESS = {
  clients: ['owner', 'admin', 'project_manager', 'support', 'sales'],
  projects: ['owner', 'admin', 'project_manager'],
  requests: ['owner', 'admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'support'],
  time: ['owner', 'admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'finance', 'hr'],
  team: ['owner', 'admin', 'hr'],
  jobs: ['owner', 'admin', 'hr'],
};

export const isReadOnlyRole = (role) => role === 'viewer';

export const canAccess = (role, page) => {
  if (!role) return false;
  if (role === 'owner') return true;
  return Boolean(PAGE_ACCESS[page]?.includes(role));
};

export const canWrite = (role, area) => {
  if (!role || isReadOnlyRole(role)) return false;
  if (role === 'owner') return true;
  return Boolean(WRITE_ACCESS[area]?.includes(role));
};
