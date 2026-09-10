import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/audit/readOnlyPortalAudit', () => ({ isReadOnlyPortalAuditHeader: vi.fn(() => false) }));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn(), isCounselor: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselor: { findFirst: vi.fn() },
    counselorAssignment: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/messages/counselorInbox', () => ({ buildCounselorInboxRows: vi.fn() }));
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn(async () => (key: string) => key) }));
vi.mock('@/components/portal/PortalPageFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/portal/PageHeader', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/portal/CounselorMessagesInboxClient', () => ({
  default: ({ initialMemberId, rows }: { initialMemberId?: string | null; rows: Array<{ programSubtitle: string }> }) => (
    <div data-testid="counselor-inbox" data-initial-member-id={initialMemberId ?? ''} data-programs={JSON.stringify(rows.map((row) => row.programSubtitle))} />
  ),
}));

import CounselorMessagesHubPage from '@/app/(portal)/counselor/messages/page';
import { getUser } from '@/lib/auth/server';
import { isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { buildCounselorInboxRows } from '@/lib/messages/counselorInbox';

const authorizedRows = [
  { memberId: 'member-1', threadId: 'thread-1', programSubtitle: 'it-support-professional-certificate-ibm' },
  { memberId: 'member-2', threadId: 'thread-2', programSubtitle: 'An individually recorded program' },
];

describe('counselor contextual messages page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'counselor-user' } as never);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue({ id: 'counselor-1' } as never);
    vi.mocked(prisma.counselorAssignment.findMany).mockResolvedValue([
      { member: { id: 'member-1' } },
      { member: { id: 'member-2' } },
    ] as never);
    vi.mocked(buildCounselorInboxRows).mockResolvedValue(authorizedRows as never);
  });

  it('opens a requested thread only after matching it to the assigned inbox rows', async () => {
    render(
      await CounselorMessagesHubPage({
        searchParams: Promise.resolve({ thread: 'thread-2' }),
      }),
    );

    expect(screen.getAllByTestId('counselor-inbox')).toHaveLength(1);
    for (const inbox of screen.getAllByTestId('counselor-inbox')) {
      expect(inbox).toHaveAttribute('data-initial-member-id', 'member-2');
    }
  });

  it('does not pass an unassigned thread id into the inbox selection', async () => {
    render(
      await CounselorMessagesHubPage({
        searchParams: Promise.resolve({ thread: 'other-tenant-thread' }),
      }),
    );

    for (const inbox of screen.getAllByTestId('counselor-inbox')) {
      expect(inbox).toHaveAttribute('data-initial-member-id', '');
    }
  });

  it('shows the catalog title for a stored slug while preserving an unmatched recorded title', async () => {
    render(await CounselorMessagesHubPage({}));
    const inboxes = screen.getAllByTestId('counselor-inbox');
    const titles = JSON.parse(inboxes[inboxes.length - 1].getAttribute('data-programs')!);
    expect(titles[0]).toBe('IT Support Professional Certificate (IBM)');
    expect(titles[1]).toBe('An individually recorded program');
    expect(authorizedRows[0].programSubtitle).toBe('it-support-professional-certificate-ibm');
  });
});
