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
 * The `mailto:` unsubscribe form is universally supported and doesn't
 * require a per-user token + HTTP unsubscribe endpoint. A real one-click
 * web unsubscribe can be layered on top later by passing an explicit
 * `List-Unsubscribe: <https://...>` URL via the `headers` override.
 *
 * Every `resend.emails.send(...)` call in lib/email.ts should be replaced
 * with `sendBrandedEmail(resend, ...)` so this wrapper is the only
 * place we touch the SMTP envelope.
 */
import type { Resend } from 'resend';

import { recordWorkflowDiagnostic } from '@/lib/diagnostics';

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

export function buildDeliverabilityHeaders(): Record<string, string> {
  return {
    'List-Unsubscribe': `<mailto:${UNSUBSCRIBE_ADDRESS}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
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

export async function sendBrandedEmail(
  resend: Resend,
  args: SendBrandedEmailArgs,
): Promise<Awaited<ReturnType<Resend['emails']['send']>>> {
  const text = args.text && args.text.trim().length > 0 ? args.text : htmlToPlainText(args.html);
  let result: Awaited<ReturnType<Resend['emails']['send']>>;
  try {
    result = await resend.emails.send({
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text,
      replyTo: args.replyTo,
      cc: args.cc,
      bcc: args.bcc,
      headers: {
        ...buildDeliverabilityHeaders(),
        ...args.headers,
      },
      ...(args.attachments ? { attachments: args.attachments } : {}),
    });
  } catch (err) {
    recordEmailFailure(args, err instanceof Error ? err.message : 'Send threw');
    throw err;
  }
  // Resend resolves with { data, error } instead of throwing on API errors.
  if (result.error) {
    recordEmailFailure(args, result.error.message ?? result.error.name ?? 'Resend API error');
  }
  return result;
}
