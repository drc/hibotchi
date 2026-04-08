import { postChannelMessage } from "./discord";
import { deactivateReminder, getActiveReminders, recordDelivery } from "./reminders";
import { chicagoDateString, compareDateStrings, formatReminderMessage, isChicagoNoon } from "./time";
import type { Env } from "./types";
import * as Sentry from "@sentry/cloudflare";
import { captureException, logSchedulerRun } from "./logging";

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
    Sentry.logger.info("scheduler_skipped_outside_window", {
      today,
      forced
    });
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

  try {
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
        Sentry.logger.info("reminder_deactivated_expired", {
          reminderId: reminder.id,
          guildId: reminder.guild_id,
          targetDate: reminder.target_date,
          today
        });
        continue;
      }

      const inserted = await recordDelivery(env.DB, reminder.id, today);
      if (!inserted) {
        summary.skippedDuplicate += 1;
        Sentry.logger.info("reminder_delivery_duplicate", {
          reminderId: reminder.id,
          guildId: reminder.guild_id,
          today
        });
        continue;
      }

      const content = formatReminderMessage(reminder.event_title, reminder.target_date, today);
      if (!content) {
        await deactivateReminder(env.DB, reminder.id);
        summary.deactivatedExpired += 1;
        Sentry.logger.info("reminder_deactivated_empty_message", {
          reminderId: reminder.id,
          guildId: reminder.guild_id,
          targetDate: reminder.target_date
        });
        continue;
      }

      try {
        await postChannelMessage(env, reminder.channel_id, content);
        summary.delivered += 1;
        Sentry.logger.info("reminder_delivered", {
          reminderId: reminder.id,
          guildId: reminder.guild_id,
          channelId: reminder.channel_id,
          targetDate: reminder.target_date
        });
      } catch (error) {
        captureException(error, {
          action: "post_channel_message",
          reminderId: reminder.id,
          guildId: reminder.guild_id,
          channelId: reminder.channel_id
        });
        continue;
      }

      if (comparison === 0) {
        await deactivateReminder(env.DB, reminder.id);
        summary.deactivatedAfterToday += 1;
        Sentry.logger.info("reminder_deactivated_after_delivery", {
          reminderId: reminder.id,
          guildId: reminder.guild_id
        });
      }
    }

    logSchedulerRun(forced, isNoonWindow, today, {
      scanned: summary.scanned,
      delivered: summary.delivered,
      skippedDuplicate: summary.skippedDuplicate,
      deactivatedExpired: summary.deactivatedExpired,
      deactivatedAfterToday: summary.deactivatedAfterToday
    });

    return summary;
  } catch (error) {
    captureException(error, {
      action: "run_scheduled_reminders",
      forced,
      today
    });
    throw error;
  }
}
