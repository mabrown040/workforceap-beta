import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';
import TrackedCourseraLaunchLink from '@/components/portal/TrackedCourseraLaunchLink';
import { buildPageMetadataAsync } from '@/app/seo';
import { getCourseraReadiness } from '@/lib/coursera/config';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import CourseraSyncCard from '@/components/portal/CourseraSyncCard';
import SkillsetProgressList from '@/components/portal/SkillsetProgressList';
import { loadMemberSkillsetProgress } from '@/lib/coursera/memberSkillsetProgress';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Coursera courses',
  description: 'Launch Coursera courses, track your progress, and keep all your training in one place.',
  path: '/dashboard/coursera',
});
}

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
  const trainingView =
    enrolledProgram && program
      ? await loadMemberProgramTrainingView({
          userId: user.id,
          programSlug: enrolledProgram,
          coursesCompletedJson: dbUser?.coursesCompleted,
        })
      : null;
  const completedCount = trainingView?.completedCount ?? 0;
  const progressPct =
    trainingView?.progressPercentDisplay ??
    (program?.courses.length
      ? Math.round((completedCount / program.courses.length) * 100)
      : 0);
  const readiness = getCourseraReadiness(enrolledProgram);
  const skillsetProgress = await loadMemberSkillsetProgress(user.id);

  const doneSlugsSet = new Set(trainingView?.completedSlugsAuthoritative ?? []);
  const orderedIncompleteCourses = program?.courses.filter((c) => !doneSlugsSet.has(c.slug)) ?? [];

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
                <p className="coursera-footnote" style={{ marginTop: 0, marginBottom: '0.35rem' }}>Progress</p>
                <h3 className="coursera-panel__title" style={{ marginBottom: '0.2rem' }}>{completedCount}/{program.courses.length} courses</h3>
                <p className="coursera-footnote" style={{ marginBottom: 0 }}>{progressPct}% complete</p>
              </div>
              <div className="content-card">
                <p className="coursera-footnote" style={{ marginTop: 0, marginBottom: '0.35rem' }}>Current course</p>
                <h3 className="coursera-panel__title" style={{ marginBottom: '0.2rem' }}>
                  {completedCount < program.courses.length
                    ? program.courses[completedCount]?.name ?? 'Next course'
                    : 'All courses complete'}
                </h3>
                <p className="coursera-footnote" style={{ marginBottom: 0 }}>
                  {completedCount < program.courses.length
                    ? `Course ${completedCount + 1} of ${program.courses.length}`
                    : 'Full library unlocked'}
                </p>
              </div>
            </div>

            <div className="content-card coursera-panel">
              <h3 className="coursera-panel__title">Your Coursera Courses</h3>
              <p className="coursera-enrolled-lead">
                You&rsquo;re enrolled in <strong>{program.title}</strong>. Launch directly into your assigned course below.
              </p>

              {/* Course pathway list */}
              <div style={{ marginBottom: '1rem' }}>
                {program.courses.map((course) => {
                  const done = doneSlugsSet.has(course.slug);
                  const currentSlug = orderedIncompleteCourses[0]?.slug ?? null;
                  const current = course.slug === currentSlug;
                  const locked = !done && !current;
                  return (
                    <div
                      key={course.slug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.5rem',
                        marginBottom: '0.375rem',
                        background: current
                          ? 'rgba(173,44,77,0.08)'
                          : done
                            ? 'rgba(74,155,79,0.06)'
                            : 'var(--surface-container-lowest)',
                        border: current ? '1px solid rgba(173,44,77,0.2)' : '1px solid var(--outline-variant)',
                        opacity: locked ? 0.5 : 1,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '1.125rem',
                          color: done ? 'var(--color-green)' : current ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                          fontVariationSettings: done ? "'FILL' 1" : undefined,
                        }}
                      >
                        {done ? 'check_circle' : current ? 'play_circle' : 'lock'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: current ? 700 : 600, fontSize: '0.875rem', margin: 0, color: 'var(--color-on-surface)' }}>
                          {course.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                          {done ? 'Completed' : current ? 'Current course — click Launch to start' : locked ? 'Locked — complete previous courses first' : ''}
                        </p>
                      </div>
                      {current && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(173,44,77,0.12)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                          NOW
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="coursera-callout">
                <h4 className="coursera-callout__title">
                  {readiness.canDeepLink
                    ? 'Direct course access is configured'
                    : readiness.canLaunch
                      ? 'Launch configured — course deep-linking pending'
                      : 'Launch setup pending'}
                </h4>
                <p className="coursera-callout__text">
                  {readiness.canDeepLink
                    ? 'You will be taken directly to your current course. Complete it to unlock the next one. The full library becomes available after you finish all assigned courses.'
                    : 'You will be taken to your program page on Coursera. Course-by-course deep-linking will be enabled once course IDs are mapped.'}
                </p>
                <ul className="coursera-callout__list">
                  <li>Launch from portal: {statusLabel(readiness.canLaunch, 'waiting on launch mapping')}</li>
                  <li>Course deep-linking: {statusLabel(readiness.canDeepLink, 'waiting on course ID mapping')}</li>
                  <li>Course progress sync: {statusLabel(readiness.canSync, 'waiting on API credentials')}</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                {completedCount >= program.courses.length && (
                  <div
                    style={{
                      width: '100%',
                      background: 'rgba(74,155,79,0.08)',
                      border: '1px solid rgba(74,155,79,0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.875rem 1rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-green)', '--ms-fill': 1 }}>
                        workspace_premium
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>All courses complete</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                      Certificates from completed courses sync automatically to your profile. View them in <Link href="/dashboard/certifications" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>My Certificates</Link>. Official PDFs are issued by Coursera and must be downloaded from their platform.
                    </p>
                  </div>
                )}
                <TrackedCourseraLaunchLink
                  href="/api/member/coursera/launch"
                  className="btn btn-primary coursera-btn-external"
                  courseSlug={orderedIncompleteCourses[0]?.slug}
                >
                  {completedCount < program.courses.length ? 'Launch Current Course' : 'Launch Coursera Library'}
                  <ExternalLink size={16} aria-hidden />
                </TrackedCourseraLaunchLink>
                <Link href="/dashboard/training" className="btn btn-outline">
                  Open training tracker
                </Link>
              </div>

              <CourseraSyncCard enabled={readiness.canSync} />

              <SkillsetProgressList
                rows={skillsetProgress}
                variant="member"
                emptyHint={
                  readiness.canSync
                    ? 'Skillset progress will appear here once your first sync runs (every 6 hours).'
                    : undefined
                }
              />

              <p className="coursera-footnote">
                {readiness.canDeepLink
                  ? 'Clicking Launch takes you directly to your current course. Complete it before moving on.'
                  : 'Until deep-linking is configured, the launch button opens your program page. Your counselor can share direct links if needed.'}
              </p>
            </div>
          </>
        ) : (
          <div className="content-card coursera-panel">
            <h3 className="coursera-panel__title">Your Coursera Courses</h3>
            <p className="coursera-empty-lead">
              You aren&rsquo;t enrolled in a program yet. Once you&rsquo;re enrolled and courses are assigned, this page becomes your Coursera launch point and progress sync hub.
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
