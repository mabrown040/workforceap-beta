import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgentInboxClient, type CascadeCardWire } from '@/app/admin/agent-inbox/AgentInboxClient';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), fetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

function cascade(overrides: Partial<CascadeCardWire> = {}): CascadeCardWire {
  return {
    id: 'cascade-1', status: 'awaiting_approval', dispatch: null,
    userId: 'member-1', userFullName: 'Test Learner', userEmail: 'learner@example.com',
    milestoneType: 'course_completed', milestoneRef: 'course-1', programSlug: 'program-1',
    counselorBrief: 'Review this learner celebration.',
    drafts: [{ type: 'celebrate_milestone', channel: 'email', subject: 'Congratulations', body: 'Your first course is complete.', rationale: 'Verified course completion', confidence: 1 }],
    invalidDraftCount: 0, draftModel: null, draftPromptVersion: null, draftedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(), createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const retrySummary = { accepted: 1, failed: 1, uncertain: 0, pending: 0, advisory: 0, canRetry: true, canFinalize: false, retryAfter: null, blockedReason: null };

describe('milestone inbox delivery retry', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
  });

  it('keeps a failed approval visible, freezes its edit, and retries without new edits', async () => {
    mocks.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Some emails could not be sent.', dispatch: retrySummary }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ emailsSent: 2, emailsFailed: 0, advisoryCount: 0 }), { status: 200 }));
    render(<AgentInboxClient cascades={[cascade()]} />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Your milestone is verified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve & Send' }));
    await screen.findByText('delivery needs attention');
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    expect(screen.getByLabelText('Subject')).toHaveValue('Your milestone is verified');
    expect(screen.getByText(/1 email accepted; 1 failed; 0 unconfirmed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry unfinished emails' }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual({ editedDrafts: {} });
    await screen.findByText('The queue is empty.');
    expect(screen.getByText('Email provider accepted 2 emails.')).toBeInTheDocument();
  });

  it.each([
    { label: 'an uncertain old delivery', dispatch: { ...retrySummary, canRetry: false, blockedReason: 'Staff must review provider delivery.' }, expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
    { label: 'an expired sending window', dispatch: retrySummary, expiresAt: new Date(Date.now() - 3_600_000).toISOString() },
  ])('blocks another send for $label and provides a refresh action', ({ dispatch, expiresAt }) => {
    render(<AgentInboxClient cascades={[cascade({ status: 'approved', dispatch, expiresAt })]} />);
    expect(screen.getByRole('button', { name: 'Retry unfinished emails' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh delivery status' }));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('uses refreshed server delivery state after an in-flight attempt finishes', () => {
    const { rerender } = render(<AgentInboxClient cascades={[cascade({ status: 'approved', dispatch: { ...retrySummary, canRetry: false, retryAfter: new Date(Date.now() + 60_000).toISOString() } })]} />);
    expect(screen.getByRole('button', { name: 'Retry unfinished emails' })).toBeDisabled();
    rerender(<AgentInboxClient cascades={[cascade({ status: 'approved', dispatch: retrySummary })]} />);
    expect(screen.getByRole('button', { name: 'Retry unfinished emails' })).toBeEnabled();
  });

  it('can finish recording an already accepted delivery after the sending window ends', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ emailsSent: 1, emailsFailed: 0, advisoryCount: 0 }), { status: 200 }));
    render(<AgentInboxClient cascades={[cascade({
      status: 'approved', expiresAt: new Date(0).toISOString(),
      dispatch: { ...retrySummary, accepted: 1, failed: 0, canRetry: false, canFinalize: true },
    })]} />);
    const finish = screen.getByRole('button', { name: 'Finish recording delivery' });
    expect(finish).toBeEnabled();
    fireEvent.click(finish);
    await screen.findByText('The queue is empty.');
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ editedDrafts: {} });
  });
});
