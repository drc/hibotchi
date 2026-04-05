import { ephemeralMessage, getInteractionUserId, getOptionValue } from "./discord";
import { createReminder, deleteUserReminder, listUserReminders } from "./reminders";
import { CHICAGO_TIME_ZONE, chicagoDateString, compareDateStrings, formatDiscordDateTag, isBeforeChicagoNoon, isValidDateString } from "./time";
import type { DiscordInteraction, Env } from "./types";

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
        max_length: TITLE_MAX_LENGTH
      },
      {
        name: "date",
        description: "Date in YYYY-MM-DD format",
        type: 3,
        required: true
      }
    ]
  },
  {
    name: "ticket-list",
    description: "List your active reminders"
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
        min_value: 1
      }
    ]
  }
] as const;

function requireGuildInteraction(interaction: DiscordInteraction): { guildId: string; channelId: string; userId: string } | Response {
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
    return context;
  }

  const rawTitle = getOptionValue(interaction.data?.options, "title");
  const rawDate = getOptionValue(interaction.data?.options, "date");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  const targetDate = typeof rawDate === "string" ? rawDate.trim() : "";

  if (!title) {
    return ephemeralMessage("Title is required.");
  }

  if (title.length > TITLE_MAX_LENGTH) {
    return ephemeralMessage(`Title must be ${TITLE_MAX_LENGTH} characters or fewer.`);
  }

  if (!isValidDateString(targetDate)) {
    return ephemeralMessage("Date must use YYYY-MM-DD format.");
  }

  const today = chicagoDateString();
  const dateComparison = compareDateStrings(targetDate, today);
  if (dateComparison < 0) {
    return ephemeralMessage("Date must be today or later.");
  }

  if (dateComparison === 0 && !isBeforeChicagoNoon()) {
    return ephemeralMessage("Same-day tickets must be created before 12:00 PM America/Chicago.");
  }

  const reminderId = await createReminder(env.DB, {
    guildId: context.guildId,
    channelId: context.channelId,
    creatorUserId: context.userId,
    eventTitle: title,
    targetDate,
    timezone: CHICAGO_TIME_ZONE
  });

  return ephemeralMessage(`Saved ticket #${reminderId} for **${title}** on ${formatDiscordDateTag(targetDate)}.`);
}

async function handleListTickets(env: Env, interaction: DiscordInteraction): Promise<Response> {
  const context = requireGuildInteraction(interaction);
  if (context instanceof Response) {
    return context;
  }

  const reminders = await listUserReminders(env.DB, context.guildId, context.userId);
  if (reminders.length === 0) {
    return ephemeralMessage("You do not have any active tickets.");
  }

  const lines = reminders.map((reminder) => `#${reminder.id} **${reminder.event_title}** (${formatDiscordDateTag(reminder.target_date)})`);
  return ephemeralMessage(lines.join("\n"));
}

async function handleDeleteTicket(env: Env, interaction: DiscordInteraction): Promise<Response> {
  const context = requireGuildInteraction(interaction);
  if (context instanceof Response) {
    return context;
  }

  const rawId = getOptionValue(interaction.data?.options, "id");
  const reminderId = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(reminderId) || reminderId < 1) {
    return ephemeralMessage("A valid numeric ticket ID is required.");
  }

  const deleted = await deleteUserReminder(env.DB, context.guildId, context.userId, reminderId);
  if (!deleted) {
    return ephemeralMessage("Ticket not found.");
  }

  return ephemeralMessage(`Deleted ticket #${reminderId}.`);
}
