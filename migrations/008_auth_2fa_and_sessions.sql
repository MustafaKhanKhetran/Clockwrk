-- Two-factor auth + refresh-token sessions for employees.
-- Access tokens shrink from 7d to 15 min; refresh tokens (opaque, sha256-hashed
-- in DB) rotate on use and can be revoked out-of-band from auth_sessions.

ALTER TABLE employees
  ADD COLUMN two_factor_secret VARCHAR(255) NULL AFTER password_hash,
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER two_factor_secret,
  ADD COLUMN two_factor_verified_at DATETIME NULL AFTER two_factor_enabled,
  ADD COLUMN two_factor_backup_codes JSON NULL AFTER two_factor_verified_at;

CREATE TABLE auth_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uk_refresh_hash (refresh_token_hash),
  KEY idx_employee_active (employee_id, revoked_at),
  CONSTRAINT fk_sessions_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;
