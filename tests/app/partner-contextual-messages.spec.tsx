import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/app/seo', () => ({ buildPageMetadataAsync: vi.fn() }));
vi.mock('@/lib/auth/portalGuards', () => ({ unlinkedPartnerHref: vi.fn(async () => '/partner/setup') }));
vi.mock('@/lib/audit/readOnlyPortalAudit', () => ({ isReadOnlyPortalAuditHeader: vi.fn(() => false) }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ getPartnerForUser: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    messageThread: { findUnique: vi.fn() },
    partnerReferral: { findMany: vi.fn() },
    message: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/messages/portalThreads', () => ({ getOrCreatePartnerMessageThread: vi.fn() }));
vi.mock('@/lib/messages/counselorThread', () => ({ serializeMessage: vi.fn((message) => message) }));
vi.mock('@/components/portal/PortalPageFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/portal/kit', () => ({
  DesignSurface: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SectionHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  Avatar: () => <span>WA</span>,
}));
vi.mock('@/components/portal/PortalTeamChatClient', () => ({
  default: ({
    contextLabel,
    initialDraft,
  }: {
    contextLabel?: string;
    initialDraft?: string;
  }) => (
    <div
      data-testid="partner-team-chat"
      data-context-label={contextLabel ?? ''}
      data-initial-draft={initialDraft ?? ''}
    />
  ),
}));

import PartnerMessagesPage from '@/app/(portal)/partner/messages/page';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getOrCreatePartnerMessageThread } from '@/lib/messages/portalThreads';

describe('partner contextual messages page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'partner-user' } as never);
    vi.mocked(getPartnerForUser).mockResolvedValue({
      partnerId: 'partner-1',
      partner: { organizationId: 'org-1' },
    } as never);
    vi.mocked(getOrCreatePartnerMessageThread).mockResolvedValue({
      id: 'partner-thread',
      portalUserLastReadAt: null,
    } as never);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(prisma.partnerReferral.findMany).mockResolvedValue([
      { member: { id: 'member-1', fullName: 'Ada Member' } },
    ] as never);
  });

  it('prefills member context only after matching the query to this partner referral set', async () => {
    render(
      await PartnerMessagesPage({
        searchParams: Promise.resolve({ memberId: 'member-1' }),
      }),
    );

    expect(screen.getByTestId('partner-team-chat')).toHaveAttribute(
      'data-context-label',
      'Regarding Ada Member',
    );
    expect(screen.getByTestId('partner-team-chat')).toHaveAttribute(
      'data-initial-draft',
      'Regarding Ada Member: ',
    );
    expect(prisma.partnerReferral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          partnerId: 'partner-1',
          partner: { organizationId: 'org-1' },
          member: { organizationId: 'org-1', deletedAt: null },
        },
      }),
    );
  });

  it('keeps the shared partner conversation generic for an unauthorized member id', async () => {
    render(
      await PartnerMessagesPage({
        searchParams: Promise.resolve({ memberId: 'other-partner-member' }),
      }),
    );

    expect(screen.getByTestId('partner-team-chat')).toHaveAttribute('data-context-label', '');
    expect(screen.getByTestId('partner-team-chat')).toHaveAttribute('data-initial-draft', '');
  });
});
