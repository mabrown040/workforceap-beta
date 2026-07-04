'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  TRAINING_BRIDGE_OCCUPATIONS,
  computeBridgeGap,
  findBridgeOccupation,
  getBridgeOccupationById,
  getBridgeProgram,
  type BridgeSkill,
  type MemberSkill,
} from '@/lib/content/trainingBridge';

export type SavedAssessment = {
  occupationTitle: string | null;
  occupationCode: string | null;
  skills: MemberSkill[];
  createdAt: string;
};

type Props = {
  /** Most recent saved Skill Mapper run, or null when the member has none. */
  assessment: SavedAssessment | null;
};

function SkillChips({ skills, tone }: { skills: BridgeSkill[]; tone: 'missing' | 'have' | 'covers' }) {
  const palette =
    tone === 'missing'
      ? { background: 'rgba(173,44,77,0.10)', color: 'var(--color-accent)' }
      : tone === 'have'
        ? { background: 'rgba(46,125,50,0.12)', color: 'var(--color-green)' }
        : { background: 'var(--surface-container-high)', color: 'var(--color-on-surface)' };
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: 0, padding: 0, listStyle: 'none' }}>
      {skills.map((s) => (
        <li
          key={s.name}
          style={{
            ...palette,
            fontSize: '0.78rem',
            fontWeight: 700,
            padding: '0.3rem 0.65rem',
            borderRadius: 999,
          }}
        >
          {s.name}
        </li>
      ))}
    </ul>
  );
}

export default function TrainingBridgeClient({ assessment }: Props) {
  const t = useTranslations('trainingBridge');

  const matchedFromAssessment = useMemo(
    () =>
      assessment
        ? findBridgeOccupation(assessment.occupationCode, assessment.occupationTitle)
        : null,
    [assessment]
  );

  const [selectedId, setSelectedId] = useState<string>(
    matchedFromAssessment?.id ?? TRAINING_BRIDGE_OCCUPATIONS[0].id
  );
  const occupation = getBridgeOccupationById(selectedId) ?? TRAINING_BRIDGE_OCCUPATIONS[0];
  const program = getBridgeProgram(occupation);

  // Personalized only when the member's assessment is being compared.
  const personalized = !!assessment && assessment.skills.length > 0;
  const gap = useMemo(
    () =>
      personalized
        ? computeBridgeGap(assessment!.skills, occupation)
        : { missingSkills: occupation.requiredSkills, haveSkills: [] },
    [personalized, assessment, occupation]
  );

  const coveredMissing = gap.missingSkills.filter((s) => occupation.pathwayCovers.includes(s.name));
  const missingNames = gap.missingSkills.map((s) => s.name).join(', ');

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* ── Where the data comes from ── */}
      {personalized ? (
        <div
          className="portal-card portal-card--flat"
          style={{ padding: '0.9rem 1.1rem', borderRadius: 14, background: 'var(--surface-container-low)' }}
        >
          <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
            {t('basedOn', {
              occupation: assessment!.occupationTitle ?? t('yourLastRun'),
              date: new Date(assessment!.createdAt).toLocaleDateString(),
            })}
          </p>
        </div>
      ) : (
        <div
          className="portal-card portal-card--flat"
          style={{ padding: '1.1rem 1.25rem', borderRadius: 14, background: 'var(--surface-container-low)' }}
        >
          <h2 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
            {t('noAssessmentTitle')}
          </h2>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
            {t('noAssessmentBody')}
          </p>
          <Link
            href="/dashboard/ai-tools/skill-mapper"
            className="btn btn-outline"
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
              account_tree
            </span>
            {t('runSkillMapper')}
          </Link>
        </div>
      )}

      {/* ── Target job picker ── */}
      <div className="portal-card portal-card--flat" style={{ padding: '1.1rem 1.25rem', borderRadius: 14 }}>
        <label
          htmlFor="training-bridge-occupation"
          style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}
        >
          {t('pickOccupationLabel')}
        </label>
        <select
          id="training-bridge-occupation"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            width: '100%',
            minHeight: 48,
            padding: '0.55rem 0.75rem',
            borderRadius: 10,
            border: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-lowest)',
            color: 'var(--color-on-surface)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {TRAINING_BRIDGE_OCCUPATIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.occupationTitle}
            </option>
          ))}
        </select>
        {matchedFromAssessment && matchedFromAssessment.id !== selectedId && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
            {t('assessmentMatchedHint', { occupation: matchedFromAssessment.occupationTitle })}
          </p>
        )}
      </div>

      {/* ── Gap summary ── */}
      <div className="portal-card portal-card--flat" style={{ padding: '1.1rem 1.25rem', borderRadius: 14 }}>
        {gap.missingSkills.length > 0 ? (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
              {personalized
                ? t('missingTitle', { count: gap.missingSkills.length, occupation: occupation.occupationTitle })
                : t('skillsNeededTitle', { occupation: occupation.occupationTitle })}
            </h2>
            <SkillChips skills={gap.missingSkills} tone="missing" />
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
              {t('allCoveredTitle', { occupation: occupation.occupationTitle })}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
              {t('allCoveredBody')}
            </p>
          </>
        )}

        {personalized && gap.haveSkills.length > 0 && (
          <div style={{ marginTop: '0.9rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {t('haveTitle')}
            </p>
            <SkillChips skills={gap.haveSkills} tone="have" />
          </div>
        )}
      </div>

      {/* ── Pathway + enroll CTA ── */}
      {program && (
        <div
          className="portal-card portal-card--flat"
          style={{ padding: '1.25rem', borderRadius: 16, borderLeft: '4px solid var(--color-accent)' }}
        >
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent)' }}>
            {t('pathwayEyebrow')}
          </p>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
            {program.title}
          </h2>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
            {t('pathwayMeta', { partner: program.partner, duration: program.duration })}
          </p>

          <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            {gap.missingSkills.length > 0 && coveredMissing.length > 0 && personalized
              ? t('pathwayCoversMissing', { skills: missingNames })
              : t('pathwayCovers')}
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <SkillChips
              skills={occupation.requiredSkills.filter((s) => occupation.pathwayCovers.includes(s.name))}
              tone="covers"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link
              href={`/apply?program=${program.slug}`}
              className="btn btn-primary"
              style={{ minHeight: 48, flex: '1 1 220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden>
                school
              </span>
              {t('enrollCta')}
            </Link>
            <Link
              href={`/programs/${program.slug}`}
              className="btn btn-outline"
              style={{ minHeight: 48, flex: '1 1 220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {t('viewProgram')}
            </Link>
          </div>

          <p style={{ margin: '0.85rem 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
            {t('disclaimer')}
          </p>
        </div>
      )}
    </div>
  );
}
