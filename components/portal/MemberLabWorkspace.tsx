'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { requestFailureMessage } from '@/lib/http/requestFailureCopy';
import { ArrowLeft, Clock3, FlaskConical, LockKeyhole } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { DesignSurface, PageOpener, StatusTag, useAnnounce } from '@/components/portal/kit';
import { LAB_MAX_ANSWER_LENGTH, LAB_MAX_ARTIFACT_URL_LENGTH, type LabWorkspace, type LabEvidenceSubmission } from '@/lib/member/labWorkspaceTypes';
import styles from './MemberLabWorkspace.module.css';

type EvidenceDraft = { answers: Record<string, string>; artifactUrl: string };
const asDraft = (workspace: LabWorkspace): EvidenceDraft => ({ answers: { ...workspace.draft.answers }, artifactUrl: workspace.draft.artifactUrl ?? '' });
const sameDraft = (a: EvidenceDraft, b: EvidenceDraft) => a.artifactUrl === b.artifactUrl && [...new Set([...Object.keys(a.answers), ...Object.keys(b.answers)])].every((key) => (a.answers[key] ?? '') === (b.answers[key] ?? ''));
function safeLink(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value.trim()); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date)} UTC`;
}
const statusLabel = { submitted: 'Awaiting review', revision_requested: 'Revision requested', reviewed: 'Reviewed' } as const;

function Submission({ submission }: { submission: LabEvidenceSubmission }) {
  const review = submission.review;
  const artifact = safeLink(submission.artifactUrl);
  return (
    <article className={styles.submission} aria-label={`Submission ${submission.attempt}`}>
      <div className={styles.submissionHeader}>
        <div><h3>Submission {submission.attempt}</h3><time dateTime={submission.submittedAt}>{dateLabel(submission.submittedAt)}</time></div>
        <StatusTag tone={submission.status === 'reviewed' ? 'ok' : submission.status === 'revision_requested' ? 'warn' : 'info'}>{statusLabel[submission.status]}</StatusTag>
      </div>
      {review ? <div className={styles.feedback}>
        <h3>Feedback from {review.reviewer.displayName}</h3>
        <p className={styles.saveState}>{review.reviewer.role === 'admin' ? 'Program staff' : 'Counselor'} · {dateLabel(review.reviewedAt)}</p>
        <p className={styles.evidenceText}>{review.feedback}</p>
        <ul className={styles.reviewScores}>{review.rubricResults.map((result) => {
          const criterion = submission.labSnapshot.rubric.find((item) => item.id === result.criterionId);
          return <li key={result.criterionId}><strong>{criterion?.title ?? result.criterionId}: {result.score} / {criterion?.maxScore ?? 2}</strong>{result.feedback ? <p className={styles.evidenceText}>{result.feedback}</p> : null}</li>;
        })}</ul>
      </div> : <p className={styles.muted}>Your evidence has been submitted. No review decision has been recorded yet.</p>}
      <details className={styles.disclosure}>
        <summary>View the evidence shared in submission {submission.attempt}</summary>
        <p className={styles.saveState}>Saved snapshot · lab {submission.contentVersion} · rubric {submission.rubricVersion}</p>
        {submission.labSnapshot.deliverables.map((item) => <div key={item.id} className={styles.disclosure}><h3>{item.title}</h3><p className={styles.evidenceText}>{submission.answers[item.id] || 'No written response.'}</p></div>)}
        {artifact ? <p><a href={artifact} target="_blank" rel="noopener noreferrer" className="wa-kit-focus">Open the submitted artifact link</a></p> : null}
        <p className={styles.saveState}>This submitted text stays unchanged when you edit your private draft. Linked files can change outside WorkforceAP.</p>
      </details>
    </article>
  );
}

/** Member-owned lab evidence. Saving is private; only explicit submission shares a frozen revision. */
export function MemberLabWorkspace({ workspace: initialWorkspace, scopeNote, returnCourseSlug }: { workspace: LabWorkspace; scopeNote: string; returnCourseSlug: string }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [draft, setDraft] = useState<EvidenceDraft>(() => asDraft(initialWorkspace));
  const [saving, setSaving] = useState<'draft' | 'submit' | 'reload' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [share, setShare] = useState(false);
  const requestInFlight = useRef(false);
  const announce = useAnnounce();
  const tCommon = useTranslations('common');
  const { lab } = workspace;
  const hasUnsaved = !sameDraft(draft, asDraft(workspace));
  const completedCount = lab.deliverables.filter((item) => Boolean(draft.answers[item.id]?.trim())).length;
  const validLink = !draft.artifactUrl.trim() || Boolean(safeLink(draft.artifactUrl));
  const withinLimits = Object.values(draft.answers).every((value) => value.length <= LAB_MAX_ANSWER_LENGTH) && draft.artifactUrl.length <= LAB_MAX_ARTIFACT_URL_LENGTH;
  const readyToSubmit = completedCount === lab.deliverables.length && validLink && withinLimits;
  const currentSubmission = workspace.submissions.find((item) => item.contentVersion === lab.contentVersion);
  const canSubmitVersion = !currentSubmission || currentSubmission.status === 'revision_requested';
  const endpoint = `/api/member/labs/${encodeURIComponent(lab.id)}`;

  useEffect(() => {
    if (!hasUnsaved && !saving) return;
    const protectUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const protectNavigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;
      if (requestInFlight.current) {
        event.preventDefault(); event.stopPropagation();
        const notice = 'Your lab work is still saving. Wait for the result before leaving.';
        setMessage(notice); announce(notice, 'assertive');
      } else if (!window.confirm('You have unsaved lab evidence. Leave without saving these changes?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', protectUnload);
    document.addEventListener('click', protectNavigation, true);
    return () => { window.removeEventListener('beforeunload', protectUnload); document.removeEventListener('click', protectNavigation, true); };
  }, [hasUnsaved, saving, announce]);

  async function persist(kind: 'draft' | 'submit') {
    if (requestInFlight.current || conflict) return;
    if (!validLink || !withinLimits || (kind === 'submit' && (!share || !readyToSubmit || !canSubmitVersion))) {
      setError('Check the evidence fields and artifact link before continuing.'); return;
    }
    const submittedDraft: EvidenceDraft = { answers: { ...draft.answers }, artifactUrl: draft.artifactUrl };
    requestInFlight.current = true; setSaving(kind); setError(''); setMessage('');
    try {
      const response = await fetch(`${endpoint}${kind === 'submit' ? '/submit' : ''}`, {
        method: kind === 'submit' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programSlug: workspace.programSlug, curriculumVersion: workspace.curriculumVersion, contentVersion: lab.contentVersion, expectedDraftRevision: workspace.draft.revision, answers: submittedDraft.answers, artifactUrl: submittedDraft.artifactUrl.trim() || null, ...(kind === 'submit' ? { shareForReview: true } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.workspace) {
        if (response.status === 409) { setConflict(true); throw new Error('A newer draft or submission exists. Your changes are still here. Copy them before loading the latest saved version.'); }
        throw new Error(response.status === 401 ? 'Your session expired. Keep this page open and sign in in another tab, then retry.' : result.error ?? 'Your evidence could not be saved. Your changes are still here; please retry.');
      }
      const saved = result.workspace as LabWorkspace;
      setWorkspace(saved);
      setDraft((current) => sameDraft(current, submittedDraft) ? asDraft(saved) : current);
      if (kind === 'submit') setShare(false);
      const notice = kind === 'submit' ? 'Evidence submitted for review. Further edits stay private until you submit again.' : 'Private draft saved in your account.';
      setMessage(notice); announce(notice);
    } catch (cause) {
      const notice = cause instanceof Error && !(cause instanceof TypeError) ? cause.message : 'Your evidence could not be saved. Check your connection and retry; your changes are still here.';
      setError(notice); announce(notice, 'assertive');
    } finally { requestInFlight.current = false; setSaving(null); }
  }

  async function reloadSaved() {
    if (requestInFlight.current) return;
    if (hasUnsaved && !window.confirm('Replace the text in this editor with the latest saved draft? Copy any changes you want to keep first.')) return;
    requestInFlight.current = true; setSaving('reload'); setError('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.workspace) throw new Error('The saved draft could not be loaded. Your text is still here; please retry.');
      setWorkspace(result.workspace); setDraft(asDraft(result.workspace)); setConflict(false); setShare(false);
      setMessage('Latest saved draft loaded.');
    } catch (cause) { setError(requestFailureMessage(cause, { connection: tCommon('connectionError'), fallback: 'The saved draft could not be loaded.' }, 'member-lab-reload')); }
    finally { requestInFlight.current = false; setSaving(null); }
  }

  return <DesignSurface surface="warm"><div className={styles.workspace}>
    <Link href={`/dashboard/program?course=${encodeURIComponent(returnCourseSlug)}`} className={`${styles.backLink} wa-kit-focus`}><ArrowLeft size={16} aria-hidden="true" /> Back to my program</Link>
    <PageOpener kicker="Practice lab" title={lab.title} lede={lab.summary} icon={<FlaskConical size={14} aria-hidden="true" />} />
    <div className={styles.meta}><StatusTag tone="info">Starter practice</StatusTag><span><Clock3 size={15} aria-hidden="true" /> About {lab.estimatedMinutes} minutes</span><span>Instructional review pending</span><span>Lab version {lab.contentVersion}</span></div>
    <nav className={styles.sectionLinks} aria-label="Lab sections"><a href="#lab-brief" className="wa-kit-focus">Lab brief</a><a href="#lab-evidence" className="wa-kit-focus">Your evidence</a><a href="#lab-feedback" className="wa-kit-focus">Submissions &amp; feedback ({workspace.submissions.length})</a></nav>
    <p className={styles.scope}>{scopeNote}</p>
    <div className={styles.columns}>
      <div id="lab-brief" className={styles.brief}>
        <section aria-labelledby="lab-objectives"><h2 id="lab-objectives">What you will practice</h2><ul>{lab.objectives.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section aria-labelledby="lab-scenario"><h2 id="lab-scenario">Your assignment</h2><div className={styles.context}><p>{lab.scenario}</p></div></section>
        <section aria-labelledby="lab-setup"><h2 id="lab-setup">Before you begin</h2><ul>{lab.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section aria-labelledby="lab-materials"><h2 id="lab-materials">Practice materials</h2><p className={styles.muted}>Use these supplied examples for your evidence. All people, tickets and systems in this lab are fictional.</p>{lab.materials.map((item, index) => <details key={item.id} className={styles.disclosure} open={index === 0}><summary>{item.title}</summary><pre className={styles.material}>{item.content}</pre></details>)}</section>
        <section aria-labelledby="lab-steps"><h2 id="lab-steps">Work through the case</h2><ol className={styles.steps}>{lab.steps.map((step) => <li key={step.title}><h3>{step.title}</h3>{step.instructions.map((instruction) => <p key={instruction}>{instruction}</p>)}</li>)}</ol></section>
        <section aria-labelledby="lab-rubric"><h2 id="lab-rubric">How your evidence is reviewed</h2><p className={styles.muted}>Use these criteria to check your work. A review records feedback on this practice; it does not award course hours or a credential.</p><ul className={styles.rubricList}>{lab.rubric.map((item) => <li key={item.id}><h3>{item.title}</h3><p>{item.description}</p><details className={styles.disclosure}><summary>Scoring guide: 0–{item.maxScore} points</summary><dl className={styles.rubricLevels}>{([0, 1, 2] as const).map((score) => <div key={score}><dt>{score} points</dt><dd>{item.scoring[score]}</dd></div>)}</dl></details></li>)}</ul></section>
        <section aria-labelledby="lab-help"><h2 id="lab-help">If you get stuck</h2>{lab.troubleshooting.map((item) => <details className={styles.disclosure} key={item.problem}><summary>{item.problem}</summary><p>{item.approach}</p></details>)}<details className={styles.disclosure}><summary>Other ways to complete the practice</summary><ul>{lab.accessibilityAlternatives.map((item) => <li key={item}>{item}</li>)}</ul></details></section>
        <section aria-labelledby="lab-sources" className={styles.sources}><h2 id="lab-sources">Reference material</h2><p className={styles.muted}>These references support the concepts used in this original practice.</p><ul>{lab.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="wa-kit-focus">{source.title}</a><p>{source.supports}</p></li>)}</ul></section>
      </div>
      <section id="lab-evidence" className={styles.editor} aria-labelledby="lab-evidence-title">
        <div className={styles.editorHeading}><h2 id="lab-evidence-title">Your evidence</h2><StatusTag tone="muted"><LockKeyhole size={13} aria-hidden="true" /> Private draft</StatusTag></div>
        <p className={styles.muted}>Write your reasoning using <a href="#lab-materials" className="wa-kit-focus">the practice materials</a>. Save as you go. Only evidence you explicitly submit is shared for review; your course notes are not included.</p>
        {currentSubmission?.status === 'revision_requested' ? <p className={styles.notice}>A revision was requested. Read the feedback below, update your evidence, then submit a new version.</p> : null}
        <form onSubmit={(event) => { event.preventDefault(); void persist('draft'); }}>
          {lab.deliverables.map((item) => <TextArea key={item.id} label={item.title} description={item.prompt} value={draft.answers[item.id] ?? ''} onChange={(value) => setDraft((current) => ({ ...current, answers: { ...current.answers, [item.id]: value } }))} isDisabled={saving === 'reload'} rows={6} maxLength={LAB_MAX_ANSWER_LENGTH} status={(draft.answers[item.id]?.length ?? 0) > LAB_MAX_ANSWER_LENGTH ? { type: 'error', message: `Use ${LAB_MAX_ANSWER_LENGTH} characters or fewer.` } : undefined} />)}
          <TextInput label="Artifact link" description="Optional: a document, diagram or work sample. Use an http or https link without passwords. Check its sharing permissions before submitting." isOptional isDisabled={saving === 'reload'} value={draft.artifactUrl} onChange={(artifactUrl) => setDraft((current) => ({ ...current, artifactUrl }))} placeholder="https://…" status={!validLink || draft.artifactUrl.length > LAB_MAX_ARTIFACT_URL_LENGTH ? { type: 'error', message: `Use a valid http or https link, up to ${LAB_MAX_ARTIFACT_URL_LENGTH} characters, without embedded credentials.` } : undefined} />
          <div className={styles.actions}><Button label="Save private draft" type="submit" variant="secondary" size="lg" isLoading={saving === 'draft'} isDisabled={Boolean(saving) || conflict || !validLink || !withinLimits} /><span className={styles.saveState}>{hasUnsaved ? 'Unsaved changes' : workspace.draft.updatedAt ? `Saved ${dateLabel(workspace.draft.updatedAt)}` : 'Not saved yet'}</span></div>
          {message ? <p className={styles.notice} role="status">{message}</p> : null}
          {error ? <div className={styles.error} role="alert"><p>{error}</p>{conflict ? <Button label="Load latest saved draft" variant="secondary" isLoading={saving === 'reload'} isDisabled={Boolean(saving)} onClick={() => void reloadSaved()} /> : null}</div> : null}
          <div className={styles.shareSection}>
            <h3>{canSubmitVersion ? 'Submit for review' : 'Your submitted evidence'}</h3>
            <p className={styles.muted}>{workspace.reviewRouting.description}</p>
            {!workspace.reviewRouting.assignedCounselor ? <p className={styles.notice}>Counselor assignment is pending. Program staff can access submitted evidence; a counselor response time is not yet confirmed.</p> : null}
            {canSubmitVersion ? <><p className={styles.saveState}>{completedCount} of {lab.deliverables.length} written responses started. Complete each response before submitting.</p>
            <label className={styles.shareConsent}><input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} disabled={Boolean(saving)} /><span>Share these lab responses and the optional artifact link with my assigned counselor and program staff.</span></label>
            <Button label={workspace.submissions.length ? 'Submit a new version for review' : 'Submit evidence for review'} variant="primary" size="lg" isLoading={saving === 'submit'} isDisabled={Boolean(saving) || conflict || !share || !readyToSubmit || !canSubmitVersion} onClick={() => void persist('submit')} />
            <p className={styles.saveState}>Submission saves a fixed copy of the evidence shown here. You can keep editing a private draft afterward.</p></> : <p className={styles.notice}>{currentSubmission?.status === 'reviewed' ? 'Your submitted work has been reviewed. You can continue using this private draft for practice.' : 'Your submitted version is awaiting review. You can edit your private draft while you wait; those edits are not added to the submission.'} <a href="#lab-feedback" className="wa-kit-focus">View submission and feedback</a></p>}
          </div>
        </form>
      </section>
    </div>
    <section id="lab-feedback" className={styles.history} aria-labelledby="lab-feedback-title"><h2 id="lab-feedback-title">Submissions &amp; feedback</h2><p className={styles.muted}>Each submission keeps its evidence and review together. New drafts do not change earlier submissions.</p>{workspace.submissions.length ? workspace.submissions.map((submission) => <Submission key={submission.id} submission={submission} />) : <p className={styles.context}>Nothing has been submitted. Your saved draft stays private until you choose to share it for review.</p>}</section>
  </div></DesignSurface>;
}
