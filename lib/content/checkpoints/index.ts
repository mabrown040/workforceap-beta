import type { ProgramCheckpointPack, SkillCheckpoint } from './types';
import { DATA_AND_SOFTWARE_PACKS } from './dataAndSoftware';
import { BUSINESS_AND_DESIGN_PACKS } from './businessAndDesign';
import { IT_INFRASTRUCTURE_PACKS } from './itInfrastructure';
import { TRADES_AND_HEALTH_PACKS } from './tradesAndHealth';

export type { ProgramCheckpointPack, SkillCheckpoint } from './types';

export const ALL_CHECKPOINT_PACKS: ProgramCheckpointPack[] = [
  ...DATA_AND_SOFTWARE_PACKS,
  ...IT_INFRASTRUCTURE_PACKS,
  ...BUSINESS_AND_DESIGN_PACKS,
  ...TRADES_AND_HEALTH_PACKS,
];

export function getPackByProgram(programSlug: string): ProgramCheckpointPack | undefined {
  return ALL_CHECKPOINT_PACKS.find((p) => p.programSlug === programSlug);
}

export function getCheckpointById(id: string): SkillCheckpoint | undefined {
  for (const pack of ALL_CHECKPOINT_PACKS) {
    for (const course of pack.courses) {
      const cp = course.checkpoints.find((c) => c.id === id);
      if (cp) return cp;
    }
  }
  return undefined;
}
