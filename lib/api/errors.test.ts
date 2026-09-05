import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { captureApiError } from '@/lib/observability/captureApiError';
import {
  ApiError,
  toApiError,
  buildApiErrorResponse,
  handleApiError,
} from './errors';

vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
}));

describe('ApiError', () => {
  it('creates error with message, code, and status', () => {
    const err = new ApiError('Something broke', 'INTERNAL_ERROR', 500);
    expect(err.message).toBe('Something broke');
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.status).toBe(500);
    expect(err.name).toBe('ApiError');
  });

  it('has static factory methods for common codes', () => {
    expect(ApiError.badRequest().code).toBe('BAD_REQUEST');
    expect(ApiError.badRequest().status).toBe(400);
    expect(ApiError.unauthorized().code).toBe('UNAUTHORIZED');
    expect(ApiError.forbidden().code).toBe('FORBIDDEN');
    expect(ApiError.notFound().code).toBe('NOT_FOUND');
    expect(ApiError.conflict().code).toBe('CONFLICT');
    expect(ApiError.rateLimited().code).toBe('RATE_LIMITED');
    expect(ApiError.internal().code).toBe('INTERNAL_ERROR');
    expect(ApiError.unavailable().code).toBe('SERVICE_UNAVAILABLE');
  });

  it('preserves custom messages on factory methods', () => {
    const err = ApiError.notFound('User not found');
    expect(err.message).toBe('User not found');
  });
});

describe('toApiError', () => {
  it('returns ApiError as-is', () => {
    const original = ApiError.badRequest();
    expect(toApiError(original)).toBe(original);
  });

  it('wraps generic Error without exposing its message and preserves the cause', () => {
    const err = new Error('Database timeout');
    const result = toApiError(err);
    expect(result).toBeInstanceOf(ApiError);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toBe('Internal server error');
    expect(result.status).toBe(500);
    expect(result.cause).toBe(err);
  });

  it('wraps string in ApiError.internal', () => {
    const result = toApiError('string error');
    expect(result.message).toBe('Internal server error');
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.cause).toBe('string error');
  });

  it('wraps unknown types with fallback message', () => {
    const original = { foo: 'bar' };
    const result = toApiError(original);
    expect(result.message).toBe('Internal server error');
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.cause).toBe(original);
  });
});

describe('buildApiErrorResponse', () => {
  it('returns NextResponse with standardized shape', async () => {
    const err = ApiError.notFound('Job not found');
    const response = buildApiErrorResponse(err);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toEqual({
      error: {
        message: 'Job not found',
        code: 'NOT_FOUND',
        status: 404,
      },
    });
  });
});

describe('handleApiError', () => {
  it('logs and returns standardized response for ApiError', async () => {
    const err = ApiError.forbidden('Admin only');
    const response = handleApiError(err, 'GET /api/admin/metrics');

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toBe('Admin only');
  });

  it('wraps unknown errors in INTERNAL_ERROR', async () => {
    const original = new Error('Unexpected');
    const response = handleApiError(original, 'POST /api/jobs');

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 },
    });
    expect(captureApiError).toHaveBeenLastCalledWith(
      expect.objectContaining({ cause: original }),
      { route: 'POST /api/jobs', extra: { code: 'INTERNAL_ERROR' } },
    );
  });
});
