import { notFound } from 'next/navigation';
import { MemberJobsKit } from '@/components/portal/kit/pages/member/MemberJobsKit';

/**
 * Storybook-lite showcase — MemberJobsKit (populated pipeline + recommendations).
 * Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for the pattern.
 * Empty-state variant: app/dev/member/jobs-empty/page.tsx.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberJobsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberJobsKit
      saved={9}
      applied={4}
      interviewing={2}
      offers={1}
      syncedLabel="Synced 3m ago · 6 active applications"
      browseHref="#"
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
