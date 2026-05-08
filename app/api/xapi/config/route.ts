import { NextResponse } from 'next/server';
import { getXapiReadiness } from '@/lib/xapi/config';

export async function GET(request: Request) {
  const readiness = getXapiReadiness({ request });
  return NextResponse.json({
    ready: readiness.ready,
    missing: readiness.missing,
    actorMode: readiness.actorMode,
    clientId: readiness.clientId,
    oauthServerUrl: readiness.oauthServerUrl,
    tenantServerUrl: readiness.tenantServerUrl,
  });
}
