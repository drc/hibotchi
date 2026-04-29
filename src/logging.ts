/**
 * Log a slash command interaction with context
 */
export function logCommandInteraction(
  commandName: string | undefined,
  guildId: string | undefined,
  userId: string | undefined,
  channelId: string | undefined,
  details?: Record<string, unknown>,
): void {
  console.log({
    event: "command_invoked",
    command: commandName,
    guildId,
    userId,
    channelId,
    ...details,
  });
}

/**
 * Log a reminder operation (create, list, delete)
 */
export function logReminderOperation(
  operation: "created" | "listed" | "deleted" | "failed",
  reminderId?: number,
  guildId?: string,
  userId?: string,
  details?: Record<string, unknown>,
): void {
  console.log({
    event: `reminder_${operation}`,
    reminderId,
    guildId,
    userId,
    ...details,
  });
}

/**
 * Log a scheduler run with summary metrics
 */
export function logSchedulerRun(
  forced: boolean,
  isNoonWindow: boolean,
  today: string,
  summary: {
    scanned: number;
    delivered: number;
    skippedDuplicate: number;
    deactivatedExpired: number;
    deactivatedAfterToday: number;
  },
): void {
  console.log({
    event: "scheduler_run",
    forced,
    isNoonWindow,
    today,
    scanned: summary.scanned,
    delivered: summary.delivered,
    skippedDuplicate: summary.skippedDuplicate,
    deactivatedExpired: summary.deactivatedExpired,
    deactivatedAfterToday: summary.deactivatedAfterToday,
  });
}

/**
 * Log a Discord API call with response metadata
 */
export function logDiscordApiCall(
  endpoint: string,
  method: string,
  status: number,
  success: boolean,
  details?: Record<string, unknown>,
): void {
  console.log({
    event: "discord_api_call",
    endpoint,
    method,
    status,
    success,
    ...details,
  });
}

/**
 * Log a database operation with context
 */
export function logDatabaseOperation(
  operation: "select" | "insert" | "update" | "delete",
  table: string,
  success: boolean,
  details?: Record<string, unknown>,
): void {
  console.log({
    event: "database_operation",
    operation,
    table,
    success,
    ...details,
  });
}

/**
 * Capture an exception and log with context
 */
export function captureException(
  error: unknown,
  context: {
    action?: string;
    reminderId?: number;
    guildId?: string;
    userId?: string;
    channelId?: string;
    [key: string]: unknown;
  },
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.log({
    event: "error_captured",
    level: "error",
    message: errorMessage,
    stack: errorStack,
    context,
  });
}

/**
 * Log a validation error with user-friendly context
 */
export function logValidationError(
  reason: string,
  guildId: string | undefined,
  userId: string | undefined,
  details?: Record<string, unknown>,
): void {
  console.log({
    event: "validation_error",
    level: "warn",
    reason,
    guildId,
    userId,
    ...details,
  });
}
