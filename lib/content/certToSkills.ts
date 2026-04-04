export interface CertSkillProfile {
  certName: string;
  skills: { axis: string; value: number }[]; // axis matches radar axes, value 0-100
}

// Mapping: each cert boosts certain skill axes
export const CERT_SKILL_PROFILES: CertSkillProfile[] = [
  { certName: 'CompTIA A+', skills: [
    { axis: 'Technical', value: 75 }, { axis: 'Analytics', value: 45 },
    { axis: 'Communication', value: 35 }, { axis: 'Leadership', value: 20 }, { axis: 'Creative', value: 15 }
  ]},
  { certName: 'CompTIA Network+', skills: [
    { axis: 'Technical', value: 80 }, { axis: 'Analytics', value: 55 },
    { axis: 'Communication', value: 30 }, { axis: 'Leadership', value: 25 }, { axis: 'Creative', value: 15 }
  ]},
  { certName: 'CompTIA Security+', skills: [
    { axis: 'Technical', value: 85 }, { axis: 'Analytics', value: 65 },
    { axis: 'Communication', value: 35 }, { axis: 'Leadership', value: 30 }, { axis: 'Creative', value: 20 }
  ]},
  { certName: 'CNA Certification', skills: [
    { axis: 'Technical', value: 50 }, { axis: 'Analytics', value: 35 },
    { axis: 'Communication', value: 80 }, { axis: 'Leadership', value: 40 }, { axis: 'Creative', value: 25 }
  ]},
  { certName: 'CPR/First Aid', skills: [
    { axis: 'Technical', value: 30 }, { axis: 'Analytics', value: 20 },
    { axis: 'Communication', value: 55 }, { axis: 'Leadership', value: 45 }, { axis: 'Creative', value: 15 }
  ]},
  { certName: 'Medical Assistant Certificate', skills: [
    { axis: 'Technical', value: 60 }, { axis: 'Analytics', value: 50 },
    { axis: 'Communication', value: 75 }, { axis: 'Leadership', value: 35 }, { axis: 'Creative', value: 20 }
  ]},
  { certName: 'OSHA 10', skills: [
    { axis: 'Technical', value: 40 }, { axis: 'Analytics', value: 35 },
    { axis: 'Communication', value: 50 }, { axis: 'Leadership', value: 55 }, { axis: 'Creative', value: 20 }
  ]},
  { certName: 'OSHA 30', skills: [
    { axis: 'Technical', value: 50 }, { axis: 'Analytics', value: 45 },
    { axis: 'Communication', value: 60 }, { axis: 'Leadership', value: 65 }, { axis: 'Creative', value: 20 }
  ]},
  { certName: 'Trade-specific certification', skills: [
    { axis: 'Technical', value: 70 }, { axis: 'Analytics', value: 40 },
    { axis: 'Communication', value: 45 }, { axis: 'Leadership', value: 35 }, { axis: 'Creative', value: 30 }
  ]},
];

// Given a list of earned cert names, compute aggregated skill profile (max per axis)
export function computeMemberSkillProfile(earnedCertNames: string[]): { axis: string; value: number }[] {
  const axes = ['Analytics', 'Technical', 'Communication', 'Leadership', 'Creative'];
  const maxByAxis: Record<string, number> = {};
  axes.forEach(a => { maxByAxis[a] = 0; });
  
  for (const certName of earnedCertNames) {
    const profile = CERT_SKILL_PROFILES.find(p => p.certName === certName);
    if (!profile) continue;
    for (const skill of profile.skills) {
      if (skill.axis in maxByAxis) {
        maxByAxis[skill.axis] = Math.max(maxByAxis[skill.axis], skill.value);
      }
    }
  }
  
  return axes.map(axis => ({ axis, value: maxByAxis[axis] / 100 }));
}

// Given member skill profile and target occupation radar, return recommended certs to fill gaps
export function recommendCertsForGaps(
  memberProfile: { axis: string; value: number }[],
  targetProfile: { axis: string; value: number }[],
  allTracks: import('./certificationTracks').CertTrack[]
): { certName: string; track: string; reason: string; link: string }[] {
  // Find axes where member is below target by 20+ points
  const gaps: { axis: string; gap: number }[] = [];
  for (const target of targetProfile) {
    const memberAxis = memberProfile.find(m => m.axis === target.axis);
    const memberVal = (memberAxis?.value ?? 0) * 100;
    const targetVal = target.value * 100;
    if (targetVal - memberVal >= 20) {
      gaps.push({ axis: target.axis, gap: targetVal - memberVal });
    }
  }
  gaps.sort((a, b) => b.gap - a.gap);
  
  const recommendations: { certName: string; track: string; reason: string; link: string }[] = [];
  const seen = new Set<string>();
  
  for (const gap of gaps.slice(0, 2)) { // top 2 gap axes
    for (const track of allTracks) {
      for (const cert of track.certs) {
        if (seen.has(cert.name)) continue;
        const profile = CERT_SKILL_PROFILES.find(p => p.certName === cert.name);
        if (!profile) continue;
        const certBoost = profile.skills.find(s => s.axis === gap.axis);
        if (certBoost && certBoost.value >= 50) {
          seen.add(cert.name);
          recommendations.push({
            certName: cert.name,
            track: track.name,
            reason: `Builds ${gap.axis} skills (${Math.round(gap.gap)}pt gap)`,
            link: cert.link,
          });
          break;
        }
      }
    }
  }
  
  return recommendations.slice(0, 3);
}
