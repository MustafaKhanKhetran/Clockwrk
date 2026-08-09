ALTER TABLE employees
  ADD COLUMN password_setup_token_hash CHAR(64) NULL AFTER password_hash,
  ADD COLUMN password_setup_expires_at DATETIME NULL AFTER password_setup_token_hash,
  ADD INDEX idx_employee_setup_token (password_setup_token_hash);
