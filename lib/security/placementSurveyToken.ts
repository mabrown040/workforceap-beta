/**
 * Signed-token helpers for post-placement survey links.
 *
 * Pattern mirrors lib/auth/mfaTrust.ts: base64url(JSON payload) + "." +
 * base64url(HMAC-SHA256 signature). Stateless; survey rows themselves are
 * the source of truth (token only proves "the server emailed this link
 * for this surveyId").
 */

const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

type PlacementSurveyTokenPayload = {
  v: number;
  sub: string; // PlacementSurvey.id
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getTokenSecret(): string {
  const secret = process.env.PLACEMENT_SURVEY_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'PLACEMENT_SURVEY_TOKEN_SECRET env var is required to issue/verify placement-survey links',
    );
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getTokenSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function issuePlacementSurveyToken(args: {
  surveyId: string;
  ttlSeconds?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: PlacementSurveyTokenPayload = {
    v: TOKEN_VERSION,
    sub: args.surveyId,
    exp: now + (args.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export type VerifyResult =
  | { ok: true; surveyId: string }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'wrong_version' };

export async function verifyPlacementSurveyToken(token: string | null | undefined): Promise<VerifyResult> {
  const value = token?.trim();
  if (!value) return { ok: false, reason: 'malformed' };

  const [payloadPart, signaturePart] = value.split('.');
  if (!payloadPart || !signaturePart) return { ok: false, reason: 'malformed' };

  const expectedSignature = await sign(payloadPart);
  if (!safeEqual(signaturePart, expectedSignature)) return { ok: false, reason: 'bad_signature' };

  let payload: PlacementSurveyTokenPayload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(payloadPart))) as PlacementSurveyTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (payload.v !== TOKEN_VERSION) return { ok: false, reason: 'wrong_version' };
  if (!payload.sub) return { ok: false, reason: 'malformed' };

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) return { ok: false, reason: 'expired' };

  return { ok: true, surveyId: payload.sub };
}
