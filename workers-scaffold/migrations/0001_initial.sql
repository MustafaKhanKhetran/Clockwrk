CREATE TABLE IF NOT EXISTS "app_settings" (
  "setting_key" TEXT PRIMARY KEY,
  "setting_value" TEXT,
  "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "application_status_log" (
  "id" TEXT PRIMARY KEY,
  "application_id" TEXT DEFAULT NULL,
  "application_type" TEXT CHECK("application_type" IN ('job','internship')) NOT NULL DEFAULT 'job',
  "old_status" TEXT DEFAULT NULL,
  "new_status" TEXT DEFAULT NULL,
  "changed_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "changed_by" INTEGER DEFAULT NULL,
  FOREIGN KEY ("changed_by") REFERENCES "employees" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "assignments" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "entity_type" TEXT CHECK("entity_type" IN ('team','client','project','request')) NOT NULL,
  "entity_id" INTEGER NOT NULL,
  "employee_id" INTEGER NOT NULL,
  "assigned_by" INTEGER DEFAULT NULL,
  "role" TEXT DEFAULT NULL,
  "subtype" TEXT CHECK("subtype" IN ('member','lead','collaborator')) DEFAULT 'member',
  "note" TEXT,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "employee_id" INTEGER DEFAULT NULL,
  "action" TEXT NOT NULL,
  "category" TEXT CHECK("category" IN ('audit','communication','note','system')) DEFAULT 'audit',
  "entity_type" TEXT DEFAULT NULL,
  "entity_id" TEXT DEFAULT NULL,
  "details" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("employee_id") REFERENCES "employees" ("id")
);

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "employee_id" INTEGER NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "user_agent" TEXT DEFAULT NULL,
  "ip" TEXT DEFAULT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TEXT DEFAULT NULL,
  "expires_at" TEXT NOT NULL,
  "revoked_at" TEXT DEFAULT NULL,
  FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "booking_attendees" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "booking_id" TEXT NOT NULL,
  "employee_id" INTEGER NOT NULL,
  "role_in_meeting" TEXT DEFAULT NULL,
  "added_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "company" TEXT DEFAULT NULL,
  "client_role" TEXT DEFAULT NULL,
  "services" TEXT,
  "notes" TEXT,
  "guests" TEXT,
  "booking_date" TEXT NOT NULL,
  "booking_time" TEXT NOT NULL,
  "zoom_link" TEXT DEFAULT NULL,
  "zoom_meeting_id" TEXT DEFAULT NULL,
  "cal_booking_id" TEXT DEFAULT NULL,
  "status" TEXT DEFAULT 'confirmed',
  "fallback_used" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "assigned_to" INTEGER DEFAULT NULL,
  "is_internal" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("assigned_to") REFERENCES "employees" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "client_addons" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "addon_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT CHECK("status" IN ('active','scheduled_removal')) NOT NULL DEFAULT 'active',
  "activated_at" TEXT DEFAULT NULL,
  "ends_at" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "client_contacts" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT DEFAULT NULL,
  "can_approve" INTEGER DEFAULT 1,
  "can_bill" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "client_messages" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "project_id" INTEGER DEFAULT NULL,
  "sender" TEXT CHECK("sender" IN ('client','team')) NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "client_ticket_replies" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "ticket_id" INTEGER NOT NULL,
  "sender" TEXT CHECK("sender" IN ('client','team')) NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ticket_id") REFERENCES "client_tickets" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "client_tickets" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT CHECK("category" IN ('Technical Issue','Billing Question','General Inquiry','Revision Request','Feature Request')) NOT NULL,
  "priority" TEXT CHECK("priority" IN ('Low','Normal','High','Urgent')) DEFAULT 'Normal',
  "description" TEXT NOT NULL,
  "status" TEXT CHECK("status" IN ('Open','In Progress','Resolved','Closed')) DEFAULT 'Open',
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT DEFAULT NULL,
  "company" TEXT DEFAULT NULL,
  "avatar_url" TEXT DEFAULT NULL,
  "plan" TEXT CHECK("plan" IN ('startup','business','enterprise')) NOT NULL DEFAULT 'startup',
  "billing" TEXT CHECK("billing" IN ('weekly','monthly')) NOT NULL DEFAULT 'weekly',
  "whitelabel" INTEGER DEFAULT 0,
  "status" TEXT CHECK("status" IN ('active','paused','cancelled')) NOT NULL DEFAULT 'active',
  "payment_ref" TEXT DEFAULT NULL,
  "referral_code" TEXT DEFAULT NULL,
  "subscribed_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "next_payment_due" TEXT DEFAULT NULL,
  "last_payment_date" TEXT DEFAULT NULL,
  "notes" TEXT,
  "password_hash" TEXT DEFAULT NULL,
  "notify_prefs" TEXT DEFAULT NULL,
  "portal_onboarding_version" INTEGER NOT NULL DEFAULT 0,
  "portal_role" TEXT CHECK("portal_role" IN ('admin','member')) NOT NULL DEFAULT 'member',
  "onboarding_completed_at" TEXT DEFAULT NULL,
  "password_reset_token_hash" TEXT DEFAULT NULL,
  "password_reset_expires_at" TEXT DEFAULT NULL,
  "account_setup_token_hash" TEXT DEFAULT NULL,
  "account_setup_expires_at" TEXT DEFAULT NULL,
  "account_setup_completed_at" TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "dashboard_alerts" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "type" TEXT CHECK("type" IN ('booking','payment','newsletter','referral','application','system','error','support','message')) NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "link" TEXT DEFAULT NULL,
  "is_read" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "employees" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "two_factor_secret" TEXT DEFAULT NULL,
  "two_factor_enabled" INTEGER NOT NULL DEFAULT 0,
  "two_factor_verified_at" TEXT DEFAULT NULL,
  "two_factor_backup_codes" TEXT DEFAULT NULL,
  "password_setup_token_hash" TEXT DEFAULT NULL,
  "password_setup_expires_at" TEXT DEFAULT NULL,
  "role" TEXT CHECK("role" IN ('owner','admin','head_of_design','head_of_development','head_of_delivery','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer','sales','marketing_manager','seo_specialist','social_media_manager','content_writer','operations_manager','finance','hr','legal','executive_assistant','support','viewer')) DEFAULT NULL,
  "level" TEXT CHECK("level" IN ('intern','junior','mid','senior','lead','head','director')) DEFAULT NULL,
  "max_capacity" INTEGER DEFAULT NULL,
  "department" TEXT DEFAULT NULL,
  "salary" REAL DEFAULT NULL,
  "status" TEXT CHECK("status" IN ('active','on_leave','inactive')) NOT NULL DEFAULT 'active',
  "joined_date" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "phone" TEXT DEFAULT NULL,
  "avatar_url" TEXT,
  "emergency_contact" TEXT DEFAULT NULL,
  "notes" TEXT,
  "last_seen_at" TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "category" TEXT CHECK("category" IN ('software','salary','marketing','infrastructure','misc')) NOT NULL DEFAULT 'misc',
  "description" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "date" TEXT NOT NULL,
  "added_by" INTEGER DEFAULT NULL,
  "notes" TEXT,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("added_by") REFERENCES "employees" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "files" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER DEFAULT NULL,
  "project_id" INTEGER DEFAULT NULL,
  "request_id" INTEGER DEFAULT NULL,
  "uploaded_by" INTEGER DEFAULT NULL,
  "file_name" TEXT DEFAULT NULL,
  "file_url" TEXT,
  "file_type" TEXT DEFAULT NULL,
  "category" TEXT DEFAULT NULL,
  "version" TEXT DEFAULT NULL,
  "notes" TEXT,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "message_id" INTEGER DEFAULT NULL,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id"),
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id"),
  FOREIGN KEY ("request_id") REFERENCES "requests" ("id"),
  FOREIGN KEY ("uploaded_by") REFERENCES "employees" ("id"),
  FOREIGN KEY ("message_id") REFERENCES "client_messages" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "internship_applications" (
  "id" TEXT PRIMARY KEY,
  "job_id" TEXT DEFAULT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT DEFAULT NULL,
  "location" TEXT DEFAULT NULL,
  "university" TEXT DEFAULT NULL,
  "program" TEXT DEFAULT NULL,
  "enrollment_status" TEXT DEFAULT NULL,
  "graduation_year" INTEGER DEFAULT NULL,
  "year_of_study" TEXT DEFAULT NULL,
  "area_of_interest" TEXT DEFAULT NULL,
  "portfolio_url" TEXT DEFAULT NULL,
  "linkedin_url" TEXT DEFAULT NULL,
  "resume_url" TEXT DEFAULT NULL,
  "availability_start" TEXT DEFAULT NULL,
  "availability_duration" TEXT DEFAULT NULL,
  "hours_per_week" TEXT DEFAULT NULL,
  "skills" TEXT,
  "referral_source" TEXT DEFAULT NULL,
  "why_clockwrk" TEXT,
  "strongest_skill" TEXT,
  "improvement_area" TEXT,
  "work_style" TEXT DEFAULT NULL,
  "extra_note" TEXT,
  "status" TEXT DEFAULT 'new',
  "notes" TEXT,
  "applied_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "job_applications" (
  "id" TEXT PRIMARY KEY,
  "job_id" TEXT DEFAULT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT DEFAULT NULL,
  "location" TEXT DEFAULT NULL,
  "availability_type" TEXT DEFAULT NULL,
  "availability_start" TEXT DEFAULT NULL,
  "experience_yrs" TEXT DEFAULT NULL,
  "linkedin_url" TEXT DEFAULT NULL,
  "seniority_level" TEXT DEFAULT NULL,
  "current_role" TEXT DEFAULT NULL,
  "remote_experience" TEXT DEFAULT NULL,
  "has_shipped_work" TEXT DEFAULT NULL,
  "additional_links" TEXT,
  "resume_url" TEXT DEFAULT NULL,
  "skills" TEXT,
  "best_work_description" TEXT,
  "hardest_part" TEXT,
  "why_clockwrk" TEXT,
  "strongest_skill" TEXT,
  "improvement_area" TEXT,
  "work_style" TEXT DEFAULT NULL,
  "extra_note" TEXT,
  "status" TEXT DEFAULT 'new',
  "notes" TEXT,
  "applied_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "job_listings" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "department" TEXT DEFAULT NULL,
  "type" TEXT DEFAULT NULL,
  "status" TEXT CHECK("status" IN ('open','closed')) DEFAULT 'open',
  "location" TEXT DEFAULT NULL,
  "description" TEXT,
  "requirements" TEXT,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "email" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT DEFAULT 'footer',
  "status" TEXT DEFAULT 'active',
  "subscribed_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_predictions" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "predicted_amount" REAL NOT NULL,
  "predicted_date" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "signals" TEXT NOT NULL,
  "status" TEXT CHECK("status" IN ('pending','confirmed','missed')) NOT NULL DEFAULT 'pending',
  "outcome_payment_id" INTEGER DEFAULT NULL,
  "outcome_at" TEXT DEFAULT NULL,
  "view_scope" TEXT CHECK("view_scope" IN ('yearly','monthly','both')) NOT NULL DEFAULT 'both',
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_releases" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "requested_by" INTEGER NOT NULL,
  "amount_usd" REAL NOT NULL,
  "fee_usd" REAL DEFAULT 30.00,
  "notes" TEXT,
  "status" TEXT CHECK("status" IN ('pending','approved','rejected')) DEFAULT 'pending',
  "exchange_rate" REAL DEFAULT NULL,
  "received_pkr" REAL DEFAULT NULL,
  "screenshot_url" TEXT DEFAULT NULL,
  "rejection_reason" TEXT DEFAULT NULL,
  "requested_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "released_at" TEXT DEFAULT NULL,
  "released_by" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER DEFAULT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "company" TEXT DEFAULT NULL,
  "plan" TEXT CHECK("plan" IN ('startup','business','enterprise')) NOT NULL,
  "billing" TEXT CHECK("billing" IN ('weekly','monthly')) NOT NULL,
  "amount" REAL NOT NULL,
  "fee_usd" REAL DEFAULT 30.00,
  "received_usd" REAL DEFAULT NULL,
  "exchange_rate" REAL DEFAULT 275.6200,
  "received_pkr" REAL DEFAULT NULL,
  "whitelabel" INTEGER DEFAULT 0,
  "payment_ref" TEXT DEFAULT NULL,
  "txn_id" TEXT DEFAULT NULL,
  "referral_code" TEXT DEFAULT NULL,
  "status" TEXT CHECK("status" IN ('pending','confirmed','failed')) NOT NULL DEFAULT 'pending',
  "submitted_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TEXT DEFAULT NULL,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "prediction_runs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "ran_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clients_scored" INTEGER NOT NULL DEFAULT 0,
  "predictions_created" INTEGER NOT NULL DEFAULT 0,
  "predictions_updated" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER DEFAULT NULL,
  "error" TEXT
);

CREATE TABLE IF NOT EXISTS "project_links" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "project_id" INTEGER NOT NULL,
  "kind" TEXT CHECK("kind" IN ('production','staging','figma','github','appstore','docs','prototype','other')) NOT NULL DEFAULT 'other',
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "project_resources" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "project_id" INTEGER NOT NULL,
  "client_id" INTEGER DEFAULT NULL,
  "kind" TEXT CHECK("kind" IN ('brand','website','requirements','competitor','figma','drive','research','other')) NOT NULL DEFAULT 'other',
  "title" TEXT NOT NULL,
  "url" TEXT,
  "file_url" TEXT,
  "file_name" TEXT DEFAULT NULL,
  "notes" TEXT,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT DEFAULT NULL,
  "icon_emoji" TEXT DEFAULT NULL,
  "logo_url" TEXT,
  "status" TEXT CHECK("status" IN ('active','paused','completed')) NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "goal" TEXT,
  "audience" TEXT DEFAULT NULL,
  "success_measure" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "project_manager_id" INTEGER DEFAULT NULL,
  "priority" TEXT CHECK("priority" IN ('low','normal','high','urgent')) DEFAULT 'normal',
  "progress_percent" INTEGER DEFAULT 0,
  "start_date" TEXT DEFAULT NULL,
  "due_date" TEXT DEFAULT NULL,
  "estimated_hours" REAL DEFAULT 0.00,
  "github_repo" TEXT,
  "staging_url" TEXT,
  "live_url" TEXT,
  "tech_stack" TEXT,
  "health_status" TEXT CHECK("health_status" IN ('healthy','warning','critical')) DEFAULT 'healthy',
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT PRIMARY KEY,
  "referrer_id" TEXT DEFAULT NULL,
  "client_name" TEXT DEFAULT NULL,
  "client_email" TEXT DEFAULT NULL,
  "plan_tier" TEXT DEFAULT NULL,
  "order_amount" REAL DEFAULT NULL,
  "reward_amount" REAL DEFAULT NULL,
  "status" TEXT DEFAULT 'pending',
  "converted_at" TEXT DEFAULT NULL,
  "rewarded_at" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "referrers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT DEFAULT NULL,
  "email" TEXT NOT NULL,
  "referral_code" TEXT NOT NULL,
  "is_verified" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "request_activity" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "request_id" INTEGER NOT NULL,
  "actor_type" TEXT CHECK("actor_type" IN ('client','employee','system')) NOT NULL DEFAULT 'system',
  "actor_id" INTEGER DEFAULT NULL,
  "event_type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "metadata" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("request_id") REFERENCES "requests" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "request_breakdown_parts" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "parent_request_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT DEFAULT NULL,
  "priority" TEXT CHECK("priority" IN ('low','normal','high','urgent')) NOT NULL DEFAULT 'normal',
  "position" INTEGER NOT NULL,
  "depends_on_part_id" INTEGER DEFAULT NULL,
  "child_request_id" INTEGER DEFAULT NULL,
  "created_by_employee_id" INTEGER DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("child_request_id") REFERENCES "requests" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("created_by_employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("depends_on_part_id") REFERENCES "request_breakdown_parts" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("parent_request_id") REFERENCES "requests" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "request_comments" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "request_id" INTEGER NOT NULL,
  "employee_id" INTEGER DEFAULT NULL,
  "client_id" INTEGER DEFAULT NULL,
  "comment" TEXT NOT NULL,
  "visibility" TEXT CHECK("visibility" IN ('internal','client')) DEFAULT 'internal',
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("request_id") REFERENCES "requests" ("id"),
  FOREIGN KEY ("employee_id") REFERENCES "employees" ("id")
);

CREATE TABLE IF NOT EXISTS "requests" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "project_id" INTEGER NOT NULL,
  "client_id" INTEGER NOT NULL,
  "assigned_to" INTEGER DEFAULT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT DEFAULT NULL,
  "status" TEXT CHECK("status" IN ('queue','in_progress','in_review','revision','completed')) NOT NULL DEFAULT 'queue',
  "priority" TEXT CHECK("priority" IN ('low','normal','high','urgent')) NOT NULL DEFAULT 'normal',
  "delivery_files" TEXT,
  "revision_notes" TEXT,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TEXT DEFAULT NULL,
  "due_date" TEXT DEFAULT NULL,
  "estimated_hours" REAL DEFAULT 0.00,
  "completion_percent" INTEGER DEFAULT 0,
  "approval_status" TEXT CHECK("approval_status" IN ('pending','approved','rejected')) DEFAULT 'pending',
  "request_kind" TEXT CHECK("request_kind" IN ('normal','parent','child')) NOT NULL DEFAULT 'normal',
  "parent_request_id" INTEGER DEFAULT NULL,
  "scope_status" TEXT CHECK("scope_status" IN ('none','reviewing','proposed','approved')) NOT NULL DEFAULT 'none',
  "queue_position" INTEGER DEFAULT NULL,
  "part_number" INTEGER DEFAULT NULL,
  "depends_on_request_id" INTEGER DEFAULT NULL,
  "breakdown_approved_at" TEXT DEFAULT NULL,
  "breakdown_approved_by_client_id" INTEGER DEFAULT NULL,
  FOREIGN KEY ("breakdown_approved_by_client_id") REFERENCES "clients" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("depends_on_request_id") REFERENCES "requests" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("parent_request_id") REFERENCES "requests" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("assigned_to") REFERENCES "employees" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "subscription_changes" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "client_id" INTEGER NOT NULL,
  "kind" TEXT CHECK("kind" IN ('plan','addon','cadence','retainer')) NOT NULL,
  "direction" TEXT CHECK("direction" IN ('upgrade','downgrade','add','remove','switch')) NOT NULL DEFAULT 'upgrade',
  "mode" TEXT CHECK("mode" IN ('prorate_now','at_renewal','fresh_cycle')) NOT NULL DEFAULT 'prorate_now',
  "from_value" TEXT DEFAULT NULL,
  "to_value" TEXT NOT NULL,
  "target_cadence" TEXT CHECK("target_cadence" IN ('weekly','monthly')) DEFAULT NULL,
  "quantity" INTEGER DEFAULT 1,
  "full_price" REAL DEFAULT 0.00,
  "credit_applied" REAL DEFAULT 0.00,
  "amount_due" REAL DEFAULT 0.00,
  "amount_received" REAL DEFAULT 0.00,
  "payment_ref" TEXT NOT NULL,
  "status" TEXT CHECK("status" IN ('awaiting_payment','payment_reported','partially_paid','active','scheduled','cancelled','expired','rejected')) NOT NULL DEFAULT 'awaiting_payment',
  "effective_date" TEXT DEFAULT NULL,
  "new_billing_date" TEXT DEFAULT NULL,
  "requested_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "reported_at" TEXT DEFAULT NULL,
  "verified_at" TEXT DEFAULT NULL,
  "expires_at" TEXT DEFAULT NULL,
  "notes" TEXT,
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "lead_id" INTEGER DEFAULT NULL,
  "department" TEXT DEFAULT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("lead_id") REFERENCES "employees" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "time_logs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "request_id" INTEGER DEFAULT NULL,
  "project_id" INTEGER DEFAULT NULL,
  "employee_id" INTEGER NOT NULL,
  "hours" REAL NOT NULL,
  "description" TEXT,
  "log_date" TEXT NOT NULL,
  "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("request_id") REFERENCES "requests" ("id"),
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id"),
  FOREIGN KEY ("employee_id") REFERENCES "employees" ("id")
);


-- Indexes

CREATE INDEX IF NOT EXISTS "ix_application_status_log_changed_by" ON "application_status_log" ("changed_by");

CREATE INDEX IF NOT EXISTS "ix_assignments_idx_entity" ON "assignments" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "ix_assignments_idx_employee" ON "assignments" ("employee_id");

CREATE INDEX IF NOT EXISTS "ix_audit_logs_employee_id" ON "audit_logs" ("employee_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_auth_sessions_uk_refresh_hash" ON "auth_sessions" ("refresh_token_hash");

CREATE INDEX IF NOT EXISTS "ix_auth_sessions_idx_employee_active" ON "auth_sessions" ("employee_id", "revoked_at");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_booking_attendees_uniq_booking_emp" ON "booking_attendees" ("booking_id", "employee_id");

CREATE INDEX IF NOT EXISTS "ix_booking_attendees_idx_booking" ON "booking_attendees" ("booking_id");

CREATE INDEX IF NOT EXISTS "ix_booking_attendees_idx_employee" ON "booking_attendees" ("employee_id");

CREATE INDEX IF NOT EXISTS "ix_bookings_assigned_to" ON "bookings" ("assigned_to");

CREATE INDEX IF NOT EXISTS "ix_client_addons_idx_ca_client" ON "client_addons" ("client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_client_contacts_uniq_cc" ON "client_contacts" ("client_id", "email");

CREATE INDEX IF NOT EXISTS "ix_client_contacts_idx_cc_client" ON "client_contacts" ("client_id");

CREATE INDEX IF NOT EXISTS "ix_client_messages_client_id" ON "client_messages" ("client_id");

CREATE INDEX IF NOT EXISTS "ix_client_messages_idx_cm_project" ON "client_messages" ("project_id");

CREATE INDEX IF NOT EXISTS "ix_client_ticket_replies_ticket_id" ON "client_ticket_replies" ("ticket_id");

CREATE INDEX IF NOT EXISTS "ix_client_tickets_client_id" ON "client_tickets" ("client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_clients_email" ON "clients" ("email");

CREATE INDEX IF NOT EXISTS "ix_clients_idx_prt_hash" ON "clients" ("password_reset_token_hash");

CREATE INDEX IF NOT EXISTS "ix_clients_idx_client_setup_token" ON "clients" ("account_setup_token_hash");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_employees_email" ON "employees" ("email");

CREATE INDEX IF NOT EXISTS "ix_employees_idx_last_seen" ON "employees" ("last_seen_at");

CREATE INDEX IF NOT EXISTS "ix_employees_idx_employee_setup_token" ON "employees" ("password_setup_token_hash");

CREATE INDEX IF NOT EXISTS "ix_expenses_added_by" ON "expenses" ("added_by");

CREATE INDEX IF NOT EXISTS "ix_files_client_id" ON "files" ("client_id");

CREATE INDEX IF NOT EXISTS "ix_files_project_id" ON "files" ("project_id");

CREATE INDEX IF NOT EXISTS "ix_files_request_id" ON "files" ("request_id");

CREATE INDEX IF NOT EXISTS "ix_files_uploaded_by" ON "files" ("uploaded_by");

CREATE INDEX IF NOT EXISTS "ix_files_idx_files_message" ON "files" ("message_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_newsletter_subscribers_unique_email_type" ON "newsletter_subscribers" ("email", "type");

CREATE INDEX IF NOT EXISTS "ix_payment_predictions_idx_client" ON "payment_predictions" ("client_id");

CREATE INDEX IF NOT EXISTS "ix_payment_predictions_idx_date" ON "payment_predictions" ("predicted_date");

CREATE INDEX IF NOT EXISTS "ix_payment_predictions_idx_status" ON "payment_predictions" ("status");

CREATE INDEX IF NOT EXISTS "ix_payment_predictions_idx_scope" ON "payment_predictions" ("view_scope");

CREATE INDEX IF NOT EXISTS "ix_payment_releases_idx_status" ON "payment_releases" ("status");

CREATE INDEX IF NOT EXISTS "ix_payment_releases_idx_requested_by" ON "payment_releases" ("requested_by");

CREATE INDEX IF NOT EXISTS "ix_payments_client_id" ON "payments" ("client_id");

CREATE INDEX IF NOT EXISTS "ix_project_links_idx_pl_project" ON "project_links" ("project_id");

CREATE INDEX IF NOT EXISTS "ix_project_resources_idx_pr_project" ON "project_resources" ("project_id");

CREATE INDEX IF NOT EXISTS "ix_projects_client_id" ON "projects" ("client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_referrers_email" ON "referrers" ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_referrers_referral_code" ON "referrers" ("referral_code");

CREATE INDEX IF NOT EXISTS "ix_request_activity_idx_request_activity_request" ON "request_activity" ("request_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_request_breakdown_parts_uq_breakdown_parent_position" ON "request_breakdown_parts" ("parent_request_id", "position");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_request_breakdown_parts_uq_breakdown_child" ON "request_breakdown_parts" ("child_request_id");

CREATE INDEX IF NOT EXISTS "ix_request_breakdown_parts_idx_breakdown_dependency" ON "request_breakdown_parts" ("depends_on_part_id");

CREATE INDEX IF NOT EXISTS "ix_request_breakdown_parts_idx_breakdown_creator" ON "request_breakdown_parts" ("created_by_employee_id");

CREATE INDEX IF NOT EXISTS "ix_request_comments_request_id" ON "request_comments" ("request_id");

CREATE INDEX IF NOT EXISTS "ix_request_comments_employee_id" ON "request_comments" ("employee_id");

CREATE INDEX IF NOT EXISTS "ix_request_comments_idx_rc_client" ON "request_comments" ("client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_requests_uq_requests_parent_part" ON "requests" ("parent_request_id", "part_number");

CREATE INDEX IF NOT EXISTS "ix_requests_project_id" ON "requests" ("project_id");

CREATE INDEX IF NOT EXISTS "ix_requests_assigned_to" ON "requests" ("assigned_to");

CREATE INDEX IF NOT EXISTS "ix_requests_idx_requests_parent" ON "requests" ("parent_request_id");

CREATE INDEX IF NOT EXISTS "ix_requests_idx_requests_queue" ON "requests" ("client_id", "status", "queue_position");

CREATE INDEX IF NOT EXISTS "ix_requests_idx_requests_dependency" ON "requests" ("depends_on_request_id");

CREATE INDEX IF NOT EXISTS "ix_requests_fk_requests_breakdown_client" ON "requests" ("breakdown_approved_by_client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ux_subscription_changes_uniq_ref" ON "subscription_changes" ("payment_ref");

CREATE INDEX IF NOT EXISTS "ix_subscription_changes_idx_sc_client" ON "subscription_changes" ("client_id");

CREATE INDEX IF NOT EXISTS "ix_subscription_changes_idx_sc_status" ON "subscription_changes" ("status");

CREATE INDEX IF NOT EXISTS "ix_teams_lead_id" ON "teams" ("lead_id");

CREATE INDEX IF NOT EXISTS "ix_time_logs_request_id" ON "time_logs" ("request_id");

CREATE INDEX IF NOT EXISTS "ix_time_logs_project_id" ON "time_logs" ("project_id");

CREATE INDEX IF NOT EXISTS "ix_time_logs_employee_id" ON "time_logs" ("employee_id");
