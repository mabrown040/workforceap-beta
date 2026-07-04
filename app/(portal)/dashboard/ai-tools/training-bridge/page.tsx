import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import TrainingBridgeClient, {
  type SavedAssessment,
} from '@/components/portal/TrainingBridgeClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('trainingBridge');
  return buildPageMetadataAsync({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/dashboard/ai-tools/training-bridge',
  });
}

/** Parse the most recent saved Skill Mapper run into the shape the client needs. */
function parseAssessment(row: { output: string; createdAt: Date } | null): SavedAssessment | null {
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.output) as {
      occupationTitle?: unknown;
      occupationCode?: unknown;
      skills?: unknown;
    };
    const skills = Array.isArray(parsed.skills)
      ? parsed.skills
          .filter(
            (s): s is { name: string; score?: number } =>
              !!s && typeof (s as { name?: unknown }).name === 'string'
          )
          .map((s) => ({ name: s.name, score: typeof s.score === 'number' ? s.score : undefined }))
      : [];
    if (skills.length === 0) return null;
    return {
      occupationTitle: typeof parsed.occupationTitle === 'string' ? parsed.occupationTitle : null,
      occupationCode: typeof parsed.occupationCode === 'string' ? parsed.occupationCode : null,
      skills,
      createdAt: row.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export default async function TrainingBridgePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/training-bridge');

  const t = await getTranslations('trainingBridge');

  let assessment: SavedAssessment | null = null;
  try {
    // Most recent Skill Mapper occupation lookup (skips Interest Profiler and
    // resume-extraction rows, which use other inputSummary prefixes).
    const row = await prisma.aIToolResult.findFirst({
      where: {
        userId: user.id,
        toolType: 'skill_assessment',
        inputSummary: { startsWith: 'Skill mapper lookup' },
      },
      orderBy: { createdAt: 'desc' },
      select: { output: true, createdAt: true },
    });
    assessment = parseAssessment(row);
  } catch (err) {
    console.error('[training-bridge page] assessment lookup failed', err);
  }

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title={t('title')}
            subtitle={t('subtitle')}
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: t('title') },
            ]}
            action={
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('betaTag')}
              </span>
            }
          />
        </div>

        <div style={{ padding: '1rem 1rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <TrainingBridgeClient assessment={assessment} />
        </div>
      </div>
    </div>
  );
}
