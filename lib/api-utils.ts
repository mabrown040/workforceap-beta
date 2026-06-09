import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestId, getRequestId } from '@/lib/observability/requestId';
import { runWithRequestId } from '@/lib/observability/requestId';
import { captureApiError } from '@/lib/observability/captureApiError';
import type { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Standardized API error codes for client handling.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_REQUEST';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  requestId: string;
}

const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  IDEMPOTENCY_CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  PAYLOAD_TOO_LARGE: 413,
  BAD_REQUEST: 400,
};

/**
 * Create a consistent JSON error response with { error, code, requestId } shape.
 */
export function createApiErrorResponse(
  error: string,
  code: ApiErrorCode,
  status?: number,
  requestId?: string,
): NextResponse<ApiErrorResponse> {
  const resolvedStatus = status ?? ERROR_STATUS_MAP[code] ?? 500;
  const rid = requestId ?? getRequestId() ?? 'unknown';
  return NextResponse.json({ error, code, requestId: rid }, { status: resolvedStatus });
}

/**
 * Extract client IP from request headers (X-Forwarded-For, X-Real-IP, or remoteAddress fallback).
 */
export function getClientIp(request: Request | NextRequest): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  // NextRequest has `ip` property in some environments
  if ('ip' in request && typeof request.ip === 'string') return request.ip;
  return 'unknown';
}

/**
 * Wrap a route handler so every request is tagged with a resolved requestId
 * and errors are normalized to the standard { error, code, requestId } shape.
 */
export function withApiReliability<T>(
  handler: (request: NextRequest) => Promise<T>,
  options?: {
    route?: string;
    requireAuth?: boolean;
  },
): (request: NextRequest) => Promise<T | NextResponse<ApiErrorResponse>> {
  return async (request: NextRequest) => {
    const { requestId } = resolveRequestId(request.headers);
    return runWithRequestId(requestId, async () => {
      try {
        return await handler(request);
      } catch (err) {
        const route = options?.route ?? 'unknown';
        captureApiError(err, { route });
        return createApiErrorResponse(
          'An unexpected error occurred. Please try again.',
          'INTERNAL_ERROR',
        ) as unknown as T;
      }
    });
  };
}

/**
 * Parse and validate JSON body with Zod, returning a standardized error on failure.
 */
export async function parseValidatedBody<T extends z.ZodTypeAny>(
  request: NextRequest | Request,
  schema: T,
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse<ApiErrorResponse> }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: createApiErrorResponse('Invalid JSON body', 'VALIDATION_ERROR', 400),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'Validation failed';
    return {
      success: false,
      response: createApiErrorResponse(message, 'VALIDATION_ERROR', 400),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Simple in-memory idempotency cache for dev / low-traffic.
 * In production with Redis configured, use Redis-backed idempotency.
 */
const idempotencyMemory = new Map<string, { status: number; body: unknown; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function memoryIdempotencyKey(key: string): { status: number; body: unknown } | null {
  const entry = idempotencyMemory.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    idempotencyMemory.delete(key);
    return null;
  }
  return { status: entry.status, body: entry.body };
}

function setMemoryIdempotency(key: string, status: number, body: unknown): void {
  idempotencyMemory.set(key, { status, body, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
  // Prune expired entries periodically
  if (idempotencyMemory.size % 100 === 0) {
    const now = Date.now();
    for (const [k, v] of idempotencyMemory) {
      if (v.expiresAt < now) idempotencyMemory.delete(k);
    }
  }
}

/**
 * Idempotency key support for POST mutations.
 * If the client sends `Idempotency-Key` header, we cache the response
 * and return the same response for duplicate requests within the TTL.
 */
export function withIdempotency<T>(
  handler: (request: NextRequest) => Promise<T>,
): (request: NextRequest) => Promise<T> {
  return async (request: NextRequest) => {
    const key = request.headers.get('idempotency-key')?.trim();
    if (!key) {
      return handler(request);
    }

    const cached = memoryIdempotencyKey(key);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status }) as unknown as T;
    }

    const result = await handler(request);

    // Cache successful JSON responses (2xx)
    if (result instanceof NextResponse && result.status >= 200 && result.status < 300) {
      try {
        const body = await result.clone().json();
        setMemoryIdempotency(key, result.status, body);
      } catch {
        // Non-JSON or unreadable — skip caching
      }
    }

    return result;
  };
}

/**
 * Check both user and IP rate limits for AI coach endpoints.
 * Returns a standardized 429 response if either limit is exceeded.
 */
export async function checkDualRateLimit(
  userId: string,
  ip: string,
  checkUser: (id: string) => Promise<{ success: boolean }>,
  checkIp: (id: string) => Promise<{ success: boolean }>,
): Promise<{ allowed: true } | { allowed: false; response: NextResponse<ApiErrorResponse> }> {
  const [userResult, ipResult] = await Promise.all([
    checkUser(userId),
    checkIp(ip),
  ]);

  if (!userResult.success) {
    return {
      allowed: false,
      response: createApiErrorResponse(
        'Rate limit exceeded for your account. Please try again in a few minutes.',
        'RATE_LIMITED',
        429,
      ),
    };
  }

  if (!ipResult.success) {
    return {
      allowed: false,
      response: createApiErrorResponse(
        'Rate limit exceeded from this network. Please try again in a few minutes.',
        'RATE_LIMITED',
        429,
      ),
    };
  }

  return { allowed: true };
}

/**
 * Returns a 503 Service Unavailable response with standard error shape.
 */
export function createServiceUnavailableResponse(message?: string): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse(
    message ?? 'This feature is temporarily unavailable. Please try again soon.',
    'SERVICE_UNAVAILABLE',
    503,
  );
}

/**
 * Returns a 429 Too Many Requests response with standard error shape.
 */
export function createRateLimitResponse(message?: string): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse(
    message ?? 'Rate limit exceeded. Please try again in a few minutes.',
    'RATE_LIMITED',
    429,
  );
}

/**
 * Returns a 401 Unauthorized response with standard error shape.
 */
export function createUnauthorizedResponse(): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
}

/**
 * Returns a 404 Not Found response with standard error shape.
 */
export function createNotFoundResponse(message?: string): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse(message ?? 'Not found', 'NOT_FOUND', 404);
}
