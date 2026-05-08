import 'server-only';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

function normalizeBaseUrl(value: string | undefined) {
  const raw = value?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}

function getBaseUrlFromRequest(request: Request): string | null {
  try {
    const u = new URL(request.url);
    return u.origin;
  } catch {
    return null;
  }
}

export function getXapiConfig(options: { request?: Request } = {}) {
  const fromRequest = options.request ? getBaseUrlFromRequest(options.request) : null;
  const tenantBaseUrl = normalizeBaseUrl(
    fromRequest ||
      process.env.XAPI_TENANT_SERVER_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  );

  return {
    clientId:
      process.env.XAPI_CLIENT_ID?.trim() ||
      process.env.COURSERA_APP_ID?.trim() ||
      'workforceap-xapi',
    clientSecret:
      process.env.XAPI_CLIENT_SECRET?.trim() ||
      process.env.COURSERA_APP_SECRET?.trim() ||
      process.env.COURSERA_WEBHOOK_SECRET?.trim() ||
      '',
    oauthServerUrl: `${tenantBaseUrl}/api/xapi/oauth/token`,
    tenantServerUrl: `${tenantBaseUrl}/api/xapi`,
    issuer: tenantBaseUrl,
    audience: 'coursera-xapi',
    tokenTtlSeconds: 60 * 60,
    actorMode: 'mbox' as const,
  };
}

export function getXapiReadiness(options: { request?: Request } = {}) {
  const config = getXapiConfig(options);
  const missing: string[] = [];
  if (!config.clientId) missing.push('XAPI client ID');
  if (!config.clientSecret) missing.push('XAPI client secret');

  return {
    ready: missing.length === 0,
    missing,
    actorMode: config.actorMode,
    oauthServerUrl: config.oauthServerUrl,
    tenantServerUrl: config.tenantServerUrl,
    clientId: config.clientId,
  };
}
