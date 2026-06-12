import Link from 'next/link';
import type { ApplicationStatusSummary, DashboardTranslator } from './types';

/* Priority next-step card (mobile) - extracted verbatim from page.tsx.
   Rendered there only when there is no dominant next action and the
   application status has a next step. */
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
          <section aria-label="Priority action" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ borderRadius: '1rem', overflow: 'hidden', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.82)', margin: '0 0 0.35rem' }}>{t('priorityAction')}</p>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                      {applicationStatus.nextStep}
                    </h2>
                  </div>
                  <span className="material-symbols-outlined wa-text-xl" style={{ color: 'var(--color-gold)', '--ms-fill': 1 }} aria-hidden>bolt</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.88)', margin: 0, lineHeight: 1.5 }}>
                  {t('priorityActionFor', { program: programTitle ?? applicationStatus.programInterest ?? t('yourProgramInline') })}
                </p>
                <Link
                  href={applicationStatus.nextStepHref}
                  style={{ display: 'block', width: '100%', background: '#fff', color: 'var(--color-accent)', padding: '0.75rem', borderRadius: '0.625rem', textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', boxSizing: 'border-box', minHeight: '44px' }}
                >
                  {t('takeAction')}
                </Link>
              </div>
            </div>
          </section>
  );
}
