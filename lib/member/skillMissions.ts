import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  getSkillMissionDefinitionsForProgram,
  getSkillMissionDefinition as getDefFromCatalog,
  type SkillMissionDefinition,
} from '@/lib/content/skillMissionCatalog';

export { type SkillMissionDefinition };

export const MISSION_EVENT_SUBMITTED = 'skill_mission_submitted';
export const MISSION_EVENT_PASSED = 'skill_mission_passed';
export const MISSION_EVENT_RETRY = 'skill_mission_needs_retry';

export type MissionStatus = 'locked' | 'ready' | 'passed' | 'needs_retry';

export type MissionResult = {
  verdict: 'passed' | 'needs_retry';
  coachingNote: string;
  starStory: string;
  resumeBullet: string;
  skillsUnlocked: string[];
};

export type SkillMissionSummaryItem = SkillMissionDefinition & {
  status: MissionStatus;
  completedAt: Date | null;
  latestResult: MissionResult | null;
  aiToolResultId: string | null;
};

export type SkillMissionSummary = {
  programSlug: string;
  programTitle: string | null;
  totalMissions: number;
  passedCount: number;
  readyCount: number;
  retryCount: number;
  streak: number;
  careerReadinessPct: number;
  demonstratedSkills: string[];
  missions: SkillMissionSummaryItem[];
};

export async function loadSkillMissionSummary(args: {
  userId: string;
  programSlug: string | null;
  completedCourseSlugs: string[];
}): Promise<SkillMissionSummary | null> {
  if (!args.programSlug) return null;
  const definitions = getSkillMissionDefinitionsForProgram(args.programSlug);
  if (!definitions.length) return null;

  const missionKeys = definitions.map((d) => d.key);

  const events = await prisma.memberEvent.findMany({
    where: {
      userId: args.userId,
      entityType: 'skill_checkpoint',
      entityId: { in: missionKeys },
      eventName: { in: [MISSION_EVENT_PASSED, MISSION_EVENT_RETRY] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      eventName: true,
      entityId: true,
      createdAt: true,
      metadata: true,
    },
  });

  // Build map of entityId → latest event (most recent createdAt wins due to asc order)
  const latestEventMap = new Map<
    string,
    { eventName: string; createdAt: Date; metadata: unknown }
  >();
  for (const event of events) {
    if (event.entityId) {
      latestEventMap.set(event.entityId, {
        eventName: event.eventName,
        createdAt: event.createdAt,
        metadata: event.metadata,
      });
    }
  }

  function asRecord(v: unknown): Record<string, unknown> | null {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  }

  function parseMissionResult(metadata: unknown): {
    result: MissionResult | null;
    aiToolResultId: string | null;
  } {
    const rec = asRecord(metadata);
    if (!rec) return { result: null, aiToolResultId: null };

    const verdict = rec['verdict'];
    if (verdict !== 'passed' && verdict !== 'needs_retry') {
      return { result: null, aiToolResultId: null };
    }

    const coachingNote = typeof rec['coachingNote'] === 'string' ? rec['coachingNote'] : '';
    const starStory = typeof rec['starStory'] === 'string' ? rec['starStory'] : '';
    const resumeBullet = typeof rec['resumeBullet'] === 'string' ? rec['resumeBullet'] : '';
    const rawSkills = rec['skillsUnlocked'];
    const skillsUnlocked: string[] = Array.isArray(rawSkills)
      ? rawSkills.filter((s): s is string => typeof s === 'string')
      : [];
    const aiToolResultId =
      typeof rec['aiToolResultId'] === 'string' ? rec['aiToolResultId'] : null;

    return {
      result: { verdict, coachingNote, starStory, resumeBullet, skillsUnlocked },
      aiToolResultId,
    };
  }

  const missions: SkillMissionSummaryItem[] = definitions.map((def) => {
    const latestEvent = latestEventMap.get(def.key) ?? null;

    let status: MissionStatus;
    if (!args.completedCourseSlugs.includes(def.courseSlug)) {
      status = 'locked';
    } else if (latestEvent?.eventName === MISSION_EVENT_PASSED) {
      status = 'passed';
    } else if (latestEvent?.eventName === MISSION_EVENT_RETRY) {
      status = 'needs_retry';
    } else {
      status = 'ready';
    }

    const { result: latestResult, aiToolResultId } = parseMissionResult(
      latestEvent?.metadata ?? null,
    );

    const completedAt =
      latestEvent?.eventName === MISSION_EVENT_PASSED ? latestEvent.createdAt : null;

    return {
      ...def,
      status,
      completedAt,
      latestResult,
      aiToolResultId,
    };
  });

  // Streak: count consecutive 'passed' from the END, stop at first non-passed
  let streak = 0;
  for (let i = missions.length - 1; i >= 0; i--) {
    if (missions[i].status === 'passed') {
      streak++;
    } else {
      break;
    }
  }

  // demonstratedSkills: unique skill labels from passed missions
  const skillSet = new Set<string>();
  for (const m of missions) {
    if (m.status === 'passed' && m.skillLabels) {
      for (const label of m.skillLabels) {
        skillSet.add(label);
      }
    }
  }
  const demonstratedSkills = Array.from(skillSet);

  const passedCount = missions.filter((m) => m.status === 'passed').length;
  const readyCount = missions.filter((m) => m.status === 'ready').length;
  const retryCount = missions.filter((m) => m.status === 'needs_retry').length;
  const totalMissions = definitions.length;
  const careerReadinessPct = Math.round((passedCount / totalMissions) * 100);

  return {
    programSlug: args.programSlug,
    programTitle: getProgramBySlug(args.programSlug)?.title ?? null,
    totalMissions,
    passedCount,
    readyCount,
    retryCount,
    streak,
    careerReadinessPct,
    demonstratedSkills,
    missions,
  };
}

export async function recordMissionResult(args: {
  userId: string;
  programSlug: string;
  courseSlug: string;
  result: MissionResult;
  aiToolResultId: string | null;
}): Promise<void> {
  const key = `${args.programSlug}:mission:${args.courseSlug}`;
  const eventName =
    args.result.verdict === 'passed' ? MISSION_EVENT_PASSED : MISSION_EVENT_RETRY;

  await prisma.memberEvent.create({
    data: {
      userId: args.userId,
      eventName,
      entityType: 'skill_checkpoint',
      entityId: key,
      sourcePage: '/member/missions',
      metadata: {
        ...args.result,
        aiToolResultId: args.aiToolResultId,
        courseSlug: args.courseSlug,
        programSlug: args.programSlug,
        recordedAt: new Date().toISOString(),
      },
    },
  });
}

export function getMissionDefinitionForKey(key: string): SkillMissionDefinition | null {
  const parts = key.split(':mission:');
  if (parts.length !== 2) return null;
  const [programSlug, courseSlug] = parts;
  return getDefFromCatalog(programSlug, courseSlug) ?? null;
}
