import { describe, expect, it } from 'vitest';

import {
  normalizeMessageQueryValue,
  resolveAuthorizedCounselorMessageContext,
  resolveAuthorizedPartnerMessageMember,
} from '@/lib/messages/contextSelection';

const counselorRows = [
  { memberId: 'member-1', threadId: 'thread-1' },
  { memberId: 'member-2', threadId: 'thread-2' },
];

describe('contextual message selection', () => {
  it('selects a counselor thread only when it belongs to the server-authorized inbox rows', () => {
    expect(
      resolveAuthorizedCounselorMessageContext(counselorRows, { threadId: 'thread-2' }),
    ).toEqual({ memberId: 'member-2', threadId: 'thread-2' });

    expect(
      resolveAuthorizedCounselorMessageContext(counselorRows, { threadId: 'other-tenant-thread' }),
    ).toBeNull();
  });

  it('supports an authorized counselor member deep link without trusting an unknown member id', () => {
    expect(
      resolveAuthorizedCounselorMessageContext(counselorRows, { memberId: 'member-1' }),
    ).toEqual({ memberId: 'member-1', threadId: 'thread-1' });

    expect(
      resolveAuthorizedCounselorMessageContext(counselorRows, { memberId: 'unassigned-member' }),
    ).toBeNull();
  });

  it('selects a partner context only from the server-loaded referral members', () => {
    const permitted = [
      { id: 'member-1', fullName: 'Ada Member' },
      { id: 'member-2', fullName: 'Grace Member' },
    ];

    expect(resolveAuthorizedPartnerMessageMember(permitted, 'member-2')).toEqual(permitted[1]);
    expect(resolveAuthorizedPartnerMessageMember(permitted, 'other-partner-member')).toBeNull();
  });

  it('rejects blank, oversized, and repeated query values as ambiguous', () => {
    expect(normalizeMessageQueryValue('  ')).toBeNull();
    expect(normalizeMessageQueryValue('x'.repeat(201))).toBeNull();
    expect(normalizeMessageQueryValue(['member-1', 'member-2'])).toBeNull();
  });
});
