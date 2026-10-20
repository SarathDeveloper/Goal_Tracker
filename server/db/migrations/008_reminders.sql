CREATE TABLE reminder_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  days_before INTEGER NOT NULL DEFAULT 3 CHECK (days_before BETWEEN 0 AND 30),
  check_time TEXT NOT NULL DEFAULT '09:00'
);

INSERT INTO reminder_settings (id, enabled, days_before, check_time) VALUES (1, 1, 3, '09:00');

CREATE TABLE reminder_log (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('goal', 'habit')),
  subject_id INTEGER NOT NULL,
  period_key TEXT NOT NULL,
  shown_at TEXT NOT NULL,
  UNIQUE (kind, subject_id, period_key)
);
