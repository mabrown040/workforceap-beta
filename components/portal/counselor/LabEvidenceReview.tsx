'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { requestFailureMessage } from '@/lib/http/requestFailureCopy';
import { ArrowLeft, ClipboardCheck, ExternalLink } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { TextArea } from '@astryxdesign/core/TextArea';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { DesignSurface, PageOpener, useAnnounce } from '@/components/portal/kit';
import { LAB_MAX_CRITERION_FEEDBACK_LENGTH, LAB_MAX_FEEDBACK_LENGTH, type LabEvidenceSubmission, type LabReviewInput, type LabStaffReviewWorkspace } from '@/lib/member/labWorkspaceTypes';
import { LAB_REVIEW_LABELS, labReviewDate } from './LabReviewQueue';
import styles from './labReviews.module.css';

type CriterionDraft = { score?: 0 | 1 | 2; feedback: string };

function SubmittedEvidence({ submission }: { submission: LabEvidenceSubmission }) {
  return <VStack gap={4}>
    {submission.labSnapshot.deliverables.map((prompt) => <section key={prompt.id}>
      <h3>{prompt.title}</h3>
      <p className={styles.meta}>{prompt.prompt}</p>
      <p className={styles.evidence}>{submission.answers[prompt.id] || 'No response submitted.'}</p>
    </section>)}
    {submission.artifactUrl ? <a href={submission.artifactUrl} target="_blank" rel="noopener noreferrer" className={`${styles.link} wa-kit-focus`}>Open member’s supporting link <ExternalLink size={14} aria-hidden="true" /></a> : null}
  </VStack>;
}

function SavedReview({ submission }: { submission: LabEvidenceSubmission }) {
  const review = submission.review;
  if (!review) return null;
  const total = review.rubricResults.reduce((sum, item) => sum + item.score, 0);
  return <section className={styles.panel} aria-label={`Feedback for attempt ${submission.attempt}`}>
    <VStack gap={3}>
      <h2>{LAB_REVIEW_LABELS[review.decision]}</h2>
      <p>{total} of {submission.labSnapshot.rubric.length * 2} rubric points · {review.reviewer.displayName} · {labReviewDate(review.reviewedAt)}</p>
      <p className={styles.evidence}>{review.feedback}</p>
      {review.rubricResults.map((result) => <section key={result.criterionId}>
        <h3>{submission.labSnapshot.rubric.find((criterion) => criterion.id === result.criterionId)?.title ?? result.criterionId} · {result.score}/2</h3>
        {result.feedback ? <p className={styles.evidence}>{result.feedback}</p> : null}
      </section>)}
    </VStack>
  </section>;
}

export default function LabEvidenceReview({ submissionId }: { submissionId: string }) {
  const [workspace, setWorkspace] = useState<LabStaffReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [criteria, setCriteria] = useState<Record<string, CriterionDraft>>({});
  const [decision, setDecision] = useState<LabReviewInput['decision'] | ''>('');
  const alive = useRef(true);
  const announce = useAnnounce();
  const tCommon = useTranslations('common');
  const hasLocalDraft = Boolean(feedback || decision || Object.keys(criteria).length);
  const dirty = hasLocalDraft;
  const submission = workspace?.submission;
  const rubric = submission?.labSnapshot.rubric ?? [];
  const allScored = rubric.length > 0 && rubric.every((item) => criteria[item.id]?.score !== undefined);
  const allAddressed = allScored && rubric.every((item) => criteria[item.id]?.score === 2);
  const tooLong = feedback.length > LAB_MAX_FEEDBACK_LENGTH || Object.values(criteria).some((item) => item.feedback.length > LAB_MAX_CRITERION_FEEDBACK_LENGTH);

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/staff/lab-reviews/${encodeURIComponent(submissionId)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.review) throw new Error(result.error ?? 'This submission is unavailable or outside your assigned members.');
      if (alive.current) setWorkspace(result.review);
    } catch (failure) {
      if (alive.current) setError(requestFailureMessage(failure, { connection: tCommon('connectionError'), fallback: 'The submission could not be loaded. Try again.' }, 'lab-evidence-review-load'));
    } finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty && !saving) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (!link || link.target === '_blank' || link.getAttribute('href')?.startsWith('#') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (saving || !window.confirm('Your review has not been sent. Leave without saving this feedback?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', beforeUnload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', navigate, true); };
  }, [dirty, saving]);

  async function sendReview() {
    if (!submission || saving || !decision || !allScored || !feedback.trim() || tooLong || (decision === 'reviewed' && !allAddressed)) return;
    setSaving(true); setError(''); setMessage('');
    const payload: LabReviewInput = { expectedReviewVersion: 0, decision, feedback, rubricResults: rubric.map((item) => ({ criterionId: item.id, score: criteria[item.id].score!, feedback: criteria[item.id].feedback })) };
    try {
      const response = await fetch(`/api/staff/lab-reviews/${encodeURIComponent(submissionId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.review) throw new Error(result.error ?? 'Your feedback was not saved. Your draft is still here; try again.');
      if (alive.current) { setWorkspace(result.review); setFeedback(''); setCriteria({}); setDecision(''); setMessage('Feedback saved. The member can now read it in their lab workspace.'); announce('Feedback saved.'); }
    } catch (failure) {
      const detail = requestFailureMessage(failure, { connection: tCommon('connectionError'), fallback: 'Your feedback was not saved. Your draft is still here; try again.' }, 'lab-evidence-review-save');
      if (alive.current) { setError(detail); announce(detail, 'assertive'); }
    } finally { if (alive.current) setSaving(false); }
  }

  return <DesignSurface surface="dense"><main className={styles.workspace}>
    <VStack gap={6}>
      <Link href="/counselor/lab-reviews" className={`${styles.link} wa-kit-focus`}><ArrowLeft size={16} aria-hidden="true" /> Lab review queue</Link>
      <PageOpener kicker="Submitted lab work" title={submission?.labSnapshot.title ?? 'Review evidence'} lede={workspace ? `${workspace.member.displayName} · Attempt ${submission?.attempt}` : 'Read the member’s evidence and respond against its rubric.'} icon={<ClipboardCheck size={16} aria-hidden="true" />} />
      {loading ? <p role="status">Loading submission…</p> : null}
      {error ? <VStack gap={3}><p className={styles.error}>{error}</p><Button label="Check current review status" isDisabled={loading || saving} onClick={() => void load()} /></VStack> : null}
      {message ? <p className={styles.success}>{message}</p> : null}
      {submission && workspace ? <>
        <HStack gap={3} wrap="wrap"><p className={styles.status}>{LAB_REVIEW_LABELS[submission.status]}</p><p className={styles.meta}>Submitted {labReviewDate(submission.submittedAt)} · Rubric {submission.rubricVersion}</p></HStack>
        <Link href={workspace.member.href} className={`${styles.link} wa-kit-focus`}>Open {workspace.member.displayName}’s member profile</Link>
        {!workspace.reviewRouting.assignedCounselor ? <p className={styles.muted}>{workspace.reviewRouting.description}</p> : null}
        <details className={styles.history}>
          <summary className="wa-kit-focus">Read the original lab brief and practice materials</summary>
          <VStack gap={4}>
            <p>{submission.labSnapshot.scenario}</p>
            {submission.labSnapshot.materials.map((material) => <section key={material.id}><h3>{material.title}</h3><p className={styles.evidence}>{material.content}</p></section>)}
            {submission.labSnapshot.steps.map((step, index) => <section key={step.title}><h3>{index + 1}. {step.title}</h3><ol>{step.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>)}
          </VStack>
        </details>
        <section aria-label="Submitted evidence"><VStack gap={4}><h2>The member’s work</h2><SubmittedEvidence submission={submission} /></VStack></section>
        <SavedReview submission={submission} />
        {submission.review && hasLocalDraft ? <section className={styles.panel} aria-label="Your local review draft"><VStack gap={3}>
          <h2>Your local review draft</h2>
          <p className={styles.muted}>A review is already recorded. Your local feedback is kept below so you can compare or copy it before leaving.</p>
          <p className={styles.evidence}>{feedback}</p>
          {rubric.filter((item) => criteria[item.id]).map((item) => <section key={item.id}><h3>{item.title} · {criteria[item.id].score ?? 'Unscored'}/2</h3><p className={styles.evidence}>{criteria[item.id].feedback}</p></section>)}
        </VStack></section> : null}
        {workspace.canReview && !submission.review ? <form onSubmit={(event) => { event.preventDefault(); void sendReview(); }} aria-label="Review submitted evidence">
          <VStack gap={5}>
            <section><h2>Give specific, usable feedback</h2><p className={styles.muted}>Score the written evidence against each criterion. This review does not verify live device performance, training attendance, or an external credential.</p></section>
            <FormLayout>
              {rubric.map((criterion) => <section key={criterion.id} className={styles.criterion}>
                <VStack gap={3}>
                  <RadioList label={criterion.title} description={criterion.description} value={String(criteria[criterion.id]?.score ?? '')} onChange={(value) => { setCriteria((previous) => ({ ...previous, [criterion.id]: { feedback: previous[criterion.id]?.feedback ?? '', score: Number(value) as 0 | 1 | 2 } })); if (value !== '2' && decision === 'reviewed') setDecision('revision_requested'); }} isDisabled={saving} isRequired>
                    {([0, 1, 2] as const).map((score) => <RadioListItem key={score} value={String(score)} label={`${score} / 2`} description={criterion.scoring[score]} />)}
                  </RadioList>
                  <TextArea label={`Feedback: ${criterion.title}`} value={criteria[criterion.id]?.feedback ?? ''} onChange={(value) => setCriteria((previous) => ({ ...previous, [criterion.id]: { ...previous[criterion.id], feedback: value } }))} rows={2} maxLength={LAB_MAX_CRITERION_FEEDBACK_LENGTH} isOptional isDisabled={saving} />
                </VStack>
              </section>)}
              <TextArea label="What to keep and what to do next" description="Name the evidence that worked and the specific change or next practice that would help." value={feedback} onChange={setFeedback} rows={5} maxLength={LAB_MAX_FEEDBACK_LENGTH} isRequired isDisabled={saving} />
              <RadioList label="Review decision" value={decision} onChange={(value) => setDecision(value as LabReviewInput['decision'])} isRequired isDisabled={saving}>
                <RadioListItem value="revision_requested" label="Request a revision" description="The member can update the work and submit a new attempt." />
                <RadioListItem value="reviewed" label="Mark evidence reviewed" description={allAddressed ? 'Every criterion is addressed. Keep this review as a record of the submitted work.' : 'Available after every criterion receives 2 points.'} isDisabled={!allAddressed} />
              </RadioList>
            </FormLayout>
            {!allScored || !feedback.trim() || !decision ? <p className={styles.meta}>Score every criterion, write your next-step feedback, and choose a decision to send.</p> : null}
            <HStack gap={3} wrap="wrap"><Button label="Send feedback to member" type="submit" variant="primary" size="lg" isLoading={saving} isDisabled={saving || !allScored || !feedback.trim() || !decision || tooLong || (decision === 'reviewed' && !allAddressed)} /></HStack>
          </VStack>
        </form> : !submission.review ? <p className={styles.muted}>This attempt is no longer open for review. Check the member’s latest submission in the queue.</p> : null}
        {workspace.history.filter((item) => item.id !== submission.id).length ? <section><h2>Other attempts</h2>{workspace.history.filter((item) => item.id !== submission.id).map((item) => <details key={item.id} className={styles.history}><summary className="wa-kit-focus">Attempt {item.attempt} · {LAB_REVIEW_LABELS[item.status]}</summary><VStack gap={4}><SubmittedEvidence submission={item} /><SavedReview submission={item} /></VStack></details>)}</section> : null}
      </> : null}
    </VStack>
  </main></DesignSurface>;
}
