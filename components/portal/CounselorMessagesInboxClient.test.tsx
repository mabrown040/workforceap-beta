import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/components/portal/VoiceAgentSurface', () => ({
  default: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock('@/components/admin/AdminMemberCounselorChatClient', () => ({
  default: () => <div>Loaded chat</div>,
}));
vi.mock('@/lib/portal/messagingSurfaces', () => ({ counselorStaffMessagingSurface: {} }));

import CounselorMessagesInboxClient from './CounselorMessagesInboxClient';
import type { CounselorInboxRow } from '@/lib/messages/counselorInbox';

const rows: CounselorInboxRow[] = [
  {
    memberId: 'member-1',
    memberName: 'Ada Member',
    threadId: 'thread-1',
    programSubtitle: 'Program one',
    enrollmentStatus: 'enrolled',
    lastActivityLabel: 'Active today',
    preview: 'First message',
    timeLabel: 'Today',
    sortAt: '2026-08-29T12:00:00.000Z',
    unreadCount: 2,
    needsReply: true,
  },
  {
    memberId: 'member-2',
    memberName: 'Grace Member',
    threadId: 'thread-2',
    programSubtitle: 'Program two',
    enrollmentStatus: 'enrolled',
    lastActivityLabel: 'Active yesterday',
    preview: 'Second message',
    timeLabel: 'Yesterday',
    sortAt: '2026-08-28T12:00:00.000Z',
    unreadCount: 0,
    needsReply: false,
  },
];

describe('CounselorMessagesInboxClient deep-link selection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const memberId = String(input).includes('member-2') ? 'member-2' : 'member-1';
        return {
          ok: true,
          json: async () => ({
            member: { id: memberId, fullName: memberId === 'member-2' ? 'Grace Member' : 'Ada Member' },
            thread: {
              id: memberId === 'member-2' ? 'thread-2' : 'thread-1',
              memberId,
              counselorUserId: 'staff-1',
              memberLastReadAt: null,
              counselorLastReadAt: null,
            },
            messages: [],
          }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('opens the selected conversation instead of leaving a mobile deep link on the inbox list', async () => {
    render(
      <CounselorMessagesInboxClient
        staffUserId="staff-1"
        rows={rows}
        initialMemberId="member-2"
      />,
    );

    expect(screen.getByRole('button', { name: 'All conversations' })).toBeInTheDocument();
    expect(await screen.findAllByText('Grace Member')).not.toHaveLength(0);
    expect(fetch).toHaveBeenCalledWith(
      '/api/counselor/members/member-2/messages',
      { credentials: 'include' },
    );
  });
});
