# Clockwrk Dashboard Editable Elements

This file maps dashboard editability to the current database schema in `db.txt` and the existing action-based n8n webhook pattern.

Rule: the frontend should only enable a control when a matching backend action exists or the UI clearly labels it as backend required.

## Clients

Table: `clients`

Editable fields:
- `name`, `email`, `company`
- `plan`, `billing`, `whitelabel`
- `status`
- `payment_ref`, `referral_code`
- `next_payment_due`, `last_payment_date`
- `notes`

Current frontend support:
- Owner/admin can add clients with `dashboard-clients` action `add`.
- Owner/admin/project_manager/account_manager can update `status` with action `update_status`.
- Finance can view billing fields.
- Sales can view lead-safe fields.

Backend required:
- `update_client` for full client profile edits.
- `update_billing_fields` for payment/due-date edits.
- `assign_client_team` using `client_team_assignments`.

## Projects

Table: `projects`

Editable fields:
- `name`, `client_id`, `project_manager_id`
- `status`, `priority`, `progress_percent`, `health_status`
- `start_date`, `due_date`, `estimated_hours`
- `github_repo`, `staging_url`, `live_url`, `tech_stack`
- `notes`

Current frontend support:
- Project create/update form exists through `dashboard-projects` actions `create` and `update`.
- File links can be attached to projects.

Backend required:
- Ensure `dashboard-projects` persists every schema-backed field.
- Add assignment management for `project_assignments`.

## Requests

Table: `requests`

Editable fields:
- `title`, `description`
- `type`, `status`, `priority`
- `assigned_to`, `due_date`
- `estimated_hours`, `completion_percent`
- `delivery_files`, `revision_notes`
- `approval_status`

Related editable tables:
- `request_assignments`
- `request_collaborators`
- `request_comments`
- `time_logs`
- `files`

Current frontend support:
- Create/update form exists through `dashboard-requests` actions `create` and `update`.
- Status update exists through `update_status`.
- Approval update, comments, and time logging are wired but depend on backend support.
- File links can be attached to requests.

Backend required:
- Confirm `add_comment`, `log_time`, and approval writes.
- Add collaborator and assignment management.

## Bookings

Table: `bookings`

Editable fields:
- `name`, `email`, `company`
- `services`, `notes`, `guests`
- `booking_date`, `booking_time`
- `zoom_link`, `zoom_meeting_id`
- `status`
- `assigned_to`

Current frontend support:
- Status update exists through `dashboard-bookings` action `update_status`.
- Zoom link is displayed and joinable.

Backend required:
- `update_booking` for full booking edits.
- `assign_booking` for `assigned_to`.
- Safe reschedule behavior for `booking_date` and `booking_time`.

## Finance

Tables: `payments`, `expenses`, `employees`

Editable fields:
- Payments: `status`, `confirmed_at`, `txn_id`
- Expenses: `category`, `description`, `amount`, `currency`, `date`, `notes`
- Employees salary status is workflow-driven, not directly represented as a salary ledger table in `db.txt`.

Current frontend support:
- Confirm payments with `confirm_payment`.
- Add/edit/delete expenses with `add_expense`, `edit_expense`, `delete_expense`.
- Mark salary paid with `mark_salary_paid`.
- Currency display should stay PKR.

Backend required:
- Payment edit action for correction workflows.
- Dedicated salary payment ledger if salary payments need auditability.

## Team

Table: `employees`

Editable fields:
- `name`, `email`, `role`, `level`, `department`
- `max_capacity`, `salary`, `status`
- `joined_date`, `phone`, `avatar_url`
- `emergency_contact`, `notes`

Related tables:
- `teams`
- `team_members`

Current frontend support:
- Add/edit employees with `dashboard-team` action `create/update`.
- Deactivate employee action exists in UI.

Backend required:
- Confirm password-safe employee creation/update behavior.
- Team membership management for `teams` and `team_members`.

## Jobs And Applications

Tables: `job_listings`, `applications`, `application_status_log`

Editable fields:
- Job listings: `title`, `department`, `type`, `status`, `location`, `description`, `requirements`, `is_active`
- Applications: `status`, `notes`
- Application log: `note`, `changed_by`

Current frontend support:
- Add/edit jobs with `dashboard-hr` action `create/update`.
- Update application status from the applications table.

Backend required:
- Persist status logs to `application_status_log`.
- Interview scheduling if `Interviews Scheduled` becomes a real HR workflow.

## Time Logs

Table: `time_logs`

Editable fields:
- `request_id`, `project_id`, `employee_id`
- `hours`, `description`, `log_date`

Current frontend support:
- Add/edit/delete time logs with `dashboard-time-logs`.

Backend required:
- Confirm role filters for employee-specific time views.

## Files

Table: `files`

Editable fields:
- `client_id`, `project_id`, `request_id`
- `file_name`, `file_url`, `file_type`
- `category`, `version`, `notes`

Current frontend support:
- Add file links through `dashboard-files`.

Backend required:
- Edit/delete file links.
- Upload workflow if files should be stored, not only linked.

## Communications

Table source: `audit_logs` with category `communication` or a webhook-backed communication view.

Editable fields:
- Communication entries should generally be append-only.
- Notes may be appended, not silently edited.

Current frontend support:
- Communication timeline is read-only.

Backend required:
- Add communication/note action if team members should append timeline entries.

## Alerts

Table: `dashboard_alerts`

Editable fields:
- `is_read`
- Bulk clear/delete for read alerts

Current frontend support:
- Mark read, mark all read, clear read alerts.

Backend required:
- Alert delete by id if needed.

## Newsletter

Table: `newsletter_subscribers`

Editable fields:
- `email`, `type`, `source`, `status`

Current frontend support:
- Unsubscribe.
- Send newsletter through webhook action.

Backend required:
- Edit subscriber metadata.
- Resubscribe/reactivate action.

## Referrals

Tables: `referrers`, `referrals`

Editable fields:
- Referrers: `name`, `email`, `referral_code`, `is_verified`
- Referrals: `status`, `reward_amount`, `rewarded_at`

Current frontend support:
- Mark referral paid.

Backend required:
- Edit referrer profile.
- Verify/unverify referrer.
- Adjust reward amount with audit log.

## Calendar

Source tables:
- `bookings`
- `requests`
- `projects`
- `payments`

Editable behavior:
- Calendar itself should not directly edit source records unless it routes to the owning entity.
- Booking reschedule, request due date edits, payment due-date edits, and project due-date edits should happen in their source modules.

Current frontend support:
- Calendar is read-only with detail drawer.

Backend required:
- Entity deep links or edit routing from calendar events.

## Audit Logs

Table: `audit_logs`

Editable behavior:
- Audit logs should be read-only.
- New rows should be appended by backend actions.

Current frontend support:
- Stub page only.

Backend required:
- List/filter audit logs.

## Website Health And Workflow Health

Source:
- n8n workflow health checks and system probes.

Editable behavior:
- Read-only dashboard views.
- Workflow remediation should happen in n8n/Cloudflare/backend tooling, not direct frontend writes.

Current frontend support:
- Stub pages only.

Backend required:
- Health-check branches for each n8n workflow using safe GET or `healthcheck=1`, no DB writes.
