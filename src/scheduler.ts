import { postChannelMessage } from "./discord";
import { deactivateReminder, getActiveReminders, recordDelivery } from "./reminders";
import { chicagoDateString, compareDateStrings, formatReminderMessage, isChicagoNoon } from "./time";
import type { Env } from "./types";

export interface SchedulerRunOptions {
  force?: boolean;
  now?: Date;
}

export interface SchedulerRunSummary {
  attemptedAt: string;
  forced: boolean;
  isNoonWindow: boolean;
  today: string;
  scanned: number;
  delivered: number;
  skippedDuplicate: number;
  deactivatedExpired: number;
  deactivatedAfterToday: number;
  skippedOutsideWindow: boolean;
}

export async function runScheduledReminders(env: Env, options: SchedulerRunOptions = {}): Promise<SchedulerRunSummary> {
  const now = options.now ?? new Date();
  const forced = options.force === true;
  const isNoonWindow = isChicagoNoon(now);
  const today = chicagoDateString(now);

  if (!forced && !isNoonWindow) {
    return {
      attemptedAt: now.toISOString(),
      forced,
      isNoonWindow,
      today,
      scanned: 0,
      delivered: 0,
      skippedDuplicate: 0,
      deactivatedExpired: 0,
      deactivatedAfterToday: 0,
      skippedOutsideWindow: true
    };
  }

  const reminders = await getActiveReminders(env.DB);
  const summary: SchedulerRunSummary = {
    attemptedAt: now.toISOString(),
    forced,
    isNoonWindow,
    today,
    scanned: reminders.length,
    delivered: 0,
    skippedDuplicate: 0,
    deactivatedExpired: 0,
    deactivatedAfterToday: 0,
    skippedOutsideWindow: false
  };

  for (const reminder of reminders) {
    const comparison = compareDateStrings(reminder.target_date, today);
    if (comparison < 0) {
      await deactivateReminder(env.DB, reminder.id);
      summary.deactivatedExpired += 1;
      continue;
    }

    const inserted = await recordDelivery(env.DB, reminder.id, today);
    if (!inserted) {
      summary.skippedDuplicate += 1;
      continue;
    }

    const content = formatReminderMessage(reminder.event_title, reminder.target_date, today);
    if (!content) {
      await deactivateReminder(env.DB, reminder.id);
      summary.deactivatedExpired += 1;
      continue;
    }

    await postChannelMessage(env, reminder.channel_id, content);
    summary.delivered += 1;
    if (comparison === 0) {
      await deactivateReminder(env.DB, reminder.id);
      summary.deactivatedAfterToday += 1;
    }
  }

  return summary;
}
