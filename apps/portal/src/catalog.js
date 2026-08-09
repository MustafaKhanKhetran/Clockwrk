// Pricing, plans and the service catalogue — this is real configuration, not
// sample data. All fake clients, projects, requests, files, invoices, team
// members, messages, tickets and activity were removed on 2026-08-08; the
// portal reads those from the API only, so nothing invented can reach a client.

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

