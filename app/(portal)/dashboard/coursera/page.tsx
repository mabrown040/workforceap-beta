import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { ExternalLink } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Coursera courses',
  description: 'Access your Coursera courses through WorkforceAP.',
  path: '/dashboard/coursera',
});

export default async function CourseraIntegrationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/coursera');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram;

  return (
    <div className="portal-main-content">
      <PageHeader
        title="Coursera & course access"
        subtitle="Your assigned courses will appear here as we finish connecting your account."
      />

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Enterprise course access</h3>

        {enrolledProgram ? (
          <div>
            <p style={{ color: 'var(--color-gray-700)', marginBottom: '1rem', lineHeight: 1.6 }}>
              You&apos;re enrolled in: <strong>{enrolledProgram}</strong>
            </p>

            <div
              style={{
                padding: '1.25rem',
                background: 'var(--color-light, #f8fafc)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border, #e5e7eb)',
                marginBottom: '1.25rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>
                In-app access is almost here
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-600)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                We&apos;re finalizing Coursera Enterprise integration. Once your license is active, you&apos;ll open assigned
                courses from this page without juggling separate logins, and progress will stay aligned with your WorkforceAP
                dashboard.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
                <li>Open assigned courses from your portal</li>
                <li>Track progress alongside your program milestones</li>
                <li>Complete certificates in one place</li>
              </ul>
            </div>

            <a
              href="https://www.coursera.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Open Coursera
              <ExternalLink size={16} aria-hidden />
            </a>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginTop: '0.75rem' }}>
              Until in-app access is enabled, use Coursera directly with the login information your counselor provides.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
              You aren&apos;t enrolled in a program yet. Once you&apos;re enrolled and courses are assigned, they&apos;ll show
              up here.
            </p>
            <Link href="/dashboard/program" className="btn btn-primary">
              View my program
            </Link>
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
        Questions? Email{' '}
        <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)' }}>
          info@workforceap.org
        </a>{' '}
        or message your counselor from{' '}
        <Link href="/dashboard/messages" style={{ color: 'var(--color-accent)' }}>
          Messages
        </Link>
        .
      </p>
    </div>
  );
}
