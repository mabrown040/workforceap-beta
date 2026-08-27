import { notFound } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
import { MemberJobsBoard } from '@/components/portal/kit/pages/member/MemberJobsBoard';
import { MemberJobsKit } from '@/components/portal/kit/pages/member/MemberJobsKit';
import { MemberJobDetail } from '@/components/portal/kit/pages/member/MemberJobDetail';
import JobsListingClient from '@/app/(portal)/dashboard/jobs/JobsListingClient';
import MobileApplyFunnel from '@/app/(portal)/dashboard/jobs/[id]/MobileApplyFunnel';
import JobTailorPanel, { JOB_TAILOR_PREVIEW_RESULT } from '@/components/portal/JobTailorPanel';

/**
 * Storybook-lite showcase — MemberJobsKit (populated pipeline + recommendations).
 * Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for the pattern.
 * Empty-state variant: app/dev/member/jobs-empty/page.tsx.
 *   /dev/member/jobs               — tracked pipeline
 *   /dev/member/jobs?state=board   — open-roles board (PageOpener + kit rows)
 *   /dev/member/jobs?state=listing — live JobsListingClient on kit JobListingRow
 *   /dev/member/jobs?state=detail  — live job detail chrome (PageOpener + kit cards + tailor)
 */
export const dynamic = 'force-dynamic';

const LISTING_JOBS = [
  {
    id: 'j1',
    title: 'Cloud Support Engineer',
    location: 'Austin, TX',
    locationType: 'onsite',
    jobType: 'fulltime',
    salaryMin: 58000,
    salaryMax: 72000,
    employer: { companyName: 'Deloitte', logoUrl: null },
  },
  {
    id: 'j2',
    title: 'Junior Salesforce Consultant',
    location: 'Remote',
    locationType: 'remote',
    jobType: 'fulltime',
    salaryMin: 54000,
    salaryMax: 66000,
    employer: { companyName: 'Accenture', logoUrl: null },
  },
  {
    id: 'j3',
    title: 'Technical Support Associate',
    location: 'Austin, TX',
    locationType: 'onsite',
    jobType: 'fulltime',
    salaryMin: 46000,
    salaryMax: 52000,
    employer: { companyName: 'Tesla', logoUrl: null },
  },
  {
    id: 'j4',
    title: 'IT Support Specialist',
    location: 'Austin, TX',
    locationType: 'hybrid',
    jobType: 'fulltime',
    salaryMin: 48000,
    salaryMax: 55000,
    employer: { companyName: 'HEB', logoUrl: null },
  },
];

export default async function DevMemberJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  if (state === 'board') {
    return (
      <MemberJobsBoard
        pipelineHref="/dev/member/jobs"
        jobs={[
          { id: 'j1', title: 'Cloud Support Engineer', company: 'Deloitte', location: 'Austin, TX', meta: 'Full-time · $58k–72k', match: '92% match', applied: true, href: '/dev/member/jobs?state=detail' },
          { id: 'j2', title: 'Junior Salesforce Consultant', company: 'Accenture', location: 'Remote', meta: 'Full-time · $54k–66k', match: '87% match', href: '/dev/member/jobs?state=detail' },
          { id: 'j3', title: 'Technical Support Associate', company: 'Tesla', location: 'Austin, TX', meta: 'Full-time · $46k–52k', match: '74% match', href: '/dev/member/jobs?state=detail' },
          { id: 'j4', title: 'IT Support Specialist', company: 'HEB', location: 'Austin, TX', meta: 'Full-time · $48k–55k', href: '/dev/member/jobs?state=detail' },
        ]}
      />
    );
  }
  if (state === 'listing') {
    return (
      <DesignSurface surface="warm">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
          <PageOpener
            kicker="Job search"
            title="Open roles"
            lede="Hiring-partner openings. Track applications from the pipeline."
            icon={<Briefcase size={13} aria-hidden="true" />}
          />
          <JobsListingClient
            preview
            isAuthenticated
            initialJobs={LISTING_JOBS}
            initialTotal={LISTING_JOBS.length}
            appliedJobIds={['j1']}
            initialSavedJobIds={['j2']}
            initialMatchedJobs={[
              { id: 'j1', title: 'Cloud Support Engineer', company: 'Deloitte', location: 'Austin, TX', locationType: 'onsite', matchPct: 92 },
              { id: 'j2', title: 'Junior Salesforce Consultant', company: 'Accenture', location: 'Remote', locationType: 'remote', matchPct: 87 },
              { id: 'j3', title: 'Technical Support Associate', company: 'Tesla', location: 'Austin, TX', locationType: 'onsite', matchPct: 74 },
            ]}
          />
        </div>
      </DesignSurface>
    );
  }
  if (state === 'detail') {
    return (
      <MemberJobDetail
        title="Cloud Support Engineer"
        company="Deloitte"
        location="Austin, TX"
        jobType="Full-time"
        salary="$58,000 – $72,000/yr"
        description={"Help members of Deloitte's cloud practice resolve tickets, document runbooks, and grow into a support engineer role.\n\nYou will work with senior engineers on AWS and Azure incidents, then own a small book of accounts."}
        requirements={[
          'Google IT Support or CompTIA A+ (or equivalent hands-on troubleshooting)',
          'Clear written English for tickets and runbooks',
          'Willingness to work a hybrid Austin schedule',
        ]}
        backHref="/dev/member/jobs?state=listing"
        screening={{
          packTitle: 'Cloud support screen',
          employerLabel: 'Deloitte',
          questions: [
            { id: 'q1', prompt: 'Walk through how you would triage a user who cannot connect to VPN.', type: 'scenario' },
            { id: 'q2', prompt: 'Which ticket fields do you fill in before escalating?', type: 'short_answer' },
          ],
        }}
        referral={{
          company: 'Deloitte',
          message:
            "Hi! I'm applying for the Cloud Support Engineer role at Deloitte and thought of you since you work there.\nI just completed IT Support training and would love any insight you can share, or an introduction to the right person.\nThanks so much! — Jordan",
          copySlot: <ProofCopy />,
        }}
        applySlot={
          <>
            <JobTailorPanel jobId="j1" preview initialResult={JOB_TAILOR_PREVIEW_RESULT} />
            <MobileApplyFunnel
              preview
              jobId="j1"
              authenticated
              jobTitle="Cloud Support Engineer"
              employerName="Deloitte"
              salaryLine="$58,000 – $72,000/yr"
              location="Austin, TX"
              jobType="Full-time"
            />
          </>
        }
      />
    );
  }

  return (
    <MemberJobsKit
      saved={9}
      applied={4}
      interviewing={2}
      offers={1}
      syncedLabel="Synced 3m ago · 6 active applications"
      browseHref="/dev/member/jobs?state=board"
      jobHref={() => '#'}
      applications={[
        { id: 'a1', role: 'Salesforce Administrator', company: 'Deloitte', location: 'Austin, TX', applied: 'Jun 12', stage: 'Interviewing', tone: 'warn' },
        { id: 'a2', role: 'Agentforce Solutions Engineer', company: 'Accenture', location: 'Remote', applied: 'Jun 14', stage: 'Applied', tone: 'muted' },
        { id: 'a3', role: 'Cloud Support Associate', company: 'Indeed', location: 'Austin, TX', applied: 'Jun 16', stage: 'Screening', tone: 'info' },
        { id: 'a4', role: 'Junior Cloud Engineer', company: 'Oracle', location: 'Austin, TX', applied: 'Jun 18', stage: 'Applied', tone: 'muted' },
        { id: 'a5', role: 'IT Support Specialist', company: 'Tesla', location: 'Austin, TX', applied: 'Jun 21', stage: 'Offer', tone: 'ok' },
        { id: 'a6', role: 'Business Systems Analyst', company: 'HEB', location: 'Austin, TX', applied: 'Jun 9', stage: 'Closed', tone: 'alert' },
      ]}
      recommended={[
        { id: 'r1', logo: 'DL', match: '92% match', title: 'Cloud Support Engineer', meta: 'Deloitte · Austin, TX · $58k–72k' },
        { id: 'r2', logo: 'AC', match: '87% match', title: 'Junior Salesforce Consultant', meta: 'Accenture · Remote · $54k–66k' },
        { id: 'r3', logo: 'TS', match: '74% match', title: 'Technical Support Associate', meta: 'Tesla · Austin, TX · $46k–52k' },
      ]}
    />
  );
}

function ProofCopy() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        padding: '10px 16px',
        background: 'transparent',
        color: 'var(--wa-accent)',
        border: '1px solid var(--wa-border)',
        fontWeight: 600,
        fontSize: 'var(--wa-type-body)',
        borderRadius: 999,
      }}
    >
      Copy message
    </span>
  );
}
