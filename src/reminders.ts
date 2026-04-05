import type { CreateReminderInput, ReminderRecord } from "./types";

function asReminder(row: unknown): ReminderRecord {
  return row as ReminderRecord;
}

export async function createReminder(db: D1Database, input: CreateReminderInput): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO reminders (
        guild_id,
        channel_id,
        creator_user_id,
        event_title,
        target_date,
        timezone,
        active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .bind(
      input.guildId,
      input.channelId,
      input.creatorUserId,
      input.eventTitle,
      input.targetDate,
      input.timezone,
      now,
      now
    )
    .run();

  return Number(result.meta.last_row_id);
}

export async function listUserReminders(db: D1Database, guildId: string, userId: string): Promise<ReminderRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM reminders
       WHERE guild_id = ? AND creator_user_id = ? AND active = 1
       ORDER BY target_date ASC, id ASC`
    )
    .bind(guildId, userId)
    .all();

  return (result.results ?? []).map(asReminder);
}

export async function deleteUserReminder(db: D1Database, guildId: string, userId: string, reminderId: number): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM reminders
       WHERE id = ? AND guild_id = ? AND creator_user_id = ?`
    )
    .bind(reminderId, guildId, userId)
    .run();

  return Number(result.meta.changes) > 0;
}

export async function getActiveReminders(db: D1Database): Promise<ReminderRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM reminders
       WHERE active = 1
       ORDER BY target_date ASC, id ASC`
    )
    .all();

  return (result.results ?? []).map(asReminder);
}

export async function deactivateReminder(db: D1Database, reminderId: number): Promise<void> {
  await db
    .prepare(
      `UPDATE reminders
       SET active = 0, updated_at = ?
       WHERE id = ?`
    )
    .bind(new Date().toISOString(), reminderId)
    .run();
}

export async function recordDelivery(db: D1Database, reminderId: number, sentOn: string): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO delivery_log (
        reminder_id,
        sent_on,
        created_at
      ) VALUES (?, ?, ?)`
    )
    .bind(reminderId, sentOn, new Date().toISOString())
    .run();

  return Number(result.meta.changes) > 0;
}
