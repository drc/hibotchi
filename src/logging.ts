import * as Sentry from "@sentry/cloudflare";

/**
 * Sensitive keys to filter from logs to prevent leaking secrets
 */
const SENSITIVE_KEYS = ["ADMIN_API_TOKEN", "DISCORD_BOT_TOKEN", "DISCORD_PUBLIC_KEY", "authorization", "Authorization"];

/**
 * Recursively sanitize an object to remove sensitive data
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Don't expose raw strings that might be tokens
    return "[redacted]";
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
        sanitized[key] = "[redacted]";
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
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
): void {
  Sentry.logger.info("command_invoked", {
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
  Sentry.logger.info(`reminder_${operation}`, {
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
  Sentry.logger.info("scheduler_run", {
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
  const level = success ? "info" : "warn";
  const logger = Sentry.logger[level as "info" | "warn"];
  logger("discord_api_call", {
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
  const level = success ? "info" : "warn";
  const logger = Sentry.logger[level as "info" | "warn"];
  logger("database_operation", {
    operation,
    table,
    success,
    ...details,
  });
}

/**
 * Capture an exception with context, sanitizing sensitive data
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
  const sanitizedContext = sanitizeObject(context) as Record<string, unknown>;
  if (error instanceof Error) {
    Sentry.captureException(error, {
      contexts: {
        operation: sanitizedContext,
      },
      level: "error",
    });
  } else {
    Sentry.captureException(new Error(String(error)), {
      contexts: {
        operation: sanitizedContext,
      },
      level: "error",
    });
  }
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
  Sentry.logger.warn("validation_error", {
    reason,
    guildId,
    userId,
    ...details,
  });
}
