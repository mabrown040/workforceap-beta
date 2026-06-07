/**
 * Structured JSON logger.
 *
 * Thin wrapper around `console.{log,warn,error}` that emits one JSON object
 * per line:
 *   { level, timestamp, requestId, message, ...context }
 *
 * Why JSON and not pretty: Vercel + most log shippers parse stdout as JSON
 * when each line is valid JSON, which gives us per-field search ("filter
 * by requestId") and avoids the regex parsing fragility of free-form logs.
 *
 * `requestId` is pulled from the `AsyncLocalStorage` scope set up by
 * `runWithRequestId()` in `lib/observability/requestId.ts`. If no scope is
 * active (e.g. a cron job that hasn't been threaded yet) the field is
 * omitted rather than emitted as `null` — easier to grep for the absence.
 */

import { getRequestId } from '@/lib/observability/requestId';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry extends LogContext {
  level: LogLevel;
  timestamp: string;
  message: string;
  requestId?: string;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...sanitizeContext(context),
  };
  const requestId = getRequestId();
  if (requestId) entry.requestId = requestId;

  const line = safeStringify(entry);

  // Route to stderr for warn/error so it surfaces in error log streams.
  switch (level) {
    case 'error':
       
      console.error(line);
      break;
    case 'warn':
       
      console.warn(line);
      break;
    case 'debug':
       
      console.debug(line);
      break;
    default:
       
      console.log(line);
  }
}

/** Normalize Error-shaped values into `{ name, message, stack }`. */
function sanitizeContext(context: LogContext | undefined): LogContext {
  if (!context) return {};
  const out: LogContext = {};
  for (const [k, v] of Object.entries(context)) {
    if (v instanceof Error) {
      out[k] = { name: v.name, message: v.message, stack: v.stack };
    } else {
      out[k] = v;
    }
  }
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    // Circular structure or non-serializable. Fall back to a marker so we
    // don't drop the log entirely.
    try {
      return JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message: '[logger] failed to serialize entry',
      });
    } catch {
      return '{"level":"error","message":"[logger] catastrophic serialization failure"}';
    }
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    emit('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    emit('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    emit('error', message, context);
  },
};
