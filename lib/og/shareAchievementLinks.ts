export type SkillCheckpointShareInput = {
  origin?: string;
  skillName: string;
  programTitle: string;
  courseName: string;
  correct: number;
  total: number;
};

export type CertificateShareInput = {
  origin?: string;
  certificateTitle: string;
  earnedAtIso: string;
  issuer?: string;
};

export type AchievementSharePathInput =
  | {
      kind: 'skill-checkpoint';
      skillName: string;
      programTitle: string;
      courseName: string;
      scoreLabel: string;
    }
  | {
      kind: 'certificate';
      certificateTitle: string;
      issuer?: string;
      earnedAtIso: string;
    };

const DEFAULT_SHARE_ORIGIN = 'https://www.workforceap.org';
const DEFAULT_ISSUER = 'WorkforceAP';
const SHARE_ACHIEVEMENT_PATH = '/share/achievement';

function normalizeOrigin(origin?: string): string {
  const trimmed = origin?.trim();
  return (trimmed || DEFAULT_SHARE_ORIGIN).replace(/\/$/, '');
}

function dateOnly(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

export function getBrowserShareOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
}

export function buildShareAchievementPath(input: AchievementSharePathInput): string {
  const params = new URLSearchParams();

  if (input.kind === 'certificate') {
    params.set('type', 'certificate');
    params.set('title', input.certificateTitle);
    params.set('issuer', input.issuer ?? DEFAULT_ISSUER);
    params.set('date', dateOnly(input.earnedAtIso));
  } else {
    params.set('type', 'skill-checkpoint');
    params.set('skill', input.skillName);
    params.set('program', input.programTitle);
    params.set('course', input.courseName);
    params.set('score', input.scoreLabel);
  }

  return `${SHARE_ACHIEVEMENT_PATH}?${params.toString()}`;
}

export function buildSkillCheckpointShare(input: SkillCheckpointShareInput) {
  const scoreLabel = `${input.correct}/${input.total} correct`;
  const path = buildShareAchievementPath({
    kind: 'skill-checkpoint',
    skillName: input.skillName,
    programTitle: input.programTitle,
    courseName: input.courseName,
    scoreLabel,
  });

  return {
    url: `${normalizeOrigin(input.origin)}${path}`,
    title: `Skill demonstrated: ${input.skillName}`,
    text: `I completed a WorkforceAP Skill Checkpoint for ${input.skillName} and scored ${input.correct}/${input.total}.`,
  };
}

export function buildCertificateShare(input: CertificateShareInput) {
  const path = buildShareAchievementPath({
    kind: 'certificate',
    certificateTitle: input.certificateTitle,
    issuer: input.issuer,
    earnedAtIso: input.earnedAtIso,
  });

  return {
    url: `${normalizeOrigin(input.origin)}${path}`,
    title: `Certificate earned: ${input.certificateTitle}`,
    text: `I recorded my ${input.certificateTitle} in WorkforceAP.`,
  };
}
