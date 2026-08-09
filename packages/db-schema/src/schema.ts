import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }), name: text('name').notNull(), email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(), role: text('role'), department: text('department'), status: text('status').notNull().default('active'), salary: real('salary'),
});
export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }), name: text('name').notNull(), email: text('email').notNull(), company: text('company'), avatarUrl: text('avatar_url'),
  plan: text('plan').notNull().default('startup'), billing: text('billing').notNull().default('weekly'), status: text('status').notNull().default('active'), nextPaymentDue: text('next_payment_due'), passwordHash: text('password_hash'),
});
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }), clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'), status: text('status').notNull().default('active'), startedAt: text('started_at'), targetDelivery: text('target_delivery'),
});
export const requests = sqliteTable('requests', {
  id: integer('id').primaryKey({ autoIncrement: true }), clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }), projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: text('title').notNull(), description: text('description'), status: text('status').notNull().default('queued'), priority: text('priority').notNull().default('normal'), expectedDelivery: text('expected_delivery'),
});
export const requestComments = sqliteTable('request_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }), requestId: integer('request_id').notNull().references(() => requests.id, { onDelete: 'cascade' }), senderType: text('sender_type').notNull(), senderId: integer('sender_id'), text: text('text').notNull(), createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }), clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }), projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }), requestId: integer('request_id').references(() => requests.id, { onDelete: 'set null' }), name: text('name').notNull(), url: text('url').notNull(), mimeType: text('mime_type'), size: integer('size'), createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
export const clientMessages = sqliteTable('client_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }), clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }), projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }), sender: text('sender').notNull(), content: text('content').notNull(), createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
export const clientTickets = sqliteTable('client_tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }), clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }), subject: text('subject').notNull(), category: text('category').notNull(), priority: text('priority').notNull().default('Normal'), description: text('description').notNull(), status: text('status').notNull().default('Open'),
});
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }), clientId: integer('client_id').references(() => clients.id, { onDelete: 'set null' }), amount: real('amount').notNull(), currency: text('currency').notNull().default('USD'), status: text('status').notNull(), paymentRef: text('payment_ref'), createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
export const dashboardAlerts = sqliteTable('dashboard_alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }), type: text('type').notNull(), title: text('title').notNull(), message: text('message'), link: text('link'), isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false), createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
export const schema = { employees, clients, projects, requests, requestComments, files, clientMessages, clientTickets, payments, dashboardAlerts };
