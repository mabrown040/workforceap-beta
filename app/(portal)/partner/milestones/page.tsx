import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMilestonesView from '@/components/partner/PartnerMilestonesView';
import PartnerMilestonesMobile from '@/components/partner/PartnerMilestonesMobile';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Milestones',
  description: 'Certifications, placements, and activity for your referrals.',
  path: '/partner/milestones',
});

export default async function PartnerMilestonesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/milestones');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <>
      {/* ── MOBILE SECTION ── */}
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem' }}>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: '#8c0f37', marginBottom: '0.125rem' }}>Partner Portal</p>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#1c1b1b' }}>Milestones</h1>
          <p className="text-sm" style={{ color: '#584144', marginTop: '0.25rem' }}>Review member certifications, placements, and progress events.</p>
        </div>

        <PartnerMilestonesMobile />
        <MobileBottomNav variant="portal" />
      </div>

      {/* ── DESKTOP SECTION ── */}
      <div className="wa-hidden wa-md:wa-block">
        <PageHeader
          title="Milestones"
          subtitle="Recent certifications, placements, and milestone events across your referrals."
        />
        <PartnerMilestonesView />
      </div>
    </>
  );
}
