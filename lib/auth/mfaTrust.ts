const ADMIN_MFA_TRUST_COOKIE = 'wa_admin_mfa_trust';
const ADMIN_MFA_TRUST_VERSION = 1;

type AdminMfaTrustPayload = {
  v: number;
  sub: string;
  exp: number;
  ua?: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getTrustSecret() {
  const secret = process.env.AUTH_TRUST_COOKIE_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_TRUST_COOKIE_SECRET env var is required for admin MFA trust cookies');
  }
  return secret;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(value: string) {
  const key = await importHmacKey(getTrustSecret());
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function hashUserAgent(userAgent: string | null | undefined) {
  const normalized = userAgent?.trim();
  if (!normalized) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function getAdminMfaTrustDays() {
  const raw = Number(process.env.ADMIN_MFA_TRUST_DAYS || '7');
  if (!Number.isFinite(raw)) return 7;
  return clamp(Math.round(raw), 3, 7);
}

export function getAdminMfaTrustCookieName() {
  return ADMIN_MFA_TRUST_COOKIE;
}

export async function issueAdminMfaTrustToken(args: { userId: string; userAgent?: string | null }) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminMfaTrustPayload = {
    v: ADMIN_MFA_TRUST_VERSION,
    sub: args.userId,
    exp: now + getAdminMfaTrustDays() * 24 * 60 * 60,
    ua: await hashUserAgent(args.userAgent),
  };

  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminMfaTrustToken(args: {
  token?: string | null;
  userId: string;
  userAgent?: string | null;
}) {
  const token = args.token?.trim();
  if (!token) return false;

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return false;

  const expectedSignature = await sign(payloadPart);
  if (!safeEqual(signaturePart, expectedSignature)) return false;

  let payload: AdminMfaTrustPayload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(payloadPart))) as AdminMfaTrustPayload;
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.v !== ADMIN_MFA_TRUST_VERSION) return false;
  if (payload.sub !== args.userId) return false;
  if (!payload.exp || payload.exp <= now) return false;

  const expectedUaHash = await hashUserAgent(args.userAgent);
  if ((payload.ua || undefined) !== (expectedUaHash || undefined)) return false;

  return true;
}

export function getAdminMfaTrustCookieOptions() {
  return {
    path: '/',
    maxAge: getAdminMfaTrustDays() * 24 * 60 * 60,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  };
}
