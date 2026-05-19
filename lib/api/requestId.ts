export const REQUEST_ID_HEADER = 'x-request-id';

export function resolveRequestId(request?: Request | null): string {
  const incoming = request?.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming) return incoming;
  return crypto.randomUUID();
}

export function withRequestIdHeader<T extends Response>(response: T, requestId: string): T {
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }) as T;
}
