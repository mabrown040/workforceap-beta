import { PROGRAMS, PROGRAM_AXIS_MAP, RADAR_AXES, type RadarAxis } from './programs';

export interface CertSkillProfile {
  certName: string;
  skills: { axis: RadarAxis; value: number }[]; // axis matches modern 6-axis radar, value 0-100
}

/**
 * Cert → modern 6-axis skill mapping.
 * Migrated from legacy 5-axis (Technical, Analytics, Communication, Leadership, Creative)
 * to the 6 modern axes used everywhere else: Analytics, Engineering, Design, Strategy, Ethics, Research.
 */
export const CERT_SKILL_PROFILES: CertSkillProfile[] = [
  { certName: 'CompTIA A+', skills: [
    { axis: 'Analytics', value: 40 }, { axis: 'Engineering', value: 80 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 25 },
    { axis: 'Service', value: 35 }, { axis: 'Research', value: 30 },
  ]},
  { certName: 'CompTIA Network+', skills: [
    { axis: 'Analytics', value: 45 }, { axis: 'Engineering', value: 85 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 25 },
    { axis: 'Service', value: 30 }, { axis: 'Research', value: 30 },
  ]},
  { certName: 'CompTIA Security+', skills: [
    { axis: 'Analytics', value: 55 }, { axis: 'Engineering', value: 75 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 40 },
    { axis: 'Service', value: 65 }, { axis: 'Research', value: 40 },
  ]},
  { certName: 'CNA Certification', skills: [
    { axis: 'Analytics', value: 25 }, { axis: 'Engineering', value: 20 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 30 },
    { axis: 'Service', value: 80 }, { axis: 'Research', value: 35 },
  ]},
  { certName: 'CPR/First Aid', skills: [
    { axis: 'Analytics', value: 15 }, { axis: 'Engineering', value: 10 },
    { axis: 'Design', value: 5 }, { axis: 'Strategy', value: 20 },
    { axis: 'Service', value: 55 }, { axis: 'Research', value: 15 },
  ]},
  { certName: 'Medical Assistant Certificate', skills: [
    { axis: 'Analytics', value: 40 }, { axis: 'Engineering', value: 30 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 25 },
    { axis: 'Service', value: 75 }, { axis: 'Research', value: 45 },
  ]},
  { certName: 'OSHA 10', skills: [
    { axis: 'Analytics', value: 25 }, { axis: 'Engineering', value: 40 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 25 },
    { axis: 'Service', value: 60 }, { axis: 'Research', value: 20 },
  ]},
  { certName: 'OSHA 30', skills: [
    { axis: 'Analytics', value: 35 }, { axis: 'Engineering', value: 50 },
    { axis: 'Design', value: 10 }, { axis: 'Strategy', value: 35 },
    { axis: 'Service', value: 70 }, { axis: 'Research', value: 25 },
  ]},
  { certName: 'Trade-specific certification', skills: [
    { axis: 'Analytics', value: 30 }, { axis: 'Engineering', value: 70 },
    { axis: 'Design', value: 15 }, { axis: 'Strategy', value: 25 },
    { axis: 'Service', value: 40 }, { axis: 'Research', value: 25 },
  ]},
];

/** Given a list of earned cert names, compute aggregated skill profile (max per axis). */
export function computeMemberSkillProfile(earnedCertNames: string[]): { axis: string; value: number }[] {
  const maxByAxis: Record<string, number> = {};
  RADAR_AXES.forEach((a) => { maxByAxis[a] = 0; });

  for (const certName of earnedCertNames) {
    const profile = CERT_SKILL_PROFILES.find((p) => p.certName === certName);
    if (!profile) continue;
    for (const skill of profile.skills) {
      if (skill.axis in maxByAxis) {
        maxByAxis[skill.axis] = Math.max(maxByAxis[skill.axis], skill.value);
      }
    }
  }

  return RADAR_AXES.map((axis) => ({ axis, value: maxByAxis[axis] / 100 }));
}

/**
 * Given member skill profile and target occupation radar, return recommended
 * WorkforceAP programs to fill skill gaps.
 *
 * @deprecated Prefer `recommendProgramsForGaps` from `./programs` for richer results.
 * Kept for backward compat — internally delegates to the program-based engine now.
 */
export function recommendCertsForGaps(
  memberProfile: { axis: string; value: number }[],
  targetProfile: { axis: string; value: number }[],
  _allTracks: import('./certificationTracks').CertTrack[],
): { certName: string; track: string; reason: string; link: string }[] {
  // Find axes where member is below target by 15+ points
  const gaps: { axis: string; gap: number }[] = [];
  for (const target of targetProfile) {
    const memberAxis = memberProfile.find((m) => m.axis === target.axis);
    const memberVal = (memberAxis?.value ?? 0) * 100;
    const targetVal = target.value * 100;
    if (targetVal - memberVal >= 15) {
      gaps.push({ axis: target.axis, gap: targetVal - memberVal });
    }
  }
  gaps.sort((a, b) => b.gap - a.gap);

  // Map top gap axes to programs
  const recommendations: { certName: string; track: string; reason: string; link: string }[] = [];
  const seen = new Set<string>();

  for (const gap of gaps.slice(0, 3)) {
    // Find best program for this gap axis
    let bestSlug = '';
    let bestScore = 0;
    for (const [slug, scores] of Object.entries(PROGRAM_AXIS_MAP)) {
      if (seen.has(slug)) continue;
      const axisScore = scores[gap.axis] ?? 0;
      if (axisScore > bestScore) {
        bestScore = axisScore;
        bestSlug = slug;
      }
    }
    if (bestSlug && bestScore >= 40) {
      seen.add(bestSlug);
      const program = PROGRAMS.find((p) => p.slug === bestSlug);
      if (program) {
        recommendations.push({
          certName: program.title,
          track: program.categoryLabel,
          reason: `Builds ${gap.axis} skills (${Math.round(gap.gap)}pt gap)`,
          link: `/programs/${program.slug}`,
        });
      }
    }
  }

  return recommendations.slice(0, 3);
}
