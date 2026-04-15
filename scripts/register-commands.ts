import { registerGuildCommands } from "@/discord";
import { slashCommands } from "@/commands";

function readEnv(name: keyof Env): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const env = {
  DISCORD_APPLICATION_ID: readEnv("DISCORD_APPLICATION_ID"),
  DISCORD_BOT_TOKEN: readEnv("DISCORD_BOT_TOKEN"),
  COMMAND_GUILD_ID: readEnv("COMMAND_GUILD_ID"),
} as Env;

await registerGuildCommands(env, [...slashCommands]);
console.log("Registered guild slash commands.");
