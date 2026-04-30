import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import SkillMapperClient from '@/components/portal/tools/SkillMapperClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata: Metadata = buildPageMetadata({
  title: 'Skill Mapper',
  description: 'Explore occupation skills from O*NET. Visualize competency radar charts and top skills for any career path.',
  path: '/dashboard/ai-tools/skill-mapper',
});

export default async function SkillMapperPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/skill-mapper');

  return (
    <>
      <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1.25rem 2rem 1.5rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Skill Mapper"
            subtitle="Search any occupation to see its top skills and competency radar chart."
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Skill Mapper' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '1rem 1.5rem 2rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12 }}>
            <SkillMapperClient />
          </div>
          <ToolHistoryPanel
            userId={user.id}
            toolType="skill_assessment"
            title="Recent Skill Mapper Lookups"
          />
        </div>

        <MobileBottomNav variant="portal" />
      </div>
      </div>
    </>
  );
}
