import type { ProgramCourse } from '@/lib/content/programs';

export type WorkforceApLesson = NonNullable<ProgramCourse['lessons']>[number];

const PRIMARY_LESSON_CTA_CLASS =
  'wa-kit-cta wa-kit-cta--xl wa-kit-cta--block wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none';

const SECONDARY_LESSON_CTA_CLASS =
  'wa-kit-cta wa-kit-cta--ghost wa-kit-cta--xl wa-kit-cta--block wa-kit-focus hover:wa-opacity-90 wa-transition-opacity wa-duration-150 motion-reduce:wa-transition-none';

export function lessonCtaLabel(index: number): string {
  return index === 0 ? 'Start this lesson' : 'Open this lesson';
}

export default function WorkforceApModuleLessons({
  lessons,
}: {
  lessons: readonly WorkforceApLesson[];
}) {
  return (
    <ol className="wa-kit-lesson-list">
      {lessons.map((lesson, index) => {
        const isFirst = index === 0;
        const label = lessonCtaLabel(index);
        return (
          <li key={`${lesson.title}-${lesson.url}`}>
            <p className="wa-kit-lesson-list__copy">
              {lesson.title}
              <span className="wa-kit-lesson-list__meta"> · {lesson.minutes} min</span>
            </p>
            {lesson.verificationLabel ? (
              <p className="wa-kit-lesson-list__note">{lesson.verificationLabel}</p>
            ) : null}
            <a
              href={lesson.url}
              target="_blank"
              rel="noopener noreferrer"
              className={isFirst ? PRIMARY_LESSON_CTA_CLASS : SECONDARY_LESSON_CTA_CLASS}
              aria-label={`${label}: ${lesson.title}`}
            >
              {label}
            </a>
            {lesson.fallbackUrl ? (
              <a
                href={lesson.fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="wa-kit-cta wa-kit-cta--ghost wa-kit-focus"
              >
                {lesson.fallbackLabel ?? 'Open provider materials fallback'}
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
