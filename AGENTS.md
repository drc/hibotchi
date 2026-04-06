# AGENTS.md

This repository is a Cloudflare Workers TypeScript project for the HiBOTchi Discord bot.

This file documents conventions and commands for coding agents working inside this repo.

## Repo Summary

- Runtime: Cloudflare Workers
- HTTP framework: Hono
- Language: TypeScript (ESM)
- Database: Cloudflare D1
- Tests: Vitest with `@cloudflare/vitest-pool-workers`
- Primary entrypoint: `src/index.ts`
- Worker config: `wrangler.jsonc`

## Instruction Files

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files were found in this repository. If you add them, include brief intent and autoprompt rules.

## Core Commands (package.json)

- Install dependencies: `npm install`
- Local dev server (with scheduled test hooks): `npm run dev` (runs `wrangler dev --test-scheduled`)
- Deploy Worker: `npm run deploy`
- Generate Wrangler runtime/binding types: `npm run cf-typegen`
- Typecheck / lint (project uses tsc for type-level linting): `npm run check` or `npm run lint`
- Run all tests once: `npm test` (runs `vitest run`)
- Run tests in watch mode: `npm run test:watch`
- Apply D1 migrations (local): `npm run db:migrate:local`
- Apply D1 migrations (remote): `npm run db:migrate:remote`
- Register Discord commands (uses `.dev.vars`): `npm run register:commands`

Single-test examples (Vitest):

- Run one test file: `npx vitest run tests/scheduler.test.ts`
- Run tests by name: `npx vitest run -t "can be forced outside the noon window"`
- Run via npm for a single file: `npm test -- tests/scheduler.test.ts`
- Run a single file in watch mode: `npx vitest tests/scheduler.test.ts`

## Useful Dev / Debug Commands

- Trigger scheduled handler locally: `curl http://localhost:8787/__scheduled`
- Force reminder delivery (local dev server):
  `curl -X POST http://localhost:8787/admin/run-reminders -H "Authorization: Bearer $ADMIN_API_TOKEN" -H "Content-Type: application/json" -d '{"force":true}'`
- Tail Worker logs: `wrangler tail`

## Environment and Secrets

- Local secrets are loaded from `.dev.vars` (used by scripts that call Node with `--env-file`).
- Do not hardcode credentials in source files.
- Use `wrangler secret put` for deployed secrets.
- Keep non-secret config and OAuth URLs in `wrangler.jsonc`.
- After editing `wrangler.jsonc`, regenerate types: `npm run cf-typegen`.

Common .dev.vars keys expected in dev:

- `ADMIN_API_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `COMMAND_GUILD_ID`

## Project Conventions

- Strict TypeScript: prefer narrow types and avoid `any`.
- Small, explicit helper functions over clever abstractions.
- Reuse existing modules before introducing new ones.
- Keep routing and Worker wiring in `src/index.ts` and move focused logic into small helpers/modules.
- Current domain split to preserve: `src/index.ts`, `src/commands.ts`, `src/discord.ts`, `src/reminders.ts`, `src/scheduler.ts`, `src/time.ts`, `src/types.ts`.

## Formatting & Style

- Indentation: 2 spaces.
- Quotes: double quotes for JS/TS strings.
- Semicolons: use them.
- Trailing commas: avoid unless surrounding file already uses them.
- Keep import groups compact (no extra blank-line-separated blocks).

## Import Rules

- Prefer relative imports within `src/`.
- Put value imports before type-only imports when both are needed.
- Use `import type { ... } from "..."` for pure type imports.

## Naming Conventions

- Variables and functions: `camelCase`.
- Types and interfaces: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants (e.g., `CHICAGO_TIME_ZONE`).
- Slash command names: kebab-case strings (e.g., `ticket-list`).
- D1 column names: `snake_case`.
- File names: short, lowercase, one concern per file.

## TypeScript Guidelines

- Avoid `any` and broad casts.
- Prefer explicit interfaces for shared shapes and explicit function return types for public APIs.
- Use narrow unions and `undefined` checks instead of `as` where possible.
- Use `as` only when the runtime shape is proven (e.g., after JSON-schema validation or a trusted parse).

## Error Handling

- Fail early for validation errors; return clear user-facing messages (ephemeral Discord responses where appropriate).
- Throw for infrastructure/third-party failures so they surface in logs and can be retried.
- Include contextual information in thrown errors to assist debugging (IDs, guild, user, request hints), but do not leak secrets.
- Use explicit HTTP status codes for upstream responses (401, 403, 422, 500, etc.).

## Worker & Cloudflare Guidelines

- The D1 binding is expected to be named `DB`. Do not rename bindings without updating `wrangler.jsonc` and types.
- Keep scheduled logic in `runScheduledReminders()` and preserve the noon-in-`America/Chicago` behavior unless product changes.
- If you change bindings, cron, or env names, update `wrangler.jsonc` and run: `npm run cf-typegen`.

## Discord-Specific Guidelines

- Always verify interaction signatures before processing Discord requests.
- Interaction responses for create/list/delete are ephemeral by design; public channel messages are used only for scheduled reminders.
- Keep slash command definitions in `src/commands.ts` in sync with registration; re-run `npm run register:commands` after changes.

## Database Guidelines

- Keep SQL queries explicit and local to `src/reminders.ts` unless creating a new domain module.
- Use prepared statements and `.bind(...)` for parameterized SQL to avoid injection.
- Preserve ownership constraints (guild ID, creator user ID) in queries and access checks.
- Maintain delivery idempotency via `delivery_log` table and guards.
- Schema changes belong in new migration files; do not edit historical migrations.

## Testing Guidelines

- Add/update tests when changing scheduler/date logic, command validation, or D1 behavior.
- Prefer targeted unit tests in `tests/` with small setup/teardown.
- Use `beforeEach` for D1 reset/setup and `vi.stubGlobal("fetch", ...)` to mock Discord API calls.
- When changing cron behavior, test both scheduled-window and forced/manual execution paths.

## Editing Guidance For Agents

- Make the smallest correct change.
- Don't introduce new frameworks or large abstractions unless requested.
- Preserve user-visible message formats unless instructed otherwise.
- Avoid unrelated refactors in the same change.

## Minimum Verification Before Finishing

- Run typecheck: `npm run check`.
- Run tests: `npm test` (and a targeted single-test run when appropriate).
- If you modified `wrangler.jsonc` or bindings: `npm run cf-typegen`.
- If you modified commands: `npm run register:commands`.
- If you modified DB schema: run the appropriate migration command and note whether `db:migrate:local` or `db:migrate:remote` is needed.

## Notes For Future Agents

- Admin route: `POST /admin/run-reminders` protected by `ADMIN_API_TOKEN` — useful for forcing deliveries during testing.
- Local and remote D1 can diverge; be explicit which env you are testing against.
- If you add Cursor/Copilot rules, include them here and explain their effect on automated agents.

If anything in this file conflicts with runtime configuration or package.json scripts, prefer the source of truth (package.json, wrangler.jsonc) and update this document.
