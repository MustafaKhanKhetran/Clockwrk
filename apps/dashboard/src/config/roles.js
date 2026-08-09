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
  'marketing_manager',
  'seo_specialist',
  'social_media_manager',
  'content_writer',
  'operations_manager',
  'finance',
  'hr',
  'legal',
  'executive_assistant',
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
  marketing_manager: 'Marketing Manager',
  seo_specialist: 'SEO Specialist',
  social_media_manager: 'Social Media Manager',
  content_writer: 'Content Writer',
  operations_manager: 'Operations Manager',
  finance: 'Finance',
  hr: 'HR',
  legal: 'Legal',
  executive_assistant: 'Executive Assistant',
  support: 'Support',
  sales: 'Sales',
  viewer: 'Viewer',
};

export const PAGE_ACCESS = {
  overview: ROLES,
  clients: ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager', 'finance', 'support', 'sales'],
  projects: ['owner', 'admin', 'head_of_delivery', 'head_of_design', 'head_of_development', 'project_manager', 'account_manager', 'designer', 'motion_designer', 'illustrator', 'copywriter', 'video_editor', 'frontend_developer', 'backend_developer', 'fullstack_developer', 'mobile_developer', 'devops', 'qa_engineer'],
  requests: ['owner', 'admin', 'head_of_delivery', 'head_of_design', 'head_of_development', 'project_manager', 'account_manager', 'designer', 'motion_designer', 'illustrator', 'copywriter', 'video_editor', 'frontend_developer', 'backend_developer', 'fullstack_developer', 'mobile_developer', 'devops', 'qa_engineer'],
  time: ['owner', 'admin', 'head_of_delivery', 'head_of_design', 'head_of_development', 'project_manager', 'account_manager', 'designer', 'motion_designer', 'illustrator', 'copywriter', 'video_editor', 'frontend_developer', 'backend_developer', 'fullstack_developer', 'mobile_developer', 'devops', 'qa_engineer'],
  team: ['owner', 'admin', 'head_of_delivery', 'project_manager', 'hr'],
  finance: ['owner', 'finance'],
  newsletter: ['owner', 'admin', 'project_manager', 'sales'],
  bookings: ['owner', 'admin', 'head_of_delivery', 'project_manager', 'account_manager', 'sales'],
  calendar: ROLES,
  referrals: ['owner', 'finance', 'sales'],
  jobs: ['owner', 'admin', 'hr'],
  alerts: ROLES,
  settings: ['owner'],
};

export const WRITE_ACCESS = {
  clients: ['owner', 'admin', 'project_manager', 'support', 'sales'],
  projects: ['owner', 'admin', 'head_of_delivery', 'project_manager'],
  requests: ROLES.filter(role => role !== 'viewer'),
  time: ROLES.filter(role => role !== 'viewer'),
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
