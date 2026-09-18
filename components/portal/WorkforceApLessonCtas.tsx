import { ExternalLink } from 'lucide-react';

export type WorkforceApLessonCta = {
  title: string;
  minutes: number;
  url: string;
  verificationLabel?: string;
  fallbackUrl?: string;
  fallbackLabel?: string;
};

const LESSON_CTA_CLASS =
  'wa-kit-cta wa-kit-cta--lg wa-kit-cta--block wa-kit-focus hover:wa-opacity-90 active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none';

const FALLBACK_CTA_CLASS =
  'wa-kit-cta wa-kit-cta--ghost wa-kit-cta--block wa-kit-focus hover:wa-opacity-90 wa-transition-opacity wa-duration-150 motion-reduce:wa-transition-none';

/**
 * Stacked crimson lesson buttons for WorkforceAP-authored modules.
 * Title and minutes stay supporting copy so the filled control is the thing
 * a non-computer-literate member can actually see.
 */
export default function WorkforceApLessonCtas({
  lessons,
}: {
  lessons: readonly WorkforceApLessonCta[];
}) {
  return (
    <ol className="wa-kit-lesson-ctas">
      {lessons.map((lesson, index) => {
        const isFirst = index === 0;
        const actionLabel = isFirst ? 'Start this lesson' : `Open ${lesson.title}`;
        return (
          <li key={`${lesson.title}-${lesson.url}`}>
            <p className="wa-kit-lesson-ctas__title">{lesson.title}</p>
            <p className="wa-kit-meta" style={{ margin: 0 }}>
              {lesson.minutes} min
              {lesson.verificationLabel ? ` · ${lesson.verificationLabel}` : ''}
            </p>
            <a
              href={lesson.url}
              target="_blank"
              rel="noopener noreferrer"
              className={LESSON_CTA_CLASS}
              aria-label={isFirst ? `Start this lesson: ${lesson.title}` : actionLabel}
            >
              {actionLabel}
              <ExternalLink size={18} aria-hidden="true" />
            </a>
            {lesson.fallbackUrl ? (
              <a
                href={lesson.fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={FALLBACK_CTA_CLASS}
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
