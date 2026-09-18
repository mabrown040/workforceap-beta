import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { DesignSurface, PageOpener, StatusTag } from '@/components/portal/kit';
import WorkforceApLessonCtas from '@/components/portal/WorkforceApLessonCtas';
import WorkforceApModuleCompleteButton from '@/components/portal/WorkforceApModuleCompleteButton';
import { DIGITAL_LITERACY_MODULES, DIGITALLEARN_PROVIDER } from '@/shared/digitalLiteracyPathway';

/**
 * Preview of Dad's Digital Literacy Module 1 control: a big crimson
 * "Start this lesson" button, with Mark complete demoted.
 *   /dev/member/digital-literacy-module
 *   /dev/member/digital-literacy-module?module=file-management-basics
 */
export const dynamic = 'force-dynamic';

export default async function DevDigitalLiteracyModulePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { module: moduleKey } = await searchParams;
  const course = DIGITAL_LITERACY_MODULES.find((row) => row.key === moduleKey)
    ?? DIGITAL_LITERACY_MODULES[0];
  const lessonMinutes = course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <DesignSurface surface="warm">
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--wa-pad-sm)', paddingBottom: '5rem' }}>
        <PageOpener
          kicker={`${DIGITALLEARN_PROVIDER.name} module`}
          title={course.name}
          lede={course.summary}
          icon={<BookOpen size={14} aria-hidden="true" />}
          action={<StatusTag tone="warn">{lessonMinutes} min of lessons</StatusTag>}
        />
        <section className="wa-kit-card" style={{ marginTop: 24, padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Open course pages and materials</h2>
          <p style={{ margin: '8px 0 16px', color: 'var(--wa-muted)', lineHeight: 1.6 }}>
            These links open on {DIGITALLEARN_PROVIDER.name} in a new tab. Access is free and a provider account is optional.
            {' '}{DIGITALLEARN_PROVIDER.languageNote}
          </p>
          <WorkforceApLessonCtas lessons={course.lessons} />
        </section>
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <WorkforceApModuleCompleteButton
            courseSlug={course.key}
            programSlug="digital-literacy-empowerment-class"
            completed={false}
            appearance="secondary"
            label="Mark module complete in WorkforceAP"
          />
        </div>
      </main>
    </DesignSurface>
  );
}
