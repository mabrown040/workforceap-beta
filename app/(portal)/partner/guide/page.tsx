import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';

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
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Referral guide</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.75rem' }}>
        Practical steps for {ctx.partner.name} staff when introducing candidates to WorkforceAP.
      </p>

      <ol style={{ lineHeight: 1.6, paddingLeft: '1.25rem', maxWidth: 720 }}>
        <li style={{ marginBottom: '1rem' }}>
          <strong>Confirm eligibility</strong> — Candidate is committed to training, can attend live or async sessions,
          and meets program prerequisites we publish on the public site.
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <strong>Point them to Apply</strong> — Direct applicants to{' '}
          <Link href="/apply" style={{ color: 'var(--color-accent)' }}>
            workforceap.org/apply
          </Link>
          . Ask them to list your organization when asked how they heard about us so the referral is attributed.
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <strong>Track in this portal</strong> — Referred members appear on your{' '}
          <Link href="/partner" style={{ color: 'var(--color-accent)' }}>
            dashboard
          </Link>{' '}
          with program progress and milestones. Open a member row for more detail.
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <strong>Stay in touch</strong> — Encourage members to complete readiness steps and certifications; celebrate
          placements when they reach hiring outcomes.
        </li>
      </ol>

      <p style={{ marginTop: '2rem', color: 'var(--color-gray-600)' }}>
        Questions? Contact WorkforceAP at{' '}
        <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)' }}>
          info@workforceap.org
        </a>
        .
      </p>
    </div>
  );
}
