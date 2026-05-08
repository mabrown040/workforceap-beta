import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { getXapiConfig } from '@/lib/xapi/config';

type TokenPayload = {
  sub: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  scope: string;
};

function base64urlEncode(input: string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function issueXapiAccessToken(
  scope = 'statements:write',
  options: { request?: Request } = {}
) {
  const config = getXapiConfig(options);
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: config.clientId,
    aud: config.audience,
    iss: config.issuer,
    iat: now,
    exp: now + config.tokenTtlSeconds,
    scope,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, config.clientSecret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyXapiAccessToken(token: string, options: { request?: Request } = {}) {
  const config = getXapiConfig(options);
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error('Malformed access token');
  }

  const expected = sign(`${headerPart}.${payloadPart}`, config.clientSecret);
  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64urlDecode(payloadPart)) as TokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error('Access token expired');
  if (payload.aud !== config.audience) throw new Error('Invalid token audience');
  if (payload.iss !== config.issuer) throw new Error('Invalid token issuer');

  return payload;
}

export function parseBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function parseBasicAuth(authHeader: string | null) {
  if (!authHeader) return null;
  const match = authHeader.match(/^Basic\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    return {
      clientId: decoded.slice(0, idx),
      clientSecret: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}
