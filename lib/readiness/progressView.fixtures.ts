import type { ScoreBreakdown } from './score';

/** Production dashboard screenshot: 86% / 100, 60, 83, 100 with "apply to 3 jobs". */
export const SCREENSHOT_86_BREAKDOWN: ScoreBreakdown = {
  completeProfile: { earned: 5, max: 5, done: true },
  setGoals: { earned: 10, max: 10, done: true },
  buildResume: { earned: 20, max: 20, done: true },
  complete2Resources: { earned: 10, max: 10, done: true },
  practiceInterview: { earned: 15, max: 15, done: true },
  startPathway: { earned: 5, max: 5, done: true },
  completePathwaySteps: { earned: 6, max: 15, done: false },
  addApplications: { earned: 10, max: 15, done: false },
  trackCertifications: { earned: 0, max: 5, done: false },
  weeklyConsistency: { earned: 5, max: 5, done: true },
};

export function zeroScoreBreakdown(): ScoreBreakdown {
  return {
    completeProfile: { earned: 0, max: 5, done: false },
    setGoals: { earned: 0, max: 10, done: false },
    buildResume: { earned: 0, max: 20, done: false },
    complete2Resources: { earned: 0, max: 10, done: false },
    practiceInterview: { earned: 0, max: 15, done: false },
    startPathway: { earned: 0, max: 5, done: false },
    completePathwaySteps: { earned: 0, max: 15, done: false },
    addApplications: { earned: 0, max: 15, done: false },
    trackCertifications: { earned: 0, max: 5, done: false },
    weeklyConsistency: { earned: 0, max: 5, done: false },
  };
}
