import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Employer screening',
  description: 'Optional employer-designed questions near the end of your program.',
  path: '/dashboard/program/employer-screening',
});

type Question = { id: string; prompt: string; type: 'short_text' | 'yes_no' };

export default async function EmployerScreeningMemberPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/program/employer-screening');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, coursesCompleted: true },
  });
  const slug = dbUser?.enrolledProgram;
  if (!slug) redirect('/dashboard/program');

  const program = getProgramBySlug(slug);
  const completed = parseCourseSlugList(dbUser.coursesCompleted);
  const total = program?.courses.length ?? 0;
  const done = program ? program.courses.filter((c) => completed.includes(c.slug)).length : 0;
  const nearComplete = total > 0 && done / total >= 0.85;

  const pack = await prisma.employerScreeningPack.findFirst({
    where: { programSlug: slug, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!pack) notFound();

  const questions = (pack.questionsJson as unknown) as Question[];
  if (!Array.isArray(questions)) notFound();

  return (
    <>
      <div className="portal-pad-x" style={{ paddingBottom: '6rem', maxWidth: 720 }}>
        <PageHeader
          title="Employer screening pack"
          subtitle={
            nearComplete
              ? `${pack.packTitle} — shared by ${pack.employerLabel}. This is informational for hiring pipelines; it does not replace counselor guidance.`
              : `This pack becomes relevant closer to program completion (${done}/${total} courses done). You can preview the questions now.`
          }
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'My Program', href: '/dashboard/program' },
            { label: 'Employer screening' },
          ]}
        />
        <ol style={{ margin: '1rem 0 0', paddingLeft: '1.1rem', display: 'grid', gap: '1rem' }}>
          {questions.map((q, i) => (
            <li key={q.id} style={{ lineHeight: 1.55 }}>
              <span style={{ fontWeight: 700 }}>{i + 1}. </span>
              {q.prompt}{' '}
              <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>({q.type.replace('_', ' ')})</span>
            </li>
          ))}
        </ol>
        <p style={{ margin: '1.25rem 0 0', fontSize: '0.88rem', color: 'var(--color-on-surface-variant)' }}>
          Your counselor may collect answers separately or add a digital form later — this page is the canonical list of what a partner employer asked us to surface.
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/dashboard/program/start" className="btn btn-outline">
            Back to Path to certification
          </Link>
        </div>
      </div>    </>
  );
}
