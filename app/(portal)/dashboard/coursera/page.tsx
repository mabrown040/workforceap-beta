import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { ExternalLink } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';

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
    <>
    <div className="portal-main-content">
      <PageHeader
        title="Coursera & course access"
        subtitle="Your assigned courses will appear here as we finish connecting your account."
      />

      <div className="content-card coursera-panel">
        <h3 className="coursera-panel__title">Enterprise course access</h3>

        {enrolledProgram ? (
          <div>
            <p className="coursera-enrolled-lead">
              You&apos;re enrolled in: <strong>{enrolledProgram}</strong>
            </p>

            <div className="coursera-callout">
              <h4 className="coursera-callout__title">In-app access is almost here</h4>
              <p className="coursera-callout__text">
                We&apos;re finalizing Coursera Enterprise integration. Once your license is active, you&apos;ll open assigned
                courses from this page without juggling separate logins, and progress will stay aligned with your WorkforceAP
                dashboard.
              </p>
              <ul className="coursera-callout__list">
                <li>Open assigned courses from your portal</li>
                <li>Track progress alongside your program milestones</li>
                <li>Complete certificates in one place</li>
              </ul>
            </div>

            <a
              href="https://www.coursera.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary coursera-btn-external"
            >
              Open Coursera
              <ExternalLink size={16} aria-hidden />
            </a>
            <p className="coursera-footnote">
              Until in-app access is enabled, use Coursera directly with the login information your counselor provides.
            </p>
          </div>
        ) : (
          <div>
            <p className="coursera-empty-lead">
              You aren&apos;t enrolled in a program yet. Once you&apos;re enrolled and courses are assigned, they&apos;ll show
              up here.
            </p>
            <Link href="/dashboard/program" className="btn btn-primary">
              View my program
            </Link>
          </div>
        )}
      </div>

      <p className="coursera-footer-note">
        Questions? Email <a href="mailto:info@workforceap.org">info@workforceap.org</a> or message your counselor from{' '}
        <Link href="/dashboard/messages">Messages</Link>.
      </p>
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
