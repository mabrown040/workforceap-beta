/**
 * One-click email unsubscribe (RFC 8058).
 *
 * POST — what Gmail/Yahoo call when a user hits their native Unsubscribe
 *        button (body `List-Unsubscribe=One-Click`). Must succeed without
 *        any interaction; the HMAC token in the query is the authorization.
 * GET  — humans clicking the footer link. Unsubscribes (idempotent — the
 *        token can only ever turn notifications off for its own user) and
 *        shows a small confirmation page.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { withSystemGuc } from '@/lib/db/withRequestGuc';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribeToken';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

async function unsubscribe(req: NextRequest): Promise<{ ok: boolean }> {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const email = verifyUnsubscribeToken(token);
  if (!email) return { ok: false };
  try {
    await withSystemGuc(() =>
      prisma.user.updateMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        data: { notificationsUpdates: false, notificationsReminders: false },
      }),
    );
    // Zero matched rows is still success: there is nothing subscribed under
    // that address, which is exactly the state the requester asked for.
    return { ok: true };
  } catch (err) {
    logger.error('unsubscribe: failed to update preferences', { err });
    return { ok: false };
  }
}

export async function POST(req: NextRequest) {
  const { ok } = await unsubscribe(req);
  // RFC 8058: reply 2xx when processed. Invalid tokens get 400 so mailbox
  // providers don't treat a broken link as a working unsubscribe.
  return ok
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { ok } = await unsubscribe(req);
  const body = ok
    ? `<h1>You're unsubscribed</h1><p>You'll no longer receive updates or reminder emails from Workforce Advancement Project. You can turn them back on any time in <a href="/dashboard/settings">your notification settings</a>.</p>`
    : `<h1>This link isn't valid</h1><p>The unsubscribe link looks incomplete or expired. You can manage emails in <a href="/dashboard/settings">your notification settings</a>, or email <a href="mailto:unsubscribe@workforceap.org">unsubscribe@workforceap.org</a>.</p>`;
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribe — Workforce Advancement Project</title><style>body{font-family:system-ui,sans-serif;max-width:34em;margin:12vh auto;padding:0 24px;color:#1f2430;line-height:1.6}h1{font-size:1.5rem}a{color:#ad2c4d}</style></head><body>${body}</body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
