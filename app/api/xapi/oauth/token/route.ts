import { NextResponse } from 'next/server';
import { getXapiConfig, getXapiReadiness } from '@/lib/xapi/config';
import { issueXapiAccessToken, parseBasicAuth } from '@/lib/xapi/token';

export async function POST(request: Request) {
  const readiness = getXapiReadiness();
  if (!readiness.ready) {
    return NextResponse.json({ error: 'xAPI auth is not configured', missing: readiness.missing }, { status: 503 });
  }

  const config = getXapiConfig();
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

  const accessToken = issueXapiAccessToken();
  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: config.tokenTtlSeconds,
    scope: 'statements:write',
  });
}
