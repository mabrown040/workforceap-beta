import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import Link from 'next/link';

export const metadata: Metadata = buildPageMetadata({
  title: 'Company settings',
  description: 'Employer portal company settings.',
  path: '/employer/settings',
});

export default async function EmployerSettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/settings');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  return (
    <div>
      <PageHeader
        title="Company settings"
        subtitle={`Portal context: ${ctx.employer.companyName}. Deeper company profile editing ships in a follow-up; contact your WorkforceAP admin for account changes today.`}
      />
      <p style={{ color: 'var(--color-gray-600)', maxWidth: '640px', lineHeight: 1.6 }}>
        For email or contact updates, reach out via{' '}
        <Link href="/employer/messages" style={{ color: 'var(--color-accent)' }}>
          Messages / support
        </Link>{' '}
        or <a href="mailto:info@workforceap.org">info@workforceap.org</a>.
      </p>
    </div>
  );
}
