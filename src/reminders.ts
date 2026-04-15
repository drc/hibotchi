import type { CreateReminderInput, ReminderRecord } from "@/types";
import { captureException, logDatabaseOperation } from "@/logging";

function asReminder(row: unknown): ReminderRecord {
  return row as ReminderRecord;
}

export async function createReminder(db: D1Database, input: CreateReminderInput): Promise<number> {
  const now = new Date().toISOString();
  try {
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
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(
        input.guildId,
        input.channelId,
        input.creatorUserId,
        input.eventTitle,
        input.targetDate,
        input.timezone,
        now,
        now,
      )
      .run();

    logDatabaseOperation("insert", "reminders", true, {
      guildId: input.guildId,
      userId: input.creatorUserId,
    });

    return Number(result.meta.last_row_id);
  } catch (error) {
    logDatabaseOperation("insert", "reminders", false);
    captureException(error, {
      action: "insert_reminder",
      guildId: input.guildId,
      userId: input.creatorUserId,
    });
    throw error;
  }
}

export async function listUserReminders(db: D1Database, guildId: string, userId: string): Promise<ReminderRecord[]> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM reminders
       WHERE guild_id = ? AND creator_user_id = ? AND active = 1
       ORDER BY target_date ASC, id ASC`,
      )
      .bind(guildId, userId)
      .all();

    logDatabaseOperation("select", "reminders", true, {
      guildId,
      userId,
      count: result.results?.length ?? 0,
    });

    return (result.results ?? []).map(asReminder);
  } catch (error) {
    logDatabaseOperation("select", "reminders", false);
    captureException(error, {
      action: "select_reminders",
      guildId,
      userId,
    });
    throw error;
  }
}

export async function deleteUserReminder(
  db: D1Database,
  guildId: string,
  userId: string,
  reminderId: number,
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        `DELETE FROM reminders
       WHERE id = ? AND guild_id = ? AND creator_user_id = ?`,
      )
      .bind(reminderId, guildId, userId)
      .run();

    const deleted = Number(result.meta.changes) > 0;
    logDatabaseOperation("delete", "reminders", true, {
      reminderId,
      guildId,
      userId,
      deleted,
    });

    return deleted;
  } catch (error) {
    logDatabaseOperation("delete", "reminders", false);
    captureException(error, {
      action: "delete_reminder",
      reminderId,
      guildId,
      userId,
    });
    throw error;
  }
}

export async function getActiveReminders(db: D1Database): Promise<ReminderRecord[]> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM reminders
       WHERE active = 1
       ORDER BY target_date ASC, id ASC`,
      )
      .all();

    logDatabaseOperation("select", "reminders", true, {
      count: result.results?.length ?? 0,
    });

    return (result.results ?? []).map(asReminder);
  } catch (error) {
    logDatabaseOperation("select", "reminders", false);
    captureException(error, {
      action: "get_active_reminders",
    });
    throw error;
  }
}

export async function deactivateReminder(db: D1Database, reminderId: number): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE reminders
       SET active = 0, updated_at = ?
       WHERE id = ?`,
      )
      .bind(new Date().toISOString(), reminderId)
      .run();

    logDatabaseOperation("update", "reminders", true, {
      reminderId,
    });
  } catch (error) {
    logDatabaseOperation("update", "reminders", false);
    captureException(error, {
      action: "deactivate_reminder",
      reminderId,
    });
    throw error;
  }
}

export async function recordDelivery(db: D1Database, reminderId: number, sentOn: string): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        `INSERT OR IGNORE INTO delivery_log (
         reminder_id,
         sent_on,
         created_at
       ) VALUES (?, ?, ?)`,
      )
      .bind(reminderId, sentOn, new Date().toISOString())
      .run();

    const inserted = Number(result.meta.changes) > 0;
    logDatabaseOperation("insert", "delivery_log", true, {
      reminderId,
      sentOn,
      inserted,
    });

    return inserted;
  } catch (error) {
    logDatabaseOperation("insert", "delivery_log", false);
    captureException(error, {
      action: "record_delivery",
      reminderId,
      sentOn,
    });
    throw error;
  }
}
