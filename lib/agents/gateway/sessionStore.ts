import { createHash, randomBytes } from 'node:crypto';
import { Redis } from '@upstash/redis';
import type { RlsRole } from '@/lib/db/gucContext';

export const AGENT_GATEWAY_SESSION_TTL_SECONDS = 30 * 60;
export const AGENT_GATEWAY_MAX_TOOL_CALLS = 60;
export const AGENT_GATEWAY_SECRET_VARIABLE = 'secret__agent_gateway_token';

const KEY_PREFIX = 'agent-gateway:v1';

type AuthenticatedGatewayRole = Exclude<RlsRole, 'anonymous' | 'system'>;

const AUTHENTICATED_ROLES = new Set<AuthenticatedGatewayRole>([
  'member',
  'admin',
  'counselor',
  'partner',
  'employer',
  'super_admin',
]);

export type AgentGatewaySessionClaims = {
  version: 1;
  userId: string;
  organizationId: string;
  role: AuthenticatedGatewayRole;
  issuer: string;
  agentKey: string;
  conversationId?: string;
  allowedTools: string[];
  issuedAt: string;
  expiresAt: string;
};

export class AgentGatewaySessionError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 429 | 503,
    readonly code:
      | 'gateway_unavailable'
      | 'invalid_token'
      | 'expired_token'
      | 'tool_not_allowed'
      | 'rate_limited',
  ) {
    super(message);
    this.name = 'AgentGatewaySessionError';
  }
}

type SecurityRedis = Pick<Redis, 'set' | 'get' | 'incr' | 'expire'>;

function requireSecurityRedis(): SecurityRedis {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    throw new AgentGatewaySessionError(
      'Agent tools are temporarily unavailable.',
      503,
      'gateway_unavailable',
    );
  }
  return new Redis({ url, token });
}

export function hashAgentGatewayToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Bind gateway sessions to the trusted deployment environment. Preview and
 * production may share Redis and the same provider agent, but their opaque
 * tokens must never be replayable across that boundary.
 */
export function resolveAgentGatewayIssuer(
  env: Partial<Pick<NodeJS.ProcessEnv, 'VERCEL_ENV' | 'VERCEL_PROJECT_ID' | 'VERCEL_PROJECT_PRODUCTION_URL' | 'NODE_ENV'>> = process.env,
): string {
  const vercelEnvironment = env.VERCEL_ENV?.trim();
  const project =
    env.VERCEL_PROJECT_ID?.trim() ||
    env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    'workforceap';
  const issuer = vercelEnvironment
    ? `vercel:${project}:${vercelEnvironment}`
    : `self-hosted:workforceap:${env.NODE_ENV?.trim() || 'unknown'}`;
  return issuer.slice(0, 256);
}

function issuerNamespace(issuer: string): string {
  return createHash('sha256').update(issuer, 'utf8').digest('hex').slice(0, 24);
}

function sessionKey(tokenHash: string, issuer: string): string {
  return `${KEY_PREFIX}:${issuerNamespace(issuer)}:session:${tokenHash}`;
}

function callsKey(tokenHash: string, issuer: string): string {
  return `${KEY_PREFIX}:${issuerNamespace(issuer)}:calls:${tokenHash}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseClaims(value: unknown): AgentGatewaySessionClaims | null {
  let candidate = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== 'object') return null;
  const raw = candidate as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !isNonEmptyString(raw.userId) ||
    !isNonEmptyString(raw.organizationId) ||
    !isNonEmptyString(raw.issuer) ||
    typeof raw.role !== 'string' ||
    !AUTHENTICATED_ROLES.has(raw.role as AuthenticatedGatewayRole) ||
    !isNonEmptyString(raw.agentKey) ||
    !isNonEmptyString(raw.issuedAt) ||
    !isNonEmptyString(raw.expiresAt) ||
    !Array.isArray(raw.allowedTools) ||
    !raw.allowedTools.every(isNonEmptyString)
  ) {
    return null;
  }
  if (raw.conversationId !== undefined && !isNonEmptyString(raw.conversationId)) {
    return null;
  }
  return {
    version: 1,
    userId: raw.userId,
    organizationId: raw.organizationId,
    role: raw.role as AuthenticatedGatewayRole,
    issuer: raw.issuer,
    agentKey: raw.agentKey,
    ...(raw.conversationId ? { conversationId: raw.conversationId as string } : {}),
    allowedTools: [...new Set(raw.allowedTools as string[])],
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt,
  };
}

export async function issueAgentGatewaySession(
  input: Omit<AgentGatewaySessionClaims, 'version' | 'issuer' | 'issuedAt' | 'expiresAt'>,
  options?: { redis?: SecurityRedis; now?: Date; ttlSeconds?: number; issuer?: string },
): Promise<{ token: string; claims: AgentGatewaySessionClaims }> {
  if (!isNonEmptyString(input.userId) || !isNonEmptyString(input.organizationId)) {
    throw new AgentGatewaySessionError(
      'A verified member and organization are required for agent tools.',
      403,
      'tool_not_allowed',
    );
  }
  if (!AUTHENTICATED_ROLES.has(input.role)) {
    throw new AgentGatewaySessionError(
      'A verified authenticated role is required for agent tools.',
      403,
      'tool_not_allowed',
    );
  }
  const allowedTools = [...new Set(input.allowedTools.filter(isNonEmptyString))];
  if (allowedTools.length === 0) {
    throw new AgentGatewaySessionError(
      'This agent is not approved to use member data tools.',
      403,
      'tool_not_allowed',
    );
  }

  const now = options?.now ?? new Date();
  const ttlSeconds = Math.max(60, Math.min(options?.ttlSeconds ?? AGENT_GATEWAY_SESSION_TTL_SECONDS, 3600));
  const token = `wap_ag_${randomBytes(32).toString('base64url')}`;
  const tokenHash = hashAgentGatewayToken(token);
  const issuer = options?.issuer?.trim() || resolveAgentGatewayIssuer();
  const claims: AgentGatewaySessionClaims = {
    version: 1,
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.role,
    issuer,
    agentKey: input.agentKey,
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    allowedTools,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };

  try {
    const redis = options?.redis ?? requireSecurityRedis();
    await redis.set(sessionKey(tokenHash, issuer), claims, { ex: ttlSeconds });
  } catch (error) {
    if (error instanceof AgentGatewaySessionError) throw error;
    throw new AgentGatewaySessionError(
      'Agent tools are temporarily unavailable.',
      503,
      'gateway_unavailable',
    );
  }

  return { token, claims };
}

export async function authorizeAgentGatewaySession(
  token: string,
  requestedTool: string,
  options?: { redis?: SecurityRedis; now?: Date; issuer?: string },
): Promise<AgentGatewaySessionClaims> {
  if (!/^wap_ag_[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new AgentGatewaySessionError('Invalid agent tool token.', 401, 'invalid_token');
  }
  const tokenHash = hashAgentGatewayToken(token);
  const issuer = options?.issuer?.trim() || resolveAgentGatewayIssuer();

  try {
    const redis = options?.redis ?? requireSecurityRedis();
    const claims = parseClaims(await redis.get(sessionKey(tokenHash, issuer)));
    if (!claims) {
      throw new AgentGatewaySessionError('Invalid agent tool token.', 401, 'invalid_token');
    }
    if (claims.issuer !== issuer) {
      throw new AgentGatewaySessionError('Invalid agent tool token.', 401, 'invalid_token');
    }
    const now = options?.now ?? new Date();
    if (Date.parse(claims.expiresAt) <= now.getTime()) {
      throw new AgentGatewaySessionError('Agent tool token expired.', 401, 'expired_token');
    }
    if (!claims.allowedTools.includes(requestedTool)) {
      throw new AgentGatewaySessionError(
        'This agent is not approved to use that tool.',
        403,
        'tool_not_allowed',
      );
    }

    const callCount = await redis.incr(callsKey(tokenHash, issuer));
    // Refresh the counter TTL on every authorized call. If Redis accepted the
    // increment but a prior expiry write failed, a later call can still repair
    // it; the key can never outlive the underlying session.
    const remainingSeconds = Math.max(
      1,
      Math.ceil((Date.parse(claims.expiresAt) - now.getTime()) / 1000),
    );
    await redis.expire(callsKey(tokenHash, issuer), remainingSeconds);
    if (callCount > AGENT_GATEWAY_MAX_TOOL_CALLS) {
      throw new AgentGatewaySessionError(
        'Agent tool call limit reached.',
        429,
        'rate_limited',
      );
    }
    return claims;
  } catch (error) {
    if (error instanceof AgentGatewaySessionError) throw error;
    throw new AgentGatewaySessionError(
      'Agent tools are temporarily unavailable.',
      503,
      'gateway_unavailable',
    );
  }
}

export function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}
