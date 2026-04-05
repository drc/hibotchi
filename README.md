# HiBOTchi

Cloudflare Worker Discord bot for daily countdown reminders.

## Commands

- `/ticket` creates a reminder for the current channel
- `/ticket-list` lists only your active reminders
- `/ticket-delete` deletes one of your reminders by numeric ID

Create/list/delete responses are ephemeral. The scheduled daily reminder message is public in the saved channel.

## Setup

1. Install dependencies:
   - `npm install`
2. Create a D1 database and update `wrangler.jsonc` with the real `database_id`.
3. Apply local migrations:
   - `npm run db:migrate:local`
4. Set Worker secrets:
   - `wrangler secret put ADMIN_API_TOKEN`
   - `wrangler secret put DISCORD_APPLICATION_ID`
   - `wrangler secret put DISCORD_BOT_TOKEN`
   - `wrangler secret put DISCORD_PUBLIC_KEY`
5. Replace `INSTALL_URL` in `wrangler.jsonc` with your real Discord OAuth install link.
6. Set `COMMAND_GUILD_ID` in `wrangler.jsonc` for development command registration.
7. Create `.dev.vars` for local development secrets, for example:
   - `DISCORD_APPLICATION_ID=...`
   - `DISCORD_BOT_TOKEN=...`
   - `DISCORD_PUBLIC_KEY=...`
   - `ADMIN_API_TOKEN=...`
   - `COMMAND_GUILD_ID=...`
8. Register commands:
   - `npm run register:commands`

## Local development

- Start the Worker locally:
  - `npm run dev`
- Trigger the scheduled handler locally:
  - `http://localhost:8787/__scheduled`
- Force the scheduled reminder run immediately:
  - `curl -X POST http://localhost:8787/admin/run-reminders -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" -H "Content-Type: application/json" -d '{"force":true}'`

## Checks

- Typecheck: `npm run check`
- Tests: `npm test`
- Generate Cloudflare types after config changes: `npm run cf-typegen`

## Deployment

1. Apply remote migrations:
   - `npm run db:migrate:remote`
2. Deploy:
   - `npm run deploy`
3. Force a live reminder test after deploy:
   - `curl -X POST https://YOUR_WORKER_URL/admin/run-reminders -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" -H "Content-Type: application/json" -d '{"force":true}'`
