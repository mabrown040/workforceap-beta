import { notFound } from 'next/navigation';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import SkillMapperClient, {
  type SkillMapperPreviewSeed,
} from '@/components/portal/tools/SkillMapperClient';

/**
 * Credential-free proofs for Skill Mapper auto-compare.
 *   /dev/member/skill-mapper              — search form only
 *   /dev/member/skill-mapper?state=compared — first result + side-panel gap
 */
export const dynamic = 'force-dynamic';

const PREVIEW: SkillMapperPreviewSeed = {
  initialQuery: 'software developer',
  memberProfile: [
    { axis: 'Analytics', value: 0.42 },
    { axis: 'Engineering', value: 0.35 },
    { axis: 'Design', value: 0.28 },
    { axis: 'Strategy', value: 0.48 },
    { axis: 'Service', value: 0.55 },
    { axis: 'Research', value: 0.3 },
  ],
  occupations: [
    {
      code: '15-1252.00',
      title: 'Software Developers',
      description: 'Research, design, and develop software applications.',
    },
    {
      code: '15-1212.00',
      title: 'Information Security Analysts',
      description: 'Plan and carry out security measures to protect systems.',
    },
  ],
  detailsByCode: {
    '15-1252.00': {
      radar: [
        { axis: 'Analytics', value: 0.72 },
        { axis: 'Engineering', value: 0.85 },
        { axis: 'Design', value: 0.38 },
        { axis: 'Strategy', value: 0.44 },
        { axis: 'Service', value: 0.55 },
        { axis: 'Research', value: 0.61 },
      ],
      skills: [
        { name: 'Programming', score: 85, importance: 'High' },
        { name: 'Critical Thinking', score: 78, importance: 'High' },
        { name: 'Systems Analysis', score: 72, importance: 'High' },
      ],
    },
    '15-1212.00': {
      radar: [
        { axis: 'Analytics', value: 0.68 },
        { axis: 'Engineering', value: 0.74 },
        { axis: 'Design', value: 0.3 },
        { axis: 'Strategy', value: 0.52 },
        { axis: 'Service', value: 0.4 },
        { axis: 'Research', value: 0.66 },
      ],
      skills: [
        { name: 'Security Analysis', score: 88, importance: 'High' },
        { name: 'Systems Analysis', score: 80, importance: 'High' },
        { name: 'Critical Thinking', score: 76, importance: 'High' },
      ],
    },
  },
};

export default async function DevMemberSkillMapperPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const compared = state === 'compared';

  return (
    <DesignSurface surface="warm">
      <div className="skill-mapper-page-shell" style={{ maxWidth: 1120, margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
        <div className="wa-space-y-5" style={{ marginBottom: 20 }}>
          <SectionHeader
            kicker="Design preview"
            title="Skill Mapper"
            goal="Search an occupation to see its skills and how they compare to yours."
          />
        </div>
        <div className="wa-kit-card skill-mapper-card">
          <SkillMapperClient
            preview={{
              ...PREVIEW,
              autoCompare: compared,
            }}
          />
        </div>
      </div>
    </DesignSurface>
  );
}
