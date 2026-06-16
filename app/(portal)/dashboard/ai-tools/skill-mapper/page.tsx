import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

const SkillMapperClient = dynamic(() => import('@/components/portal/tools/SkillMapperClient'), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="portal-card portal-card--flat"
      style={{
        padding: '2.5rem 1.25rem',
        borderRadius: 12,
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      Loading Skill Mapper…
    </div>
  ),
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('skillMapperMetaTitle'),
    description: t('skillMapperMetaDesc'),
    path: '/dashboard/ai-tools/skill-mapper',
  });
}

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

        <div className="skill-mapper-page-shell" style={{ maxWidth: 900, margin: '0 auto', padding: '1rem 1.5rem 2rem' }}>
          <div className="portal-card portal-card--flat skill-mapper-card" style={{ padding: '1rem', borderRadius: 12 }}>
            <SkillMapperClient />
          </div>
          <ToolHistoryPanel
            userId={user.id}
            toolType="skill_assessment"
            title="Recent Skill Mapper Lookups"
          />
        </div>      </div>
      </div>
    </>
  );
}
