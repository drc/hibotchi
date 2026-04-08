-- Recreate delivery_log table with ON DELETE CASCADE
-- SQLite doesn't support ALTER TABLE to modify foreign keys, so we need to recreate the table

-- Step 1: Create temporary table with the new schema
CREATE TABLE delivery_log_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL,
  sent_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);

-- Step 2: Copy existing data
INSERT INTO delivery_log_new SELECT * FROM delivery_log;

-- Step 3: Drop old table
DROP TABLE delivery_log;

-- Step 4: Rename new table to original name
ALTER TABLE delivery_log_new RENAME TO delivery_log;

-- Step 5: Recreate the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_log_unique
  ON delivery_log (reminder_id, sent_on);
