// Mock data layer — swap for real /api/client calls when wiring backend.
// Shapes intentionally mirror clockwrk-api responses.

export const me = {
  name: 'Sardar Khan',
  company: 'M94 Group',
  email: 'mustayy8@gmail.com',
  plan: 'Business',
  slots: 2,
  extraSlots: 0,
  paused: false,
  renewsAt: 'Jul 18',
  memberSince: 'Mar 2026',
};

export const SERVICES = {
  Development: ['Web App', 'Website', 'SaaS', 'E-commerce', 'Mobile App', 'MVP', 'API & Integrations', 'Extension', 'Backend & DB', 'DevOps', 'CMS', 'Bug Fixes'],
  Design: ['MVP', 'Website', 'Landing Page', 'E-commerce', 'Mobile App', 'SaaS', 'Extension', 'UI Design', 'UX Design'],
  Branding: ['Logo', 'Brand Identity', 'Design System', 'Illustrations', 'Mockups', 'Icon Set'],
  Presence: ['Pitch Deck', 'Slide Deck', 'Ad Creatives', 'Email Templates', 'Infographic', 'Social Graphics', 'Brochure', 'Business Card'],
  'Outdoor & Print': ['Packaging', 'Stationery', 'Billboard', 'Event Banner', 'Resume'],
};

export const SVC_EMOJI = {
  Development: '⚡', Design: '🎨', Branding: '✦', Presence: '📣', 'Outdoor & Print': '📦',
};

export const FILE_EMOJI = { pdf: '📄', zip: '🗜️', figma: '🎨', video: '🎬', img: '🖼️', code: '⌨️', html: '🌐' };

/* ---------------- people ---------------- */
export const people = {
  ayesha: { id: 1, name: 'Ayesha R.', role: 'Project Manager', online: true },
  omar: { id: 2, name: 'Omar S.', role: 'Account Manager', online: true },
  daniyal: { id: 3, name: 'Daniyal K.', role: 'Lead Developer', online: true },
  sana: { id: 4, name: 'Sana M.', role: 'Senior Designer', online: false },
  hamza: { id: 5, name: 'Hamza T.', role: 'Frontend Developer', online: true },
  zara: { id: 6, name: 'Zara A.', role: 'Brand Designer', online: false },
};
export const team = [people.ayesha, people.omar, people.daniyal, people.sana];

/* ---------------- projects ----------------
   One client ↔ many projects. Every request belongs to a project. */
export const projects = [
  {
    id: 1,
    name: 'Platform MVP',
    tagline: 'SaaS web app — request marketplace for logistics',
    status: 'active',
    progress: 68,
    startedAt: 'Apr 2, 2026',
    targetAt: 'Aug 15, 2026',
    pm: people.ayesha,
    am: people.omar,
    members: [people.daniyal, people.hamza, people.sana],
    preview: { url: 'https://preview.clockwrk.io/m94-platform', kind: 'html', label: 'Staging build · updated 2h ago' },
    stack: ['React', 'Node.js', 'MySQL', 'Stripe'],
    description: 'Full MVP build: customer app, admin panel, payments, and notifications. Shipping in weekly increments to the staging link.',
  },
  {
    id: 2,
    name: 'Brand System',
    tagline: 'Identity, design system & brand collateral',
    status: 'active',
    progress: 90,
    startedAt: 'Mar 10, 2026',
    targetAt: 'Jul 20, 2026',
    pm: people.ayesha,
    am: people.omar,
    members: [people.zara, people.sana],
    preview: { url: 'https://preview.clockwrk.io/m94-brand', kind: 'figma', label: 'Figma workspace' },
    stack: ['Figma', 'Illustrator'],
    description: 'Logo refinement, full color/type system, and templates for decks, social, and print.',
  },
  {
    id: 3,
    name: 'Growth Assets',
    tagline: 'Landing pages, emails & ad creatives',
    status: 'paused',
    progress: 40,
    startedAt: 'May 5, 2026',
    targetAt: '—',
    pm: people.ayesha,
    am: people.omar,
    members: [people.sana, people.hamza],
    preview: { url: 'https://preview.clockwrk.io/m94-growth', kind: 'html', label: 'Paused — last build Jun 18' },
    stack: ['HTML', 'Figma', 'Mailchimp'],
    description: 'Conversion assets for the launch: A/B landing variants, onboarding emails, and paid-social creatives.',
  },
];

/* ---------------- requests ---------------- */
export const requestsSeed = [
  {
    id: 101, projectId: 1, title: 'Checkout flow redesign', category: 'Design', type: 'UI Design',
    status: 'active', progress: 62, startedAt: 'Jul 1', due: 'Jul 6', revisionsUsed: 0,
    brief: 'Redesign the 3-step checkout to reduce drop-off. Keep the lime accent, simplify the plan picker, mobile-first.',
    timeline: [
      { label: 'Submitted', at: 'Jul 1, 09:12', done: true },
      { label: 'Started — slot 1', at: 'Jul 1, 14:30', done: true },
      { label: 'First draft in progress', at: 'now', now: true },
      { label: 'Delivery expected', at: 'Jul 6' },
    ],
    changelog: [
      { at: 'Jul 2, 18:40', who: 'Sana M.', text: 'Hi-fi mockups for steps 1–2 done. Apple Pay moved above the fold per your note.' },
      { at: 'Jul 1, 16:10', who: 'Sana M.', text: 'Wireframes complete. Simplified plan picker from 6 UI elements to 3.' },
    ],
    comments: [
      { who: 'Ayesha R.', at: 'Jul 2', text: 'Wireframes are done — moving to hi-fi today. Question: keep Apple Pay above the fold?' },
      { who: 'You', at: 'Jul 2', text: 'Yes, Apple Pay first. Card form second.' },
    ],
    deliverables: [],
    rating: null,
  },
  {
    id: 102, projectId: 1, title: 'Marketing site dark mode', category: 'Development', type: 'Website',
    status: 'active', progress: 30, startedAt: 'Jul 2', due: 'Jul 7',
    brief: 'Add a dark theme to the marketing site, system-preference aware, with a toggle in the navbar.',
    timeline: [
      { label: 'Submitted', at: 'Jul 2, 11:02', done: true },
      { label: 'Started — slot 2', at: 'Jul 2, 16:00', done: true },
      { label: 'Build in progress', at: 'now', now: true },
      { label: 'Delivery expected', at: 'Jul 7' },
    ],
    changelog: [
      { at: 'Jul 3, 10:05', who: 'Daniyal K.', text: 'Token system converted to CSS variables. Hero + navbar themed, preview on staging.' },
    ],
    comments: [],
    deliverables: [],
    preview: { url: 'https://preview.clockwrk.io/m94-darkmode', kind: 'html', label: 'Dev preview · dark mode branch' },
    rating: null,
  },
  {
    id: 103, projectId: 2, title: 'Investor pitch deck v2', category: 'Presence', type: 'Pitch Deck',
    status: 'review', progress: 100, startedAt: 'Jun 26', due: 'Jun 30', deliveredAt: 'Jun 30', revisionsUsed: 1,
    brief: '14-slide seed deck refresh: new traction numbers, cleaner story arc.',
    timeline: [
      { label: 'Submitted', at: 'Jun 26, 09:40', done: true },
      { label: 'Started — slot 1', at: 'Jun 26, 13:00', done: true },
      { label: 'v1 delivered', at: 'Jun 27, 17:15', done: true, kind: 'delivery' },
      { label: 'Revision requested — "traction slide should lead with MRR"', at: 'Jun 28, 10:05', done: true, kind: 'revision' },
      { label: 'v2 delivered', at: 'Jun 30, 15:20', done: true, kind: 'delivery' },
      { label: 'Awaiting your review', at: 'now', now: true },
    ],
    changelog: [
      { at: 'Jun 30, 15:20', who: 'Zara A.', text: 'Final export delivered. Two cover options included (bold type vs product shot).' },
      { at: 'Jun 28, 12:00', who: 'Zara A.', text: 'Story arc restructured: problem → traction → moat. Traction slide now leads with MRR curve.' },
    ],
    comments: [{ who: 'Ayesha R.', at: 'Jun 30', text: 'Delivered! Two cover options included — let us know which direction you prefer.' }],
    deliverables: [
      { id: 'd1', name: 'pitch-deck-v2.pdf', kind: 'pdf', size: '9.1 MB', at: 'Jun 30', version: 2, current: true },
      { id: 'd2', name: 'cover-options.fig', kind: 'figma', size: '—', at: 'Jun 30', version: 2, current: true },
      { id: 'd0', name: 'pitch-deck-v1.pdf', kind: 'pdf', size: '8.7 MB', at: 'Jun 27', version: 1, current: false },
    ],
    rating: null,
  },
  {
    id: 104, projectId: 3, title: 'Onboarding email sequence', category: 'Presence', type: 'Email Templates',
    status: 'queued', queuePos: 1,
    brief: '5-email welcome sequence for new subscribers. Friendly, short, one CTA each.',
    timeline: [], changelog: [], comments: [], deliverables: [], rating: null,
  },
  {
    id: 105, projectId: 1, title: 'App Store screenshots', category: 'Design', type: 'Mobile App',
    status: 'queued', queuePos: 2,
    brief: '8 localized screenshots for iOS listing, both light and dark app themes.',
    timeline: [], changelog: [], comments: [], deliverables: [], rating: null,
  },
  {
    id: 106, projectId: 1, title: 'API rate-limit middleware', category: 'Development', type: 'Backend & DB',
    status: 'queued', queuePos: 3,
    brief: 'Per-key sliding window rate limiting with Redis, plus usage headers.',
    timeline: [], changelog: [], comments: [], deliverables: [], rating: null,
  },
  {
    id: 107, projectId: 2, title: 'Brand identity refresh', category: 'Branding', type: 'Brand Identity',
    status: 'done', deliveredAt: 'Jun 22', approvedAt: 'Jun 24', revisionsUsed: 1,
    brief: 'Logo refinement, color system, typography scale.',
    timeline: [
      { label: 'Submitted', at: 'Jun 12', done: true },
      { label: 'Started — slot 2', at: 'Jun 13', done: true },
      { label: 'v1 delivered', at: 'Jun 18', done: true, kind: 'delivery' },
      { label: 'Revision requested — "mono variant for dev contexts"', at: 'Jun 19', done: true, kind: 'revision' },
      { label: 'v2 delivered', at: 'Jun 22', done: true, kind: 'delivery' },
      { label: 'Approved by you', at: 'Jun 24', done: true },
    ],
    changelog: [
      { at: 'Jun 22, 11:00', who: 'Zara A.', text: 'Final brand book + logo package delivered.' },
      { at: 'Jun 18, 14:30', who: 'Zara A.', text: 'v2: tightened letterforms, added mono variant for dev contexts.' },
    ],
    comments: [],
    deliverables: [
      { id: 'd3', name: 'brand-book.pdf', kind: 'pdf', size: '4.2 MB', at: 'Jun 22', version: 2, current: true },
      { id: 'd4', name: 'logo-primary.svg', kind: 'svg', size: '12 KB', at: 'Jun 22', version: 2, current: true },
      { id: 'd4b', name: 'icon-set-24px.svg', kind: 'icon', size: '86 KB', at: 'Jun 22', version: 2, current: true },
      { id: 'd4c', name: 'logo-package.zip', kind: 'zip', size: '18 MB', at: 'Jun 22', version: 2, current: true },
      { id: 'd3a', name: 'brand-book-draft.pdf', kind: 'pdf', size: '3.9 MB', at: 'Jun 18', version: 1, current: false },
    ],
    rating: { stars: 5, feedback: 'Zara nailed the identity — the mono logo variant was a brilliant touch.', published: true },
  },
  {
    id: 108, projectId: 3, title: 'Landing page A/B variant', category: 'Design', type: 'Landing Page',
    status: 'done', deliveredAt: 'Jun 18', approvedAt: 'Jun 19', revisionsUsed: 0,
    brief: 'Alternative hero with social proof above the fold.',
    timeline: [
      { label: 'Submitted', at: 'Jun 14', done: true },
      { label: 'v1 delivered', at: 'Jun 18', done: true, kind: 'delivery' },
      { label: 'Approved by you — first pass', at: 'Jun 19', done: true },
    ],
    changelog: [{ at: 'Jun 18, 16:45', who: 'Sana M.', text: 'Variant B delivered with testimonial strip above the fold.' }],
    comments: [],
    deliverables: [
      { id: 'd5', name: 'landing-b.fig', kind: 'figma', size: '—', at: 'Jun 18', version: 1, current: true },
      { id: 'd6', name: 'hero-animation.mp4', kind: 'video', size: '32 MB', at: 'Jun 18', version: 1, current: true },
    ],
    rating: { stars: 4, feedback: 'Great variant, quick turnaround.', published: false },
  },
];

/* ---------------- add-ons ---------------- */
export const ADDONS = [
  { id: 'slot', emoji: '⚡', name: 'Extra request slot', price: 700, per: '/mo', blurb: 'One more request running in parallel. Add or remove any month.' },
  { id: 'rush', emoji: '🚀', name: 'Rush delivery', price: 250, per: '/request', blurb: 'Jump the 2–3 day cycle — next-business-day delivery on one request.' },
  { id: 'whitelabel', emoji: '🏷️', name: 'White label', price: 550, per: '/mo', blurb: 'Your name on every file and report. Your clients never know we exist.' },
];

export const PLANS = [
  { name: 'Startup', slots: 1, price: 870, blurb: 'One request at a time' },
  { name: 'Business', slots: 2, price: 1550, blurb: 'Two requests at a time' },
  { name: 'Enterprise', slots: 3, price: 2300, blurb: 'Three requests at a time' },
];

export const invoices = [
  { id: 'INV-0231', date: 'Jun 18, 2026', amount: 1550, status: 'paid' },
  { id: 'INV-0198', date: 'May 18, 2026', amount: 1550, status: 'paid' },
  { id: 'INV-0164', date: 'Apr 18, 2026', amount: 1550, status: 'paid' },
  { id: 'INV-0133', date: 'Mar 18, 2026', amount: 870, status: 'paid' },
];

export const messages = [
  { id: 1, who: 'them', name: 'Ayesha R.', at: 'Yesterday 16:04', text: 'Hey Sardar! Dark mode build kicked off today — Daniyal is on it.' },
  { id: 2, who: 'me', at: 'Yesterday 16:20', text: 'Great. One thing: keep the logo white in dark mode, not lime.' },
  { id: 3, who: 'them', name: 'Ayesha R.', at: 'Yesterday 16:22', text: 'Noted 👍 White logo on dark. We\'ll ship a preview link by Monday.' },
  { id: 4, who: 'them', name: 'Ayesha R.', at: 'Today 09:15', text: 'Checkout wireframes are ready in the review tab whenever you have 10 minutes.' },
];

export const tickets = [
  { id: 'T-42', subject: 'Invoice PDF shows old company name', status: 'resolved', at: 'Jun 20', replies: 2 },
  { id: 'T-45', subject: 'Add a second teammate to portal access', status: 'open', at: 'Jul 1', replies: 1 },
];

export const activity = [
  { id: 1, icon: '📬', text: 'Ayesha commented on Checkout flow redesign', at: '2h ago' },
  { id: 2, icon: '🔨', text: 'Dark mode tokens shipped to staging preview', at: '5h ago' },
  { id: 3, icon: '🚚', text: 'Investor pitch deck v2 was delivered', at: '3d ago' },
  { id: 4, icon: '▶️', text: 'Marketing site dark mode moved into slot 2', at: '1d ago' },
  { id: 5, icon: '✅', text: 'You approved Brand identity refresh', at: '9d ago' },
];
