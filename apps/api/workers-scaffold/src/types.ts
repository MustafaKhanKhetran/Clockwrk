// Shared types for the Clockwrk Worker.
// `Env` is intentionally hand-written here because we want lightweight typing
// without running `wrangler types` on every dev machine — if you add a
// binding, add it in both wrangler.jsonc and here.

export type Env = {
  DB: D1Database;
  R2: R2Bucket;

  // Vars (public)
  ALLOWED_ORIGINS: string;
  ALLOW_RAW_SQL: string;
  R2_PUBLIC_URL: string;
  RESEND_FROM: string;

  // Secrets
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  INTERNAL_ALERT_EMAIL: string;
};

// Auth-context payloads. Employee and client tokens share the same signing
// secret; the `type` claim keeps them mutually exclusive.
export type EmployeeClaims = {
  id: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export type ClientClaims = {
  type: 'client';
  id: number;
  email: string;
  name: string;
  company: string | null;
  plan: string | null;
  iat?: number;
  exp?: number;
};

export type MfaPendingClaims = {
  type: 'mfa_pending';
  id: number;
  iat?: number;
  exp?: number;
};

// Hono context variables set by middleware.
export type Variables = {
  employee?: EmployeeClaims;
  client?: ClientClaims;
};
