import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner referral guide',
  description: 'How to refer members and track progress in the partner portal.',
  path: '/partner/guide',
});

export default async function PartnerGuidePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/guide');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <div>
      <PageHeader
        title="Referral guide"
        subtitle={`Practical steps for ${ctx.partner.name} staff when introducing candidates to WorkforceAP.`}
      />

      <ol className="partner-guide-steps">
        <li>
          <strong>Confirm eligibility</strong> — Candidate is committed to training, can attend live or async sessions,
          and meets program prerequisites we publish on the public site.
        </li>
        <li>
          <strong>Point them to Apply</strong> — Direct applicants to{' '}
          <Link href="/apply" style={{ color: 'var(--color-accent)' }}>
            workforceap.org/apply
          </Link>
          . Ask them to list your organization when asked how they heard about us so the referral is attributed.
        </li>
        <li>
          <strong>Track in this portal</strong> — Referred members appear on your{' '}
          <Link href="/partner" style={{ color: 'var(--color-accent)' }}>
            dashboard
          </Link>{' '}
          with program progress and milestones. Open a member row for more detail.
        </li>
        <li>
          <strong>Stay in touch</strong> — Encourage members to complete readiness steps and certifications; celebrate
          placements when they reach hiring outcomes.
        </li>
      </ol>

      <p className="partner-guide-note">
        Questions? Contact WorkforceAP at{' '}
        <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)' }}>
          info@workforceap.org
        </a>
        .
      </p>
    </div>
  );
}
