ALTER TABLE subscription_changes
  ADD COLUMN target_cadence ENUM('weekly', 'monthly') NULL AFTER to_value;
