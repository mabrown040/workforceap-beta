import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getDiscoveredProgram } from '@/lib/content/programs';

type StringMap = Record<string, string>;
type StringArrayMap = Record<string, string[]>;

const DEFAULT_API_BASE_URL = 'https://api.coursera.com/ent/api/rest/v1';
const DEFAULT_PLATFORM_URL = 'https://www.coursera.org';

const DISCOVERED_PROGRAM_ID_MAP: StringMap = Object.fromEntries(
  Object.entries(DISCOVERED_COURSERA_PROGRAMS).map(([programSlug, mapping]) => [programSlug, mapping.courseraProgramId])
);

const DISCOVERED_COURSE_ID_MAP: StringArrayMap = Object.fromEntries(
  Object.entries(DISCOVERED_COURSERA_PROGRAMS).map(([programSlug, mapping]) => [
    programSlug,
    mapping.courses.map((course) => course.courseId),
  ])
);

const DISCOVERED_DEFAULT_PROGRAM_ID = Object.values(DISCOVERED_COURSERA_PROGRAMS)[0]?.courseraProgramId ?? '';

function deriveProgramIdFromUrl(raw: string | undefined): string {
  const value = raw?.trim() || '';
  if (!value) return '';

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/programs\/([^/]+)/i);
    return match?.[1]?.trim() || '';
  } catch {
    const match = value.match(/\/programs\/([^/]+)/i);
    return match?.[1]?.trim() || '';
  }
}

function parseCsv(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseStringMap(raw: string | undefined): StringMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) =>
        typeof value === 'string' && value.trim() ? [[key, value.trim()]] : []
      )
    );
  } catch {
    return {};
  }
}

function parseStringArrayMap(raw: string | undefined): StringArrayMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (!Array.isArray(value)) return [];
        const items = value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean);
        return items.length ? [[key, items]] : [];
      })
    );
  } catch {
    return {};
  }
}

function interpolateTemplate(template: string, values: Record<string, string | undefined>): string | null {
  let failed = false;
  const resolved = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    if (!value) {
      failed = true;
      return '';
    }
    return encodeURIComponent(value);
  });
  return failed ? null : resolved;
}

export function getCourseraConfig() {
  const programHomeUrl = process.env.COURSERA_PROGRAM_HOME_URL?.trim() || '';
  const explicitProgramId = process.env.COURSERA_PROGRAM_ID?.trim() || '';
  const envProgramIdMap = parseStringMap(process.env.COURSERA_PROGRAM_ID_MAP);
  const envCourseIdMap = parseStringArrayMap(process.env.COURSERA_COURSE_ID_MAP);

  return {
    apiBaseUrl: process.env.COURSERA_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    apiToken: process.env.COURSERA_API_TOKEN?.trim() || '',
    appId: process.env.COURSERA_APP_ID?.trim() || '',
    appKey: process.env.COURSERA_APP_KEY?.trim() || '',
    appSecret: process.env.COURSERA_APP_SECRET?.trim() || '',
    oauthTokenUrl:
      process.env.COURSERA_OAUTH_TOKEN_URL?.trim() ||
      'https://api.coursera.com/oauth2/client_credentials/token',
    programId: explicitProgramId || deriveProgramIdFromUrl(programHomeUrl) || DISCOVERED_DEFAULT_PROGRAM_ID,
    programIdMap: { ...DISCOVERED_PROGRAM_ID_MAP, ...envProgramIdMap },
    programHomeUrl,
    programUrlTemplate: process.env.COURSERA_PROGRAM_URL_TEMPLATE?.trim() || '',
    /** Template for deep-linking to individual courses: {courseId}, {programId}, {userId}, {email} */
    courseUrlTemplate: process.env.COURSERA_COURSE_URL_TEMPLATE?.trim() || '',
    defaultSkillsetIds: parseCsv(process.env.COURSERA_DEFAULT_SKILLSET_IDS),
    skillsetIdMap: parseStringArrayMap(process.env.COURSERA_SKILLSET_ID_MAP),
    /** Map of programSlug → courseIndex → Coursera course ID */
    courseIdMap: { ...DISCOVERED_COURSE_ID_MAP, ...envCourseIdMap },
    webhookSecret:
      process.env.COURSERA_WEBHOOK_SECRET?.trim() || process.env.WEBHOOK_SECRET?.trim() || '',
    platformUrl: DEFAULT_PLATFORM_URL,
  };
}

export function resolveCourseraProgramId(programSlug: string | null | undefined): string {
  const config = getCourseraConfig();
  if (programSlug && config.programIdMap[programSlug]) return config.programIdMap[programSlug];
  return config.programId;
}

export function resolveCourseraSkillsetIds(programSlug: string | null | undefined): string[] {
  const config = getCourseraConfig();
  if (programSlug && config.skillsetIdMap[programSlug]?.length) return config.skillsetIdMap[programSlug];
  return config.defaultSkillsetIds;
}

export function buildCourseraLaunchUrl(args: {
  programSlug?: string | null;
  userId: string;
  email: string;
  /** 0-based index of the current course the member should start */
  currentCourseIndex?: number;
  /** Optional locale for localized Coursera URLs */
  locale?: string;
}): string | null {
  const config = getCourseraConfig();
  const programId = resolveCourseraProgramId(args.programSlug);
  void args.locale;

  // If we have a course ID map and a current course index, deep-link to that specific course
  const courseIds = args.programSlug ? config.courseIdMap[args.programSlug] : undefined;
  const discoveredCourseIds =
    args.programSlug ? getDiscoveredProgram(args.programSlug)?.courses.map((course) => course.courseId) : undefined;
  const effectiveCourseIds = courseIds?.length ? courseIds : discoveredCourseIds;
  const currentCourseId =
    effectiveCourseIds && args.currentCourseIndex != null
      ? effectiveCourseIds[args.currentCourseIndex]
      : undefined;

  if (currentCourseId && config.courseUrlTemplate) {
    const courseUrl = interpolateTemplate(config.courseUrlTemplate, {
      courseId: currentCourseId,
      programId,
      programSlug: args.programSlug ?? '',
      userId: args.userId,
      email: args.email,
    });
    if (courseUrl) return courseUrl;
  }

  if (config.programUrlTemplate) {
    return interpolateTemplate(config.programUrlTemplate, {
      programId,
      programSlug: args.programSlug ?? '',
      userId: args.userId,
      email: args.email,
    });
  }

  if (config.programHomeUrl) return config.programHomeUrl;
  return null;
}

export function getCourseraReadiness(programSlug: string | null | undefined) {
  const config = getCourseraConfig();
  const programId = resolveCourseraProgramId(programSlug);
  const skillsetIds = resolveCourseraSkillsetIds(programSlug);
  const courseIds = programSlug ? config.courseIdMap[programSlug] : undefined;
  const launchUrl = buildCourseraLaunchUrl({
    programSlug,
    userId: 'template-user',
    email: 'template@example.com',
    currentCourseIndex: 0,
  });

  const launchMissing: string[] = [];
  if (!config.programHomeUrl && !config.programUrlTemplate && !config.courseUrlTemplate) {
    launchMissing.push('program or course launch URL template');
  }
  if (config.programUrlTemplate.includes('{programId}') && !programId) {
    launchMissing.push('Coursera program ID mapping');
  }
  if (config.courseUrlTemplate && (!courseIds || courseIds.length === 0)) {
    launchMissing.push('course ID mapping for deep-linking');
  }

  const syncMissing: string[] = [];
  if (!config.apiToken && !(config.appKey && config.appSecret)) {
    syncMissing.push('API token or OAuth app key/secret');
  }
  if (!programId) syncMissing.push('Coursera program ID');
  if (skillsetIds.length === 0) syncMissing.push('skillset IDs');

  const webhookMissing: string[] = [];
  if (!config.webhookSecret) webhookMissing.push('webhook secret');

  return {
    canLaunch: Boolean(launchUrl),
    canDeepLink: Boolean(config.courseUrlTemplate && courseIds && courseIds.length > 0),
    canSync: syncMissing.length === 0,
    canReceiveWebhooks: webhookMissing.length === 0,
    launchMissing,
    syncMissing,
    webhookMissing,
    programId,
    skillsetIds,
    courseIds,
    platformUrl: config.platformUrl,
  };
}
