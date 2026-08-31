import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
  APPROVED_CURRICULUM_VERSION,
  APPROVED_PROGRAM_CURRICULA,
} from '@/lib/content/programCurriculumManifest';
import { PROGRAM_SYLLABI } from '@/shared/programSyllabi';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const approvedProgramSummarySchema = z.object({
  programSlug: z.string().min(1),
  title: z.string().min(1),
  totalHours: z.number().int().positive(),
  courseCount: z.number().int().positive(),
  sourceDocument: z.string().min(1),
  syllabusSourceSha256: z.string().regex(SHA256_PATTERN),
}).strict();

const approvedProgramCatalogContentSchema = z.object({
  kind: z.literal('approved_program_catalog'),
  catalogVersion: z.string().min(1),
  truthBoundary: z.literal(
    'approved_curriculum_does_not_prove_operational_coursera_availability',
  ),
  programs: z.array(approvedProgramSummarySchema).min(1),
}).strict();

const approvedCourseraProgramSchema = z.object({
  programSlug: z.string().min(1),
  approvedCourseCount: z.number().int().positive(),
  approvedProviderCourseCount: z.number().int().positive(),
  externalTrackStatus: z.enum(['pending', 'validated']),
  collectionId: z.string().min(1).nullable(),
  assignmentMode: z.enum(['disabled', 'canary', 'enabled']),
}).strict();

const approvedCourseraTargetContentSchema = z.object({
  kind: z.literal('approved_coursera_target'),
  curriculumVersion: z.literal(APPROVED_CURRICULUM_VERSION),
  truthBoundary: z.literal(
    'local_target_bindings_do_not_prove_provider_licensing_or_launchability',
  ),
  approvedCourseCount: z.number().int().positive(),
  approvedProviderCourseCount: z.number().int().positive(),
  approvedWorkforceApCourseCount: z.number().int().nonnegative(),
  programs: z.array(approvedCourseraProgramSchema).min(1),
}).strict();

const missingProviderBindingSchema = z.object({
  courseraSlug: z.string().min(1),
  courseraCourseId: z.string().min(1),
}).strict();

const operationalProgramSchema = z.object({
  programSlug: z.string().min(1),
  approvedProviderCourseCount: z.number().int().positive(),
  exactApiMatchCount: z.number().int().nonnegative(),
  missing: z.array(missingProviderBindingSchema),
}).strict();

const courseraOperationalSnapshotContentSchema = z.object({
  kind: z.literal('coursera_operational_snapshot'),
  asOf: z.string().datetime({ offset: true }),
  activationState: z.enum(['blocked', 'canary', 'enabled']),
  truthBoundary: z.literal(
    'operational_availability_requires_exact_provider_catalog_and_learning_path_proof',
  ),
  approvedProviderCourseCount: z.number().int().positive(),
  exactApiMatchCount: z.number().int().nonnegative(),
  missingProviderCourseCount: z.number().int().nonnegative(),
  programs: z.array(operationalProgramSchema).min(1),
}).strict();

export const agentKnowledgeContentSchema = z.discriminatedUnion('kind', [
  approvedProgramCatalogContentSchema,
  approvedCourseraTargetContentSchema,
  courseraOperationalSnapshotContentSchema,
]);

export const agentKnowledgeEntrySchema = z.object({
  knowledgeId: z.string().min(1),
  audience: z.array(z.enum(['agent', 'member', 'staff', 'partner', 'employer', 'public'])).min(1),
  tenantScope: z.string().min(1),
  sensitivity: z.enum(['public', 'internal', 'restricted']),
  status: z.enum(['approved', 'verified', 'blocked', 'draft', 'retired']),
  owner: z.string().min(1),
  reviewer: z.string().min(1),
  sourcePath: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  sourceSha: z.string().regex(SHA256_PATTERN),
  version: z.string().min(1),
  effectiveAt: z.string().datetime({ offset: true }),
  reviewBy: z.string().datetime({ offset: true }),
  citationLabel: z.string().min(1),
  contentHash: z.string().regex(SHA256_PATTERN),
  content: agentKnowledgeContentSchema,
}).strict().superRefine((entry, context) => {
  if (Boolean(entry.sourcePath) === Boolean(entry.sourceUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Exactly one of sourcePath or sourceUrl is required',
    });
  }
});

export const agentKnowledgeManifestSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(agentKnowledgeEntrySchema).min(1),
}).strict();

export type AgentKnowledgeContent = z.infer<typeof agentKnowledgeContentSchema>;
export type AgentKnowledgeEntry = z.infer<typeof agentKnowledgeEntrySchema>;
export type AgentKnowledgeManifest = z.infer<typeof agentKnowledgeManifestSchema>;

export type AgentKnowledgeValidationOptions = {
  asOf?: Date;
  sourceShaByPath?: Readonly<Record<string, string>>;
  sourceShaByUrl?: Readonly<Record<string, string>>;
  requireSourceProof?: boolean;
};

export class AgentKnowledgeValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Agent knowledge manifest rejected:\n- ${issues.join('\n- ')}`);
    this.name = 'AgentKnowledgeValidationError';
    this.issues = issues;
  }
}

function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Knowledge content contains a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  throw new TypeError(`Knowledge content contains unsupported type: ${typeof value}`);
}

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Hash repository text independently of the checkout's line-ending policy.
 * Git stores these governed sources with LF line endings, while Windows
 * checkouts may materialize them as CRLF when core.autocrlf is enabled.
 */
export function computeCanonicalTextSha256(value: string | Buffer): string {
  const text = Buffer.isBuffer(value) ? value.toString('utf8') : value;
  return sha256Hex(text.replace(/\r\n/g, '\n'));
}

export function computeKnowledgeContentHash(content: AgentKnowledgeContent | unknown): string {
  return sha256Hex(canonicalize(content));
}

const FORBIDDEN_CONTENT_KEYS = new Set([
  'address',
  'dateofbirth',
  'dob',
  'email',
  'firstname',
  'fullname',
  'lastname',
  'memberid',
  'phone',
  'phonenumber',
  'rawresume',
  'rawtranscript',
  'resume',
  'resumetext',
  'socialsecuritynumber',
  'ssn',
  'transcript',
  'userid',
]);

function collectUnsafeContent(value: unknown, location: string, issues: string[]): void {
  if (typeof value === 'string') {
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) {
      issues.push(`${location} contains an email address`);
    }
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) {
      issues.push(`${location} contains a possible Social Security number`);
    }
    if (/\bsk_[A-Za-z0-9_-]{12,}\b/.test(value)) {
      issues.push(`${location} contains an API secret`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeContent(item, `${location}[${index}]`, issues));
    return;
  }

  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_CONTENT_KEYS.has(normalizedKey)) {
      issues.push(`${location}.${key} is prohibited from governed agent knowledge`);
    }
    collectUnsafeContent(nested, `${location}.${key}`, issues);
  }
}

function validateApprovedCatalog(
  content: z.infer<typeof approvedProgramCatalogContentSchema>,
  issues: string[],
): void {
  const canonicalPrograms = Object.values(PROGRAM_SYLLABI);
  const configuredBySlug = new Map(content.programs.map((program) => [program.programSlug, program]));

  if (configuredBySlug.size !== content.programs.length) {
    issues.push('approved_program_catalog contains a duplicate program slug');
  }
  if (content.programs.length !== canonicalPrograms.length) {
    issues.push(
      `approved_program_catalog expected ${canonicalPrograms.length} programs but found ${content.programs.length}`,
    );
  }

  for (const canonical of canonicalPrograms) {
    const configured = configuredBySlug.get(canonical.slug);
    if (!configured) {
      issues.push(`approved_program_catalog is missing ${canonical.slug}`);
      continue;
    }

    const expected = {
      title: canonical.title,
      totalHours: canonical.totalHours,
      courseCount: canonical.courses.length,
      sourceDocument: canonical.sourceDocument,
      syllabusSourceSha256: canonical.sourceSha256,
    };
    for (const [field, expectedValue] of Object.entries(expected)) {
      const actualValue = configured[field as keyof typeof configured];
      if (actualValue !== expectedValue) {
        issues.push(
          `approved_program_catalog ${canonical.slug}.${field} drifted: expected ${JSON.stringify(expectedValue)}, received ${JSON.stringify(actualValue)}`,
        );
      }
    }
  }
}

function validateApprovedCourseraTarget(
  content: z.infer<typeof approvedCourseraTargetContentSchema>,
  issues: string[],
): void {
  const configuredBySlug = new Map(content.programs.map((program) => [program.programSlug, program]));
  if (configuredBySlug.size !== content.programs.length) {
    issues.push('approved_coursera_target contains a duplicate program slug');
  }
  if (content.programs.length !== APPROVED_PROGRAM_CURRICULA.length) {
    issues.push(
      `approved_coursera_target expected ${APPROVED_PROGRAM_CURRICULA.length} programs but found ${content.programs.length}`,
    );
  }

  let approvedCourseCount = 0;
  let approvedProviderCourseCount = 0;
  for (const canonical of APPROVED_PROGRAM_CURRICULA) {
    approvedCourseCount += canonical.expectedCourseCount;
    approvedProviderCourseCount += canonical.expectedProviderCourseCount;
    const configured = configuredBySlug.get(canonical.programSlug);
    if (!configured) {
      issues.push(`approved_coursera_target is missing ${canonical.programSlug}`);
      continue;
    }

    const expected = {
      approvedCourseCount: canonical.expectedCourseCount,
      approvedProviderCourseCount: canonical.expectedProviderCourseCount,
      externalTrackStatus: canonical.externalTrack.status,
      collectionId: canonical.externalTrack.collectionId,
      assignmentMode: canonical.externalTrack.assignmentMode,
    };
    for (const [field, expectedValue] of Object.entries(expected)) {
      const actualValue = configured[field as keyof typeof configured];
      if (actualValue !== expectedValue) {
        issues.push(
          `approved_coursera_target ${canonical.programSlug}.${field} drifted: expected ${JSON.stringify(expectedValue)}, received ${JSON.stringify(actualValue)}`,
        );
      }
    }
  }

  const approvedWorkforceApCourseCount = approvedCourseCount - approvedProviderCourseCount;
  if (content.approvedCourseCount !== approvedCourseCount) {
    issues.push(`approved_coursera_target total course count must be ${approvedCourseCount}`);
  }
  if (content.approvedProviderCourseCount !== approvedProviderCourseCount) {
    issues.push(
      `approved_coursera_target provider course count must be ${approvedProviderCourseCount}`,
    );
  }
  if (content.approvedWorkforceApCourseCount !== approvedWorkforceApCourseCount) {
    issues.push(
      `approved_coursera_target WorkforceAP course count must be ${approvedWorkforceApCourseCount}`,
    );
  }
}

function validateOperationalSnapshot(
  content: z.infer<typeof courseraOperationalSnapshotContentSchema>,
  target: z.infer<typeof approvedCourseraTargetContentSchema> | undefined,
  issues: string[],
): void {
  if (!target) {
    issues.push('coursera_operational_snapshot has no approved_coursera_target to compare against');
    return;
  }

  const targetBySlug = new Map(target.programs.map((program) => [program.programSlug, program]));
  const operationalBySlug = new Map(
    content.programs.map((program) => [program.programSlug, program]),
  );
  if (operationalBySlug.size !== content.programs.length) {
    issues.push('coursera_operational_snapshot contains a duplicate program slug');
  }
  if (content.programs.length !== target.programs.length) {
    issues.push('coursera_operational_snapshot does not cover every approved target program');
  }

  let approvedTotal = 0;
  let matchedTotal = 0;
  let missingTotal = 0;
  const seenMissingIds = new Set<string>();

  for (const operational of content.programs) {
    const targetProgram = targetBySlug.get(operational.programSlug);
    if (!targetProgram) {
      issues.push(`coursera_operational_snapshot includes unknown program ${operational.programSlug}`);
      continue;
    }
    const canonical = APPROVED_PROGRAM_CURRICULA.find(
      (program) => program.programSlug === operational.programSlug,
    );
    if (!canonical) {
      issues.push(`coursera_operational_snapshot cannot resolve ${operational.programSlug}`);
      continue;
    }

    approvedTotal += operational.approvedProviderCourseCount;
    matchedTotal += operational.exactApiMatchCount;
    missingTotal += operational.missing.length;

    if (
      operational.approvedProviderCourseCount !== targetProgram.approvedProviderCourseCount
    ) {
      issues.push(
        `coursera_operational_snapshot ${operational.programSlug} approved denominator drifted`,
      );
    }
    if (
      operational.exactApiMatchCount + operational.missing.length !==
      operational.approvedProviderCourseCount
    ) {
      issues.push(
        `coursera_operational_snapshot ${operational.programSlug} matches plus missing must equal its approved denominator`,
      );
    }

    const canonicalBindings = new Map(
      canonical.courses
        .filter((course) => course.kind === 'coursera')
        .map((course) => [course.courseraCourseId, course.courseraSlug]),
    );
    for (const missing of operational.missing) {
      if (seenMissingIds.has(missing.courseraCourseId)) {
        issues.push(
          `coursera_operational_snapshot repeats missing provider ID ${missing.courseraCourseId}`,
        );
      }
      seenMissingIds.add(missing.courseraCourseId);
      const expectedSlug = canonicalBindings.get(missing.courseraCourseId);
      if (expectedSlug !== missing.courseraSlug) {
        issues.push(
          `coursera_operational_snapshot missing binding ${missing.courseraCourseId} is not the approved ${operational.programSlug} target`,
        );
      }
    }
  }

  for (const targetProgram of target.programs) {
    if (!operationalBySlug.has(targetProgram.programSlug)) {
      issues.push(`coursera_operational_snapshot is missing ${targetProgram.programSlug}`);
    }
  }

  if (approvedTotal !== content.approvedProviderCourseCount) {
    issues.push('coursera_operational_snapshot approved total does not equal its program totals');
  }
  if (matchedTotal !== content.exactApiMatchCount) {
    issues.push('coursera_operational_snapshot match total does not equal its program totals');
  }
  if (
    missingTotal !== content.missingProviderCourseCount ||
    seenMissingIds.size !== content.missingProviderCourseCount
  ) {
    issues.push('coursera_operational_snapshot missing total does not equal its unique bindings');
  }
  if (content.approvedProviderCourseCount !== target.approvedProviderCourseCount) {
    issues.push('coursera_operational_snapshot denominator differs from the approved target');
  }
  if (
    content.exactApiMatchCount + content.missingProviderCourseCount !==
    content.approvedProviderCourseCount
  ) {
    issues.push('coursera_operational_snapshot matches plus missing must equal the approved denominator');
  }
  if (
    content.missingProviderCourseCount > 0 &&
    content.activationState !== 'blocked'
  ) {
    issues.push('coursera_operational_snapshot must remain blocked while provider bindings are missing');
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

export function validateAgentKnowledgeManifest(
  input: unknown,
  options: AgentKnowledgeValidationOptions = {},
): AgentKnowledgeManifest {
  const parsed = agentKnowledgeManifestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AgentKnowledgeValidationError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`),
    );
  }

  const manifest = parsed.data;
  const issues: string[] = [];
  const asOf = options.asOf ?? new Date();
  const requireSourceProof = options.requireSourceProof ?? true;
  if (Number.isNaN(asOf.getTime())) issues.push('Validation asOf must be a valid date');

  const seenIds = new Set<string>();
  for (const entry of manifest.entries) {
    if (seenIds.has(entry.knowledgeId)) issues.push(`Duplicate knowledgeId: ${entry.knowledgeId}`);
    seenIds.add(entry.knowledgeId);

    if (entry.tenantScope !== 'global' && !entry.tenantScope.startsWith('organization:')) {
      issues.push(`${entry.knowledgeId} has an unsupported tenantScope`);
    }

    const effectiveAt = new Date(entry.effectiveAt);
    const reviewBy = new Date(entry.reviewBy);
    if (effectiveAt > reviewBy) {
      issues.push(`${entry.knowledgeId} effectiveAt is after reviewBy`);
    }
    if (asOf < effectiveAt) {
      issues.push(`${entry.knowledgeId} is not effective until ${entry.effectiveAt}`);
    }
    if (asOf > reviewBy) {
      issues.push(`${entry.knowledgeId} is stale after ${entry.reviewBy}`);
    }

    const actualContentHash = computeKnowledgeContentHash(entry.content);
    if (actualContentHash !== entry.contentHash) {
      issues.push(
        `${entry.knowledgeId} contentHash mismatch: expected ${entry.contentHash}, received ${actualContentHash}`,
      );
    }

    collectUnsafeContent(entry.content, entry.knowledgeId, issues);

    const proof = entry.sourcePath
      ? options.sourceShaByPath?.[entry.sourcePath]
      : entry.sourceUrl
        ? options.sourceShaByUrl?.[entry.sourceUrl]
        : undefined;
    if (requireSourceProof && !proof) {
      issues.push(`${entry.knowledgeId} is missing an independently computed source proof`);
    } else if (proof && proof.toLowerCase() !== entry.sourceSha) {
      issues.push(
        `${entry.knowledgeId} sourceSha mismatch: expected ${entry.sourceSha}, received ${proof.toLowerCase()}`,
      );
    }

    switch (entry.content.kind) {
      case 'approved_program_catalog':
        validateApprovedCatalog(entry.content, issues);
        break;
      case 'approved_coursera_target':
        validateApprovedCourseraTarget(entry.content, issues);
        break;
      case 'coursera_operational_snapshot':
        break;
    }
  }

  const targets = manifest.entries.filter(
    (entry) => entry.content.kind === 'approved_coursera_target',
  );
  const snapshots = manifest.entries.filter(
    (entry) => entry.content.kind === 'coursera_operational_snapshot',
  );
  const catalogs = manifest.entries.filter(
    (entry) => entry.content.kind === 'approved_program_catalog',
  );
  if (catalogs.length !== 1) issues.push(`Expected exactly one approved program catalog, found ${catalogs.length}`);
  if (targets.length !== 1) issues.push(`Expected exactly one approved Coursera target, found ${targets.length}`);
  if (snapshots.length !== 1) issues.push(`Expected exactly one Coursera operational snapshot, found ${snapshots.length}`);

  const target = targets[0]?.content;
  const snapshot = snapshots[0]?.content;
  if (target?.kind === 'approved_coursera_target' && snapshot?.kind === 'coursera_operational_snapshot') {
    validateOperationalSnapshot(snapshot, target, issues);
  }

  if (issues.length > 0) throw new AgentKnowledgeValidationError(issues);
  return deepFreeze(manifest);
}

function resolveInsideRoot(rootDir: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new AgentKnowledgeValidationError([`Absolute source paths are prohibited: ${relativePath}`]);
  }
  const resolved = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AgentKnowledgeValidationError([`Source path escapes repository root: ${relativePath}`]);
  }
  return resolved;
}

export const DEFAULT_AGENT_KNOWLEDGE_MANIFEST_PATH =
  'config/agent-knowledge/manifest.v1.json';

export async function loadAgentKnowledgeManifest(options: {
  rootDir?: string;
  manifestPath?: string;
  asOf?: Date;
} = {}): Promise<AgentKnowledgeManifest> {
  const rootDir = await realpath(options.rootDir ?? process.cwd());
  const manifestPath = resolveInsideRoot(
    rootDir,
    options.manifestPath ?? DEFAULT_AGENT_KNOWLEDGE_MANIFEST_PATH,
  );
  const manifestRaw = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
  const structurallyParsed = agentKnowledgeManifestSchema.safeParse(manifestRaw);
  if (!structurallyParsed.success) {
    throw new AgentKnowledgeValidationError(
      structurallyParsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'manifest'}: ${issue.message}`,
      ),
    );
  }

  const sourceShaByPath: Record<string, string> = {};
  for (const entry of structurallyParsed.data.entries) {
    if (!entry.sourcePath) {
      throw new AgentKnowledgeValidationError([
        `${entry.knowledgeId} uses sourceUrl; provide an externally verified URL proof instead of the filesystem loader`,
      ]);
    }
    if (sourceShaByPath[entry.sourcePath]) continue;
    const sourcePath = resolveInsideRoot(rootDir, entry.sourcePath);
    sourceShaByPath[entry.sourcePath] = computeCanonicalTextSha256(
      await readFile(sourcePath),
    );
  }

  return validateAgentKnowledgeManifest(manifestRaw, {
    asOf: options.asOf,
    sourceShaByPath,
    requireSourceProof: true,
  });
}
