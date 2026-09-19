import { act, cleanup, fireEvent, render as renderBare, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberLabWorkspace } from '@/components/portal/MemberLabWorkspace';
import type { LabWorkspace, LabEvidenceSubmission } from '@/lib/member/labWorkspaceTypes';

const render = (ui: ReactElement) => renderBare(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>);

const lab: LabWorkspace['lab'] = {
  id: 'ticket-triage', contentVersion: '2026-09-09.v1', rubricVersion: '2026-09-09.v1', title: 'Investigate a supplied ticket', summary: 'Explain a support decision using fictional evidence.', estimatedMinutes: 60,
  objectives: ['Separate an observation from a hypothesis.'], prerequisites: ['Use the supplied records.'], scenario: 'A fictional reception workstation cannot save an export.',
  materials: [{ id: 'snapshot', title: 'Fictional device snapshot', format: 'text', content: '09:05 — free storage 0.8 GB; export failed.' }],
  steps: [{ title: 'Compare the observations', instructions: ['Cite the supplied time and describe a reversible next step.'] }],
  deliverables: [{ id: 'observations', title: 'Your observations', prompt: 'Cite a material and time.' }, { id: 'next-step', title: 'Your next step', prompt: 'Explain the next check and needed permission.' }],
  rubric: [{ id: 'evidence', title: 'Traceable observations', description: 'The reviewer can locate the evidence.', maxScore: 2, scoring: { 0: 'No evidence.', 1: 'An observation without its source.', 2: 'An observation with its source and time.' } }],
  troubleshooting: [{ problem: 'Unsure of the cause?', approach: 'State what is missing.' }], accessibilityAlternatives: ['Use a numbered text list.'], sources: [{ title: 'Concept reference', url: 'https://example.org/reference', supports: 'Storage terminology.' }],
};
function workspace(): LabWorkspace { return { lab, programSlug: 'it-support-professional-certificate-ibm', curriculumVersion: 'legacy-v1', draft: { revision: 0, answers: {}, artifactUrl: null, updatedAt: null }, submissions: [], reviewRouting: { assignedCounselor: false, counselorNames: [], description: 'Program staff can review submitted evidence.' } }; }
function submission(overrides: Partial<LabEvidenceSubmission> = {}): LabEvidenceSubmission { return { id: 'submission-1', attempt: 1, draftRevision: 1, contentVersion: lab.contentVersion, rubricVersion: lab.rubricVersion, labSnapshot: lab, answers: { observations: 'Submitted observation.', 'next-step': 'Submitted next step.' }, artifactUrl: null, submittedAt: '2026-09-09T12:00:00Z', status: 'submitted', reviewVersion: 0, review: null, ...overrides }; }
const renderWorkspace = (data = workspace()) => render(<MemberLabWorkspace workspace={data} scopeNote="Planning estimates are not tracked hours or approved curriculum coverage." returnCourseSlug="it-support-professional-certificate-ibm-course-10" />);
const respond = (data: LabWorkspace) => new Response(JSON.stringify({ workspace: data }), { status: 200 });
function fillEvidence() { fireEvent.change(screen.getByRole('textbox', { name: 'Your observations' }), { target: { value: 'The supplied snapshot at09:05 shows0.8 GB free.' } }); fireEvent.change(screen.getByRole('textbox', { name: 'Your next step' }), { target: { value: 'Ask the owner for permission before changing files.' } }); }
function savedFromRequest(revision: number): LabWorkspace { const body = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string); return { ...workspace(), draft: { revision, answers: body.answers, artifactUrl: body.artifactUrl, updatedAt: '2026-09-09T12:00:00Z' } }; }

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }))); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); window.history.replaceState(null, '', '/dashboard/learning/labs/ticket-triage'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('member lab evidence workspace', () => {
  it('renders supplied instruction and an explicitly private draft without sending on mount', () => {
    renderWorkspace();
    expect(screen.getByText('09:05 — free storage 0.8 GB; export failed.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How your evidence is reviewed' })).toBeInTheDocument();
    expect(screen.getByText('Instructional review pending')).toBeInTheDocument();
    expect(screen.getByText(/Counselor assignment is pending/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit evidence for review' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Back to my program' })).toHaveAttribute('href', '/dashboard/program?course=it-support-professional-certificate-ibm-course-10');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saves only the private snapshot and preserves newer typing during the request', async () => {
    let complete!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    renderWorkspace(); fillEvidence();
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    const saved = savedFromRequest(1);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ programSlug: workspace().programSlug, curriculumVersion: 'legacy-v1', contentVersion: lab.contentVersion, expectedDraftRevision: 0, answers: saved.draft.answers, artifactUrl: null });
    fireEvent.change(screen.getByRole('textbox', { name: 'Your observations' }), { target: { value: 'A newer observation while saving.' } });
    await act(async () => complete(respond(saved)));
    expect(screen.getByRole('textbox', { name: 'Your observations' })).toHaveValue('A newer observation while saving.');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    vi.mocked(fetch).mockImplementationOnce(async () => respond(savedFromRequest(2)));
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).expectedDraftRevision).toBe(1);
    expect(vi.mocked(fetch).mock.calls.every((call) => call[1]?.method === 'PUT')).toBe(true);
  });

  it('requires complete evidence and consent, then shares a frozen snapshot while later edits remain private', async () => {
    let complete!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    renderWorkspace(); fillEvidence();
    expect(screen.getByRole('button', { name: 'Submit evidence for review' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit evidence for review' }));
    const saved = savedFromRequest(1);
    const submitted = submission({ answers: saved.draft.answers });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/member/labs/ticket-triage/submit');
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).shareForReview).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your next step' }), { target: { value: 'My later private revision.' } });
    await act(async () => complete(respond({ ...saved, submissions: [submitted] })));
    expect(screen.getByRole('textbox', { name: 'Your next step' })).toHaveValue('My later private revision.');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Submission 1' })).toHaveTextContent(saved.draft.answers['next-step']);
    expect(screen.getByRole('article', { name: 'Submission 1' })).not.toHaveTextContent('My later private revision.');
    expect(screen.queryByRole('button', { name: /Submit a new version/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Your submitted version is awaiting review/)).toBeInTheDocument();
  });

  it('retains evidence after a failed save and permits retry', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Storage unavailable. Retry shortly.' }), { status: 503 }));
    renderWorkspace(); fillEvidence();
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Your evidence' })).getByRole('alert')).toHaveTextContent('Storage unavailable. Retry shortly.'));
    expect(screen.getByRole('textbox', { name: 'Your next step' })).toHaveValue('Ask the owner for permission before changing files.');
    vi.mocked(fetch).mockImplementationOnce(async () => respond(savedFromRequest(1)));
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Your evidence' })).queryByRole('alert')).not.toBeInTheDocument());
    expect(within(screen.getByRole('region', { name: 'Your evidence' })).getByText('Private draft saved in your account.')).toBeInTheDocument();
  });

  it('never overwrites a conflicted draft without a deliberate reload', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Conflict' }), { status: 409 }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWorkspace(); fillEvidence();
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Your evidence' })).getByRole('alert')).toHaveTextContent('A newer draft or submission exists.'));
    expect(screen.getByRole('button', { name: 'Save private draft' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Load latest saved draft' }));
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'Your observations' })).toHaveValue('The supplied snapshot at09:05 shows0.8 GB free.');
    confirm.mockReturnValue(true);
    vi.mocked(fetch).mockResolvedValueOnce(respond({ ...workspace(), draft: { revision: 4, answers: { observations: 'The latest saved observation.' }, artifactUrl: null, updatedAt: '2026-09-09T12:00:00Z' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Load latest saved draft' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Your observations' })).toHaveValue('The latest saved observation.'));
    expect(screen.getByRole('button', { name: 'Save private draft' })).toBeEnabled();
  });

  it('shows recorded rubric feedback from its immutable snapshot and permits a requested revision', () => {
    const attempt = submission({ status: 'revision_requested', reviewVersion: 1, labSnapshot: { ...lab, rubric: [{ ...lab.rubric[0], title: 'Original evidence criterion' }] }, review: { id: 'review-1', version: 1, decision: 'revision_requested', feedback: 'Cite the source time before naming the cause.', rubricVersion: lab.rubricVersion, rubricResults: [{ criterionId: 'evidence', score: 1, feedback: 'The time is missing.' }], reviewer: { displayName: 'Casey Fixture', role: 'counselor' }, reviewedAt: '2026-09-09T14:00:00Z' } });
    renderWorkspace({ ...workspace(), submissions: [attempt] });
    expect(screen.getByText('Feedback from Casey Fixture')).toBeInTheDocument();
    expect(screen.getByText('Original evidence criterion: 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('The time is missing.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit a new version for review' })).toBeDisabled();
    expect(screen.getByRole('article', { name: 'Submission 1' })).toHaveTextContent('Submitted observation.');
    expect(screen.getByRole('textbox', { name: 'Your observations' })).toHaveValue('');
  });

  it('allows work on new lab content after an older content version was reviewed', async () => {
    const currentLab = { ...lab, contentVersion: '2026-10-01.v2', rubricVersion: '2026-10-01.v2' };
    const oldAttempt = submission({ status: 'reviewed', reviewVersion: 1, review: { id: 'old-review', version: 1, decision: 'reviewed', feedback: 'The earlier version was reviewed.', rubricVersion: lab.rubricVersion, rubricResults: [{ criterionId: 'evidence', score: 2, feedback: '' }], reviewer: { displayName: 'Casey Fixture', role: 'counselor' }, reviewedAt: '2026-09-09T14:00:00Z' } });
    renderWorkspace({ ...workspace(), lab: currentLab, submissions: [oldAttempt] });
    fillEvidence(); await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Submit a new version for review' })).toBeEnabled();
    expect(screen.queryByText(/Your submitted work has been reviewed/)).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Submission 1' })).toHaveTextContent('The earlier version was reviewed.');
    expect(screen.getByRole('article', { name: 'Submission 1' })).toHaveTextContent(lab.contentVersion);
  });

  it('blocks unsafe links and does not render unsafe links in historical evidence', () => {
    renderWorkspace({ ...workspace(), submissions: [submission({ artifactUrl: 'javascript:alert(1)', status: 'reviewed' })] });
    expect(screen.queryByRole('link', { name: 'Open the submitted artifact link' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /^Artifact link/ }), { target: { value: 'https://username:password@example.org/work' } });
    expect(screen.getByRole('button', { name: 'Save private draft' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Submit a new version/ })).not.toBeInTheDocument();
  });

  it('protects unsaved navigation but lets the member read another section of this lab', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWorkspace(); fillEvidence();
    const unloading = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unloading);
    expect(unloading.defaultPrevented).toBe(true);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen.getByRole('link', { name: 'Back to my program' }).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); expect(confirm).toHaveBeenCalledOnce();
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Lab sections' })).getByRole('link', { name: 'Lab brief' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'Your observations' })).toHaveValue('The supplied snapshot at09:05 shows0.8 GB free.');
  });
});
