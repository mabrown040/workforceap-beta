export type SkillCheckpointShareCard = {
  kind: 'skill-checkpoint';
  skillName: string;
  userDisplayName: string;
};

export type CertificateShareCard = {
  kind: 'certificate';
  certificateTitle: string;
  userDisplayName: string;
  issuer: string;
  displayDate: string;
};

export type OgShareCard = SkillCheckpointShareCard | CertificateShareCard;

const DEFAULT_USER_DISPLAY_NAME = 'WorkforceAP Member';
const DEFAULT_SKILL_NAME = 'Career Readiness Skill';
const DEFAULT_CERTIFICATE_TITLE = 'WorkforceAP Certificate';
const DEFAULT_ISSUER = 'WorkforceAP';
const MAX_TEXT_LENGTH = 64;

function cleanText(value: string | null, fallback: string): string {
  if (value && /[<>]/.test(value)) {
    return fallback;
  }

  const cleaned = (value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return fallback;
  }

  if (cleaned.length <= MAX_TEXT_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_TEXT_LENGTH - 1).trimEnd()}…`;
}

function formatDisplayDate(value: string | null): string {
  if (!value) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date());
  }

  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = isoDateOnly ? new Date(`${value}T00:00:00Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value, 'Recently issued');
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function parseOgShareCardParams(searchParams: URLSearchParams): OgShareCard {
  const type = searchParams.get('type');
  const userDisplayName = cleanText(searchParams.get('name'), DEFAULT_USER_DISPLAY_NAME);

  if (type === 'certificate') {
    return {
      kind: 'certificate',
      certificateTitle: cleanText(searchParams.get('title'), DEFAULT_CERTIFICATE_TITLE),
      userDisplayName,
      issuer: cleanText(searchParams.get('issuer'), DEFAULT_ISSUER),
      displayDate: formatDisplayDate(searchParams.get('date')),
    };
  }

  return {
    kind: 'skill-checkpoint',
    skillName: cleanText(searchParams.get('skill'), DEFAULT_SKILL_NAME),
    userDisplayName,
  };
}
