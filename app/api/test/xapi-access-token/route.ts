import { NextResponse } from 'next/server';
import { issueXapiAccessToken } from '@/lib/xapi/token';

/**
 * Issues a short-lived HS256 xAPI access token using the same secret as
 * `/api/xapi/oauth/token`. **Never enable in production.**
 *
 * Enabled when `NODE_ENV === 'test'` or when `E2E_ISSUE_XAPI_TOKEN=1` with
 * `NODE_ENV !== 'production'` (local Playwright + `.env.local` — never set on
 * deployed production).
 */
export async function GET() {
  const allowByNodeEnv = process.env.NODE_ENV === 'test';
  const allowForLocalE2E =
    process.env.E2E_ISSUE_XAPI_TOKEN === '1' && process.env.NODE_ENV !== 'production';
  if (!allowByNodeEnv && !allowForLocalE2E) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    accessToken: issueXapiAccessToken(),
    usage: 'POST /api/xapi/statements with Authorization: Bearer <accessToken>',
  });
}
