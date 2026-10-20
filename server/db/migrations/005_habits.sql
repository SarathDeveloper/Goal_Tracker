CREATE TABLE habits (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 120),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  target_per_period INTEGER NOT NULL CHECK (target_per_period BETWEEN 1 AND 7),
  goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (frequency != 'daily' OR target_per_period = 1)
);

CREATE TABLE habit_checkins (
  id INTEGER PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL CHECK (checkin_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, checkin_date)
);

CREATE INDEX habits_goal ON habits (goal_id);
