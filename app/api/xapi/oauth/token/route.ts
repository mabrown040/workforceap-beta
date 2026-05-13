import { NextResponse } from 'next/server';
import { getXapiConfig, getXapiReadiness } from '@/lib/xapi/config';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { checkXapiOAuthTokenRateLimit } from '@/lib/rate-limit';
import { issueXapiAccessToken, parseBasicAuth } from '@/lib/xapi/token';

export async function GET() {
  try {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  );

  } catch (error) {
    console.error('/xapi/oauth/token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkXapiOAuthTokenRateLimit(ip);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const readiness = getXapiReadiness({ request });
  if (!readiness.ready) {
    return NextResponse.json({ error: 'xAPI auth is not configured', missing: readiness.missing }, { status: 503 });
  }

  const config = getXapiConfig({ request });
  const auth = parseBasicAuth(request.headers.get('authorization'));

  let body: URLSearchParams | null = null;
  try {
    const text = await request.text();
    body = new URLSearchParams(text);
  } catch {
    body = null;
  }

  const clientId = auth?.clientId || body?.get('client_id') || '';
  const clientSecret = auth?.clientSecret || body?.get('client_secret') || '';
  const grantType = body?.get('grant_type') || 'client_credentials';

  if (grantType !== 'client_credentials') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  }

  if (clientId !== config.clientId || clientSecret !== config.clientSecret) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }

  const accessToken = issueXapiAccessToken('statements:write', { request });
  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: config.tokenTtlSeconds,
    scope: 'statements:write',
  });

  } catch (error) {
    console.error('/xapi/oauth/token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

