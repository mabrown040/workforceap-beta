import Link from 'next/link';
import type { ApplicationStatusSummary, DashboardTranslator } from './types';

/* Primary Today card (mobile) when there is no dominant NBA — application next step. */
export default function MobilePriorityActionCard({
  t,
  applicationStatus,
  programTitle,
}: {
  t: DashboardTranslator;
  applicationStatus: ApplicationStatusSummary;
  programTitle: string | null;
}) {
  return (
    <section aria-label={t('todayFocus')} style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
      <div
        style={{
          borderRadius: 'var(--wa-radius)',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--wa-accent-dark), var(--wa-accent))',
          boxShadow: 'var(--wa-shadow-lg)',
        }}
      >
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  fontSize: 'var(--wa-type-meta)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'color-mix(in srgb, var(--wa-on-accent) 82%, transparent)',
                  margin: '0 0 0.35rem',
                }}
              >
                {t('todayFocus')}
              </p>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--wa-on-accent)', margin: 0, lineHeight: 1.3 }}>
                {applicationStatus.nextStep}
              </h2>
            </div>
            <span className="material-symbols-outlined wa-text-xl" style={{ color: 'var(--wa-gold)', '--ms-fill': 1 }} aria-hidden>
              bolt
            </span>
          </div>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'color-mix(in srgb, var(--wa-on-accent) 88%, transparent)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {t('priorityActionFor', { program: programTitle ?? applicationStatus.programInterest ?? t('yourProgramInline') })}
          </p>
          <Link
            href={applicationStatus.nextStepHref}
            style={{
              display: 'block',
              width: '100%',
              background: 'var(--wa-on-accent)',
              color: 'var(--wa-accent)',
              padding: '0.75rem',
              borderRadius: 'var(--wa-radius-sm)',
              textDecoration: 'none',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              minHeight: '44px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t('takeAction')}
          </Link>
        </div>
      </div>
    </section>
  );
}
