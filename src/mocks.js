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
  Development: ['Web App', 'Website', 'SaaS', 'E-commerce', 'Mobile App', 'MVP', 'Extension'],
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
    id: 101, projectId: 1, title: 'Checkout flow redesign', category: 'Design', type: 'UI Design', priority: 'High',
    status: 'active', progress: 62, startedAt: 'Jul 1', due: 'Jul 4', revisionsUsed: 0,
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
    id: 102, projectId: 1, title: 'Marketing site dark mode', category: 'Development', type: 'Website', priority: 'Normal',
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
    id: 103, projectId: 2, title: 'Investor pitch deck v2', category: 'Presence', type: 'Pitch Deck', priority: 'High',
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
    id: 104, projectId: 3, title: 'Onboarding email sequence', category: 'Presence', type: 'Email Templates', priority: 'Standard',
    status: 'queued', queuePos: 1,
    brief: '5-email welcome sequence for new subscribers. Friendly, short, one CTA each.',
    timeline: [], changelog: [], comments: [], deliverables: [], rating: null,
  },
  {
    id: 112, projectId: 1, title: 'Shipment tracking dashboard', category: 'Development', type: 'Web App', priority: 'Urgent',
    status: 'review', progress: 100, startedAt: 'Jul 1', due: 'Jul 4', deliveredAt: 'Jul 4', revisionsUsed: 0,
    brief: 'Live shipment dashboard with carrier status, exception alerts, and customer-facing tracking links.',
    timeline: [
      { label: 'Submitted', at: 'Jul 1, 10:20', done: true },
      { label: 'Started — slot 1', at: 'Jul 1, 13:10', done: true },
      { label: 'Production candidate delivered', at: 'Jul 4, 16:45', done: true, kind: 'delivery' },
      { label: 'Awaiting your review', at: 'now', now: true },
    ],
    changelog: [{ at: 'Jul 4, 16:45', who: 'Daniyal K.', text: 'Staging build, source package, QA notes, and deployment guide are ready for review.' }],
    comments: [{ who: 'Daniyal K.', at: 'Jul 4', text: 'The staging build is ready. Please test the exception-alert flow and mobile table view.' }],
    deliverables: [
      { id: 'review-dev-1', name: 'tracking-dashboard-staging.html', kind: 'html', size: 'Live', at: 'Jul 4', version: 1, current: true, url: 'https://preview.clockwrk.io/m94-tracking' },
      { id: 'review-dev-2', name: 'tracking-dashboard-source.zip', kind: 'zip', size: '12.8 MB', at: 'Jul 4', version: 1, current: true },
      { id: 'review-dev-3', name: 'qa-and-deployment.md', kind: 'code', size: '18 KB', at: 'Jul 4', version: 1, current: true },
    ],
    rating: null,
  },
  {
    id: 113, projectId: 3, title: 'Launch campaign landing page', category: 'Development', type: 'Landing Page', priority: 'High',
    status: 'review', progress: 100, startedAt: 'Jul 2', due: 'Jul 5', deliveredAt: 'Jul 5', revisionsUsed: 1,
    brief: 'Responsive launch page with campaign tracking, lead capture, and conversion-ready sections.',
    timeline: [
      { label: 'Submitted', at: 'Jul 2, 09:00', done: true },
      { label: 'Revision completed', at: 'Jul 4, 15:30', done: true, kind: 'revision' },
      { label: 'Final build delivered', at: 'Jul 5, 11:10', done: true, kind: 'delivery' },
      { label: 'Awaiting your review', at: 'now', now: true },
    ],
    changelog: [{ at: 'Jul 5, 11:10', who: 'Hamza T.', text: 'Final responsive build delivered with analytics events and optimized assets.' }],
    comments: [{ who: 'Ayesha R.', at: 'Jul 5', text: 'Final build is ready. The revised testimonial section and analytics events are included.' }],
    deliverables: [
      { id: 'review-web-1', name: 'campaign-landing-live.html', kind: 'html', size: 'Live', at: 'Jul 5', version: 2, current: true, url: 'https://preview.clockwrk.io/m94-campaign' },
      { id: 'review-web-2', name: 'campaign-landing-source.zip', kind: 'zip', size: '6.3 MB', at: 'Jul 5', version: 2, current: true },
    ],
    rating: null,
  },
  {
    id: 105, projectId: 1, title: 'App Store screenshots', category: 'Design', type: 'Mobile App', priority: 'Normal',
    status: 'queued', queuePos: 2,
    brief: '8 localized screenshots for iOS listing, both light and dark app themes.',
    timeline: [], changelog: [], comments: [], deliverables: [], rating: null,
  },
  {
    id: 106, projectId: 1, title: 'API rate-limit middleware', category: 'Development', type: 'Backend & DB', priority: 'Urgent',
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
  {
    id: 109, projectId: 1, title: 'Customer portal release', category: 'Development', type: 'Web App',
    status: 'done', deliveredAt: 'Jun 15', approvedAt: 'Jun 16', revisionsUsed: 1,
    brief: 'Production-ready customer portal with authentication, request tracking, file delivery, and billing views.',
    timeline: [
      { label: 'Submitted', at: 'May 28', done: true },
      { label: 'Staging build delivered', at: 'Jun 10', done: true, kind: 'delivery' },
      { label: 'Production release delivered', at: 'Jun 15', done: true, kind: 'delivery' },
      { label: 'Approved by you', at: 'Jun 16', done: true },
    ],
    changelog: [{ at: 'Jun 15, 17:40', who: 'Daniyal K.', text: 'Production build, source package, deployment notes, and environment template delivered.' }],
    comments: [],
    deliverables: [
      { id: 'dev1', name: 'customer-portal-live.html', kind: 'html', size: 'Live', at: 'Jun 15', version: 3, current: true, url: 'https://preview.clockwrk.io/m94-platform' },
      { id: 'dev2', name: 'customer-portal-source.zip', kind: 'zip', size: '18.6 MB', at: 'Jun 15', version: 3, current: true },
      { id: 'dev3', name: 'release-notes.md', kind: 'code', size: '14 KB', at: 'Jun 15', version: 3, current: true },
      { id: 'dev4', name: 'environment.example', kind: 'code', size: '3 KB', at: 'Jun 15', version: 3, current: true },
      { id: 'dev0', name: 'customer-portal-rc.zip', kind: 'zip', size: '17.9 MB', at: 'Jun 10', version: 2, current: false },
    ],
    rating: { stars: 5, feedback: 'The release process and documentation were exceptionally clear.', published: true },
  },
  {
    id: 110, projectId: 1, title: 'Operations browser plugin', category: 'Development', type: 'Extension',
    status: 'done', deliveredAt: 'Jun 8', approvedAt: 'Jun 9', revisionsUsed: 0,
    brief: 'Chrome extension for capturing shipment details and sending them into the platform.',
    timeline: [
      { label: 'Submitted', at: 'May 30', done: true },
      { label: 'Plugin package delivered', at: 'Jun 8', done: true, kind: 'delivery' },
      { label: 'Approved by you', at: 'Jun 9', done: true },
    ],
    changelog: [{ at: 'Jun 8, 13:20', who: 'Hamza T.', text: 'Manifest v3 extension, install package, source, and QA checklist delivered.' }],
    comments: [],
    deliverables: [
      { id: 'plug1', name: 'clockwrk-capture-extension.zip', kind: 'zip', size: '2.4 MB', at: 'Jun 8', version: 1, current: true },
      { id: 'plug2', name: 'manifest-v3.json', kind: 'code', size: '6 KB', at: 'Jun 8', version: 1, current: true },
      { id: 'plug3', name: 'plugin-install-guide.html', kind: 'html', size: '420 KB', at: 'Jun 8', version: 1, current: true },
      { id: 'plug4', name: 'qa-checklist.md', kind: 'code', size: '11 KB', at: 'Jun 8', version: 1, current: true },
    ],
    rating: { stars: 5, feedback: 'Installed cleanly and worked on the first test.', published: false },
  },
  {
    id: 111, projectId: 1, title: 'Shipment API integration', category: 'Development', type: 'API & Integrations',
    status: 'done', deliveredAt: 'May 29', approvedAt: 'May 30', revisionsUsed: 1,
    brief: 'Carrier API integration with normalized tracking events, webhook verification, and retry handling.',
    timeline: [
      { label: 'Submitted', at: 'May 16', done: true },
      { label: 'API package delivered', at: 'May 29', done: true, kind: 'delivery' },
      { label: 'Approved by you', at: 'May 30', done: true },
    ],
    changelog: [{ at: 'May 29, 16:10', who: 'Daniyal K.', text: 'OpenAPI specification, Postman collection, integration source, and deployment guide delivered.' }],
    comments: [],
    deliverables: [
      { id: 'api1', name: 'carrier-api-openapi.json', kind: 'code', size: '96 KB', at: 'May 29', version: 2, current: true },
      { id: 'api2', name: 'carrier-integration-source.zip', kind: 'zip', size: '5.8 MB', at: 'May 29', version: 2, current: true },
      { id: 'api3', name: 'api-documentation.html', kind: 'html', size: '1.2 MB', at: 'May 29', version: 2, current: true },
      { id: 'api4', name: 'postman-collection.json', kind: 'code', size: '84 KB', at: 'May 29', version: 2, current: true },
    ],
    rating: { stars: 5, feedback: 'Excellent API documentation and handover.', published: true },
  },
];

/* ---------------- add-ons ---------------- */
export const ADDONS = [
  { id: 'whitelabel', name: 'White Label', weeklyPrice: 550, monthlyPrice: 1670, blurb: 'Your name on every file and report. Your clients never know we exist.' },
  { id: 'hire', name: 'Hire From Us', weeklyPrice: 1200, monthlyPrice: 3500, blurb: 'A dedicated Clockwrk team member embedded into your workflow.' },
  { id: 'slot', name: 'Additional request slot', weeklyPrice: 400, monthlyPrice: 1200, blurb: 'One more creative request running in parallel.' },
  { id: 'priority', name: 'Priority queue', weeklyPrice: 200, monthlyPrice: 600, blurb: 'Your queued creative requests move ahead of the standard queue.' },
];

// Subscription — the active build phase. Paid upfront, work starts on payment.
// Weekly = pause or cancel any week. Monthly = ~10% off the true monthly cost
// (a real month is 4.333 weeks, so weekly x 4.333 x 0.9, rounded for clean pricing).
export const PLANS = [
  { name: 'Startup', slots: 1, price: 870, cadence: 'wk', monthlyPrice: 3350, blurb: 'One request at a time' },
  { name: 'Business', slots: 2, price: 1550, cadence: 'wk', monthlyPrice: 6000, blurb: 'Two requests at a time' },
  { name: 'Enterprise', slots: 3, price: 2300, cadence: 'wk', monthlyPrice: 8950, blurb: 'Three requests at a time' },
];

export const PLAN_CARE = {
  Startup: 'starter',
  Business: 'growth',
  Enterprise: 'business',
};

const SERVICE_ITEMS = [
  { id: 'shared', category: 'Hosting', name: 'Shared hosting', price: 25, cadence: 'mo', buyModel: 'order', billing: 'infra' },
  { id: 'wordpress', category: 'Hosting', name: 'WordPress hosting', price: 45, cadence: 'mo', buyModel: 'order', billing: 'infra' },
  { id: 'woocommerce', category: 'Hosting', name: 'WooCommerce hosting', price: 75, cadence: 'mo', buyModel: 'order', billing: 'infra' },
  { id: 'vps', category: 'Hosting', name: 'VPS hosting', price: 120, cadence: 'mo', buyModel: 'order', billing: 'infra' },
  { id: 'audit', category: 'Security', name: 'Security audit', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'firewall', category: 'Security', name: 'Firewall setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: '2fa', category: 'Security', name: '2FA setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'removal', category: 'Security', name: 'Malware removal', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'staging', category: 'Hosting', name: 'Staging environment', price: 18, cadence: 'mo', buyModel: 'toggle', billing: 'infra' },
  { id: 'migration', category: 'Hosting', name: 'Managed site migration', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'uptime', category: 'Hosting', name: 'Advanced uptime monitoring', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'domain-transfer', category: 'Domains', name: 'Domain transfer', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'managed-dns', category: 'Domains', name: 'Managed DNS', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'subdomain', category: 'Domains', name: 'Subdomain setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'email-starter', category: 'Email', name: 'Starter mailbox', price: 6, cadence: 'mo', buyModel: 'toggle', billing: 'infra' },
  { id: 'email-team', category: 'Email', name: 'Team mailbox', price: 12, cadence: 'mo', buyModel: 'toggle', billing: 'infra' },
  { id: 'email-business', category: 'Email', name: 'Business mailbox', price: 22, cadence: 'mo', buyModel: 'toggle', billing: 'infra' },
  { id: 'email-forwarding', category: 'Email', name: 'Forwarding and aliases', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'email-migration', category: 'Email', name: 'Email migration', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'ssl', category: 'Security', name: 'Managed SSL certificate', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'bugs', category: 'Maintenance', name: 'Bug fixes', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'content', category: 'Maintenance', name: 'Content updates', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'plugin-updates', category: 'Maintenance', name: 'Plugin updates', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'broken-links', category: 'Maintenance', name: 'Broken link monitoring', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'health-report', category: 'Maintenance', name: 'Monthly health report', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'performance', category: 'Performance', name: 'Performance optimisation', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'database', category: 'Performance', name: 'Database optimisation', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'page-speed', category: 'Performance', name: 'Page speed optimisation', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'cwv', category: 'Performance', name: 'Core Web Vitals', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'images', category: 'Performance', name: 'Image optimisation', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'cdn', category: 'Performance', name: 'CDN setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'caching', category: 'Performance', name: 'Caching setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'minify', category: 'Performance', name: 'Asset minification', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'ga4', category: 'Analytics', name: 'GA4 setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'gsc', category: 'Analytics', name: 'Search Console setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'conversion', category: 'Analytics', name: 'Conversion tracking', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'heatmap', category: 'Analytics', name: 'Heatmap setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'performance-report', category: 'Analytics', name: 'Monthly performance report', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'technical-seo', category: 'SEO', name: 'Technical SEO', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'onpage-seo', category: 'SEO', name: 'On-page SEO', price: 0, cadence: 'included', buyModel: 'request', billing: 'included', perUnit: 'page' },
  { id: 'local-seo', category: 'SEO', name: 'Local SEO setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'seo-monitor', category: 'SEO', name: 'SEO monitoring', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'keywords', category: 'SEO', name: 'Keyword tracking', price: 0, cadence: 'care', buyModel: 'toggle', billing: 'care' },
  { id: 'launch-setup', category: 'Setup', name: 'Website launch setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'workspace-setup', category: 'Setup', name: 'Google Workspace setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'cloudflare-setup', category: 'Setup', name: 'Cloudflare setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'gateway-setup', category: 'Setup', name: 'Payment gateway setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
  { id: 'integration-setup', category: 'Setup', name: 'Integration setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included', perUnit: 'tool' },
  { id: 'gdpr-setup', category: 'Setup', name: 'GDPR setup', price: 0, cadence: 'included', buyModel: 'request', billing: 'included' },
];

const SERVICE_BUCKETS = {
  Hosting: 'Run & maintain',
  Domains: 'Set up & launch',
  Email: 'Run & maintain',
  Security: 'Secure',
  Maintenance: 'Run & maintain',
  Performance: 'Speed',
  Analytics: 'Grow',
  SEO: 'Grow',
  Setup: 'Set up & launch',
};
export const SERVICE_CATALOG = SERVICE_ITEMS.map((item) => ({ ...item, bucket: SERVICE_BUCKETS[item.category] }));

// Retainer — the after-launch product. Keeps a finished project alive once the
// active build phase ends. Included free while a client is on a subscription;
// becomes their standalone bill when the project ships.
// Annual = 2 months free (~16.7% off).
export const CARE_PLANS = [
  {
    id: 'starter',
    name: 'Care',
    price: 295,
    cadence: 'mo',
    annualPrice: 2950,
    hoursIncluded: 2,
    responseTime: '2 business days',
    strategyCall: null,
    includes: [
      'Daily backups + one-click restore',
      'Uptime monitoring',
      'Core, plugin & theme updates',
      'Managed SSL & DNS',
      'Broken-link monitoring',
      'Malware scan & removal',
      'Monthly health report',
      '2 hours of content edits',
    ],
  },
  {
    id: 'growth',
    name: 'Care+',
    price: 495,
    cadence: 'mo',
    annualPrice: 4950,
    hoursIncluded: 5,
    responseTime: 'Next business day',
    strategyCall: 'Monthly (30 min)',
    recommended: true,
    includes: [
      'Everything in Care',
      'Performance monitoring + monthly tuning',
      'Security hardening + firewall',
      'SEO & keyword monitoring',
      'Monthly performance report',
      '5 hours of edits & small fixes',
      'Next-business-day response',
      'Monthly strategy call',
    ],
  },
  {
    id: 'business',
    name: 'Care Pro',
    price: 895,
    cadence: 'mo',
    annualPrice: 8950,
    hoursIncluded: 12,
    responseTime: '4 business hours',
    strategyCall: 'Quarterly deep-dive',
    includes: [
      'Everything in Care+',
      '12 hours of edits & development',
      '4-business-hour response SLA',
      'Staging environment included',
      'Quarterly security audit',
      'Priority position in the queue',
      'Quarterly strategy deep-dive',
    ],
  },
];

// Overage beyond the hours included in a retainer tier.
export const RETAINER_EXTRA_HOURS = {
  hourly: 85,
  block: { hours: 5, price: 375 },
};

export const REQUESTABLE_SERVICES = SERVICE_CATALOG
  .filter((s) => s.billing === 'included')
  .reduce((acc, s) => {
    (acc[s.category] ||= []).push(s.name);
    return acc;
  }, {});

export const LAUNCH_BUNDLES = [
  { id: 'essentials', name: 'Launch Essentials', price: 350, includes: ['Analytics check', 'SEO baseline', 'Launch checklist'] },
  { id: 'pro', name: 'Launch Pro', price: 650, includes: ['Essentials', 'Performance pass', 'Conversion tracking'] },
  { id: 'premium', name: 'Launch Premium', price: 1200, includes: ['Pro', 'Security audit', '30-day monitoring'] },
];

export const domainsSeed = [
  { id: 1, name: 'm94group.com', renewalAt: 'Sep 18, 2026', autoRenew: true, privacy: true },
  { id: 2, name: 'm94logistics.io', renewalAt: 'Nov 4, 2026', autoRenew: false, privacy: true },
];
export const mailboxesSeed = [
  { id: 1, address: 'hello@m94group.com', plan: 'Team', status: 'active' },
  { id: 2, address: 'ops@m94group.com', plan: 'Business', status: 'active' },
];
export const hostingSeed = {
  accounts: [{ id: 1, domain: 'm94group.com', plan: 'VPS', price: 120, status: 'active', uptime: 99.99 }],
  backups: [{ id: 1, createdAt: 'Jul 6, 03:00', type: 'Daily', status: 'complete' }, { id: 2, createdAt: 'Jul 5, 03:00', type: 'Daily', status: 'complete' }],
};
export const securitySeed = [
  { id: 'ssl', name: 'SSL management', price: 20, on: true },
  { id: 'malware', name: 'Malware scanning', price: 35, on: true },
  { id: 'ddos', name: 'DDoS monitoring', price: 45, on: false },
  { id: 'login', name: 'Login monitoring', price: 25, on: true },
];
export const reportsSeed = [
  { id: 'RPT-101', type: 'Website health', period: 'June 2026', generatedAt: 'Jul 1, 2026', url: '/reports/health-june.pdf' },
  { id: 'RPT-102', type: 'Performance', period: 'June 2026', generatedAt: 'Jul 2, 2026', url: '/reports/performance-june.pdf' },
  { id: 'RPT-103', type: 'SEO', period: 'Q2 2026', generatedAt: 'Jul 3, 2026', url: '/reports/seo-q2.pdf' },
];

export const invoices = [
  { id: 'INV-0231', date: 'Jun 18, 2026', amount: 1750, status: 'paid', renewalAt: 'Jun 25, 2026', autoRenew: true, lineItems: [{ label: 'Business plan', cadence: 'weekly', amount: 1550 }, { label: 'Priority queue', cadence: 'weekly', amount: 200 }] },
  { id: 'INV-0198', date: 'May 18, 2026', amount: 1670, status: 'paid', renewalAt: 'Jun 18, 2026', autoRenew: true, lineItems: [{ label: 'White Label', cadence: 'monthly', amount: 1670 }] },
  { id: 'INV-0164', date: 'Apr 18, 2026', amount: 350, status: 'paid', renewalAt: null, autoRenew: false, lineItems: [{ label: 'Launch Essentials', cadence: 'one-time', amount: 350 }] },
  { id: 'INV-0133', date: 'Mar 18, 2026', amount: 120, status: 'paid', renewalAt: 'Mar 18, 2027', autoRenew: true, lineItems: [{ label: 'Domain registration', cadence: 'yearly', amount: 120 }] },
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
