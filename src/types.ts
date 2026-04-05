export interface Env {
  DB: D1Database;
  ADMIN_API_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  INSTALL_URL: string;
  COMMAND_GUILD_ID?: string;
}

export interface ReminderRecord {
  id: number;
  guild_id: string;
  channel_id: string;
  creator_user_id: string;
  event_title: string;
  target_date: string;
  timezone: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  guildId: string;
  channelId: string;
  creatorUserId: string;
  eventTitle: string;
  targetDate: string;
  timezone: string;
}

export interface SlashCommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

export interface DiscordInteraction {
  type: number;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: {
    user?: {
      id: string;
    };
  };
  user?: {
    id: string;
  };
  data?: {
    name?: string;
    options?: SlashCommandOption[];
  };
}
