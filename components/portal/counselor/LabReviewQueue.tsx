'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/VStack';
import { DesignSurface, PageOpener, useAnnounce } from '@/components/portal/kit';
import type { LabReviewQueue as Queue, LabReviewStatus } from '@/lib/member/labWorkspaceTypes';
import styles from './labReviews.module.css';

export const LAB_REVIEW_LABELS: Record<LabReviewStatus, string> = {
  submitted: 'Awaiting review', revision_requested: 'Revision requested', reviewed: 'Evidence reviewed',
};
export function labReviewDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

export default function LabReviewQueue({ status }: { status: LabReviewStatus }) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const announce = useAnnounce();

  async function load(cursor?: string | null) {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ status });
      if (cursor) query.set('cursor', cursor);
      const response = await fetch(`/api/staff/lab-reviews?${query}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.items)) throw new Error(result.error ?? 'The review queue could not be loaded. Try again.');
      if (generation.current !== current) return;
      setQueue((previous) => ({ items: cursor ? [...(previous?.items ?? []), ...result.items].filter((item, index, all) => all.findIndex((other) => other.submissionId === item.submissionId) === index) : result.items, nextCursor: result.nextCursor }));
    } catch (failure) {
      if (generation.current !== current) return;
      const message = failure instanceof Error ? failure.message : 'The review queue could not be loaded. Try again.';
      setError(message); announce(message, 'assertive');
    } finally { if (generation.current === current) setLoading(false); }
  }
  // Route remounts on status changes. Invalidate an unfinished request on leave.
  useEffect(() => { void load(); return () => { generation.current++; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <DesignSurface surface="dense"><main className={styles.workspace}>
    <VStack gap={6}>
      <PageOpener kicker="Member learning" title="Lab reviews" lede="Turn submitted work into clear feedback and a useful next attempt." icon={<ClipboardCheck size={16} aria-hidden="true" />} />
      <nav aria-label="Lab review status" className={styles.tabs}>
        {(Object.keys(LAB_REVIEW_LABELS) as LabReviewStatus[]).map((value) => <Link key={value} href={`/counselor/lab-reviews?status=${value}`} aria-current={status === value ? 'page' : undefined} className="wa-kit-focus">{LAB_REVIEW_LABELS[value]}</Link>)}
      </nav>
      <p className={styles.muted}>Only work members chose to submit appears here. Review the supplied evidence against its saved rubric; private drafts stay with the member.</p>
      {error ? <VStack gap={3}><p className={styles.error}>{error}</p><Button label="Try loading again" onClick={() => void load(queue?.nextCursor)} isDisabled={loading} /></VStack> : null}
      {!queue && loading ? <p role="status">Loading submitted work…</p> : null}
      {queue?.items.length === 0 ? <section className={styles.panel}><VStack gap={2}><h2>{status === 'submitted' ? 'No lab work waiting for review' : `No work marked “${LAB_REVIEW_LABELS[status].toLowerCase()}”`}</h2><p className={styles.muted}>Submissions from your assigned members will appear here. Organization admins can also see work awaiting a counselor assignment.</p></VStack></section> : null}
      {queue?.items.length ? <ul className={styles.queue}>{queue.items.map((item) => <li key={item.submissionId}>
        <VStack gap={1}>
          <h2>{item.labTitle}</h2>
          <p>{item.member.displayName}</p>
          <p className={styles.meta}>Attempt {item.attempt} · Submitted {labReviewDate(item.submittedAt)}</p>
          {!item.reviewRouting.assignedCounselor ? <p className={styles.status}>Needs a counselor assignment · admin review available</p> : null}
        </VStack>
        <Link href={`/counselor/lab-reviews/${item.submissionId}`} className={`${styles.link} wa-kit-focus`}>{status === 'submitted' ? 'Review evidence' : 'View feedback'} <ArrowRight size={16} aria-hidden="true" /></Link>
      </li>)}</ul> : null}
      {queue?.nextCursor && !error ? <Button label="Load more submissions" onClick={() => void load(queue.nextCursor)} isLoading={loading} isDisabled={loading} /> : null}
    </VStack>
  </main></DesignSurface>;
}
