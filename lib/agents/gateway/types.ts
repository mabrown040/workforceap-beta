import type { RlsRole } from '@/lib/db/gucContext';

export const MEMBER_AGENT_TOOL_NAMES = [
  'get_my_next_step',
  'get_training_status',
  'get_coursera_progress',
] as const;

export type MemberAgentToolName = (typeof MEMBER_AGENT_TOOL_NAMES)[number];

/**
 * Identity established by verified server auth. This object is never part of
 * an ElevenLabs/model tool schema and must never be built from tool arguments.
 */
export type AuthenticatedAgentPrincipal = Readonly<{
  userId: string;
  organizationId: string;
  role: Exclude<RlsRole, 'anonymous' | 'system'>;
}>;

export type AgentGatewayStatus =
  | 'ok'
  | 'not_found'
  | 'unavailable'
  | 'invalid_request';

export type AgentGatewaySource = Readonly<{
  system: 'workforceap';
  records: readonly string[];
  mode: 'read_only';
  /** Latest source timestamp when the source exposes one. */
  freshThrough: string | null;
}>;

export type AgentGatewayHandoff = Readonly<{
  recommended: boolean;
  destination: 'none' | 'portal' | 'counselor' | 'support';
  href: string | null;
  reason: string | null;
}>;

export type AgentGatewayResponse<T> = Readonly<{
  status: AgentGatewayStatus;
  asOf: string;
  source: AgentGatewaySource;
  data: T;
  memberFacingMessage: string;
  handoff: AgentGatewayHandoff;
}>;

export type MemberNextStepData = Readonly<{
  action: Readonly<{
    id: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  }> | null;
}>;

export type MemberTrainingStatusData = Readonly<{
  programName: string | null;
  programSlug: string | null;
  curriculumVersion: string | null;
  status: 'not_assigned' | 'not_started' | 'in_progress' | 'complete' | 'unavailable';
  completedCourses: number;
  totalCourses: number;
  progressPercent: number;
  nextCourseName: string | null;
  lastActivityAt: string | null;
  curriculumTruth: Readonly<{
    governanceState: 'verified' | 'unavailable';
    approvalState: 'approved' | 'unknown';
    approvedTitle: string | null;
    approvedCourseCount: number | null;
    approvedVersion: string | null;
    /** True only when the governed approved version exactly matches this enrollment. */
    appliesToEnrollment: boolean;
    enrollmentVersionMatch: 'match' | 'mismatch' | 'unknown';
    courseraAvailability: 'blocked' | 'canary' | 'enabled' | 'not_governed' | 'unknown';
    launchable: boolean;
    operationalAsOf: string | null;
    reason: string;
    citations: readonly string[];
  }> | null;
}>;

export type MemberCourseraProgressData = Readonly<{
  linked: boolean;
  totalCourses: number;
  completedCourses: number;
  averageProgressPercent: number;
  lastActivityAt: string | null;
  lastSyncedAt: string | null;
  courses: ReadonlyArray<
    Readonly<{
      name: string;
      programName: string | null;
      progressPercent: number;
      completed: boolean;
      lastActivityAt: string | null;
      certificateAvailable: boolean;
    }>
  >;
}>;

export type MemberGatewaySnapshot = Readonly<{
  programName: string | null;
  programSlug: string | null;
  curriculumVersion: string | null;
  nextActions: ReadonlyArray<{
    id: string;
    title: string;
    body: string;
    href: string;
    cta: string;
  }>;
  training: Readonly<{
    completedCount: number;
    totalCourses: number;
    progressPercent: number;
    allComplete: boolean;
    hasStarted: boolean;
    nextCourseName: string | null;
    lastActivityAt: Date | null;
  }> | null;
  programKnowledge: Readonly<{
    governanceState: 'verified' | 'unavailable';
    approvalState: 'approved' | 'unknown';
    approvedTitle: string | null;
    approvedCourseCount: number | null;
    approvedVersion: string | null;
    /** Computed at the gateway boundary; source readers must not assert it. */
    appliesToEnrollment?: boolean;
    enrollmentVersionMatch?: 'match' | 'mismatch' | 'unknown';
    courseraAvailability: 'blocked' | 'canary' | 'enabled' | 'not_governed' | 'unknown';
    launchable: boolean;
    operationalAsOf: string | null;
    reason: string;
    citations: readonly string[];
  }> | null;
}>;

export type CourseraGatewaySnapshot = Readonly<{
  totalCourses: number;
  completedCourses: number;
  averageProgressPercent: number;
  lastActivityAt: Date | null;
  lastSyncedAt: Date | null;
  courses: ReadonlyArray<{
    name: string;
    programName: string | null;
    progressPercent: number;
    completed: boolean;
    lastActivityAt: Date | null;
    certificateAvailable: boolean;
  }>;
}>;

export type MemberAgentGatewayReader = Readonly<{
  memberExistsInScope(principal: AuthenticatedAgentPrincipal): Promise<boolean>;
  loadMemberSnapshot(principal: AuthenticatedAgentPrincipal): Promise<MemberGatewaySnapshot | null>;
  loadCourseraSnapshot(principal: AuthenticatedAgentPrincipal): Promise<CourseraGatewaySnapshot | null>;
}>;

export type MemberAgentGateway = Readonly<{
  getMyNextStep(): Promise<AgentGatewayResponse<MemberNextStepData>>;
  getTrainingStatus(): Promise<AgentGatewayResponse<MemberTrainingStatusData>>;
  getCourseraProgress(): Promise<AgentGatewayResponse<MemberCourseraProgressData>>;
  /** Provider-boundary dispatch. Only `{ tool }` is accepted. */
  invoke(input: unknown): Promise<AgentGatewayResponse<unknown>>;
}>;
