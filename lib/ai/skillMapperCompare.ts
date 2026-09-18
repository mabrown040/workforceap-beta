/**
 * Skill Mapper comparison helpers — member radar vs a target occupation.
 * Axis values are 0–1 (the same scale SkillMapperClient stores after search).
 */

export type SkillRadarPoint = {
  axis: string;
  value: number;
};

export type SkillGap = {
  axis: string;
  member: number;
  target: number;
  gap: number;
};

export function hasComparableSkills(profile: readonly SkillRadarPoint[]): boolean {
  return profile.some((point) => point.value > 0);
}

/**
 * Gaps where the occupation requires more than the member currently shows.
 * Returned member/target/gap values are 0–100 percentages for display.
 */
export function computeSkillGaps(
  memberProfile: readonly SkillRadarPoint[],
  targetRadar: readonly SkillRadarPoint[],
): SkillGap[] {
  if (memberProfile.length === 0 || targetRadar.length === 0) return [];

  return targetRadar
    .map((target) => {
      const memberAxis = memberProfile.find((point) => point.axis === target.axis);
      const memberVal = (memberAxis?.value ?? 0) * 100;
      const targetVal = target.value * 100;
      return {
        axis: target.axis,
        member: memberVal,
        target: targetVal,
        gap: targetVal - memberVal,
      };
    })
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}
