import { NextResponse } from 'next/server';
import { captureApiError } from '@/lib/observability/captureApiError';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ApiErrorResponse {
  error: {
    message: string;
    code: ApiErrorCode;
    status: number;
  };
}

/**
 * Structured API error with HTTP status code and machine-readable code.
 * Used across all API routes for consistent error responses.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(message: string, code: ApiErrorCode, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }

  static badRequest(message = 'Bad request'): ApiError {
    return new ApiError(message, 'BAD_REQUEST', 400);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(message, 'FORBIDDEN', 403);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(message, 'NOT_FOUND', 404);
  }

  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(message, 'CONFLICT', 409);
  }

  static rateLimited(message = 'Rate limited'): ApiError {
    return new ApiError(message, 'RATE_LIMITED', 429);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(message, 'INTERNAL_ERROR', 500);
  }

  static unavailable(message = 'Service unavailable'): ApiError {
    return new ApiError(message, 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Convert any thrown value into a standardized ApiError.
 *
 * Only ApiError instances carry their original message through to the
 * response body — those are explicitly authored by route handlers and
 * are safe to surface. Anything else (raw Error from a Prisma/DB call,
 * third-party SDK exception, plain string throw) gets a generic
 * "Internal server error" message so we don't leak internals like
 * connection strings, SQL fragments, or stack-derived paths.
 *
 * The original Error message is still preserved on the ApiError's
 * `cause` field for server-side logging — see handleApiError, which
 * Sentry+console-logs the cause but returns only the safe message.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const apiErr = ApiError.internal('Internal server error');
  // Attach the original for logging; never serialized into the response.
  (apiErr as Error & { cause?: unknown }).cause = err;
  return apiErr;
}

/**
 * Standardized error response builder. Always returns `{ error: { message, code, status } }`.
 */
export function buildApiErrorResponse(err: ApiError): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        message: err.message,
        code: err.code,
        status: err.status,
      },
    },
    { status: err.status }
  );
}

/**
 * Universal API route error handler.
 * Logs the error via Sentry + console, then returns a consistent JSON response.
 *
 * @param err - The thrown error
 * @param route - Route identifier for logging (e.g. 'GET /api/jobs')
 * @returns NextResponse with standardized error shape
 */
export function handleApiError(err: unknown, route: string): NextResponse<ApiErrorResponse> {
  const apiError = toApiError(err);

  captureApiError(apiError, { route, extra: { code: apiError.code } });

  return buildApiErrorResponse(apiError);
}
