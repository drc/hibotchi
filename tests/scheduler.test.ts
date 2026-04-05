import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReminder } from "../src/reminders";
import { runScheduledReminders } from "../src/scheduler";
import type { Env } from "../src/types";

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

describe("scheduler", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.restoreAllMocks();
  });

  it("sends only once for the same day", async () => {
    await createReminder(env.DB, {
      guildId: "guild-1",
      channelId: "channel-1",
      creatorUserId: "user-1",
      eventTitle: "Vacation",
      targetDate: "2026-04-05",
      timezone: "America/Chicago"
    });

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const workerEnv = {
      DB: env.DB,
      DISCORD_BOT_TOKEN: "token"
    } as Env;

    const noon = new Date("2026-04-04T17:05:00.000Z");
    await runScheduledReminders(workerEnv, { now: noon });
    await runScheduledReminders(workerEnv, { now: noon });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deactivates reminders after the event day send", async () => {
    const reminderId = await createReminder(env.DB, {
      guildId: "guild-1",
      channelId: "channel-1",
      creatorUserId: "user-1",
      eventTitle: "Launch Day",
      targetDate: "2026-04-04",
      timezone: "America/Chicago"
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));

    const workerEnv = {
      DB: env.DB,
      DISCORD_BOT_TOKEN: "token"
    } as Env;

    await runScheduledReminders(workerEnv, { now: new Date("2026-04-04T17:05:00.000Z") });

    const result = await env.DB.prepare("SELECT active FROM reminders WHERE id = ?").bind(reminderId).first<{ active: number }>();
    expect(result?.active).toBe(0);
  });

  it("can be forced outside the noon window", async () => {
    await createReminder(env.DB, {
      guildId: "guild-1",
      channelId: "channel-1",
      creatorUserId: "user-1",
      eventTitle: "Vacation",
      targetDate: "2026-04-05",
      timezone: "America/Chicago"
    });

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const workerEnv = {
      DB: env.DB,
      DISCORD_BOT_TOKEN: "token"
    } as Env;

    const summary = await runScheduledReminders(workerEnv, {
      force: true,
      now: new Date("2026-04-04T03:00:00.000Z")
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(summary.delivered).toBe(1);
    expect(summary.skippedOutsideWindow).toBe(false);
  });
});
