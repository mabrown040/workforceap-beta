import 'server-only';

type StringMap = Record<string, string>;
type StringArrayMap = Record<string, string[]>;

const DEFAULT_API_BASE_URL = 'https://api.coursera.com/ent/api/rest/v1';
const DEFAULT_PLATFORM_URL = 'https://www.coursera.org';

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
  return {
    apiBaseUrl: process.env.COURSERA_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    apiToken: process.env.COURSERA_API_TOKEN?.trim() || '',
    programId: process.env.COURSERA_PROGRAM_ID?.trim() || '',
    programIdMap: parseStringMap(process.env.COURSERA_PROGRAM_ID_MAP),
    programHomeUrl: process.env.COURSERA_PROGRAM_HOME_URL?.trim() || '',
    programUrlTemplate: process.env.COURSERA_PROGRAM_URL_TEMPLATE?.trim() || '',
    defaultSkillsetIds: parseCsv(process.env.COURSERA_DEFAULT_SKILLSET_IDS),
    skillsetIdMap: parseStringArrayMap(process.env.COURSERA_SKILLSET_ID_MAP),
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
}): string | null {
  const config = getCourseraConfig();
  const programId = resolveCourseraProgramId(args.programSlug);

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
  const launchUrl = buildCourseraLaunchUrl({
    programSlug,
    userId: 'template-user',
    email: 'template@example.com',
  });

  const launchMissing: string[] = [];
  if (!config.programHomeUrl && !config.programUrlTemplate) {
    launchMissing.push('program launch URL');
  }
  if (config.programUrlTemplate.includes('{programId}') && !programId) {
    launchMissing.push('Coursera program ID mapping');
  }

  const syncMissing: string[] = [];
  if (!config.apiToken) syncMissing.push('API token');
  if (!programId) syncMissing.push('Coursera program ID');
  if (skillsetIds.length === 0) syncMissing.push('skillset IDs');

  const webhookMissing: string[] = [];
  if (!config.webhookSecret) webhookMissing.push('webhook secret');

  return {
    canLaunch: Boolean(launchUrl),
    canSync: syncMissing.length === 0,
    canReceiveWebhooks: webhookMissing.length === 0,
    launchMissing,
    syncMissing,
    webhookMissing,
    programId,
    skillsetIds,
    platformUrl: config.platformUrl,
  };
}
