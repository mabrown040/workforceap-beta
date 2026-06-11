import RequestHelpButton from '@/components/portal/RequestHelpButton';
import MemberFeedbackButton from '@/components/portal/MemberFeedbackButton';
import type { DashboardTranslator } from './types';

/* Quick Actions 2x2 (mobile) - extracted verbatim from page.tsx. */
export default function MobileQuickActions({ t }: { t: DashboardTranslator }) {
  return (
        <section aria-label="Quick actions" style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
          <div className="portal-dash-section-header">
            <h3 className="portal-dash-section-header__title">{t('quickActions')}</h3>
          </div>
          <div className="portal-quick-grid-2x2">
            {([
              { icon: 'school', label: t('myTrainingMetricLabel'), href: '/dashboard/learning' },
              { icon: 'upload_file', label: t('uploadResume'), href: '/dashboard/ai-tools/resume-studio?view=rewrite' },
              { icon: 'forum', label: t('interviewPrep'), href: '/dashboard/ai-tools/interview-practice' },
              { icon: 'auto_awesome', label: t('aiTools'), href: '/dashboard/ai-tools' },
            ] as const).map((action) => (
              <a key={action.label} href={action.href} className="portal-quick-grid-item">
                <div className="portal-quick-grid-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{action.icon}</span>
                </div>
                <span className="portal-quick-grid-item__label">{action.label}</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <RequestHelpButton />
            <MemberFeedbackButton />
          </div>
        </section>
  );
}
