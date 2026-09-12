/**
 * Centralized Resend send wrapper. Two responsibilities:
 *
 * 1. Provide a plaintext fallback. Resend (and downstream MTAs) penalize
 *    HTML-only mail; without a `text` part Gmail/O365 reduce reputation
 *    and accessibility/screen-reader users get a blank message.
 *
 * 2. Attach List-Unsubscribe + List-Unsubscribe-Post headers. Gmail and
 *    Yahoo's Feb 2024 bulk-sender rules require both; without them,
 *    member-facing mail (welcome, weekly recap, partner digest, nudges)
 *    is increasingly likely to be bulk-blocked or routed to spam.
 *
 * Single-recipient sends automatically carry a real RFC 8058 one-click
 * unsubscribe URL (/api/unsubscribe with an HMAC token bound to the
 * recipient email; flips that account's notification prefs off).
 * Multi-recipient sends fall back to the universally supported `mailto:`
 * form (with no One-Click-Post header, which would be invalid against a
 * mailto-only List-Unsubscribe).
 *
 * Every `resend.emails.send(...)` call in lib/email.ts should be replaced
 * with `sendBrandedEmail(resend, ...)` so this wrapper is the only
 * place we touch the SMTP envelope.
 */
import type { Resend } from 'resend';

import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribeToken';

const RESEND_MAX_ATTEMPTS = 3;
const RESEND_RETRY_BASE_DELAY_MS = 500;
/** Never spend more than one minute of a request waiting to retry email. */
const RESEND_RETRY_MAX_TOTAL_WAIT_MS = 60_000;

type Sleep = (ms: number) => Promise<void>;

export interface SendBrandedEmailRetryOptions {
  /** Test seam; production uses a real bounded timer. */
  sleep?: Sleep;
  /** Test seam for absolute Retry-After / rate-limit reset values. */
  now?: () => number;
  /** Shared caller deadline; no provider retry sleep may cross it. */
  deadlineAtMs?: number;
}

export const UNSUBSCRIBE_ADDRESS =
  process.env.EMAIL_UNSUBSCRIBE_ADDRESS || 'unsubscribe@workforceap.org';

/**
 * Strip HTML tags + decode the small set of entities the template
 * helpers emit into a reasonable plaintext fallback. This is a best-
 * effort conversion — for emails where plaintext fidelity matters
 * (security alerts, magic links) the caller should still pass an
 * explicit `text` field.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|h[1-6]|tr|td|blockquote|table|thead|tbody)[^>]*>/gi, '\n')
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, (_m, href, text) => {
      const inner = String(text).trim();
      return inner && inner !== href ? `${inner} (${href})` : href;
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Drop CR/LF/NUL from every header value (and any header whose name carries
 * them) before handing the map to the mail SDK. One malformed env var or
 * caller-supplied value must never be able to fail an entire send — the
 * underlying fetch throws on the whole request, not just the bad header.
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (/[\r\n\0]/.test(name)) continue;
    clean[name] = String(value ?? '').replace(/[\r\n\0]/g, '').trim();
  }
  return clean;
}

export function buildDeliverabilityHeaders(unsubscribeUrl?: string): Record<string, string> {
  if (unsubscribeUrl) {
    // RFC 8058 one-click: HTTPS URI first, mailto fallback second.
    return {
      'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${UNSUBSCRIBE_ADDRESS}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }
  // Without an HTTPS URI, One-Click POST is impossible (RFC 8058 forbids
  // pairing List-Unsubscribe-Post with a mailto-only header), so send the
  // universally supported mailto form alone.
  return {
    'List-Unsubscribe': `<mailto:${UNSUBSCRIBE_ADDRESS}?subject=unsubscribe>`,
  };
}

export interface SendBrandedEmailArgs {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  /** Optional override; defaults to HTML stripped to plaintext. */
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** Caller-supplied headers are merged on top of the defaults. */
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
  /** Stable per-message request key; retries must preserve the original payload. */
  idempotencyKey?: string;
}

/**
 * Persist a send failure to workflow diagnostics so /admin/diagnostics shows
 * email problems instead of them dying in server logs. Fire-and-forget: the
 * diagnostic write must never change send behavior or throw.
 */
function recordEmailFailure(args: SendBrandedEmailArgs, failureReason: string) {
  void recordWorkflowDiagnostic({
    workflow: 'email_send',
    status: 'error',
    summary: `Email send failed: "${args.subject}"`,
    provider: 'resend',
    failureReason,
    metadata: {
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function readHeader(headers: unknown, name: string): unknown {
  if (headers instanceof Headers) return headers.get(name);
  const record = asRecord(headers);
  if (!record) return undefined;
  const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? record[key] : undefined;
}

function parseRetryAfterMs(value: unknown, nowMs: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric * 1_000;
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return Math.max(0, timestamp - nowMs);
  }
  return null;
}

function parseRateLimitResetMs(value: unknown, nowMs: number): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (numeric >= 1_000_000_000_000) return Math.max(0, numeric - nowMs);
  if (numeric >= 1_000_000_000) return Math.max(0, numeric * 1_000 - nowMs);
  return numeric * 1_000;
}

function resendRetryDelayMs(error: unknown, attempt: number, nowMs: number): number | null {
  const record = asRecord(error);
  if (!record) return null;
  const status = Number(record.status ?? record.statusCode ?? record.status_code);
  const name = String(record.name ?? record.code ?? '').toLowerCase();
  if (status !== 429 && name !== 'rate_limit_exceeded' && name !== 'rate_limited') return null;

  const rateLimit = asRecord(record.rateLimit ?? record.rate_limit);
  const retryAfterMs = Number(record.retryAfterMs ?? record.retry_after_ms);
  const hintedDelay = Number.isFinite(retryAfterMs) && retryAfterMs >= 0
    ? retryAfterMs
    : parseRetryAfterMs(
        record.retryAfter ?? record.retry_after ?? readHeader(record.headers, 'retry-after'),
        nowMs,
      ) ?? parseRateLimitResetMs(
        rateLimit?.reset
          ?? record.rateLimitReset
          ?? record.rate_limit_reset
          ?? readHeader(record.headers, 'ratelimit-reset')
          ?? readHeader(record.headers, 'x-ratelimit-reset'),
        nowMs,
      );
  const backoff = RESEND_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
  return Math.max(hintedDelay ?? backoff, backoff);
}

export async function sendBrandedEmail(
  resend: Resend,
  args: SendBrandedEmailArgs,
  retryOptions: SendBrandedEmailRetryOptions = {},
): Promise<Awaited<ReturnType<Resend['emails']['send']>>> {
  const text = args.text && args.text.trim().length > 0 ? args.text : htmlToPlainText(args.html);
  const payload = {
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text,
    replyTo: args.replyTo,
    cc: args.cc,
    bcc: args.bcc,
    headers: sanitizeHeaders({
      // Single-recipient mail gets a tokenized RFC 8058 one-click URL bound
      // to that recipient; multi-recipient mail falls back to mailto-only.
      ...buildDeliverabilityHeaders(
        typeof args.to === 'string' ? buildUnsubscribeUrl(args.to) : undefined,
      ),
      ...args.headers,
    }),
    ...(args.attachments ? { attachments: args.attachments } : {}),
  };
  const sleep = retryOptions.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = retryOptions.now ?? Date.now;
  let totalRetryWaitMs = 0;

  for (let attempt = 1; attempt <= RESEND_MAX_ATTEMPTS; attempt++) {
    let result: Awaited<ReturnType<Resend['emails']['send']>>;
    try {
      result = args.idempotencyKey
        ? await resend.emails.send(payload, { idempotencyKey: args.idempotencyKey })
        : await resend.emails.send(payload);
    } catch (err) {
      const nowMs = now();
      const delayMs = resendRetryDelayMs(err, attempt, nowMs);
      if (
        delayMs !== null
        && attempt < RESEND_MAX_ATTEMPTS
        && totalRetryWaitMs + delayMs <= RESEND_RETRY_MAX_TOTAL_WAIT_MS
        && (retryOptions.deadlineAtMs === undefined || nowMs + delayMs < retryOptions.deadlineAtMs)
      ) {
        totalRetryWaitMs += delayMs;
        await sleep(delayMs);
        continue;
      }
      recordEmailFailure(args, err instanceof Error ? err.message : 'Send threw');
      throw err;
    }

    // Resend resolves with { data, error } instead of throwing on API errors.
    if (!result.error) return result;
    const nowMs = now();
    const delayMs = resendRetryDelayMs(result.error, attempt, nowMs);
    if (
      delayMs !== null
      && attempt < RESEND_MAX_ATTEMPTS
      && totalRetryWaitMs + delayMs <= RESEND_RETRY_MAX_TOTAL_WAIT_MS
      && (retryOptions.deadlineAtMs === undefined || nowMs + delayMs < retryOptions.deadlineAtMs)
    ) {
      totalRetryWaitMs += delayMs;
      await sleep(delayMs);
      continue;
    }
    const message = result.error.message ?? result.error.name ?? 'Resend API error';
    recordEmailFailure(args, message);
    throw new Error(message);
  }
  throw new Error('Resend retry budget exhausted');
}
