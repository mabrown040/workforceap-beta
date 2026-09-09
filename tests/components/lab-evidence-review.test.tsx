import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LabEvidenceReview from '@/components/portal/counselor/LabEvidenceReview';
import LabReviewQueue from '@/components/portal/counselor/LabReviewQueue';
import { getPracticeLab } from '@/lib/content/itSupportLabs';
import type { LabStaffReviewWorkspace } from '@/lib/member/labWorkspaceTypes';

const lab = getPracticeLab('ticket-triage')!;
function fixture(): LabStaffReviewWorkspace {
  return {
    member: { id: 'member-one', displayName: 'Alex Sample', href: '/counselor/students/member-one' },
    submission: { id: 'submission-one', attempt: 1, draftRevision: 1, contentVersion: lab.contentVersion, rubricVersion: lab.rubricVersion, labSnapshot: lab,
      answers: Object.fromEntries(lab.deliverables.map((item) => [item.id, `Submitted answer for ${item.title}`])), artifactUrl: 'https://example.com/submitted-work', submittedAt: '2026-09-09T14:00:00Z', status: 'submitted', reviewVersion: 0, review: null },
    history: [], reviewRouting: { assignedCounselor: true, counselorNames: ['Taylor Reviewer'], description: 'Assigned to Taylor Reviewer.' }, canReview: true,
  };
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(async () => { cleanup(); await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); }); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function scoreAll(value = '2 / 2') {
  for (const criterion of lab.rubric) {
    await userEvent.click(within(screen.getByRole('radiogroup', { name: new RegExp(criterion.title) })).getByRole('radio', { name: value }));
  }
}

describe('human lab evidence review', () => {
  it('requires the complete rubric and retains feedback after a failed save, then shows the persisted review', async () => {
    const initial = fixture();
    vi.mocked(fetch).mockResolvedValueOnce(response({ review: initial }));
    render(<LabEvidenceReview submissionId="submission-one" />);
    const feedback = await screen.findByRole('textbox', { name: /What to keep and what to do next/ });
    const submit = screen.getByRole('button', { name: 'Send feedback to member' });
    expect(submit).toBeDisabled();
    await scoreAll();
    fireEvent.change(feedback, { target: { value: 'Keep the traceable observations. Make the next owner explicit.' } });
    await userEvent.click(screen.getByRole('radio', { name: 'Request a revision' }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Review service unavailable. Try again.' }, 503));
    await userEvent.click(submit);
    expect((await screen.findAllByText('Review service unavailable. Try again.')).length).toBeGreaterThan(0);
    expect(feedback).toHaveValue('Keep the traceable observations. Make the next owner explicit.');
    const payload = JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string);
    expect(payload.rubricResults).toHaveLength(lab.rubric.length);
    expect(payload).toMatchObject({ expectedReviewVersion: 0, decision: 'revision_requested' });
    expect(payload).not.toHaveProperty('reviewerId');
    const reviewed = structuredClone(initial);
    reviewed.canReview = false; reviewed.submission.status = 'revision_requested'; reviewed.submission.reviewVersion = 1;
    reviewed.submission.review = { id: 'review-one', version: 1, ...payload, rubricVersion: lab.rubricVersion, reviewer: { displayName: 'Taylor Reviewer', role: 'counselor' }, reviewedAt: '2026-09-09T15:00:00Z' };
    vi.mocked(fetch).mockResolvedValueOnce(response({ review: reviewed }));
    await userEvent.click(submit);
    expect(await screen.findByText('Feedback saved. The member can now read it in their lab workspace.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send feedback to member' })).not.toBeInTheDocument();
    expect(screen.getByText(/10 of 10 rubric points/)).toHaveTextContent('Taylor Reviewer');
  });

  it('prevents a reviewed decision when any rubric criterion needs work', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ review: fixture() }));
    render(<LabEvidenceReview submissionId="submission-one" />);
    await screen.findByRole('textbox', { name: /What to keep and what to do next/ });
    await scoreAll();
    const reviewedDecision = screen.getByRole('radio', { name: 'Mark evidence reviewed' });
    await userEvent.click(reviewedDecision);
    await userEvent.click(within(screen.getByRole('radiogroup', { name: new RegExp(lab.rubric[0].title) })).getByRole('radio', { name: '1 / 2' }));
    expect(screen.getByRole('radio', { name: 'Request a revision' })).toBeChecked();
    expect(reviewedDecision).not.toBeChecked();
    expect(reviewedDecision).toBeDisabled();
  });

  it('does not render another member’s evidence after an access denial', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Submission not found.' }, 404));
    render(<LabEvidenceReview submissionId="private-submission" />);
    expect(await screen.findByText('Submission not found.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Submitted evidence' })).not.toBeInTheDocument();
  });

  it('keeps local feedback visible when a status check finds a competing saved review', async () => {
    const initial = fixture();
    vi.mocked(fetch).mockResolvedValueOnce(response({ review: initial }));
    render(<LabEvidenceReview submissionId="submission-one" />);
    const feedback = await screen.findByRole('textbox', { name: /What to keep and what to do next/ });
    await scoreAll();
    fireEvent.change(feedback, { target: { value: 'My unsent local feedback must remain available.' } });
    await userEvent.click(screen.getByRole('radio', { name: 'Request a revision' }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Another reviewer saved feedback first.' }, 409));
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback to member' }));
    await screen.findAllByText('Another reviewer saved feedback first.');
    const recorded = fixture();
    recorded.canReview = false; recorded.submission.status = 'reviewed'; recorded.submission.reviewVersion = 1;
    recorded.submission.review = { id: 'other-review', version: 1, decision: 'reviewed', feedback: 'A recorded review from another reviewer.', rubricVersion: lab.rubricVersion, rubricResults: lab.rubric.map((criterion) => ({ criterionId: criterion.id, score: 2, feedback: '' })), reviewer: { displayName: 'Casey Admin', role: 'admin' }, reviewedAt: '2026-09-09T15:00:00Z' };
    vi.mocked(fetch).mockResolvedValueOnce(response({ review: recorded }));
    await userEvent.click(screen.getByRole('button', { name: 'Check current review status' }));
    const local = await screen.findByRole('region', { name: 'Your local review draft' });
    expect(local).toHaveTextContent('My unsent local feedback must remain available.');
    expect(screen.getByText('A recorded review from another reviewer.')).toBeInTheDocument();
    const unloading = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unloading);
    expect(unloading.defaultPrevented).toBe(true);
  });

  it('keeps a failed queue load distinct from an empty review queue', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Queue unavailable.' }, 503));
    render(<LabReviewQueue status="submitted" />);
    expect(await screen.findByText('Queue unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('No lab work waiting for review')).not.toBeInTheDocument();
    vi.mocked(fetch).mockResolvedValueOnce(response({ items: [], nextCursor: null }));
    await userEvent.click(screen.getByRole('button', { name: 'Try loading again' }));
    await waitFor(() => expect(screen.getByText('No lab work waiting for review')).toBeInTheDocument());
  });
});
