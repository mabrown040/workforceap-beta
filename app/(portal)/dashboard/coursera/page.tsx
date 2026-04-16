import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { buildPageMetadata } from '@/app/seo';
import { getCourseraReadiness } from '@/lib/coursera/config';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import CourseraSyncCard from '@/components/portal/CourseraSyncCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'Coursera courses',
  description: 'Launch Coursera courses, track your progress, and keep all your training in one place.',
  path: '/dashboard/coursera',
});

function statusLabel(ready: boolean, waitingText: string) {
  return ready ? 'Ready' : waitingText;
}

export default async function CourseraIntegrationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/coursera');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, coursesCompleted: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedSlugs = parseCourseSlugList(dbUser?.coursesCompleted);
  const completedCount = program
    ? completedSlugs.filter((slug) => program.courses.some((course) => course.slug === slug)).length
    : 0;
  const progressPct = program?.courses.length
    ? Math.round((completedCount / program.courses.length) * 100)
    : 0;
  const readiness = getCourseraReadiness(enrolledProgram);

  return (
    <>
      <div className="portal-main-content">
        <PageHeader
          title="Coursera & course access"
          subtitle="Launch Coursera courses, track your progress, and access all your training from one place."
        />

        {program ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div className="content-card">
                <p className="coursera-footnote" style={{ marginTop: 0, marginBottom: '0.35rem' }}>Program</p>
                <h3 className="coursera-panel__title" style={{ marginBottom: 0 }}>{program.title}</h3>
                <p className="coursera-footnote" style={{ marginBottom: 0 }}>{program.partner}</p>
              </div>
              <div className="content-card">
                <p className="coursera-footnote" style={{ marginTop: 0, marginBottom: '0.35rem' }}>Local progress</p>
                <h3 className="coursera-panel__title" style={{ marginBottom: '0.2rem' }}>{completedCount}/{program.courses.length} courses</h3>
                <p className="coursera-footnote" style={{ marginBottom: 0 }}>{progressPct}% tracked in WorkforceAP</p>
              </div>
              <div className="content-card">
                <p className="coursera-footnote" style={{ marginTop: 0, marginBottom: '0.35rem' }}>Connection status</p>
                <h3 className="coursera-panel__title" style={{ marginBottom: '0.2rem' }}>
                  {readiness.canLaunch || readiness.canSync || readiness.canReceiveWebhooks
                    ? 'Scaffolded'
                    : 'Waiting on setup'}
                </h3>
                <p className="coursera-footnote" style={{ marginBottom: 0 }}>
                  Launch, sync, and progress tracking are ready to connect.
                </p>
              </div>
            </div>

            <div className="content-card coursera-panel">
              <h3 className="coursera-panel__title">Your Coursera Courses</h3>
              <p className="coursera-enrolled-lead">
                You&apos;re enrolled in <strong>{program.title}</strong>. This page will be your one place to launch courses and track progress once setup is complete.
              </p>

              <div className="coursera-callout">
                <h4 className="coursera-callout__title">
                  {readiness.canLaunch || readiness.canSync || readiness.canReceiveWebhooks
                    ? 'Connection scaffold is ready'
                    : 'Almost ready'}
                </h4>
                <p className="coursera-callout__text">
                  You&apos;ll be able to launch Coursera courses from here and your progress will sync automatically. We&apos;re finishing the final setup steps on our end.
                </p>
                <ul className="coursera-callout__list">
                  <li>Launch from the portal: {statusLabel(readiness.canLaunch, 'waiting on launch mapping')}</li>
                  <li>Course progress sync: {statusLabel(readiness.canSync, 'waiting on API credentials')}</li>
                  <li>Completion webhook intake: {statusLabel(readiness.canReceiveWebhooks, 'waiting on secure secret')}</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <a href="/api/member/coursera/launch" className="btn btn-primary coursera-btn-external">
                  Launch Coursera
                  <ExternalLink size={16} aria-hidden />
                </a>
                <Link href="/dashboard/training" className="btn btn-outline">
                  Open training tracker
                </Link>
              </div>

              <CourseraSyncCard enabled={readiness.canSync} />

              <p className="coursera-footnote">
                Until setup is complete, the launch button opens the public Coursera site. Your counselor can also share direct access links.
              </p>
            </div>
          </>
        ) : (
          <div className="content-card coursera-panel">
            <h3 className="coursera-panel__title">Your Coursera Courses</h3>
            <p className="coursera-empty-lead">
              You aren&apos;t enrolled in a program yet. Once you&apos;re enrolled and courses are assigned, this page becomes your Coursera launch point and progress sync hub.
            </p>
            <Link href="/dashboard/program" className="btn btn-primary">
              View my program
            </Link>
          </div>
        )}

        <p className="coursera-footer-note">
          Questions? Email <a href="mailto:info@workforceap.org">info@workforceap.org</a> or message your counselor from{' '}
          <Link href="/dashboard/messages">Messages</Link>.
        </p>
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
