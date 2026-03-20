import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';

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
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Messages</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Need help? Contact the WorkforceAP team.
      </p>
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
