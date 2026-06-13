import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';
import SkillCheckpointsClient from '@/components/portal/SkillCheckpointsClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('skillCheckpoints');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/dashboard/ai-tools/skill-checkpoints',
  });
}

export default async function SkillCheckpointsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/skill-checkpoints');

  return (
    <>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Skill Checkpoints"
            subtitle="Short workplace scenarios that prove you can use a skill — not just study it"
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Skill Checkpoints' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
          <SkillCheckpointsClient userId={user.id} />
        </div>
      </div>
    </>
  );
}
