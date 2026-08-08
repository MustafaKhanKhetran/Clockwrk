-- ─── PAYMENT PREDICTIONS ──────────────────────────────────────────────────────
-- Stores one prediction row per client per expected payment cycle.
-- Re-computed nightly by the prediction engine.

CREATE TABLE IF NOT EXISTS payment_predictions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Which client this prediction is for
  client_id         INT UNSIGNED NOT NULL,

  -- The payment we expect
  predicted_amount  DECIMAL(10,2) NOT NULL,          -- USD
  predicted_date    DATE NOT NULL,                   -- when we think it lands
  confidence        TINYINT UNSIGNED NOT NULL,       -- 0–100

  -- Signal breakdown (stored so we can explain WHY confidence is what it is)
  signals           JSON NOT NULL DEFAULT (JSON_OBJECT()),
  -- e.g. {"on_time_rate":0.91,"streak":6,"active_projects":2,"active_requests":3,"billing":"monthly","days_since_last":28}

  -- Outcome tracking (auto-updated when a real payment comes in or doesn't)
  status            ENUM('pending','confirmed','missed') NOT NULL DEFAULT 'pending',
  outcome_payment_id INT UNSIGNED DEFAULT NULL,      -- FK to payments.id when confirmed
  outcome_at        DATETIME DEFAULT NULL,

  -- Bookkeeping
  view_scope        ENUM('yearly','monthly','both') NOT NULL DEFAULT 'both',
  -- yearly = confidence >= 80, monthly = < 80, both = >= 80 (shown in both)

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_client   (client_id),
  INDEX idx_date     (predicted_date),
  INDEX idx_status   (status),
  INDEX idx_scope    (view_scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─── PREDICTION RUN LOG ───────────────────────────────────────────────────────
-- Tracks every time the engine ran, so we know freshness and can debug.

CREATE TABLE IF NOT EXISTS prediction_runs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ran_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clients_scored INT UNSIGNED NOT NULL DEFAULT 0,
  predictions_created INT UNSIGNED NOT NULL DEFAULT 0,
  predictions_updated INT UNSIGNED NOT NULL DEFAULT 0,
  duration_ms   INT UNSIGNED DEFAULT NULL,
  error         TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
