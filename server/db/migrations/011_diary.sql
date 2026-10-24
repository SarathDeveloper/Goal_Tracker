CREATE TABLE diary_entries (
  id INTEGER PRIMARY KEY,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 120),
  body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 10000),
  mood INTEGER CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX diary_entries_date ON diary_entries (entry_date, id);
