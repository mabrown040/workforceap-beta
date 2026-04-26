import { NextResponse } from 'next/server';
import { getXapiReadiness } from '@/lib/xapi/config';

export async function GET() {
  const readiness = getXapiReadiness();
  return NextResponse.json({
    ready: readiness.ready,
    missing: readiness.missing,
    actorMode: readiness.actorMode,
    clientId: readiness.clientId,
    oauthServerUrl: readiness.oauthServerUrl,
    tenantServerUrl: readiness.tenantServerUrl,
  });
}
