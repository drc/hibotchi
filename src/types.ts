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
