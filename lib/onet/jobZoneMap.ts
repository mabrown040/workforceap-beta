/**
 * Maps O*NET job zone (1-5) to experience band and program difficulty alignment.
 *
 * Job zones describe how much preparation is needed:
 *   1 = Little or no preparation
 *   2 = Some preparation
 *   3 = Medium preparation
 *   4 = Considerable preparation
 *   5 = Extensive preparation
 *
 * We use this to:
 *   1. Derive an experience band for the occupation.
 *   2. Score how well a program's stated difficulty / duration matches the zone.
 */

export const JOB_ZONE_TO_EXPERIENCE_BAND: Record<number, 'beginner' | 'some_experience' | 'experienced'> = {
  1: 'beginner',
  2: 'beginner',
  3: 'some_experience',
  4: 'experienced',
  5: 'experienced',
};

/** Difficulty band inferred from a program's skills + courses + duration text. */
export type ProgramDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** Rough heuristic: program difficulty from catalog metadata. */
export function inferProgramDifficulty(program: { skills: string[]; duration: string; courses: { name: string }[] }): ProgramDifficulty {
  const text = [...program.skills, program.duration, ...program.courses.map((c) => c.name)].join(' ').toLowerCase();
  if (/\b(advanced|expert|senior|architect|capstone|professional certificate|master)\b/.test(text)) return 'advanced';
  if (/\b(introduction|foundations|fundamentals|beginner|basics|essential|orientation|empowerment)\b/.test(text)) return 'beginner';
  return 'intermediate';
}

/** Map program difficulty to a numeric "zone appetite" [1-5]. */
function difficultyToZoneAppetite(difficulty: ProgramDifficulty): number {
  switch (difficulty) {
    case 'beginner': return 2;
    case 'intermediate': return 3;
    case 'advanced': return 4;
    default: return 3;
  }
}

/** Score how well a program matches an occupation's job zone.
 *  Returns [0,1] where 1 = perfect alignment. */
export function scoreJobZoneAlignment(
  jobZone: number | null | undefined,
  programDifficulty: ProgramDifficulty
): { score: number; reason: string } {
  if (!jobZone || jobZone < 1 || jobZone > 5) {
    return { score: 0.5, reason: 'No job zone data — neutral alignment.' };
  }

  const appetite = difficultyToZoneAppetite(programDifficulty);
  const diff = Math.abs(jobZone - appetite);

  // Perfect match = 1.0, off by 1 = 0.75, off by 2 = 0.45, off by 3+ = 0.15
  const score = diff === 0 ? 1.0 : diff === 1 ? 0.75 : diff === 2 ? 0.45 : 0.15;

  const band = JOB_ZONE_TO_EXPERIENCE_BAND[jobZone] ?? 'some_experience';
  let reason: string;
  if (diff === 0) {
    reason = `Program difficulty matches job zone ${jobZone} (${band}).`;
  } else if (diff <= 1) {
    reason = `Close alignment with job zone ${jobZone} (${band}).`;
  } else {
    reason = `Partial alignment with job zone ${jobZone} (${band}) — program may be ${appetite < jobZone ? 'more basic' : 'more advanced'} than typical.`;
  }

  return { score, reason };
}
