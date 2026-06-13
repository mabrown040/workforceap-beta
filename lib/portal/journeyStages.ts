/**
 * Journey-first AI toolkit: maps where a member is in their job journey to the
 * 2-3 tools that move the needle at that stage. Additive beta layer over the
 * full toolkit grid — selection lives in localStorage (no schema change) and is
 * mirrored to MemberEvent for analytics.
 */

export type JourneyStageId = 'getting_ready' | 'applying' | 'interviewing' | 'got_offer';

export type JourneyStageTool = {
  /** i18n key suffix under `journeyGuide.tools` */
  key: string;
  href: string;
  icon: string;
  minutes: number;
};

export type JourneyStage = {
  id: JourneyStageId;
  /** i18n key suffix under `journeyGuide.stages` */
  key: string;
  icon: string;
  tools: JourneyStageTool[];
};

export const JOURNEY_STAGE_STORAGE_KEY = 'wap_journey_stage';

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'getting_ready',
    key: 'gettingReady',
    icon: 'menu_book',
    tools: [
      { key: 'resumeStudio', href: '/dashboard/ai-tools/resume-studio', icon: 'fact_check', minutes: 5 },
      { key: 'skillMapper', href: '/dashboard/ai-tools/skill-mapper', icon: 'account_tree', minutes: 5 },
      { key: 'skillCheckpoints', href: '/dashboard/ai-tools/skill-checkpoints', icon: 'verified', minutes: 5 },
      { key: 'trainingBridge', href: '/dashboard/ai-tools/training-bridge', icon: 'alt_route', minutes: 5 },
    ],
  },
  {
    id: 'applying',
    key: 'applying',
    icon: 'flight_takeoff',
    tools: [
      { key: 'jobMatchScorer', href: '/dashboard/ai-tools/job-match-scorer', icon: 'query_stats', minutes: 5 },
      { key: 'coverLetter', href: '/dashboard/ai-tools/cover-letter', icon: 'draft', minutes: 10 },
      { key: 'gapAnalyzer', href: '/dashboard/ai-tools/gap-analyzer', icon: 'troubleshoot', minutes: 5 },
    ],
  },
  {
    id: 'interviewing',
    key: 'interviewing',
    icon: 'forum',
    tools: [
      { key: 'interviewPractice', href: '/dashboard/ai-tools/interview-practice?prefill=true', icon: 'record_voice_over', minutes: 10 },
      { key: 'voiceInterview', href: '/dashboard/ai-tools/voice-interview', icon: 'mic', minutes: 15 },
      { key: 'elevatorPitch', href: '/dashboard/ai-tools/elevator-pitch?prefill=true', icon: 'campaign', minutes: 5 },
    ],
  },
  {
    id: 'got_offer',
    key: 'gotOffer',
    icon: 'star',
    tools: [
      { key: 'salaryNegotiation', href: '/dashboard/ai-tools/salary-negotiation', icon: 'payments', minutes: 10 },
      { key: 'benefitsCliff', href: '/dashboard/ai-tools/benefits-cliff', icon: 'account_balance', minutes: 5 },
      { key: 'careerCoach', href: '/dashboard/ai-tools/career-business-coach', icon: 'business_center', minutes: 10 },
    ],
  },
];

export function isJourneyStageId(value: string | null): value is JourneyStageId {
  return JOURNEY_STAGES.some((s) => s.id === value);
}
