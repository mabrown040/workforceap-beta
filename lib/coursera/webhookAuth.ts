import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * Coursera REST webhook authentication.
 *
 * Supported mechanisms (first match wins):
 * 1. HMAC-SHA256 over the raw request body when a signature header is present
 *    (`x-coursera-signature`, `x-coursera-webhook-signature`, or `x-coursera-hmac-sha256`).
 *    Value may be `sha256=<hex>` or a 64-char hex digest (common webhook pattern).
 * 2. Shared secret in `x-coursera-webhook-secret` (preferred over body).
 * 3. Legacy: `secret` field in JSON body — avoid in new integrations (logs, caches).
 *
 * Use `COURSERA_WEBHOOK_SECRET` (or `WEBHOOK_SECRET` fallback, same as `getCourseraConfig`).
 * Invalid credentials return the same generic failure to avoid leaking configuration details.
 */
const SIGNATURE_HEADERS = [
  'x-coursera-signature',
  'x-coursera-webhook-signature',
  'x-coursera-hmac-sha256',
] as const;

function secureStringEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

function tryVerifyHmacSha256(secret: string, rawBody: string, headerValue: string): boolean {
  const v = headerValue.trim();
  const hex = v.toLowerCase().startsWith('sha256=') ? v.slice(7).trim().toLowerCase() : v.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex').toLowerCase();
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hex, 'hex'));
  } catch {
    return false;
  }
}

function readSignatureHeader(request: Request): string | null {
  for (const name of SIGNATURE_HEADERS) {
    const v = request.headers.get(name)?.trim();
    if (v) return v;
  }
  return null;
}

export type CourseraRestWebhookAuthResult =
  | { ok: true; method: 'hmac-sha256' | 'shared-secret-header' | 'shared-secret-body' }
  | { ok: false };

export function verifyCourseraRestWebhookAuth(args: {
  request: Request;
  rawBody: string;
  expectedSecret: string;
  /** Legacy JSON field; never persist or log. */
  bodySecret?: string | null;
}): CourseraRestWebhookAuthResult {
  const { request, rawBody, expectedSecret, bodySecret } = args;
  if (!expectedSecret) return { ok: false };

  const sigHeader = readSignatureHeader(request);
  if (sigHeader) {
    if (tryVerifyHmacSha256(expectedSecret, rawBody, sigHeader)) {
      return { ok: true, method: 'hmac-sha256' };
    }
    // If a signature header was present but HMAC failed, do not fall through to other methods.
    return { ok: false };
  }

  const headerSecret = request.headers.get('x-coursera-webhook-secret')?.trim();
  if (headerSecret && secureStringEqual(headerSecret, expectedSecret)) {
    return { ok: true, method: 'shared-secret-header' };
  }

  const bodyS = bodySecret?.trim();
  if (bodyS && secureStringEqual(bodyS, expectedSecret)) {
    return { ok: true, method: 'shared-secret-body' };
  }

  return { ok: false };
}
