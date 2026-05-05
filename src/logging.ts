import type { LogEntry, LogLevel } from "@/types";

function emitLog(level: LogLevel, event: string, context: Record<string, unknown>, traceId?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    traceId,
    context,
  };
  console.log(JSON.stringify(entry));
}

/**
 * Log a slash command interaction with context
 */
export function logCommandInteraction(
  commandName: string | undefined,
  guildId: string | undefined,
  userId: string | undefined,
  channelId: string | undefined,
  details?: Record<string, unknown>,
  traceId?: string,
): void {
  emitLog("INFO", "command_invoked", {
    command: commandName,
    guildId,
    userId,
    channelId,
    ...details,
  }, traceId);
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
  traceId?: string,
): void {
  emitLog("INFO", `reminder_${operation}`, {
    reminderId,
    guildId,
    userId,
    ...details,
  }, traceId);
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
  traceId?: string,
): void {
  emitLog("INFO", "scheduler_run", {
    forced,
    isNoonWindow,
    today,
    scanned: summary.scanned,
    delivered: summary.delivered,
    skippedDuplicate: summary.skippedDuplicate,
    deactivatedExpired: summary.deactivatedExpired,
    deactivatedAfterToday: summary.deactivatedAfterToday,
  }, traceId);
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
  traceId?: string,
): void {
  emitLog(success ? "INFO" : "WARN", "discord_api_call", {
    endpoint,
    method,
    status,
    success,
    ...details,
  }, traceId);
}

/**
 * Log a database operation with context
 */
export function logDatabaseOperation(
  operation: "select" | "insert" | "update" | "delete",
  table: string,
  success: boolean,
  details?: Record<string, unknown>,
  traceId?: string,
): void {
  emitLog(success ? "INFO" : "ERROR", "database_operation", {
    operation,
    table,
    success,
    ...details,
  }, traceId);
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
  traceId?: string,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  emitLog("ERROR", "error_captured", {
    message: errorMessage,
    stack: errorStack,
    ...context,
  }, traceId);
}

/**
 * Log a validation error with user-friendly context
 */
export function logValidationError(
  reason: string,
  guildId: string | undefined,
  userId: string | undefined,
  details?: Record<string, unknown>,
  traceId?: string,
): void {
  emitLog("WARN", "validation_error", {
    reason,
    guildId,
    userId,
    ...details,
  }, traceId);
}
