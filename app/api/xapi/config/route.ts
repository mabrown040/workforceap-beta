import { NextResponse } from 'next/server';
import { getXapiReadiness } from '@/lib/xapi/config';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { checkXapiConfigGetRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkXapiConfigGetRateLimit(ip);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const readiness = getXapiReadiness({ request });
  return NextResponse.json({
    ready: readiness.ready,
    missing: readiness.missing,
    actorMode: readiness.actorMode,
    clientId: readiness.clientId,
    oauthServerUrl: readiness.oauthServerUrl,
    tenantServerUrl: readiness.tenantServerUrl,
  });

  } catch (error) {
    console.error('/xapi/config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST() {
  try {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } },
  );

  } catch (error) {
    console.error('/xapi/config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

