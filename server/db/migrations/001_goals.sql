CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  color TEXT NOT NULL CHECK (color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  created_at TEXT NOT NULL
);

CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  start_date TEXT CHECK (start_date IS NULL OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  target_date TEXT CHECK (target_date IS NULL OR target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  completed_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (start_date IS NULL OR target_date IS NULL OR target_date >= start_date)
);

CREATE INDEX goals_status ON goals (status);
CREATE INDEX goals_target_date ON goals (target_date);
CREATE INDEX goals_category_id ON goals (category_id);

INSERT INTO categories (name, color, created_at) VALUES
  ('Health', '#0f766e', '2026-01-01T00:00:00.000Z'),
  ('Career', '#1d4ed8', '2026-01-01T00:00:00.000Z'),
  ('Learning', '#7c3aed', '2026-01-01T00:00:00.000Z'),
  ('Finance', '#b45309', '2026-01-01T00:00:00.000Z'),
  ('Personal', '#be123c', '2026-01-01T00:00:00.000Z');
