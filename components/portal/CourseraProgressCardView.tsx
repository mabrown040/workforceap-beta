'use client';

import { useLocale, useTranslations } from 'next-intl';

export type CourseraProgressRow = {
  id: string;
  courseName: string;
  university: string | null;
  courseraCourseSlug: string | null;
  /** 0..100 (Decimal serialized as number on the wire). */
  overallProgress: number;
  /** Total learning hours so far. */
  learningHours: number;
  isCompleted: boolean;
  certificateUrl: string | null;
  /** ISO string — kept primitive so server -> client serialization is trivial. */
  lastActivityTime: string | null;
  /**
   * Pre-resolved org-scoped Coursera URL for the row's "View on Coursera"
   * button. Resolved server-side via `lib/coursera/orgScopedUrls` so the
   * client view doesn't need network or catalog access. Null when the
   * underlying row lacks the metadata to resolve a URL.
   */
  viewUrl?: string | null;
};

export type CourseraProgressCardViewProps = {
  rows: CourseraProgressRow[];
  /** Fallback URL when a course slug isn't known (typically the program home). */
  programHomeUrl: string | null;
  /** Used in the empty-state CTA. */
  launchUrl: string;
};

function formatRelative(locale: 'en' | 'es', iso: string | null): string {
  if (!iso) return locale === 'es' ? 'sin actividad' : 'no activity yet';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return locale === 'es' ? 'sin actividad' : 'no activity yet';
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 30) {
    const months = Math.floor(day / 30);
    return locale === 'es'
      ? `hace ${months} mes${months === 1 ? '' : 'es'}`
      : `${months} month${months === 1 ? '' : 's'} ago`;
  }
  if (day >= 1) {
    return locale === 'es'
      ? `hace ${day} día${day === 1 ? '' : 's'}`
      : `${day} day${day === 1 ? '' : 's'} ago`;
  }
  if (hr >= 1) {
    return locale === 'es'
      ? `hace ${hr} hora${hr === 1 ? '' : 's'}`
      : `${hr} hour${hr === 1 ? '' : 's'} ago`;
  }
  if (min >= 1) {
    return locale === 'es'
      ? `hace ${min} min`
      : `${min} min ago`;
  }
  return locale === 'es' ? 'hace instantes' : 'just now';
}

/**
 * Picks the "View on Coursera" target for a row.
 *
 * Prefers the server-resolved org-scoped URL (`viewUrl`) so members land
 * inside their Coursera For Business program shell rather than the public
 * catalog. Falls back to the program home URL when no per-course resolution
 * was possible.
 */
function buildCourseLink(
  viewUrl: string | null | undefined,
  fallback: string | null,
): string | null {
  if (viewUrl && viewUrl.trim()) return viewUrl;
  return fallback;
}

export default function CourseraProgressCardView({
  rows,
  programHomeUrl,
  launchUrl,
}: CourseraProgressCardViewProps) {
  const rawLocale = useLocale();
  const locale = rawLocale === 'es' ? 'es' : 'en';
  const t = useTranslations('courseraProgress');

  const title = t('title');

  if (rows.length === 0) {
    return (
      <section
        className="portal-card portal-card--flat"
        style={{ borderLeft: '4px solid var(--color-blue)' }}
      >
        <div className="portal-card__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--color-blue)', '--ms-fill': 1 } as React.CSSProperties}
              aria-hidden
            >
              school
            </span>
            <h2 className="portal-section-heading" style={{ margin: 0, fontSize: '1rem' }}>
              {title}
            </h2>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.875rem', lineHeight: 1.6 }}>
            {t('empty')}
          </p>
          <a
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-small"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }} aria-hidden>
              open_in_new
            </span>
            {t('launch')}
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="portal-card portal-card--flat" style={{ borderLeft: '4px solid var(--color-blue)' }}>
      <div className="portal-card__body">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '0.875rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--color-blue)', '--ms-fill': 1 } as React.CSSProperties}
              aria-hidden
            >
              school
            </span>
            <h2 className="portal-section-heading" style={{ margin: 0, fontSize: '1rem' }}>
              {title}
            </h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            {rows.length} {t('courses')}
          </span>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
          {rows.map((row) => {
            const pct = Math.max(0, Math.min(100, Math.round(row.overallProgress)));
            const link = buildCourseLink(row.viewUrl ?? null, programHomeUrl);
            return (
              <li
                key={row.id}
                style={{
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '0.65rem',
                  padding: '0.75rem 0.85rem',
                  background: 'var(--surface-container-low)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.4rem',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
                    <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{row.courseName}</div>
                    {row.university ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                        {row.university}
                      </div>
                    ) : null}
                  </div>
                  {row.isCompleted ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: 'rgb(22, 163, 74)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }} aria-hidden>
                        check_circle
                      </span>
                      {t('completed')}
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    height: '6px',
                    background: 'var(--surface-container-highest)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '0.4rem',
                  }}
                  aria-hidden
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: row.isCompleted ? 'var(--color-green, rgb(22, 163, 74))' : 'var(--color-blue)',
                      borderRadius: '999px',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    fontSize: '0.8rem',
                    color: 'var(--color-on-surface-variant)',
                  }}
                >
                  <span>
                    <strong style={{ color: 'var(--color-on-surface)' }}>{pct}%</strong> ·{' '}
                    {row.learningHours.toFixed(1)} {t('hours')}
                  </span>
                  <span>{formatRelative(locale, row.lastActivityTime)}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.55rem' }}>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-small"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
                        open_in_new
                      </span>
                      {t('viewOnCoursera')}
                    </a>
                  ) : null}
                  {row.isCompleted && row.certificateUrl ? (
                    <a
                      href={row.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-small"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
                        workspace_premium
                      </span>
                      {t('viewCertificate')}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
