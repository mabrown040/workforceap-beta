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
  /(email|phone|ssn|dob|birth|tax_id|household|income|ethnic|disab|veteran|address|street|city|zip|postcode|password|token|secret|api[_-]?key|authorization|cookie|session|otp|reset|first[_-]?name|last[_-]?name|full[_-]?name)/i;

const PII_QUERY_PARAM_PATTERN =
  /(token|email|phone|password|otp|reset|code|session)/i;

const REDACTED = '[REDACTED]';

/**
 * Value-shaped PII patterns, applied to string values inside `extra`,
 * `contexts`, breadcrumb data, and request bodies. We deliberately keep
 * these tight so we don't mangle stack traces or error messages —
 * scrubbing here is in addition to key-based redaction, not a substitute.
 */
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
// E.164 or formatted US phone: tolerate spaces, dashes, dots, parens.
const PHONE_PATTERN =
  /\b(?:\+?1[\s.\-]*)?\(?\d{3}\)?[\s.\-]*\d{3}[\s.\-]*\d{4}\b/g;
const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// ISO-ish DOB: 1980-01-15 / 01/15/1980 / 15-01-1980 — narrow to avoid
// eating timestamps in stack traces (those have time components).
const DOB_PATTERN =
  /\b(?:(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2})\b/g;

/** Redact PII patterns from a free-form string value. */
function redactStringValue(value: string): string {
  if (!value) return value;
  return value
    .replace(SSN_PATTERN, '[REDACTED_SSN]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(PHONE_PATTERN, '[REDACTED_PHONE]')
    .replace(DOB_PATTERN, '[REDACTED_DOB]');
}

function isPiiKey(key: string): boolean {
  return PII_KEY_PATTERN.test(key);
}

/**
 * Recursively redact PII-shaped keys AND PII-shaped string values in an
 * object. Mutates in place. Over-scrubs by design: better to lose a
 * formatted timestamp from a debug context than to ship an SSN to Sentry.
 */
function redactObject(obj: unknown, depth = 0): void {
  if (depth > 6 || obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (typeof item === 'string') {
        obj[i] = redactStringValue(item);
      } else {
        redactObject(item, depth + 1);
      }
    }
    return;
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const rec = obj as Record<string, unknown>;
    const value = rec[key];
    if (isPiiKey(key)) {
      rec[key] = REDACTED;
    } else if (typeof value === 'string') {
      rec[key] = redactStringValue(value);
    } else if (typeof value === 'object') {
      redactObject(value, depth + 1);
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
