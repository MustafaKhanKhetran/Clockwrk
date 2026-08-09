-- Client password reset token. First-time setup uses migration 007.
-- Store the SHA-256 hash of the token, not the token itself, so a DB leak
-- can't be used to hijack an account.

ALTER TABLE clients
  ADD COLUMN password_reset_token_hash CHAR(64) NULL,
  ADD COLUMN password_reset_expires_at DATETIME NULL,
  ADD INDEX idx_prt_hash (password_reset_token_hash);
