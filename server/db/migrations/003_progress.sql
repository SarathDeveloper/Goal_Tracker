ALTER TABLE goals ADD COLUMN metric_type TEXT NOT NULL DEFAULT 'milestones'
  CHECK (metric_type IN ('milestones', 'numeric'));
ALTER TABLE goals ADD COLUMN start_value REAL;
ALTER TABLE goals ADD COLUMN target_value REAL;
ALTER TABLE goals ADD COLUMN unit TEXT NOT NULL DEFAULT '';

CREATE TABLE progress_entries (
  id INTEGER PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  value REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX progress_entries_goal ON progress_entries (goal_id, entry_date, id);
