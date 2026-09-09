import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  default: ({ messagesApiBase, initial }: { messagesApiBase: string; initial: { member: { id: string } } }) => (
    <div data-testid="loaded-chat" data-api={messagesApiBase} data-member={initial.member.id}>Loaded chat</div>
  ),
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
    cleanup();
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
      expect.objectContaining({ credentials: 'include', signal: expect.any(AbortSignal) }),
    );
  });
});

function chatResponse(memberId: string) {
  return {
    ok: true,
    json: async () => ({
      member: { id: memberId, fullName: memberId === 'member-2' ? 'Grace Member' : 'Ada Member' },
      thread: { id: `thread-${memberId}`, memberId, counselorUserId: 'staff-1', memberLastReadAt: null, counselorLastReadAt: null },
      messages: [],
    }),
  } as Response;
}
function pendingResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('CounselorMessagesInboxClient recipient safety', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it.each(['late success', 'late failure'])('keeps B selected when A returns a %s', async (outcome) => {
    const a = pendingResponse();
    const b = pendingResponse();
    const fetcher = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => String(input).includes('member-2') ? b.promise : a.promise);
    vi.stubGlobal('fetch', fetcher);
    render(<CounselorMessagesInboxClient staffUserId="staff-1" rows={rows} initialMemberId="member-1" />);
    fireEvent.click(screen.getAllByRole('button', { name: /Grace Member/ })[0]);
    expect(screen.queryByTestId('loaded-chat')).not.toBeInTheDocument();
    await act(async () => b.resolve(chatResponse('member-2')));
    await act(async () => {
      if (outcome === 'late success') a.resolve(chatResponse('member-1'));
      else a.reject(new Error('Late network failure'));
    });
    for (const chat of screen.getAllByTestId('loaded-chat')) {
      expect(chat).toHaveAttribute('data-member', 'member-2');
      expect(chat).toHaveAttribute('data-api', '/api/counselor/members/member-2/messages');
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect((fetcher.mock.calls[0][1] as RequestInit | undefined)?.signal?.aborted).toBe(true);
  });

  it('removes A’s composer immediately while B is loading, then shows B', async () => {
    const b = pendingResponse();
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).includes('member-2') ? b.promise : Promise.resolve(chatResponse('member-1'))));
    render(<CounselorMessagesInboxClient staffUserId="staff-1" rows={rows} />);
    await act(async () => {});
    expect(screen.getAllByTestId('loaded-chat')[0]).toHaveAttribute('data-member', 'member-1');
    fireEvent.click(screen.getAllByRole('button', { name: /Grace Member/ })[0]);
    expect(screen.queryByTestId('loaded-chat')).not.toBeInTheDocument();
    await act(async () => b.resolve(chatResponse('member-2')));
    expect(screen.getAllByTestId('loaded-chat')[0]).toHaveAttribute('data-member', 'member-2');
  });

  it('offers a working retry after a selected conversation cannot load', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('Network failed')).mockResolvedValue(chatResponse('member-2'));
    vi.stubGlobal('fetch', fetcher);
    render(<CounselorMessagesInboxClient staffUserId="staff-1" rows={rows} initialMemberId="member-2" />);
    await act(async () => {});
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Could not load this conversation');
    expect(screen.queryByTestId('loaded-chat')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]);
    await act(async () => {});
    expect(screen.getAllByTestId('loaded-chat')[0]).toHaveAttribute('data-member', 'member-2');
  });

  it('does not mount a mismatched API recipient', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(chatResponse('member-1')));
    render(<CounselorMessagesInboxClient staffUserId="staff-1" rows={rows} initialMemberId="member-2" />);
    await act(async () => {});
    expect(screen.queryByTestId('loaded-chat')).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Could not load this conversation');
  });
});
