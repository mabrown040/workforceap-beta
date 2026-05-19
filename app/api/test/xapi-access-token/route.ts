import { NextResponse } from 'next/server';
import { issueXapiAccessToken } from '@/lib/xapi/token';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
  try {
  // Hard-disable on any Vercel-deployed environment (preview or production).
  // VERCEL_ENV is set by Vercel for every deploy and is not user-settable,
  // so this can't be flipped by misconfiguring NODE_ENV or E2E_ISSUE_XAPI_TOKEN.
  if (process.env.VERCEL_ENV) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
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

  } catch (error) {
    console.error('/test/xapi-access-token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

