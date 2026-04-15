import { ephemeralMessage, getInteractionUserId, getOptionValue } from "@/discord";
import { createReminder, deleteUserReminder, listUserReminders } from "@/reminders";
import {
  CHICAGO_TIME_ZONE,
  chicagoDateString,
  compareDateStrings,
  formatDiscordDateTag,
  isBeforeChicagoNoon,
  isValidDateString,
} from "@/time";
import type { DiscordInteraction } from "@/types";
import * as Sentry from "@sentry/cloudflare";
import { captureException, logReminderOperation, logValidationError } from "@/logging";

const TITLE_MAX_LENGTH = 120;

export const slashCommands = [
  {
    name: "ticket",
    description: "Create a daily countdown reminder",
    options: [
      {
        name: "title",
        description: "The event title",
        type: 3,
        required: true,
        max_length: TITLE_MAX_LENGTH,
      },
      {
        name: "date",
        description: "Date in YYYY-MM-DD format",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "ticket-list",
    description: "List your active reminders",
  },
  {
    name: "ticket-delete",
    description: "Delete one of your reminders by ID",
    options: [
      {
        name: "id",
        description: "The reminder ID to delete",
        type: 4,
        required: true,
        min_value: 1,
      },
    ],
  },
] as const;

function requireGuildInteraction(
  interaction: DiscordInteraction,
): { guildId: string; channelId: string; userId: string } | Response {
  const guildId = interaction.guild_id;
  const channelId = interaction.channel_id;
  const userId = getInteractionUserId(interaction);

  if (!guildId || !channelId || !userId) {
    return ephemeralMessage("This command can only be used inside a server channel.");
  }

  return { guildId, channelId, userId };
}

export async function handleCommand(env: Env, interaction: DiscordInteraction): Promise<Response> {
  const commandName = interaction.data?.name;

  if (commandName === "ticket") {
    return handleCreateTicket(env, interaction);
  }

  if (commandName === "ticket-list") {
    return handleListTickets(env, interaction);
  }

  if (commandName === "ticket-delete") {
    return handleDeleteTicket(env, interaction);
  }

  return ephemeralMessage("Unknown command.");
}

async function handleCreateTicket(env: Env, interaction: DiscordInteraction): Promise<Response> {
  const context = requireGuildInteraction(interaction);
  if (context instanceof Response) {
    logValidationError("not_in_guild", interaction.guild_id, getInteractionUserId(interaction));
    return context;
  }

  const rawTitle = getOptionValue(interaction.data?.options, "title");
  const rawDate = getOptionValue(interaction.data?.options, "date");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  const targetDate = typeof rawDate === "string" ? rawDate.trim() : "";

  if (!title) {
    logValidationError("empty_title", context.guildId, context.userId);
    return ephemeralMessage("Title is required.");
  }

  if (title.length > TITLE_MAX_LENGTH) {
    logValidationError("title_too_long", context.guildId, context.userId, {
      titleLength: title.length,
      maxLength: TITLE_MAX_LENGTH,
    });
    return ephemeralMessage(`Title must be ${TITLE_MAX_LENGTH} characters or fewer.`);
  }

  if (!isValidDateString(targetDate)) {
    logValidationError("invalid_date_format", context.guildId, context.userId, {
      providedDate: targetDate,
    });
    return ephemeralMessage("Date must use YYYY-MM-DD format.");
  }

  const today = chicagoDateString();
  const dateComparison = compareDateStrings(targetDate, today);
  if (dateComparison < 0) {
    logValidationError("date_in_past", context.guildId, context.userId, {
      targetDate,
      today,
    });
    return ephemeralMessage("Date must be today or later.");
  }

  if (dateComparison === 0 && !isBeforeChicagoNoon()) {
    logValidationError("same_day_after_noon", context.guildId, context.userId, {
      targetDate,
    });
    return ephemeralMessage("Same-day tickets must be created before 12:00 PM America/Chicago.");
  }

  try {
    const reminderId = await createReminder(env.DB, {
      guildId: context.guildId,
      channelId: context.channelId,
      creatorUserId: context.userId,
      eventTitle: title,
      targetDate,
      timezone: CHICAGO_TIME_ZONE,
    });

    logReminderOperation("created", reminderId, context.guildId, context.userId, {
      eventTitle: title,
      targetDate,
    });

    return ephemeralMessage(`Saved ticket #${reminderId} for **${title}** on ${formatDiscordDateTag(targetDate)}.`);
  } catch (error) {
    captureException(error, {
      action: "create_reminder",
      guildId: context.guildId,
      userId: context.userId,
      channelId: context.channelId,
      eventTitle: title,
      targetDate,
    });
    return ephemeralMessage("Failed to create ticket. Please try again.");
  }
}

async function handleListTickets(env: Env, interaction: DiscordInteraction): Promise<Response> {
  const context = requireGuildInteraction(interaction);
  if (context instanceof Response) {
    logValidationError("not_in_guild", interaction.guild_id, getInteractionUserId(interaction));
    return context;
  }

  try {
    const start = Date.now();
    const reminders = await listUserReminders(env.DB, context.guildId, context.userId);

    const duration = Date.now() - start;
    Sentry.metrics.distribution("list_response_time", duration, {
      unit: "millisecond",
    });

    logReminderOperation("listed", undefined, context.guildId, context.userId, {
      count: reminders.length,
    });

    if (reminders.length === 0) {
      return ephemeralMessage("You do not have any active tickets.");
    }

    const lines = reminders.map(
      (reminder) => `#${reminder.id} **${reminder.event_title}** (${formatDiscordDateTag(reminder.target_date)})`,
    );

    Sentry.metrics.count("list_reminder_calls", 1, {
      attributes: {
        action: "list_reminders",
        guildId: context.guildId,
        userId: context.userId,
      },
    });

    return ephemeralMessage(lines.join("\n"));
  } catch (error) {
    captureException(error, {
      action: "list_reminders",
      guildId: context.guildId,
      userId: context.userId,
    });
    return ephemeralMessage("Failed to list tickets. Please try again.");
  }
}

async function handleDeleteTicket(env: Env, interaction: DiscordInteraction): Promise<Response> {
  const context = requireGuildInteraction(interaction);
  if (context instanceof Response) {
    logValidationError("not_in_guild", interaction.guild_id, getInteractionUserId(interaction));
    return context;
  }

  const rawId = getOptionValue(interaction.data?.options, "id");
  const reminderId = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(reminderId) || reminderId < 1) {
    logValidationError("invalid_reminder_id", context.guildId, context.userId, {
      providedId: rawId,
    });
    return ephemeralMessage("A valid numeric ticket ID is required.");
  }

  try {
    const deleted = await deleteUserReminder(env.DB, context.guildId, context.userId, reminderId);
    if (!deleted) {
      logValidationError("reminder_not_found", context.guildId, context.userId, {
        reminderId,
      });
      return ephemeralMessage("Ticket not found.");
    }

    logReminderOperation("deleted", reminderId, context.guildId, context.userId);
    return ephemeralMessage(`Deleted ticket #${reminderId}.`);
  } catch (error) {
    captureException(error, {
      action: "delete_reminder",
      guildId: context.guildId,
      userId: context.userId,
      reminderId,
    });
    return ephemeralMessage("Failed to delete ticket. Please try again.");
  }
}
