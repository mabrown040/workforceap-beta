import { logApiRequest } from '@/lib/log';
import { getGucContext } from '@/lib/db/gucContext';
import { resolveRequestId, withRequestIdHeader, REQUEST_ID_HEADER } from '@/lib/api/requestId';

const WAP_USER_ID_HEADER = 'x-wap-user-id';
const WAP_ORG_ID_HEADER = 'x-wap-org-id';

async function extractErrorCode(response: Response): Promise<string | undefined> {
  if (response.status < 400) return undefined;

  try {
    const clone = response.clone();
    const contentType = clone.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return String(response.status);

    const body: unknown = await clone.json();
    if (!body || typeof body !== 'object') return String(response.status);

    const record = body as Record<string, unknown>;
    if (typeof record.error_code === 'string') return record.error_code;
    if (typeof record.code === 'string') return record.code;

    const error = record.error;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string') {
      return (error as { code: string }).code;
    }
  } catch {
    // Non-JSON or unreadable bodies fall back to status code.
  }

  return String(response.status);
}

function resolveActorIds(request?: Request | null): { userId?: string; orgId?: string } {
  const guc = getGucContext();
  const userId = guc?.userId ?? request?.headers.get(WAP_USER_ID_HEADER) ?? undefined;
  const orgId = guc?.orgId ?? request?.headers.get(WAP_ORG_ID_HEADER) ?? undefined;

  return {
    userId: userId ?? undefined,
    orgId: orgId ?? undefined,
  };
}

function resolveRoute(request?: Request | null): string {
  if (!request?.url) return 'unknown';
  try {
    return new URL(request.url).pathname;
  } catch {
    return 'unknown';
  }
}

export type RouteObservabilityContext = {
  userId?: string | null;
  orgId?: string | null;
};

/**
 * Wrap an App Router API handler with structured request logging and
 * `x-request-id` propagation on responses.
 */
export function withRouteObservability<T, R extends Request = Request, C = unknown>(
  handler: (request: R, context: C) => Promise<T>,
  options?: { route?: string; context?: RouteObservabilityContext },
): (request?: Request, context?: C) => Promise<T> {
  return async (request?: Request, context?: C) => {
    const req = request as R;
    const requestId = resolveRequestId(req);
    const started = Date.now();
    const route = options?.route ?? resolveRoute(req);
    const method = req?.method ?? 'UNKNOWN';

    let status = 500;
    let errorCode: string | undefined;
    let result: T;

    try {
      result = await handler(req, context as C);

      if (result instanceof Response) {
        status = result.status;
        errorCode = await extractErrorCode(result);
        result = withRequestIdHeader(result, requestId) as T;
      } else {
        status = 200;
      }

      return result;
    } catch (err) {
      status = 500;
      errorCode = 'INTERNAL_ERROR';
      throw err;
    } finally {
      const actor = resolveActorIds(req);
      logApiRequest({
        route,
        method,
        status,
        duration_ms: Date.now() - started,
        request_id: requestId,
        user_id: options?.context?.userId ?? actor.userId ?? undefined,
        org_id: options?.context?.orgId ?? actor.orgId ?? undefined,
        error_code: errorCode,
      });
    }
  };
}

export { REQUEST_ID_HEADER };
