-- First-time client onboarding is intentionally separate from password reset.
-- Setup links can collect profile/team details; reset links only change a password.

ALTER TABLE clients
  ADD COLUMN avatar_url VARCHAR(2048) NULL AFTER company,
  ADD COLUMN account_setup_token_hash CHAR(64) NULL AFTER password_reset_expires_at,
  ADD COLUMN account_setup_expires_at DATETIME NULL AFTER account_setup_token_hash,
  ADD COLUMN account_setup_completed_at DATETIME NULL AFTER account_setup_expires_at,
  ADD INDEX idx_client_setup_token (account_setup_token_hash);
