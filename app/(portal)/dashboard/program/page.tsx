import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import Footer from '@/components/Footer';
import ProgramPicker from '@/components/portal/ProgramPicker';
import { ProgramIcon } from '@/components/ProgramIcon';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Program',
  description: 'View or select your enrolled program.',
  path: '/dashboard/program',
});

export default async function ProgramPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/program');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, enrolledAt: true, coursesCompleted: true },
  });

  const enrolledSlug = dbUser?.enrolledProgram ?? null;
  const program = enrolledSlug ? getProgramBySlug(enrolledSlug) : null;
  const coursesCompleted = (dbUser?.coursesCompleted as string[] | null) ?? [];

  if (!enrolledSlug || !program) {
    return (
      <>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Choose Your Program</h1>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
          Select one program. This is a one-time choice — funding is tied to a single program enrollment.
        </p>
        <ProgramPicker programs={PROGRAMS} />
        <Footer />
      </>
    );
  }

  const completedSet = new Set(coursesCompleted);
  const completedCount = program.courses.filter((c) => completedSet.has(c.slug)).length;

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>My Program</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Enrolled {dbUser?.enrolledAt?.toLocaleDateString() ?? ''}
      </p>

      <div className="dashboard-program-detail" style={{ borderLeft: `4px solid ${program.borderColor}` }}>
        <div className="dashboard-program-detail-header">
          <span className="dashboard-program-detail-icon"><ProgramIcon program={program} size={28} /></span>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{program.title}</h2>
            <span
              style={{
                background: program.categoryColor,
                color: 'white',
                padding: '0.2rem 0.6rem',
                borderRadius: '50px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {program.categoryLabel}
            </span>
          </div>
        </div>
        <div className="dashboard-program-detail-meta">
          <span>⏱ {program.duration}</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{program.salary}</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
          Progress: {completedCount} of {program.courses.length} courses complete
        </p>
        <div style={{ height: '6px', background: '#e5e5e5', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${program.courses.length > 0 ? (completedCount / program.courses.length) * 100 : 0}%`,
              background: program.categoryColor,
              borderRadius: '3px',
            }}
          />
        </div>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Course list</h3>
        <ul className="dashboard-program-course-list">
          {program.courses.map((c) => {
            const done = completedSet.has(c.slug);
            return (
              <li key={c.slug}>
                <span>{c.name}</span>
                <span className={`dashboard-program-badge ${done ? 'complete' : 'pending'}`}>
                  {done ? 'Complete' : 'Not Started'}
                </span>
              </li>
            );
          })}
        </ul>
        <Link href="/dashboard/training" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Go to Training
        </Link>
      </div>
      <Footer />
    </>
  );
}
