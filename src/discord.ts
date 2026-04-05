import type { DiscordInteraction, Env, SlashCommandOption } from "./types";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2
} as const;

export const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4
} as const;

export const MessageFlags = {
  Ephemeral: 1 << 6
} as const;

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function hexToArrayBuffer(value: string): ArrayBuffer {
  const bytes = hexToBytes(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function verifyDiscordRequest(request: Request, publicKey: string, rawBody: string): Promise<boolean> {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    hexToArrayBuffer(publicKey),
    {
      name: "Ed25519"
    },
    false,
    ["verify"]
  );

  return crypto.subtle.verify("Ed25519", key, hexToArrayBuffer(signature), encoder.encode(`${timestamp}${rawBody}`));
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

export function getInteractionUserId(interaction: DiscordInteraction): string | undefined {
  return interaction.member?.user?.id ?? interaction.user?.id;
}

export function getOptionValue(options: SlashCommandOption[] | undefined, name: string): string | number | boolean | undefined {
  return options?.find((option) => option.name === name)?.value;
}

export function ephemeralMessage(content: string): Response {
  return jsonResponse({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: MessageFlags.Ephemeral
    }
  });
}

export async function postChannelMessage(env: Env, channelId: string, content: string): Promise<void> {
  const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord channel message failed: ${response.status} ${body}`);
  }
}

export async function registerGuildCommands(env: Env, commands: unknown[]): Promise<void> {
  if (!env.COMMAND_GUILD_ID) {
    throw new Error("COMMAND_GUILD_ID is required to register commands.");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.COMMAND_GUILD_ID}/commands`,
    {
      method: "PUT",
      headers: {
        authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(commands)
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord command registration failed: ${response.status} ${body}`);
  }
}
