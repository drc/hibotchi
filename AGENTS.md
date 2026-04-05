# AGENTS.md

This repository is a Cloudflare Workers TypeScript project for the HiBOTchi Discord bot.

This file is for coding agents working inside this repo.

## Repo Summary

- Runtime: Cloudflare Workers
- HTTP framework: Hono
- Language: TypeScript in ESM mode
- Database: Cloudflare D1
- Tests: Vitest with `@cloudflare/vitest-pool-workers`
- Primary entrypoint: `src/index.ts`
- Worker config: `wrangler.jsonc`

## Instruction Files

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files currently exist in this repo.

## Core Commands

- Install dependencies: `npm install`
- Start local Worker dev server: `npm run dev`
- Deploy Worker: `npm run deploy`
- Generate Wrangler runtime/binding types: `npm run cf-typegen`
- Typecheck: `npm run check`
- Lint: `npm run lint`
- Run all tests once: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Apply D1 migrations locally: `npm run db:migrate:local`
- Apply D1 migrations remotely: `npm run db:migrate:remote`
- Register Discord commands using `.dev.vars`: `npm run register:commands`

## Single-Test Commands

- Run one test file: `npx vitest run tests/scheduler.test.ts`
- Run one test by name: `npx vitest run -t "can be forced outside the noon window"`
- Run one file through npm: `npm test -- tests/scheduler.test.ts`
- Run one file in watch mode: `npx vitest tests/scheduler.test.ts`

## Useful Dev/Debug Commands

- Trigger the scheduled handler locally: `curl http://localhost:8787/__scheduled`
- Force reminder delivery locally: `curl -X POST http://localhost:8787/admin/run-reminders -H "Authorization: Bearer $ADMIN_API_TOKEN" -H "Content-Type: application/json" -d '{"force":true}'`
- Tail deployed Worker logs: `wrangler tail`

## Environment and Secrets

- Local Worker secrets are loaded from `.dev.vars`.
- The `register:commands` script also loads `.dev.vars` via Node `--env-file`.
- Do not hardcode secrets in source files.
- Prefer `wrangler secret put` for deployed secrets.
- Keep OAuth install URLs and non-secret config in `wrangler.jsonc`.
- After editing `wrangler.jsonc`, run `npm run cf-typegen`.

Expected local `.dev.vars` keys usually include:

- `ADMIN_API_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `COMMAND_GUILD_ID`

## Important Project Conventions

- This repo uses strict TypeScript. Keep code type-safe.
- Prefer small, explicit helper functions over clever abstractions.
- Use existing modules before introducing new ones.
- Keep the Worker entry wiring in `src/index.ts` and move focused logic into helper modules.
- Preserve the current architecture split: `src/index.ts` for routes/exports, `src/commands.ts` for command handling, `src/discord.ts` for Discord helpers, `src/reminders.ts` for D1 access, `src/scheduler.ts` for scheduled delivery, `src/time.ts` for time helpers, and `src/types.ts` for shared interfaces.

## Formatting Style

- Use 2-space indentation.
- Use double quotes, not single quotes.
- Use semicolons.
- Keep trailing commas off unless the surrounding file already uses them.
- Keep import groups compact; the current codebase does not use extra blank-line-separated import blocks.

## Import Style

- Put value imports before type-only imports when both are needed.
- Use `import type` for pure type imports.
- Prefer relative imports within `src/`.

## Naming Conventions

- Functions and variables: `camelCase`
- Interfaces and types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` for true constants like `CHICAGO_TIME_ZONE`
- Slash command names: kebab-case strings like `ticket-list`
- D1 column names: `snake_case`
- File names: short lowercase names, one concern per file

## TypeScript Guidelines

- Do not use `any`.
- Prefer explicit interfaces for shared data shapes.
- Keep function return types explicit when the function is part of a public module API.
- Use narrow unions and `undefined` checks instead of broad casting.
- Use `as` only when the runtime shape is already known and unavoidable.

## Worker and Cloudflare Guidelines

- The app expects the D1 binding to be named `DB`.
- Do not rename bindings casually; code depends on `env.DB`.
- Scheduled logic should continue to run through `runScheduledReminders()`.
- Respect the current noon-in-`America/Chicago` behavior unless the product requirement changes.
- If you change bindings, vars, or cron config, update `wrangler.jsonc` and rerun `npm run cf-typegen`.

## Discord-Specific Guidelines

- Verify interaction signatures before processing requests.
- Create/list/delete interaction responses are ephemeral by design.
- Public channel messages are only for the scheduled reminder flow.
- Keep slash command schemas in sync with registration.
- If you change command definitions in `src/commands.ts`, re-run `npm run register:commands`.

## Error Handling

- Prefer early returns for validation failures.
- Return user-facing validation errors as simple ephemeral messages.
- Throw errors for infrastructure failures that should surface in logs, such as Discord API failures.
- Include enough context in thrown error messages to diagnose failures.
- Use explicit HTTP status codes for unauthorized or unsupported requests.

## Database Guidelines

- Keep SQL explicit and local to `src/reminders.ts` unless a new domain module is justified.
- Use prepared statements and `.bind(...)` for parameterized SQL.
- Preserve the ownership constraints around guild ID and creator user ID.
- Maintain delivery idempotency via `delivery_log`.
- If schema changes are needed, add a new migration file rather than editing old production migrations casually.

## Testing Guidelines

- Add or update tests when changing scheduler logic, date logic, command validation, or D1 behavior.
- Prefer targeted unit tests in `tests/` over manual-only verification.
- Follow existing test style: `describe` blocks by module/domain, `beforeEach` for D1 reset/setup, and `vi.stubGlobal("fetch", ...)` for Discord API mocking.
- When changing cron behavior, test both scheduled-window and forced/manual execution.

## Editing Guidance for Agents

- Make the smallest correct change.
- Do not introduce new frameworks or large abstractions without clear need.
- Preserve current user-visible message formats unless the user asks to change them.
- Keep reminder messages plain; do not re-theme the message text.
- Avoid unrelated refactors while implementing feature work.
- If you modify `wrangler.jsonc`, `package.json`, or migrations, verify with commands afterward.

## Minimum Verification Before Finishing

- Run `npm run check`
- Run `npm test`
- If config changed, run `npm run cf-typegen`
- If command schema changed, note that `npm run register:commands` is required
- If D1 schema changed, note which migration command the user should run

## Notes for Future Agents

- There is currently an admin route at `POST /admin/run-reminders` protected by `ADMIN_API_TOKEN`.
- Use that route for immediate reminder-delivery testing instead of waiting for the noon cron window.
- Local and remote D1 environments can diverge; be explicit about which one you are testing.
