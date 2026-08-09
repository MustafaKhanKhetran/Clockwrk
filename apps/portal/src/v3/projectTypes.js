// Project types offered in the composer. The emoji sets mirror TYPE_EMOJI in
// clockwrk-api/routes/clientPortal.js — when no icon is chosen the server picks
// one from the same set, so the client and server never disagree about a
// project's icon. Keep the two lists in sync if you add a type.

export const PROJECT_TYPES = [
  { name: 'Website', emoji: ['🌐', '🖥️', '🧭'], blurb: 'Marketing site, portfolio, landing pages' },
  { name: 'Web app', emoji: ['⚙️', '🧩', '🛠️'], blurb: 'Dashboards, portals, internal platforms' },
  { name: 'Mobile app', emoji: ['📱', '🚀', '🧿'], blurb: 'iOS, Android, cross-platform' },
  { name: 'E-commerce', emoji: ['🛒', '🏷️', '📦'], blurb: 'Storefronts, checkout, product pages' },
  { name: 'SaaS platform', emoji: ['☁️', '🔗', '⚡'], blurb: 'Subscription products and billing' },
  { name: 'Brand identity', emoji: ['🎨', '✨', '🪄'], blurb: 'Logo, identity, guidelines' },
  { name: 'Design system', emoji: ['🧱', '📐', '🎛️'], blurb: 'Components, tokens, documentation' },
  { name: 'Marketing campaign', emoji: ['📣', '🎯', '📈'], blurb: 'Launches, ads, landing funnels' },
  { name: 'Content', emoji: ['✍️', '📝', '📚'], blurb: 'Copy, articles, editorial' },
  { name: 'Pitch deck', emoji: ['📊', '🎤', '💼'], blurb: 'Investor and sales decks' },
  { name: 'Product launch', emoji: ['🚀', '🎉', '🧨'], blurb: 'Go-to-market and release' },
  { name: 'Internal tool', emoji: ['🔧', '🗂️', '🧮'], blurb: 'Ops tooling and automation' },
  { name: 'Research', emoji: ['🔬', '🧪', '🔎'], blurb: 'Discovery, audits, user research' },
  { name: 'Other', emoji: ['📁', '🗃️', '🧷'], blurb: 'Anything that does not fit above' },
];

export const LINK_KINDS = [
  { id: 'production', label: 'Production website' },
  { id: 'staging', label: 'Staging' },
  { id: 'figma', label: 'Figma' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'github', label: 'GitHub' },
  { id: 'appstore', label: 'App Store / Play Store' },
  { id: 'docs', label: 'Documentation' },
  { id: 'other', label: 'Other' },
];

export const RESOURCE_KINDS = [
  { id: 'brand', label: 'Brand kit' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'website', label: 'Existing website' },
  { id: 'competitor', label: 'Competitor reference' },
  { id: 'figma', label: 'Figma' },
  { id: 'drive', label: 'Drive folder' },
  { id: 'research', label: 'Research' },
  { id: 'other', label: 'Other' },
];

/** Deterministic emoji for a type, matching the server's fallback. */
export function emojiForType(typeName, seed = 0) {
  const type = PROJECT_TYPES.find((item) => item.name === typeName) || PROJECT_TYPES[PROJECT_TYPES.length - 1];
  return type.emoji[Math.abs(Number(seed) || 0) % type.emoji.length];
}

/** All emoji offered in the icon picker, de-duplicated. */
export const ICON_CHOICES = [...new Set(PROJECT_TYPES.flatMap((t) => t.emoji))];
