import { notFound } from 'next/navigation';
import { MemberCertificatesKit } from '@/components/portal/kit/pages/member/MemberCertificatesKit';

/**
 * Storybook-lite showcase — MemberCertificatesKit (earned + in-progress).
 * Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for the pattern.
 * Empty-state variant: app/dev/member/certificates-empty/page.tsx.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberCertificatesPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberCertificatesKit
      earnedCount={2}
      inProgressCount={2}
      verifiedCount={2}
      earned={[
        { id: 'aws-cp', title: 'AWS Cloud Practitioner', meta: 'Issued May 2026 · Credential ID AWS-CP-8841', verified: true, earnedAtIso: '2026-05-14' },
        { id: 'sf-adm', title: 'Salesforce Administrator', meta: 'Issued Mar 2026 · Credential ID SF-ADM-2207', verified: true, earnedAtIso: '2026-03-02' },
      ]}
      inProgress={[
        {
          id: 'aws-saa',
          title: 'AWS Solutions Architect Associate',
          percent: 47.2,
          note: 'Finish AWS Practitioner to unlock the voucher.',
        },
        {
          id: 'comptia-aplus',
          title: 'CompTIA A+',
          percent: 18,
          note: 'Core 1 hardware in progress.',
        },
      ]}
    />
  );
}
