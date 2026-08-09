import { z } from 'zod';

const Id = z.union([z.string(), z.number()]);
const NullableText = z.string().nullable().optional();

export const UserSchema = z.object({ id: Id, name: z.string(), email: z.string().email(), role: z.string().optional(), avatar_url: NullableText }).passthrough();
export const ClientSchema = z.object({ id: Id, name: z.string(), email: z.string().email(), company: NullableText, plan: z.enum(['startup', 'business', 'enterprise']).optional(), billing: z.enum(['weekly', 'monthly']).optional(), status: z.enum(['active', 'paused', 'cancelled']).optional() }).passthrough();
export const ProjectSchema = z.object({ id: Id, client_id: Id.optional(), name: z.string(), status: z.string().optional(), description: NullableText }).passthrough();
export const RequestSchema = z.object({ id: Id, client_id: Id.optional(), project_id: Id.nullable().optional(), title: z.string(), status: z.string(), priority: z.string().optional(), expected_delivery: NullableText }).passthrough();
export const AlertSchema = z.object({ id: Id, type: z.string(), title: z.string(), message: NullableText, link: NullableText, is_read: z.union([z.boolean(), z.number()]).optional(), created_at: z.string().optional() }).passthrough();
export const PlanSchema = z.object({ name: z.enum(['Startup', 'Business', 'Enterprise']), slots: z.number().int().positive(), price: z.number().nonnegative(), cadence: z.literal('wk'), monthlyPrice: z.number().nonnegative(), blurb: z.string() });

export const User = UserSchema;
export const Client = ClientSchema;
export const Project = ProjectSchema;
export const Request = RequestSchema;
export const Alert = AlertSchema;
export const Plan = PlanSchema;

export const PLAN_IDS = ['startup', 'business', 'enterprise'];
export const PLANS = PlanSchema.array().parse([
  { name: 'Startup', slots: 1, price: 870, cadence: 'wk', monthlyPrice: 3350, blurb: 'One request at a time' },
  { name: 'Business', slots: 2, price: 1550, cadence: 'wk', monthlyPrice: 6000, blurb: 'Two requests at a time' },
  { name: 'Enterprise', slots: 3, price: 2300, cadence: 'wk', monthlyPrice: 8950, blurb: 'Three requests at a time' },
]);
export const PLAN_CARE = Object.freeze({ Startup: 'starter', Business: 'growth', Enterprise: 'business' });
export const validateList = (schema, values) => z.array(schema).safeParse(values);
