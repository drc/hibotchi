CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  creator_user_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  target_date TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_owner
  ON reminders (guild_id, creator_user_id, active, target_date);

CREATE INDEX IF NOT EXISTS idx_reminders_active
  ON reminders (active, target_date);

CREATE TABLE IF NOT EXISTS delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL,
  sent_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_log_unique
  ON delivery_log (reminder_id, sent_on);
