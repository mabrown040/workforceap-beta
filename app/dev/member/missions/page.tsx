import { notFound } from 'next/navigation';
import { Target } from 'lucide-react';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { skillMissionEmptyState } from '@/lib/member/skillMissionEmptyState';

/**
 * Credential-free proofs for Skill Missions empty states + the superadmin
 * portal switcher that belongs in the member header.
 *   /dev/member/missions              — unenrolled ("Choose my program")
 *   /dev/member/missions?state=enrolled — enrolled program with no catalog missions
 */
export const dynamic = 'force-dynamic';

export default async function DevMemberMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();

  const { state } = await searchParams;
  const empty =
    state === 'enrolled'
      ? skillMissionEmptyState({
          programSlug: 'ai-professional-practitioner-certificate',
          programTitle: 'AI Professional Practitioner Certificate',
        })
      : skillMissionEmptyState({ programSlug: null, programTitle: null });

  return (
    <div className="portal-main-content">
      <header
        className="workspace-shell-header"
        style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="workspace-shell-header__brand">
          <span className="workspace-shell-brand">WorkforceAP</span>
        </div>
        <div className="workspace-shell-header__meta">
          <SuperAdminViewSwitcher initialIsSuperAdmin />
        </div>
      </header>
      <div style={{ padding: '1.5rem' }}>
        <PageHeader
          title="Skill Missions"
          subtitle="Pass a mission after each course for a resume bullet and a STAR story."
          breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Skill Missions' }]}
        />
        <PortalEmptyState
          icon={<Target size={32} aria-hidden="true" style={{ color: 'var(--color-accent)' }} />}
          title={empty.title}
          description={empty.description}
          primaryAction={empty.primaryAction}
        />
      </div>
    </div>
  );
}
