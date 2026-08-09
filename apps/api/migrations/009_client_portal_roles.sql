ALTER TABLE clients
  ADD COLUMN portal_role ENUM('admin','member') NOT NULL DEFAULT 'member'
  AFTER portal_onboarding_version;
