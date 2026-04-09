import { Hono } from "hono";
import { handleCommand } from "./commands";
import { InteractionResponseType, InteractionType, jsonResponse, verifyDiscordRequest } from "./discord";
import { runScheduledReminders } from "./scheduler";
import type { DiscordInteraction } from "./types";
import * as Sentry from "@sentry/cloudflare";
import { captureException, logCommandInteraction, logSchedulerRun } from "./logging";

const app = new Hono<{ Bindings: Env }>();

function hasValidAdminToken(request: Request, adminToken: string): boolean {
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${adminToken}`;
}

app.get("/", (c) => {
  const installUrl = c.env.INSTALL_URL;
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HiBOTchi</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #3f1d0f 0%, #170d08 48%, #080605 100%);
        color: #fff2e7;
      }
      main {
        width: min(680px, calc(100vw - 32px));
        background: rgba(27, 17, 12, 0.84);
        border: 1px solid rgba(255, 185, 127, 0.18);
        border-radius: 24px;
        padding: 40px 28px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      }
      h1 {
        font-size: clamp(2.5rem, 7vw, 4.5rem);
        line-height: 0.95;
        margin: 0 0 16px;
        letter-spacing: -0.05em;
      }
      p {
        margin: 0 0 24px;
        font-size: 1.05rem;
        line-height: 1.6;
        color: #f7d8c2;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 20px;
        border-radius: 999px;
        background: linear-gradient(135deg, #ff8f3d, #ff5f36);
        color: white;
        font-weight: 700;
        text-decoration: none;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.75rem;
        color: #ffbe91;
        margin-bottom: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Discord Sandbox Bot</div>
      <h1>HiBOTchi</h1>
      <p>Cooking-themed commands, countdown tickets, and room for future experiments. Install the bot to your server and start with <code>/ticket</code>.</p>
      <a href="${installUrl}">Add HiBOTchi to Discord</a>
    </main>
  </body>
</html>`);
});

app.post("/interactions", async (c) => {
  const rawBody = await c.req.text();
  const verified = await verifyDiscordRequest(c.req.raw, c.env.DISCORD_PUBLIC_KEY, rawBody);
  if (!verified) {
    Sentry.logger.warn("discord_request_verification_failed", {
      path: "/interactions"
    });
    return new Response("Bad request signature.", { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch (error) {
    captureException(error, { action: "parse_interaction_body" });
    return jsonResponse({ error: "Invalid JSON." }, 400);
  }

  if (interaction.type === InteractionType.Ping) {
    return jsonResponse({ type: InteractionResponseType.Pong });
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    const commandName = interaction.data?.name;
    const guildId = interaction.guild_id;
    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    const channelId = interaction.channel_id;

    logCommandInteraction(commandName, guildId, userId, channelId);

    try {
      return await handleCommand(c.env, interaction);
    } catch (error) {
      captureException(error, {
        action: "handle_command",
        command: commandName,
        guildId,
        userId,
        channelId
      });
      return jsonResponse({ error: "An error occurred while processing your command." }, 500);
    }
  }

  Sentry.logger.warn("unsupported_interaction_type", {
    type: interaction.type
  });
  return jsonResponse({ error: "Unsupported interaction type." }, 400);
});

app.post("/admin/run-reminders", async (c) => {
  if (!hasValidAdminToken(c.req.raw, c.env.ADMIN_API_TOKEN)) {
    Sentry.logger.warn("unauthorized_admin_request", {
      path: "/admin/run-reminders"
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { force?: boolean } = {};
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await c.req.json<{ force?: boolean }>();
    } catch (error) {
      captureException(error, { action: "parse_admin_request_body" });
      return jsonResponse({ error: "Invalid JSON." }, 400);
    }
  }

  try {
    const summary = await runScheduledReminders(c.env, {
      force: body.force === true
    });

    logSchedulerRun(summary.forced, summary.isNoonWindow, summary.today, {
      scanned: summary.scanned,
      delivered: summary.delivered,
      skippedDuplicate: summary.skippedDuplicate,
      deactivatedExpired: summary.deactivatedExpired,
      deactivatedAfterToday: summary.deactivatedAfterToday
    });

    return jsonResponse(summary);
  } catch (error) {
    captureException(error, {
      action: "run_scheduled_reminders",
      forced: body.force
    });
    return jsonResponse({ error: "An error occurred while running reminders." }, 500);
  }
});

const withSentry = Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV ?? "production",
    sendDefaultPii: true,
    enableLogs: true,
  }),
  app
);

const worker = {
  fetch: withSentry.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledReminders(env));
  }
};

export default worker;