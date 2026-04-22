import 'server-only';

import { getCourseraConfig } from '@/lib/coursera/config';

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

function getBasicAuthHeader(appKey: string, appSecret: string) {
  return `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString('base64')}`;
}

export async function getCourseraAccessToken() {
  const config = getCourseraConfig();

  if (config.apiToken) {
    return config.apiToken;
  }

  if (!config.appKey || !config.appSecret) {
    throw new Error('Coursera API token or app key/secret is not configured');
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const response = await fetch(config.oauthTokenUrl, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(config.appKey, config.appSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Coursera OAuth failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 1800;

  if (!accessToken) {
    throw new Error('Coursera OAuth response did not include an access token');
  }

  cachedToken = {
    accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return accessToken;
}
