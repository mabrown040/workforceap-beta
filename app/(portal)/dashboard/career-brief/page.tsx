import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefs } from '@/lib/content/careerBriefs';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import CareerBriefList from '@/components/portal/CareerBriefList';
import CareerBriefForYou from '@/components/portal/CareerBriefForYou';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Weekly Career Brief',
  description: 'Weekly guidance and opportunity updates for WorkforceAP members.',
  path: '/dashboard/career-brief',
});

export default async function CareerBriefPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-brief');

  const [briefs, context] = await Promise.all([
    Promise.resolve(getCareerBriefs()),
    getCareerBriefContext(user.id),
  ]);

  const { recommendedActions, jobSearchUrl, location, programShortLabel, applicationsCount } = context;
  const hasPersonalized = !!(location || programShortLabel || applicationsCount > 0 || jobSearchUrl || recommendedActions.length > 0);

  return (
    <>
      <div style={{ paddingBottom: '5rem' }}>
        <PageHeader
          title="Career Brief"
          subtitle="Weekly guidance, opportunities, and personalized next actions."
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Career Brief' }]}
          action={
            <Link href="/dashboard/weekly-recap" className="btn btn-outline btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>event_note</span>
              Weekly Recap
            </Link>
          }
        />

        {/* Personalized for you — shown prominently when data exists */}
        {hasPersonalized && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>person_pin</span>
              <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Personalized for You
              </h2>
            </div>
            <CareerBriefForYou context={context} />
          </div>
        )}

        {/* Quick links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'AI Career Tools', href: '/dashboard/ai-tools', icon: 'auto_awesome' },
            { label: 'WIOA Screening', href: '/dashboard/learning/wioa-qualification', icon: 'policy' },
            { label: 'Job Readiness', href: '/dashboard/readiness', icon: 'checklist' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="portal-quick-action-item"
              style={{ textDecoration: 'none', flex: '0 0 auto', padding: '0.5rem 0.875rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>{link.icon}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Brief archive */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>article</span>
            <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Weekly Briefs
            </h2>
          </div>
          <CareerBriefList briefs={briefs} />
        </div>
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
