import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgentGatewaySessionError,
  authorizeAgentGatewaySession,
  hashAgentGatewayToken,
  issueAgentGatewaySession,
  readBearerToken,
} from './sessionStore';

function memoryRedis() {
  const values = new Map<string, unknown>();
  const counts = new Map<string, number>();
  return {
    values,
    set: async (key: string, value: unknown) => {
      values.set(key, value);
      return 'OK';
    },
    get: async (key: string) => values.get(key) ?? null,
    incr: async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    expire: async () => 1,
  };
}

test('issues an opaque token and restores only server-stored tenant claims', async () => {
  const redis = memoryRedis();
  const now = new Date('2026-08-31T12:00:00.000Z');
  const issued = await issueAgentGatewaySession(
    {
      userId: 'member-1',
      organizationId: 'org-1',
      role: 'member',
      agentKey: 'counselor',
      conversationId: 'conv-1',
      allowedTools: ['get_my_next_step'],
    },
    { redis: redis as never, now, issuer: 'wap:test:production' },
  );

  assert.match(issued.token, /^wap_ag_[A-Za-z0-9_-]+$/);
  assert.equal(redis.values.has(issued.token), false);
  assert.equal(
    [...redis.values.keys()].some((key) =>
      key.endsWith(`:session:${hashAgentGatewayToken(issued.token)}`),
    ),
    true,
  );

  const claims = await authorizeAgentGatewaySession(
    issued.token,
    'get_my_next_step',
    { redis: redis as never, now, issuer: 'wap:test:production' },
  );
  assert.equal(claims.userId, 'member-1');
  assert.equal(claims.organizationId, 'org-1');
  assert.equal(claims.role, 'member');
  assert.equal(claims.issuer, 'wap:test:production');
  assert.equal(claims.conversationId, 'conv-1');
});

test('rejects a tool not granted to the agent session', async () => {
  const redis = memoryRedis();
  const now = new Date('2026-08-31T12:00:00.000Z');
  const { token } = await issueAgentGatewaySession(
    {
      userId: 'member-1',
      organizationId: 'org-1',
      role: 'member',
      agentKey: 'counselor',
      allowedTools: ['get_training_status'],
    },
    { redis: redis as never, now, issuer: 'wap:test:production' },
  );

  await assert.rejects(
    authorizeAgentGatewaySession(token, 'get_coursera_progress', {
      redis: redis as never,
      now,
      issuer: 'wap:test:production',
    }),
    (error: unknown) =>
      error instanceof AgentGatewaySessionError &&
      error.status === 403 &&
      error.code === 'tool_not_allowed',
  );
});

test('rejects an expired or malformed token', async () => {
  const redis = memoryRedis();
  const issuedAt = new Date('2026-08-31T12:00:00.000Z');
  const { token } = await issueAgentGatewaySession(
    {
      userId: 'member-1',
      organizationId: 'org-1',
      role: 'member',
      agentKey: 'counselor',
      allowedTools: ['get_my_next_step'],
    },
    {
      redis: redis as never,
      now: issuedAt,
      ttlSeconds: 60,
      issuer: 'wap:test:production',
    },
  );

  await assert.rejects(
    authorizeAgentGatewaySession(token, 'get_my_next_step', {
      redis: redis as never,
      now: new Date('2026-08-31T12:01:01.000Z'),
      issuer: 'wap:test:production',
    }),
    (error: unknown) => error instanceof AgentGatewaySessionError && error.code === 'expired_token',
  );
  await assert.rejects(
    authorizeAgentGatewaySession('member-1', 'get_my_next_step', { redis: redis as never }),
    (error: unknown) => error instanceof AgentGatewaySessionError && error.code === 'invalid_token',
  );
  await assert.rejects(
    authorizeAgentGatewaySession('wap_ag_short', 'get_my_next_step', { redis: redis as never }),
    (error: unknown) => error instanceof AgentGatewaySessionError && error.code === 'invalid_token',
  );
});

test('rejects a token replayed across deployment issuers sharing Redis', async () => {
  const redis = memoryRedis();
  const now = new Date('2026-08-31T12:00:00.000Z');
  const { token } = await issueAgentGatewaySession(
    {
      userId: 'member-1',
      organizationId: 'org-1',
      role: 'admin',
      agentKey: 'counselor',
      allowedTools: ['get_my_next_step'],
    },
    { redis: redis as never, now, issuer: 'wap:test:preview' },
  );

  await assert.rejects(
    authorizeAgentGatewaySession(token, 'get_my_next_step', {
      redis: redis as never,
      now,
      issuer: 'wap:test:production',
    }),
    (error: unknown) =>
      error instanceof AgentGatewaySessionError && error.code === 'invalid_token',
  );
});

test('parses only a strict bearer token', () => {
  assert.equal(
    readBearerToken(new Request('https://example.test', { headers: { authorization: 'Bearer wap_ag_abc' } })),
    'wap_ag_abc',
  );
  assert.equal(
    readBearerToken(new Request('https://example.test', { headers: { authorization: 'Basic abc' } })),
    null,
  );
});
