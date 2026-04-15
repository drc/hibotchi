import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createReminder, deleteUserReminder, listUserReminders } from "@/reminders";

async function resetDatabase() {
  await env.DB.exec("DROP TABLE IF EXISTS delivery_log;");
  await env.DB.exec("DROP TABLE IF EXISTS reminders;");
  await env.DB.prepare(`CREATE TABLE reminders (
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
  );`).run();
  await env.DB.prepare(`CREATE TABLE delivery_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reminder_id INTEGER NOT NULL,
    sent_on TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`).run();
  await env.DB.prepare("CREATE UNIQUE INDEX idx_delivery_log_unique ON delivery_log (reminder_id, sent_on);").run();
}

describe("reminder ownership", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists only the caller's reminders", async () => {
    await createReminder(env.DB, {
      guildId: "guild-1",
      channelId: "channel-1",
      creatorUserId: "user-1",
      eventTitle: "Vacation",
      targetDate: "2026-06-01",
      timezone: "America/Chicago",
    });
    await createReminder(env.DB, {
      guildId: "guild-1",
      channelId: "channel-1",
      creatorUserId: "user-2",
      eventTitle: "Birthday",
      targetDate: "2026-06-02",
      timezone: "America/Chicago",
    });

    const reminders = await listUserReminders(env.DB, "guild-1", "user-1");
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.event_title).toBe("Vacation");
  });

  it("deletes only the caller's own reminder", async () => {
    const id = await createReminder(env.DB, {
      guildId: "guild-1",
      channelId: "channel-1",
      creatorUserId: "user-1",
      eventTitle: "Vacation",
      targetDate: "2026-06-01",
      timezone: "America/Chicago",
    });

    const denied = await deleteUserReminder(env.DB, "guild-1", "user-2", id);
    expect(denied).toBe(false);

    const allowed = await deleteUserReminder(env.DB, "guild-1", "user-1", id);
    expect(allowed).toBe(true);
  });
});
