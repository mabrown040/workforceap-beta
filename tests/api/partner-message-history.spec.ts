// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), partner: vi.fn(), thread: vi.fn(), messages: vi.fn(), existingThread: vi.fn(), authorize: vi.fn(), advance: vi.fn(), readOnly: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.user, resolveAuthGucContext: vi.fn(async () => ({ role: 'authenticated' })) }));
vi.mock('@/lib/auth/roles', () => ({ getPartnerForUser: mocks.partner }));
vi.mock('@/lib/db/prisma', () => {
  const db = { message: { findMany: mocks.messages }, messageThread: { findUnique: mocks.existingThread } };
  return { prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } };
});
vi.mock('@/lib/messages/portalThreads', () => ({ getOrCreatePartnerMessageThread: mocks.thread, assertPartnerCanAccessThread: mocks.authorize }));
vi.mock('@/lib/audit/readOnlyPortalAudit', () => ({ isReadOnlyPortalAuditHeader: mocks.readOnly }));
vi.mock('@/lib/messages/readCursor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/messages/readCursor')>();
  return { ...actual, advanceThreadReadCursor: mocks.advance };
});
vi.mock('@/lib/messages/counselorThread', () => ({ normalizeMessageBody: vi.fn(), serializeMessage: (message: unknown) => message }));
vi.mock('@/lib/messages/rateLimit', () => ({ checkMessageRateLimit: vi.fn() }));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn() }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));

import { GET, PATCH } from '@/app/api/partner/messages/route';
const request = () => new Request('http://localhost/api/partner/messages');

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'partner-user' });
  mocks.partner.mockResolvedValue({ partnerId: 'partner-1' });
  mocks.thread.mockResolvedValue({ id: 'thread-1', partnerId: 'partner-1', kind: 'partner' });
  mocks.existingThread.mockResolvedValue({ id: 'thread-1', portalUserLastReadAt: null });
  mocks.authorize.mockResolvedValue(true);
  mocks.readOnly.mockReturnValue(false);
  mocks.advance.mockResolvedValue({ ok: true, readAt: '2026-09-09T12:00:00.000Z' });
});

describe('partner read cursor API', () => {
  const patch = (body?: unknown) => PATCH(new Request('http://localhost/api/partner/messages', {
    method: 'PATCH', ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));

  it('advances only through a supplied message in the authorized existing conversation', async () => {
    const result = await patch({ lastReadMessageId: 'last-visible' });
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true, portalUserLastReadAt: '2026-09-09T12:00:00.000Z' });
    expect(mocks.advance).toHaveBeenCalledWith({ threadId: 'thread-1', messageId: 'last-visible', reader: 'portal' });
    expect(mocks.existingThread).toHaveBeenCalledWith({ where: { partnerId: 'partner-1' } });
    expect(mocks.authorize).toHaveBeenCalledWith('partner-1', 'thread-1');
    expect(mocks.thread).not.toHaveBeenCalled();
  });

  it('lets a legacy body-less acknowledgement use the helper no-op, never the current time', async () => {
    mocks.advance.mockResolvedValue({ ok: true, readAt: null });
    expect(await (await patch()).json()).toEqual({ ok: true, portalUserLastReadAt: null });
    expect(mocks.advance).toHaveBeenCalledWith({ threadId: 'thread-1', messageId: undefined, reader: 'portal' });
  });

  it('does not create a missing conversation to mark it read', async () => {
    mocks.existingThread.mockResolvedValue(null);
    expect(await (await patch({ lastReadMessageId: 'anything' })).json()).toEqual({ ok: true, portalUserLastReadAt: null });
    expect(mocks.thread).not.toHaveBeenCalled();
    expect(mocks.advance).not.toHaveBeenCalled();
  });

  it('does not advance or provision anything during a read-only audit', async () => {
    mocks.readOnly.mockReturnValue(true);
    expect((await patch({ lastReadMessageId: 'last-visible' })).status).toBe(200);
    expect(mocks.partner).toHaveBeenCalledWith('partner-user', { readOnlyAudit: true });
    expect(mocks.advance).not.toHaveBeenCalled();
    expect(mocks.thread).not.toHaveBeenCalled();
  });

  it('rejects a message ID that does not belong to this conversation', async () => {
    mocks.advance.mockResolvedValue({ ok: false });
    expect((await patch({ lastReadMessageId: 'foreign-message' })).status).toBe(400);
  });

  it('rejects a malformed cursor before calling the helper', async () => {
    expect((await patch({ lastReadMessageId: 123 })).status).toBe(400);
    expect(mocks.advance).not.toHaveBeenCalled();
  });

  it('preserves the conversation authorization check before any update', async () => {
    mocks.authorize.mockResolvedValue(false);
    expect((await patch({ lastReadMessageId: 'last-visible' })).status).toBe(403);
    expect(mocks.advance).not.toHaveBeenCalled();
  });

  it('denies an anonymous read acknowledgement before loading a thread', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await patch({ lastReadMessageId: 'last-visible' })).status).toBe(401);
    expect(mocks.existingThread).not.toHaveBeenCalled();
    expect(mocks.advance).not.toHaveBeenCalled();
  });
});

describe('partner message history window', () => {
  it('returns the newest 500 messages chronologically and scopes the query to the authorized partner thread', async () => {
    const history = Array.from({ length: 505 }, (_, index) => ({
      id: `message-${String(index + 1).padStart(3, '0')}`,
      createdAt: new Date(Date.UTC(2026, 8, 1, 0, index)),
    }));
    mocks.messages.mockImplementation(async (args) => {
      expect(args.where).toEqual({ threadId: 'thread-1' });
      expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
      return [...history].reverse().slice(0, args.take);
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    const { messages } = await response.json();
    expect(messages).toHaveLength(500);
    expect(messages[0].id).toBe('message-006');
    expect(messages.at(-1).id).toBe('message-505');
    expect(mocks.thread).toHaveBeenCalledWith('partner-1');
  });

  it('denies anonymous requests before accessing any partner thread', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.thread).not.toHaveBeenCalled();
    expect(mocks.messages).not.toHaveBeenCalled();
  });

  it('denies users without an authorized partner context', async () => {
    mocks.partner.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(403);
    expect(mocks.thread).not.toHaveBeenCalled();
    expect(mocks.messages).not.toHaveBeenCalled();
  });
});
