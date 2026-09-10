import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPracticeLab, IT_SUPPORT_LAB_PROGRAM_SLUG } from '@/lib/content/itSupportLabs';

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findMany: vi.fn() }, counselor: { findFirst: vi.fn() }, counselorAssignment: { findMany: vi.fn() }, courseEnrollment: { findFirst: vi.fn() },
  memberLabDraft: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  memberLabSubmission: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  memberLabReview: { create: vi.fn() },
}));
const transaction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: transaction } }));
import { loadLabWorkspace, saveLabDraft, submitLabEvidence, loadLabReviewQueue, loadLabReview, reviewLabEvidence } from '@/lib/member/labWorkspace';

const lab = getPracticeLab('ticket-triage')!;
const memberId = 'member-1';
const org = 'organization-1';
const actor = { id: memberId, organizationId: org, fullName: 'Synthetic member', profile: { role: 'member' }, userRoles: [] };
const answers = Object.fromEntries(lab.deliverables.map((deliverable) => [deliverable.id, 'Supplied evidence and reasoning.']));
const input = { programSlug: IT_SUPPORT_LAB_PROGRAM_SLUG, curriculumVersion: 'legacy-v1', contentVersion: lab.contentVersion, expectedDraftRevision: 0, answers, artifactUrl: null };
const enrollment = { id: 'enrollment-1', programSlug: input.programSlug, curriculumVersion: 'legacy-v1' };
const submission = { id: 'submission-1', draftId: 'draft-1', userId: memberId, organizationId: org, labId: lab.id, programSlug: input.programSlug, curriculumVersion: 'legacy-v1', contentVersion: lab.contentVersion, rubricVersion: lab.rubricVersion, draftRevision: 1, attempt: 1, answers, artifactUrl: null, labSnapshot: lab, submittedAt: new Date('2026-09-09T12:00:00Z'), review: null };
const reviewInput = { expectedReviewVersion: 0 as const, decision: 'reviewed' as const, feedback: 'Evidence reviewed against the supplied rubric.', rubricResults: lab.rubric.map((criterion) => ({ criterionId: criterion.id, score: 2 as const, feedback: 'Addressed.' })) };

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PRISMA_FLATTEN_TX', '0');
  vi.resetAllMocks();
  transaction.mockImplementation(async (run) => run(db));
  db.user.findFirst.mockResolvedValue(actor);
  db.user.findMany.mockResolvedValue([{ id: memberId }]);
  db.counselor.findFirst.mockResolvedValue(null);
  db.counselorAssignment.findMany.mockResolvedValue([]);
  db.courseEnrollment.findFirst.mockResolvedValue(enrollment);
  db.memberLabDraft.findUnique.mockResolvedValue(null);
  db.memberLabDraft.create.mockResolvedValue({ id: 'draft-1' });
  db.memberLabDraft.updateMany.mockResolvedValue({ count: 1 });
  db.memberLabSubmission.findFirst.mockResolvedValue(null);
  db.memberLabSubmission.findMany.mockResolvedValue([]);
  db.memberLabSubmission.create.mockResolvedValue(submission);
});

afterEach(() => vi.unstubAllEnvs());

function asStaff(role: 'admin' | 'counselor' | 'super_admin' = 'admin', organizationId = org) {
  db.user.findFirst.mockImplementation(async ({ where }) => where.id === memberId
    ? { id: memberId, organizationId: org, fullName: 'Synthetic member' }
    : { ...actor, id: 'staff-1', organizationId, fullName: 'Synthetic reviewer', profile: { role } });
  db.counselor.findFirst.mockResolvedValue(role === 'counselor' ? { id: 'counselor-1' } : null);
  db.memberLabSubmission.findFirst.mockImplementation(async ({ where }) => {
    const allowed = where.organizationId === org && where.userId?.in?.includes(memberId);
    return allowed ? submission : null;
  });
  db.memberLabSubmission.findMany.mockResolvedValue([submission]);
}

describe('lab writes require atomic transactions', () => {
  const flattenedModes = [
    { name: 'preview', vercelEnv: 'preview', flatten: '0' },
    { name: 'development', vercelEnv: 'development', flatten: '0' },
    { name: 'explicit production override', vercelEnv: 'production', flatten: '1' },
  ];
  it.each(flattenedModes)('rejects all mutations before database work in $name', async ({ vercelEnv, flatten }) => {
    vi.stubEnv('VERCEL_ENV', vercelEnv);
    vi.stubEnv('PRISMA_FLATTEN_TX', flatten);

    await expect(saveLabDraft(memberId, lab.id, input)).rejects.toMatchObject({ code: 'WORKSPACE_UNAVAILABLE', status: 503 });
    await expect(submitLabEvidence(memberId, lab.id, { ...input, shareForReview: true })).rejects.toMatchObject({ code: 'WORKSPACE_UNAVAILABLE', status: 503 });
    await expect(reviewLabEvidence('staff-1', submission.id, reviewInput)).rejects.toMatchObject({ code: 'WORKSPACE_UNAVAILABLE', status: 503 });

    expect(transaction).not.toHaveBeenCalled();
    for (const model of Object.values(db)) {
      for (const query of Object.values(model)) expect(query).not.toHaveBeenCalled();
    }
  });
  it.each(flattenedModes)('keeps authorized member and staff reads available in $name', async ({ vercelEnv, flatten }) => {
    vi.stubEnv('VERCEL_ENV', vercelEnv);
    vi.stubEnv('PRISMA_FLATTEN_TX', flatten);

    expect((await loadLabWorkspace({ userId: memberId, labId: lab.id }))?.lab.id).toBe(lab.id);
    asStaff();
    expect((await loadLabReviewQueue({ userId: 'staff-1' })).items[0]?.submissionId).toBe(submission.id);
    expect((await loadLabReview({ userId: 'staff-1', submissionId: submission.id }))?.submission.id).toBe(submission.id);
    expect(db.memberLabDraft.create).not.toHaveBeenCalled();
    expect(db.memberLabDraft.updateMany).not.toHaveBeenCalled();
    expect(db.memberLabSubmission.create).not.toHaveBeenCalled();
    expect(db.memberLabReview.create).not.toHaveBeenCalled();
  });
});

describe('pinned member lab eligibility and versioned writes', () => {
  it('fails closed without an enrollment or for another assigned curriculum', async () => {
    db.courseEnrollment.findFirst.mockResolvedValue(null);
    expect(await loadLabWorkspace({ userId: memberId, labId: lab.id })).toBeNull();
    db.courseEnrollment.findFirst.mockResolvedValue({ ...enrollment, curriculumVersion: 'approved-v2' });
    expect(await loadLabWorkspace({ userId: memberId, labId: lab.id })).toBeNull();
    expect(db.memberLabDraft.findUnique).not.toHaveBeenCalled();
  });
  it('queries enrollment by authenticated identity and organization, never catalog-only access', async () => {
    const workspace = await loadLabWorkspace({ userId: memberId, labId: lab.id });
    expect(workspace?.draft.revision).toBe(0);
    expect(workspace?.reviewRouting.assignedCounselor).toBe(false);
    expect(db.courseEnrollment.findFirst.mock.calls[0][0].where).toMatchObject({ userId: memberId, organizationId: org, user: { deletedAt: null } });
  });
  it('rejects wrong program, stale content, and unknown deliverable IDs before writing', async () => {
    await expect(saveLabDraft(memberId, lab.id, { ...input, programSlug: 'other-program' })).rejects.toMatchObject({ status: 403 });
    await expect(saveLabDraft(memberId, lab.id, { ...input, contentVersion: 'old' })).rejects.toMatchObject({ code: 'CONTENT_CHANGED', status: 409 });
    await expect(saveLabDraft(memberId, lab.id, { ...input, answers: { hidden: 'field' } })).rejects.toMatchObject({ code: 'INVALID_EVIDENCE' });
    expect(db.memberLabDraft.create).not.toHaveBeenCalled();
  });
  it('allows incomplete private drafts but requires every deliverable to submit', async () => {
    await saveLabDraft(memberId, lab.id, { ...input, answers: {} });
    expect(db.memberLabDraft.create).toHaveBeenCalledOnce();
    expect(db.memberLabSubmission.create).not.toHaveBeenCalled();
    await expect(submitLabEvidence(memberId, lab.id, { ...input, answers: {}, shareForReview: true })).rejects.toMatchObject({ code: 'INVALID_EVIDENCE' });
    expect(db.memberLabSubmission.create).not.toHaveBeenCalled();
  });
  it('rejects a stale draft version without overwriting or submitting it', async () => {
    db.memberLabDraft.findUnique.mockResolvedValue({ id: 'draft-1', userId: memberId, organizationId: org, revision: 4 });
    await expect(saveLabDraft(memberId, lab.id, input)).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    expect(db.memberLabDraft.updateMany).not.toHaveBeenCalled();
    expect(db.memberLabSubmission.create).not.toHaveBeenCalled();
  });
  it('checks the compare-and-swap result before freezing evidence', async () => {
    db.memberLabDraft.findUnique.mockResolvedValue({ id: 'draft-1', userId: memberId, organizationId: org, revision: 2, submissionCount: 0 });
    db.memberLabDraft.updateMany.mockResolvedValue({ count: 0 });
    await expect(submitLabEvidence(memberId, lab.id, { ...input, expectedDraftRevision: 2, shareForReview: true })).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    expect(db.memberLabSubmission.create).not.toHaveBeenCalled();
    expect(db.memberLabDraft.updateMany.mock.calls[0][0].where).toEqual({ id: 'draft-1', userId: memberId, organizationId: org, revision: 2 });
  });
  it('freezes evidence plus original lab/rubric in the same serializable transaction', async () => {
    await submitLabEvidence(memberId, lab.id, { ...input, shareForReview: true });
    const created = db.memberLabSubmission.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ userId: memberId, organizationId: org, answers, draftRevision: 1, attempt: 1, contentVersion: lab.contentVersion, rubricVersion: lab.rubricVersion });
    expect(created.labSnapshot).toEqual(lab);
    expect(created.labSnapshot).not.toBe(lab);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
  });
  it('blocks duplicate submission until the latest review requests revision', async () => {
    db.memberLabSubmission.findFirst.mockResolvedValue(submission);
    await expect(submitLabEvidence(memberId, lab.id, { ...input, shareForReview: true })).rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
    expect(db.memberLabDraft.create).not.toHaveBeenCalled();
    db.memberLabSubmission.findFirst.mockResolvedValue({ ...submission, review: { decision: 'reviewed' } });
    await expect(submitLabEvidence(memberId, lab.id, { ...input, shareForReview: true })).rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
    db.memberLabSubmission.findFirst.mockResolvedValue({ ...submission, review: { decision: 'revision_requested' } });
    await submitLabEvidence(memberId, lab.id, { ...input, shareForReview: true });
    expect(db.memberLabSubmission.create).toHaveBeenCalledOnce();
  });
  it.each([{ userId: 'previous-owner', organizationId: org }, { userId: memberId, organizationId: 'previous-org' }])('rejects a stale draft identity after assignment transfer: %j', async (identity) => {
    db.memberLabDraft.findUnique.mockResolvedValue({ id: 'draft-1', revision: 0, ...identity });
    await expect(loadLabWorkspace({ userId: memberId, labId: lab.id })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(saveLabDraft(memberId, lab.id, input)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(db.memberLabDraft.create).not.toHaveBeenCalled();
    expect(db.memberLabDraft.updateMany).not.toHaveBeenCalled();
  });
  it('looks for previous submissions within the current content version', async () => {
    await submitLabEvidence(memberId, lab.id, { ...input, shareForReview: true });
    expect(db.memberLabSubmission.findFirst.mock.calls[0][0].where.contentVersion).toBe(lab.contentVersion);
  });
});

describe('staff scope and immutable review policy', () => {
  it('rejects ordinary members before querying submissions', async () => {
    await expect(loadLabReviewQueue({ userId: memberId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(db.memberLabSubmission.findMany).not.toHaveBeenCalled();
  });
  it('restricts counselor scopes to active same-org assignments', async () => {
    asStaff('counselor');
    db.counselorAssignment.findMany.mockResolvedValue([]);
    db.user.findMany.mockResolvedValue([]);
    expect(await loadLabReview({ userId: 'staff-1', submissionId: submission.id })).toBeNull();
    expect(db.counselorAssignment.findMany.mock.calls[0][0].where).toMatchObject({ counselorId: 'counselor-1', active: true, counselor: { active: true, user: { organizationId: org, deletedAt: null } }, member: { organizationId: org, deletedAt: null } });
    expect(db.memberLabSubmission.findFirst.mock.calls[0][0].where.userId.in).toEqual([]);
  });
  it('does not give super-admins a cross-org evidence bypass', async () => {
    asStaff('super_admin', 'other-organization');
    db.user.findMany.mockResolvedValue([]);
    expect(await loadLabReview({ userId: 'staff-1', submissionId: submission.id })).toBeNull();
    expect(db.memberLabSubmission.findFirst.mock.calls[0][0].where.organizationId).toBe('other-organization');
  });
  it('returns submitted snapshots and history to same-org admins without reading private drafts', async () => {
    asStaff();
    const result = await loadLabReview({ userId: 'staff-1', submissionId: submission.id });
    expect(result?.submission.answers).toEqual(answers);
    expect(result?.canReview).toBe(true);
    expect(db.memberLabDraft.findUnique).not.toHaveBeenCalled();
    expect(db.user.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: org, deletedAt: null, id: { not: 'staff-1' } });
  });
  it('links an assigned counselor to the existing student profile route', async () => {
    asStaff('counselor');
    db.counselorAssignment.findMany.mockImplementation(async ({ select }) => select.memberId ? [{ memberId }] : []);
    const result = await loadLabReview({ userId: 'staff-1', submissionId: submission.id });
    expect(result?.member.href).toBe('/counselor/students/' + memberId);
  });
  it('requires each frozen rubric criterion once and score2 for reviewed', async () => {
    asStaff();
    await expect(reviewLabEvidence('staff-1', submission.id, { ...reviewInput, rubricResults: reviewInput.rubricResults.slice(1) })).rejects.toMatchObject({ code: 'INVALID_REVIEW' });
    await expect(reviewLabEvidence('staff-1', submission.id, { ...reviewInput, rubricResults: reviewInput.rubricResults.map((item) => ({ ...item, score: 1 as const })) })).rejects.toMatchObject({ code: 'INVALID_REVIEW' });
    await expect(reviewLabEvidence('staff-1', submission.id, { ...reviewInput, rubricResults: reviewInput.rubricResults.map((item) => ({ ...item, criterionId: 'evidence' })) })).rejects.toMatchObject({ code: 'INVALID_REVIEW' });
    expect(db.memberLabReview.create).not.toHaveBeenCalled();
  });
  it('records a reviewer identity snapshot and exact rubric version, without editing evidence', async () => {
    asStaff();
    await reviewLabEvidence('staff-1', submission.id, reviewInput);
    expect(db.memberLabReview.create.mock.calls[0][0].data).toEqual({ submissionId: submission.id, reviewerId: 'staff-1', reviewerDisplayName: 'Synthetic reviewer', reviewerRole: 'admin', decision: 'reviewed', feedback: reviewInput.feedback, rubricVersion: lab.rubricVersion, rubricResults: reviewInput.rubricResults });
    expect(db.memberLabDraft.updateMany).not.toHaveBeenCalled();
    expect(db.memberLabSubmission.create).not.toHaveBeenCalled();
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
  });
  it('does not review a superseded submission', async () => {
    asStaff();
    db.memberLabSubmission.findMany.mockResolvedValue([{ ...submission, id: 'submission-2' }, submission]);
    await expect(reviewLabEvidence('staff-1', submission.id, reviewInput)).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    expect(db.memberLabReview.create).not.toHaveBeenCalled();
  });
  it('keeps historical-version evidence reviewable independently of a newer content version', async () => {
    asStaff();
    db.memberLabSubmission.findMany.mockResolvedValue([{ ...submission, id: 'new-content-submission', contentVersion: 'future-v2' }, submission]);
    expect((await loadLabReview({ userId: 'staff-1', submissionId: submission.id }))?.canReview).toBe(true);
  });
});
