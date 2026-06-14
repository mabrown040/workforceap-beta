export type CareerPlanActivationStage =
  | 'quiz_result'
  | 'plan_saved'
  | 'application_started'
  | 'application_submitted'
  | 'training_started';

export type CareerPlanSignal = {
  typeLabel: string | null;
  topCareerTitle: string | null;
  selectedProgramSlug: string | null;
  stage: CareerPlanActivationStage;
  committedAt: Date | null;
  shareCount: number;
  staffAction: string;
};

type CareerPlanEvent = {
  eventName: string;
  createdAt: Date;
  metadata?: unknown;
};

type CareerPlanApplication = {
  status?: string | null;
  submittedAt?: Date | string | null;
  recommendedCareerTitle?: string | null;
  programRankedSlugs?: unknown;
};

export type DeriveCareerPlanSignalInput = {
  careerRecommendationJson: unknown;
  applications: CareerPlanApplication[];
  events: CareerPlanEvent[];
  enrolledProgram: string | null;
  activeCourseCount: number;
  progressPercent: number;
  now?: Date;
};

const CAREER_PLAN_EVENT_NAMES = new Set([
  'career_quiz_result_viewed',
  'career_plan_saved',
  'career_plan_commitment_shared',
  'career_plan_application_started',
  'career_plan_training_cta_clicked',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function programSlugsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter((slug): slug is string => Boolean(slug));
}

function extractCareerPlanDetails(value: unknown): {
  typeLabel: string | null;
  topCareerTitle: string | null;
  selectedProgramSlug: string | null;
} | null {
  if (!isRecord(value)) return null;

  const typeLabel = stringValue(value.typeLabel);
  const selectedProgramSlug =
    stringValue(value.selectedProgramSlug) ??
    stringValue(value.programSlug) ??
    programSlugsFrom(value.programSlugs)[0] ??
    null;
  const topCareer = isRecord(value.topCareer) ? value.topCareer : null;
  const topCareerTitle =
    stringValue(value.topCareerTitle) ??
    stringValue(value.recommendedCareerTitle) ??
    stringValue(topCareer?.title) ??
    (Array.isArray(value.careers) && isRecord(value.careers[0])
      ? stringValue(value.careers[0].title)
      : null) ??
    (Array.isArray(value.topOccupations) && isRecord(value.topOccupations[0])
      ? stringValue(value.topOccupations[0].title)
      : null);

  if (!typeLabel && !topCareerTitle && !selectedProgramSlug) return null;
  return { typeLabel, topCareerTitle, selectedProgramSlug };
}

function extractSnapshot(careerRecommendationJson: unknown): ({
  committedAt: Date | null;
  shareCount: number;
} & NonNullable<ReturnType<typeof extractCareerPlanDetails>>) | null {
  if (!isRecord(careerRecommendationJson)) return null;

  const source = stringValue(careerRecommendationJson.source);
  const details = extractCareerPlanDetails(careerRecommendationJson);
  if (source !== 'career_quiz' && !details) return null;

  const shareCountRaw = careerRecommendationJson.shareCount;
  const shareCount = typeof shareCountRaw === 'number' && Number.isFinite(shareCountRaw) && shareCountRaw > 0
    ? Math.floor(shareCountRaw)
    : 0;

  return {
    typeLabel: details?.typeLabel ?? null,
    topCareerTitle: details?.topCareerTitle ?? null,
    selectedProgramSlug: details?.selectedProgramSlug ?? null,
    committedAt: dateValue(careerRecommendationJson.lastCommittedAt) ?? dateValue(careerRecommendationJson.createdAt),
    shareCount,
  };
}

function latestEvent(events: CareerPlanEvent[], names: string[]): CareerPlanEvent | null {
  const wanted = new Set(names);
  return events
    .filter((event) => wanted.has(event.eventName))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

function isSubmitted(application: CareerPlanApplication): boolean {
  return Boolean(application.submittedAt) || application.status === 'APPROVED' || application.status === 'DENIED' || application.status === 'NEEDS_INFO';
}

function applicationHasCareerPlan(application: CareerPlanApplication): boolean {
  return Boolean(application.recommendedCareerTitle);
}

function resolveStaffAction(stage: CareerPlanActivationStage, hoursSinceCommitted: number | null): string {
  if (stage === 'training_started') return 'Celebrate: training started from saved career plan';
  if (stage === 'application_submitted') return 'Nudge: enrolled but course 1 not started';
  if (stage === 'application_started') return 'Text: application started from plan but not submitted';
  if (stage === 'plan_saved' && (hoursSinceCommitted === null || hoursSinceCommitted >= 24)) {
    return 'Call: high-intent plan saved but no application after 24h';
  }
  if (stage === 'plan_saved') return 'Watch: saved career plan, follow up if no application after 24h';
  return 'Review: quiz result viewed; invite them to save the plan and start training';
}

export function deriveCareerPlanSignal(input: DeriveCareerPlanSignalInput): CareerPlanSignal | null {
  const relevantEvents = input.events.filter((event) => CAREER_PLAN_EVENT_NAMES.has(event.eventName));
  const snapshot = extractSnapshot(input.careerRecommendationJson);
  const careerPlanApplications = input.applications.filter(applicationHasCareerPlan);

  if (!snapshot && relevantEvents.length === 0 && careerPlanApplications.length === 0) return null;

  const latestQuiz = latestEvent(relevantEvents, ['career_quiz_result_viewed']);
  const latestSaved = latestEvent(relevantEvents, ['career_plan_saved']);
  const latestShared = latestEvent(relevantEvents, ['career_plan_commitment_shared']);
  const latestApplicationStarted = latestEvent(relevantEvents, ['career_plan_application_started']);
  const eventDetails =
    extractCareerPlanDetails(latestApplicationStarted?.metadata) ??
    extractCareerPlanDetails(latestSaved?.metadata) ??
    extractCareerPlanDetails(latestShared?.metadata) ??
    extractCareerPlanDetails(latestQuiz?.metadata);
  const selectedProgramSlug =
    snapshot?.selectedProgramSlug ??
    eventDetails?.selectedProgramSlug ??
    programSlugsFrom(careerPlanApplications[0]?.programRankedSlugs)[0] ??
    input.enrolledProgram ??
    null;
  const topCareerTitle =
    snapshot?.topCareerTitle ??
    eventDetails?.topCareerTitle ??
    careerPlanApplications.find((app) => app.recommendedCareerTitle)?.recommendedCareerTitle ??
    null;
  const submittedApplication = careerPlanApplications.find(isSubmitted);
  const startedApplication = careerPlanApplications.length > 0 || Boolean(latestApplicationStarted);

  let stage: CareerPlanActivationStage = snapshot || latestSaved || latestShared ? 'plan_saved' : 'quiz_result';
  if (startedApplication) stage = submittedApplication ? 'application_submitted' : 'application_started';
  if (input.progressPercent > 0 || input.activeCourseCount > 0 || latestEvent(relevantEvents, ['career_plan_training_cta_clicked'])) {
    stage = 'training_started';
  }

  const committedAt = latestShared?.createdAt ?? latestSaved?.createdAt ?? snapshot?.committedAt ?? null;
  const hoursSinceCommitted = committedAt
    ? Math.max(0, (input.now?.getTime() ?? Date.now()) - committedAt.getTime()) / (1000 * 60 * 60)
    : null;
  const eventShareCount = relevantEvents.filter((event) => event.eventName === 'career_plan_commitment_shared').length;

  return {
    typeLabel: snapshot?.typeLabel ?? eventDetails?.typeLabel ?? null,
    topCareerTitle,
    selectedProgramSlug,
    stage,
    committedAt,
    shareCount: (snapshot?.shareCount ?? 0) + eventShareCount,
    staffAction: resolveStaffAction(stage, hoursSinceCommitted),
  };
}
