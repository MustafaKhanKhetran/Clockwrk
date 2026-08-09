ALTER TABLE clients
  ADD COLUMN portal_onboarding_version INT NOT NULL DEFAULT 0 AFTER notify_prefs,
  ADD COLUMN onboarding_completed_at DATETIME NULL AFTER portal_onboarding_version;

ALTER TABLE requests
  ADD COLUMN request_kind ENUM('normal','parent','child') NOT NULL DEFAULT 'normal' AFTER approval_status,
  ADD COLUMN parent_request_id INT NULL AFTER request_kind,
  ADD COLUMN scope_status ENUM('none','reviewing','proposed','approved') NOT NULL DEFAULT 'none' AFTER parent_request_id,
  ADD COLUMN queue_position BIGINT NULL AFTER scope_status,
  ADD COLUMN part_number INT NULL AFTER queue_position,
  ADD COLUMN depends_on_request_id INT NULL AFTER part_number,
  ADD COLUMN breakdown_approved_at DATETIME NULL AFTER depends_on_request_id,
  ADD COLUMN breakdown_approved_by_client_id INT NULL AFTER breakdown_approved_at,
  ADD INDEX idx_requests_parent (parent_request_id),
  ADD INDEX idx_requests_queue (client_id, status, queue_position),
  ADD INDEX idx_requests_dependency (depends_on_request_id),
  ADD UNIQUE KEY uq_requests_parent_part (parent_request_id, part_number),
  ADD CONSTRAINT fk_requests_parent FOREIGN KEY (parent_request_id) REFERENCES requests(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_requests_dependency FOREIGN KEY (depends_on_request_id) REFERENCES requests(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_requests_breakdown_client FOREIGN KEY (breakdown_approved_by_client_id) REFERENCES clients(id) ON DELETE SET NULL;

UPDATE requests r
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at, id) * 1024 AS position_value
  FROM requests
  WHERE status = 'queue'
) positions ON positions.id = r.id
SET r.queue_position = positions.position_value;

CREATE TABLE request_breakdown_parts (
  id INT NOT NULL AUTO_INCREMENT,
  parent_request_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(100) NULL,
  priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  position INT NOT NULL,
  depends_on_part_id INT NULL,
  child_request_id INT NULL,
  created_by_employee_id INT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_breakdown_parent_position (parent_request_id, position),
  UNIQUE KEY uq_breakdown_child (child_request_id),
  KEY idx_breakdown_dependency (depends_on_part_id),
  KEY idx_breakdown_creator (created_by_employee_id),
  CONSTRAINT fk_breakdown_parent FOREIGN KEY (parent_request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_breakdown_dependency FOREIGN KEY (depends_on_part_id) REFERENCES request_breakdown_parts(id) ON DELETE SET NULL,
  CONSTRAINT fk_breakdown_child FOREIGN KEY (child_request_id) REFERENCES requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_breakdown_creator FOREIGN KEY (created_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE request_activity (
  id BIGINT NOT NULL AUTO_INCREMENT,
  request_id INT NOT NULL,
  actor_type ENUM('client','employee','system') NOT NULL DEFAULT 'system',
  actor_id INT NULL,
  event_type VARCHAR(80) NOT NULL,
  label VARCHAR(255) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_activity_request (request_id, created_at),
  CONSTRAINT fk_request_activity_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);
