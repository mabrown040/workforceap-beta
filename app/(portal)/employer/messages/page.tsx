import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Messages',
  description: 'Contact admin.',
  path: '/employer/messages',
});

const ADMIN_EMAIL = 'info@workforceap.org';

export default async function EmployerMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/messages');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const mailto = `mailto:${ADMIN_EMAIL}?subject=WorkforceAP Employer Inquiry - ${encodeURIComponent(ctx.employer.companyName)}`;

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Need help? Contact the WorkforceAP team."
      />
      <div
        style={{
          padding: '1.5rem',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-light)',
        }}
      >
        <p style={{ marginBottom: '1rem' }}>
          For questions about job postings, applications, or candidate matches, email us directly. Your message will
          include your company context.
        </p>
        <a href={mailto} className="btn btn-primary">
          Message Admin
        </a>
      </div>
    </div>
  );
}
