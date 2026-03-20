import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import TrainingCourseList from '@/components/portal/TrainingCourseList';

export const metadata: Metadata = buildPageMetadata({
  title: 'Training',
  description: 'Access your Coursera courses.',
  path: '/dashboard/training',
});

export default async function TrainingPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/training');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      assessmentCompleted: true,
      coursesCompleted: true,
    },
  });

  if (!dbUser?.enrolledProgram) {
    redirect('/dashboard/program');
  }

  if (!dbUser.assessmentCompleted) {
    redirect('/dashboard/assessment?redirect=/dashboard/training');
  }

  const program = getProgramBySlug(dbUser.enrolledProgram);
  if (!program) redirect('/dashboard/program');

  const coursesCompleted = (dbUser.coursesCompleted as string[] | null) ?? [];
  const completedSet = new Set(coursesCompleted);
  const completedCount = program.courses.filter((c) => completedSet.has(c.slug)).length;

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Training</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
        {program.title} — Coursera
      </p>
      <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        {completedCount} of {program.courses.length} courses complete
      </p>
      <div style={{ height: '8px', background: '#e5e5e5', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${program.courses.length > 0 ? (completedCount / program.courses.length) * 100 : 0}%`,
            background: 'var(--color-accent)',
            borderRadius: '4px',
          }}
        />
      </div>
      <TrainingCourseList
        courses={program.courses}
        completedSlugs={coursesCompleted}
      />
    </>
  );
}
