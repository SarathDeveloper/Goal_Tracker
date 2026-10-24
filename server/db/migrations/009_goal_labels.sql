ALTER TABLE goals ADD COLUMN start_label TEXT NOT NULL DEFAULT '' CHECK (length(start_label) <= 200);
ALTER TABLE goals ADD COLUMN target_label TEXT NOT NULL DEFAULT '' CHECK (length(target_label) <= 200);
