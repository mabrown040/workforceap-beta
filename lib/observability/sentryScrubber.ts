/**
 * PII scrubber shared by server + edge Sentry inits.
 *
 * AUDIT-2026-05-16 §H-S7 / §H-A3: the client Sentry init has a breadcrumb
 * scrubber for URL query strings, but the server + edge inits had no
 * filtering. Stack traces from server route handlers carry request URLs,
 * query strings, headers (including cookie + authorization), and Prisma
 * error metadata that frequently echo column values back — emails, DOB,
 * ethnicity, household income, disability status, WIOA answers, and parent/
 * guardian contact info. Shipping those to Sentry makes Sentry a sub-
 * processor with regulated PII that isn't disclosed in the privacy policy.
 *
 * The scrubber:
 *  - Drops the `cookie` and `authorization` request headers.
 *  - Redacts query keys whose names look like PII (email, phone, token, etc.).
 *  - Redacts `extra`/`contexts` keys with the same name patterns.
 *  - Strips Prisma `meta.target`/`meta.cause` shapes that can contain row content.
 *
 * Apply via `Sentry.init({ ..., beforeSend, beforeBreadcrumb })`.
 */

import type * as Sentry from '@sentry/nextjs';

const PII_KEY_PATTERN =
  /(email|phone|ssn|dob|birth|tax_id|household|income|ethnic|disab|veteran|address|zip|postcode|password|token|secret|api[_-]?key|authorization|cookie|session|otp|reset)/i;

const PII_QUERY_PARAM_PATTERN =
  /(token|email|phone|password|otp|reset|code|session)/i;

const REDACTED = '[REDACTED]';

function isPiiKey(key: string): boolean {
  return PII_KEY_PATTERN.test(key);
}

/** Recursively redact PII-shaped keys in an object. Mutates in place. */
function redactObject(obj: unknown, depth = 0): void {
  if (depth > 6 || obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) redactObject(item, depth + 1);
    return;
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const rec = obj as Record<string, unknown>;
    if (isPiiKey(key)) {
      rec[key] = REDACTED;
    } else if (typeof rec[key] === 'object') {
      redactObject(rec[key], depth + 1);
    }
  }
}

/** Redact PII-looking query keys from a URL query string. */
function redactQueryString(query: string): string {
  if (!query) return query;
  try {
    const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
    let changed = false;
    for (const key of Array.from(params.keys())) {
      if (PII_QUERY_PARAM_PATTERN.test(key)) {
        params.set(key, REDACTED);
        changed = true;
      }
    }
    return changed ? (query.startsWith('?') ? `?${params.toString()}` : params.toString()) : query;
  } catch {
    return query;
  }
}

/** Redact PII-looking query keys from a full URL. */
function redactUrl(url: string): string {
  if (!url || !url.includes('?')) return url;
  const [base, query] = url.split('?', 2);
  return `${base}?${redactQueryString(query)}`;
}

export const sentryBeforeSend: NonNullable<
  Parameters<typeof Sentry.init>[0]
>['beforeSend'] = (event) => {
  // Strip sensitive headers entirely.
  if (event.request?.headers) {
    const headers = event.request.headers as Record<string, string>;
    for (const h of Object.keys(headers)) {
      const lower = h.toLowerCase();
      if (lower === 'cookie' || lower === 'authorization' || lower === 'x-webhook-secret') {
        headers[h] = REDACTED;
      }
    }
  }

  // Redact PII-shaped query params on the request URL + query_string.
  if (event.request?.url) {
    event.request.url = redactUrl(event.request.url);
  }
  if (typeof event.request?.query_string === 'string') {
    event.request.query_string = redactQueryString(event.request.query_string);
  } else if (event.request?.query_string && typeof event.request.query_string === 'object') {
    redactObject(event.request.query_string);
  }

  // Recursively redact extras + contexts (captureApiError emits PII here).
  if (event.extra) redactObject(event.extra);
  if (event.contexts) redactObject(event.contexts);

  // Prisma errors stash row content in `meta.target` / `meta.cause`. Drop them.
  type ExtraWithError = { values?: Array<{ meta?: Record<string, unknown> }> };
  const exception = (event.exception as { values?: Array<{ meta?: Record<string, unknown> }> } | undefined);
  if (exception?.values) {
    for (const v of exception.values) {
      if (v && typeof v === 'object' && 'meta' in v && v.meta && typeof v.meta === 'object') {
        const meta = v.meta as Record<string, unknown>;
        if ('target' in meta) meta.target = REDACTED;
        if ('cause' in meta) meta.cause = REDACTED;
      }
    }
  }
  void (null as unknown as ExtraWithError); // satisfy unused-type if reshuffled

  return event;
};

export const sentryBeforeBreadcrumb: NonNullable<
  Parameters<typeof Sentry.init>[0]
>['beforeBreadcrumb'] = (breadcrumb) => {
  if (breadcrumb.data && typeof breadcrumb.data === 'object') {
    const data = breadcrumb.data as Record<string, unknown>;
    if (typeof data.url === 'string') data.url = redactUrl(data.url);
    if (typeof data.to === 'string') data.to = redactUrl(data.to);
    if (typeof data.from === 'string') data.from = redactUrl(data.from);
    redactObject(data);
  }
  if (typeof breadcrumb.message === 'string') {
    breadcrumb.message = redactUrl(breadcrumb.message);
  }
  return breadcrumb;
};
