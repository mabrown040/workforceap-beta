import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';
import { getProgramBySlug } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Outcomes snapshot',
  description: 'High-level outcomes for your referrals.',
  path: '/partner/outcomes',
});

export default async function PartnerOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/outcomes');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const { members, pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);

  const placements = members.filter((m) => m.placementRecord).length;
  const certified = members.filter((m) => m.userCertifications.length > 0).length;
  const inTraining = pipelineMembers.filter(
    (p) => p.stage === 'in_training' || p.stage === 'certified'
  ).length;

  const completions = pipelineMembers.filter((p) => {
    const program = p.member.enrolledProgram ? getProgramBySlug(p.member.enrolledProgram) : null;
    const done = (p.member.coursesCompleted as string[] | null) ?? [];
    return !!(program?.courses.length && program.courses.every((c) => done.includes(c.slug)));
  }).length;

  return (
    <div>
      <PageHeader
        title="Outcomes snapshot"
        subtitle={`Quick counts for ${ctx.partner.name}. See the overview for journey detail.`}
        action={
          <Link href="/partner" className="btn btn-secondary btn-sm">
            Partner overview
          </Link>
        }
      />
      <div className="partner-outcomes-grid">
        <div className="partner-panel partner-outcome-card">
          <div className="partner-outcome-value partner-outcome-value--accent">{members.length}</div>
          <div className="partner-outcome-label">Total referrals</div>
        </div>
        <div className="partner-panel partner-outcome-card">
          <div className="partner-outcome-value">{placements}</div>
          <div className="partner-outcome-label">Placed</div>
        </div>
        <div className="partner-panel partner-outcome-card">
          <div className="partner-outcome-value">{certified}</div>
          <div className="partner-outcome-label">With certification</div>
        </div>
        <div className="partner-panel partner-outcome-card">
          <div className="partner-outcome-value">{inTraining}</div>
          <div className="partner-outcome-label">In training / certified stage</div>
        </div>
        <div className="partner-panel partner-outcome-card">
          <div className="partner-outcome-value">{completions}</div>
          <div className="partner-outcome-label">Program completions</div>
        </div>
      </div>
    </div>
  );
}
