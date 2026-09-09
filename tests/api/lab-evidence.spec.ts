import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), load: vi.fn(), save: vi.fn(), submit: vi.fn(), queue: vi.fn(), detail: vi.fn(), review: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.user }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/member/labWorkspace', () => ({
  loadLabWorkspace: mocks.load, saveLabDraft: mocks.save, submitLabEvidence: mocks.submit,
  loadLabReviewQueue: mocks.queue, loadLabReview: mocks.detail, reviewLabEvidence: mocks.review,
  LabWorkspaceError: class extends Error {
    constructor(public code: string, public status: number) { super(code); }
  },
}));

import { GET, PUT } from '@/app/api/member/labs/[labId]/route';
import { POST as submit } from '@/app/api/member/labs/[labId]/submit/route';
import { GET as queue } from '@/app/api/staff/lab-reviews/route';
import { GET as detail, POST as review } from '@/app/api/staff/lab-reviews/[submissionId]/route';
import { LabWorkspaceError } from '@/lib/member/labWorkspace';
import { labDraftInputSchema, labReviewInputSchema } from '@/lib/member/labWorkspaceTypes';

const base = 'https://workforceap.test';
const labContext = { params: Promise.resolve({ labId: 'ticket-triage' }) };
const submissionId = '20000000-0000-4000-8000-000000000001';
const reviewContext = { params: Promise.resolve({ submissionId }) };
const draft = { programSlug: 'it-support-professional-certificate-ibm', curriculumVersion: 'legacy-v1', contentVersion: '2026-09-09.v1', expectedDraftRevision: 0, answers: { intake: 'A response' }, artifactUrl: null };
const feedback = { expectedReviewVersion: 0, decision: 'revision_requested', feedback: 'Please cite the observations.', rubricResults: [{ criterionId: 'evidence', score: 1, feedback: 'Cite the material.' }] };
function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return new Request(base + path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), headers: { Origin: base, 'Content-Type': 'application/json', ...headers } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: 'authenticated-user' });
  mocks.load.mockResolvedValue(null);
  mocks.save.mockResolvedValue({ draft: { revision: 1 } });
  mocks.submit.mockResolvedValue({ submissions: [{ id: submissionId }] });
  mocks.queue.mockResolvedValue({ items: [], nextCursor: null });
  mocks.detail.mockResolvedValue({ canReview: true });
  mocks.review.mockResolvedValue({ canReview: false });
});

describe('member lab evidence request boundary', () => {
  it('requires authentication on reads, saves, and submissions', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(request('/api/member/labs/ticket-triage'), labContext)).status).toBe(401);
    expect((await PUT(request('/api/member/labs/ticket-triage', 'PUT', draft), labContext)).status).toBe(401);
    expect((await submit(request('/api/member/labs/ticket-triage/submit', 'POST', { ...draft, shareForReview: true }), labContext)).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('returns private, uncached reads for only the authenticated identity', async () => {
    const result = await GET(request('/api/member/labs/ticket-triage'), labContext);
    expect(await result.json()).toEqual({ workspace: null });
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.load).toHaveBeenCalledWith({ userId: 'authenticated-user', labId: 'ticket-triage' });
  });
  it('rejects client-selected identity in query and write payload', async () => {
    expect((await GET(request('/api/member/labs/ticket-triage?userId=other'), labContext)).status).toBe(400);
    expect((await PUT(request('/api/member/labs/ticket-triage', 'PUT', { ...draft, userId: 'other' }), labContext)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(['https://attacker.test', 'null', ''])('rejects untrusted mutation Origin %j', async (origin) => {
    const result = await PUT(request('/api/member/labs/ticket-triage', 'PUT', draft, { Origin: origin }), labContext);
    expect(result.status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects cross-site fetch metadata even with a matching origin', async () => {
    expect((await PUT(request('/api/member/labs/ticket-triage', 'PUT', draft, { 'Sec-Fetch-Site': 'cross-site' }), labContext)).status).toBe(403);
  });
  it('requires explicit consent only for submit and never shares a draft save', async () => {
    expect((await submit(request('/api/member/labs/ticket-triage/submit', 'POST', draft), labContext)).status).toBe(400);
    expect((await submit(request('/api/member/labs/ticket-triage/submit', 'POST', { ...draft, shareForReview: false }), labContext)).status).toBe(400);
    const saved = await PUT(request('/api/member/labs/ticket-triage', 'PUT', draft), labContext);
    expect(saved.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith('authenticated-user', 'ticket-triage', draft);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('passes a deliberate submission with its version token intact', async () => {
    const body = { ...draft, expectedDraftRevision: 7, shareForReview: true };
    const result = await submit(request('/api/member/labs/ticket-triage/submit', 'POST', body), labContext);
    expect(result.status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledWith('authenticated-user', 'ticket-triage', body);
  });
  it('rejects malformed JSON and oversized bodies before persistence', async () => {
    const malformed = new Request(base + '/api/member/labs/ticket-triage', { method: 'PUT', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{' });
    expect((await PUT(malformed, labContext)).status).toBe(400);
    expect((await PUT(request('/api/member/labs/ticket-triage', 'PUT', { ...draft, answers: { intake: 'x'.repeat(81000) } }), labContext)).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('reports stale-draft conflicts distinctly without retrying or replacing evidence', async () => {
    mocks.save.mockRejectedValueOnce(new LabWorkspaceError('DRAFT_CONFLICT', 409));
    const result = await PUT(request('/api/member/labs/ticket-triage', 'PUT', draft), labContext);
    expect(result.status).toBe(409);
    expect((await result.json()).code).toBe('DRAFT_CONFLICT');
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it('returns a safe unavailable response without exposing database details', async () => {
    mocks.save.mockRejectedValueOnce(new Error('secret database credential'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await PUT(request('/api/member/labs/ticket-triage', 'PUT', draft), labContext);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('secret');
    expect(log).toHaveBeenCalledWith('[lab-evidence] Operation unavailable.');
    log.mockRestore();
  });
});

describe('staff review request boundary', () => {
  it('requires authentication on queue, detail, and review', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await queue(request('/api/staff/lab-reviews'))).status).toBe(401);
    expect((await detail(request('/api/staff/lab-reviews/' + submissionId), reviewContext)).status).toBe(401);
    expect((await review(request('/api/staff/lab-reviews/' + submissionId, 'POST', feedback), reviewContext)).status).toBe(401);
  });
  it('passes only valid scoped queue filters and authenticated actor', async () => {
    await queue(request('/api/staff/lab-reviews?status=reviewed&cursor=' + submissionId));
    expect(mocks.queue).toHaveBeenCalledWith({ userId: 'authenticated-user', status: 'reviewed', cursor: submissionId });
    expect((await queue(request('/api/staff/lab-reviews?organizationId=other'))).status).toBe(400);
    expect((await queue(request('/api/staff/lab-reviews?status=submitted&status=reviewed'))).status).toBe(400);
  });
  it('does not disclose unauthorized or missing submission details', async () => {
    mocks.detail.mockResolvedValue(null);
    expect((await detail(request('/api/staff/lab-reviews/' + submissionId), reviewContext)).status).toBe(404);
    mocks.queue.mockRejectedValueOnce(new LabWorkspaceError('FORBIDDEN', 403));
    expect((await queue(request('/api/staff/lab-reviews'))).status).toBe(403);
  });
  it('rejects cross-origin staff mutation and spoofed reviewer fields', async () => {
    expect((await review(request('/api/staff/lab-reviews/' + submissionId, 'POST', feedback, { Origin: 'https://attacker.test' }), reviewContext)).status).toBe(403);
    expect((await review(request('/api/staff/lab-reviews/' + submissionId, 'POST', { ...feedback, reviewerId: 'other' }), reviewContext)).status).toBe(400);
    expect(mocks.review).not.toHaveBeenCalled();
  });
  it('returns the saved immutable review and preserves actor/submission routing', async () => {
    const result = await review(request('/api/staff/lab-reviews/' + submissionId, 'POST', feedback), reviewContext);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ review: { canReview: false } });
    expect(mocks.review).toHaveBeenCalledWith('authenticated-user', submissionId, feedback);
  });
});

describe('evidence schema bounds', () => {
  it.each(['javascript:alert(1)', 'data:text/plain,hello', 'https://user:password@example.com/a'])('rejects unsafe evidence URL %s', (artifactUrl) => {
    expect(labDraftInputSchema.safeParse({ ...draft, artifactUrl }).success).toBe(false);
  });
  it('allows bounded text and ordinary external links without fetching them', () => {
    expect(labDraftInputSchema.safeParse({ ...draft, answers: { intake: 'x'.repeat(5000) }, artifactUrl: 'https://example.com/my-work' }).success).toBe(true);
    expect(labDraftInputSchema.safeParse({ ...draft, answers: { intake: 'x'.repeat(5001) } }).success).toBe(false);
    expect(labDraftInputSchema.safeParse({ ...draft, expectedDraftRevision: -1 }).success).toBe(false);
  });
  it('requires first review version, substantive feedback, and integer scores 0–2', () => {
    expect(labReviewInputSchema.safeParse(feedback).success).toBe(true);
    expect(labReviewInputSchema.safeParse({ ...feedback, expectedReviewVersion: 1 }).success).toBe(false);
    expect(labReviewInputSchema.safeParse({ ...feedback, feedback: ' ' }).success).toBe(false);
    expect(labReviewInputSchema.safeParse({ ...feedback, rubricResults: [{ criterionId: 'evidence', score: 3, feedback: '' }] }).success).toBe(false);
  });
});
