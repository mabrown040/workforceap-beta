import {
  APPROVED_CURRICULUM_VERSION,
  getProgramCurriculumManifest,
  isApprovedCurriculumReadyForAssignment,
} from '@/lib/content/programCurriculumManifest';
import { getProgramSyllabus } from '@/shared/programSyllabi';

import type { AgentKnowledgeEntry, AgentKnowledgeManifest } from './manifest';

type ApprovedCatalogEntry = AgentKnowledgeEntry & {
  content: Extract<AgentKnowledgeEntry['content'], { kind: 'approved_program_catalog' }>;
};

type ApprovedTargetEntry = AgentKnowledgeEntry & {
  content: Extract<AgentKnowledgeEntry['content'], { kind: 'approved_coursera_target' }>;
};

type OperationalSnapshotEntry = AgentKnowledgeEntry & {
  content: Extract<AgentKnowledgeEntry['content'], { kind: 'coursera_operational_snapshot' }>;
};

function entryByKind<K extends AgentKnowledgeEntry['content']['kind']>(
  manifest: AgentKnowledgeManifest,
  kind: K,
): (AgentKnowledgeEntry & {
  content: Extract<AgentKnowledgeEntry['content'], { kind: K }>;
}) | undefined {
  return manifest.entries.find((entry) => entry.content.kind === kind) as
    | (AgentKnowledgeEntry & {
        content: Extract<AgentKnowledgeEntry['content'], { kind: K }>;
      })
    | undefined;
}

export type TrustedAgentProgramKnowledge = {
  approval: {
    state: 'approved';
    programSlug: string;
    title: string;
    providers: string;
    deliveryFormat: string;
    totalHours: number;
    tuitionAndFees: number;
    description: string;
    recommendedPrerequisite?: string;
    courses: readonly {
      name: string;
      hours: number;
      description: string;
      courseraSlug?: string;
    }[];
    version: string;
    sourceDocument: string;
    syllabusSourceSha256: string;
  };
  coursera: {
    availabilityState: 'blocked' | 'canary' | 'enabled' | 'not_governed';
    launchable: boolean;
    reason: string;
    approvedProviderCourseCount: number | null;
    exactApiMatchCount: number | null;
    missingProviderCourseCount: number | null;
    snapshotAsOf: string | null;
    collectionId: string | null;
    assignmentMode: 'disabled' | 'canary' | 'enabled' | null;
    providerCourses: readonly {
      name: string;
      courseraSlug: string;
      courseraCourseId: string;
      availableInCatalogSnapshot: boolean | null;
    }[];
  };
  citations: readonly {
    knowledgeId: string;
    label: string;
    version: string;
    sourcePath?: string;
    sourceUrl?: string;
  }[];
};

function citation(entry: AgentKnowledgeEntry) {
  return {
    knowledgeId: entry.knowledgeId,
    label: entry.citationLabel,
    version: entry.version,
    ...(entry.sourcePath ? { sourcePath: entry.sourcePath } : {}),
    ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
  };
}

/**
 * Resolves canonical, citation-ready program truth for an agent. The approved
 * syllabus and current Coursera operational state remain separate on purpose.
 * Missing operational evidence always resolves to non-launchable.
 */
export function resolveTrustedProgramKnowledge(
  manifest: AgentKnowledgeManifest,
  programSlug: string,
): TrustedAgentProgramKnowledge | null {
  const normalizedSlug = programSlug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const approvedCatalog = entryByKind(
    manifest,
    'approved_program_catalog',
  ) as ApprovedCatalogEntry | undefined;
  if (!approvedCatalog) return null;
  const approvedSummary = approvedCatalog.content.programs.find(
    (program) => program.programSlug === normalizedSlug,
  );
  const syllabus = getProgramSyllabus(normalizedSlug);
  if (!approvedSummary || !syllabus) return null;

  const approvedTarget = entryByKind(
    manifest,
    'approved_coursera_target',
  ) as ApprovedTargetEntry | undefined;
  const operationalSnapshot = entryByKind(
    manifest,
    'coursera_operational_snapshot',
  ) as OperationalSnapshotEntry | undefined;
  const curriculum = getProgramCurriculumManifest(
    normalizedSlug,
    APPROVED_CURRICULUM_VERSION,
  );
  const targetProgram = approvedTarget?.content.programs.find(
    (program) => program.programSlug === normalizedSlug,
  );
  const operationalProgram = operationalSnapshot?.content.programs.find(
    (program) => program.programSlug === normalizedSlug,
  );

  const citations: AgentKnowledgeEntry[] = [approvedCatalog];
  if (curriculum && approvedTarget && targetProgram) citations.push(approvedTarget);
  if (curriculum && operationalSnapshot && operationalProgram) citations.push(operationalSnapshot);

  if (!curriculum || !approvedTarget || !targetProgram || !operationalSnapshot || !operationalProgram) {
    return {
      approval: {
        state: 'approved',
        programSlug: syllabus.slug,
        title: syllabus.title,
        providers: syllabus.providers,
        deliveryFormat: syllabus.deliveryFormat,
        totalHours: syllabus.totalHours,
        tuitionAndFees: syllabus.tuitionAndFees,
        description: syllabus.description,
        ...(syllabus.recommendedPrerequisite
          ? { recommendedPrerequisite: syllabus.recommendedPrerequisite }
          : {}),
        courses: syllabus.courses,
        version: approvedCatalog.version,
        sourceDocument: syllabus.sourceDocument,
        syllabusSourceSha256: syllabus.sourceSha256,
      },
      coursera: {
        availabilityState: 'not_governed',
        launchable: false,
        reason:
          'No current governed Coursera operational record covers this approved program. Do not infer availability or promise launch.',
        approvedProviderCourseCount: null,
        exactApiMatchCount: null,
        missingProviderCourseCount: null,
        snapshotAsOf: null,
        collectionId: null,
        assignmentMode: null,
        providerCourses: [],
      },
      citations: citations.map(citation),
    };
  }

  const missingIds = new Set(
    operationalProgram.missing.map((binding) => binding.courseraCourseId),
  );
  const providerCourses = curriculum.courses
    .filter(
      (course) =>
        course.kind === 'coursera' &&
        Boolean(course.courseraSlug) &&
        Boolean(course.courseraCourseId),
    )
    .map((course) => ({
      name: course.name,
      courseraSlug: course.courseraSlug!,
      courseraCourseId: course.courseraCourseId!,
      availableInCatalogSnapshot: !missingIds.has(course.courseraCourseId!),
    }));

  const trackReady = isApprovedCurriculumReadyForAssignment(normalizedSlug);
  const launchable =
    operationalSnapshot.content.activationState === 'enabled' && trackReady;
  const availabilityState = launchable
    ? 'enabled'
    : operationalSnapshot.content.activationState === 'canary' && trackReady
      ? 'canary'
      : 'blocked';

  return {
    approval: {
      state: 'approved',
      programSlug: syllabus.slug,
      title: syllabus.title,
      providers: syllabus.providers,
      deliveryFormat: syllabus.deliveryFormat,
      totalHours: syllabus.totalHours,
      tuitionAndFees: syllabus.tuitionAndFees,
      description: syllabus.description,
      ...(syllabus.recommendedPrerequisite
        ? { recommendedPrerequisite: syllabus.recommendedPrerequisite }
        : {}),
      courses: syllabus.courses,
      version: approvedCatalog.version,
      sourceDocument: syllabus.sourceDocument,
      syllabusSourceSha256: syllabus.sourceSha256,
    },
    coursera: {
      availabilityState,
      launchable,
      reason: launchable
        ? 'The approved target, provider catalog, learning path, and assignment mode are enabled.'
        : 'The curriculum is approved, but its Coursera track is not operationally launchable. Provider catalog and learning-path gates remain closed.',
      approvedProviderCourseCount: operationalProgram.approvedProviderCourseCount,
      exactApiMatchCount: operationalProgram.exactApiMatchCount,
      missingProviderCourseCount: operationalProgram.missing.length,
      snapshotAsOf: operationalSnapshot.content.asOf,
      collectionId: targetProgram.collectionId,
      assignmentMode: targetProgram.assignmentMode,
      providerCourses,
    },
    citations: citations.map(citation),
  };
}
