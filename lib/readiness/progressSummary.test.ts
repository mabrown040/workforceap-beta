import { describe, expect, test } from 'vitest';
import { SCREENSHOT_86_BREAKDOWN, zeroScoreBreakdown } from './progressView.fixtures';
import { buildReadinessProgressView } from './progressView';
import {
  READINESS_EMPTY_RECAP,
  buildFactualReadinessRecap,
  buildReadinessSummaryPrompt,
  cleanReadinessSummary,
  readinessSummaryLooksGrounded,
} from './progressSummary';

describe('buildFactualReadinessRecap', () => {
  test('explains the 86% screenshot without inventing progress', () => {
    const recap = buildFactualReadinessRecap(buildReadinessProgressView(SCREENSHOT_86_BREAKDOWN));
    expect(recap).toContain('86%');
    expect(recap).toContain('86 of 105 weighted points');
    expect(recap).toContain('Resume & Profile');
    expect(recap).toContain('Engagement');
    expect(recap).toContain('Training & Certs is 60%');
    expect(recap).toContain('Complete pathway steps (6/15)');
    expect(recap).toContain('Track certificates (0/5)');
    expect(recap).toContain('Interview & Jobs is 83%');
    expect(recap).toContain('Add applications (10/15)');
    expect(recap).toContain('Apply to at least 3 jobs');
    expect(recap).not.toMatch(/preassessment/i);
    expect(recap).not.toMatch(/AWS/i);
  });

  test('empty score stays an honest zero recap', () => {
    const recap = buildFactualReadinessRecap(buildReadinessProgressView(zeroScoreBreakdown()));
    expect(recap.startsWith(READINESS_EMPTY_RECAP)).toBe(true);
    expect(recap).toContain('Build or upload your resume');
  });
});

describe('readinessSummaryLooksGrounded', () => {
  const view = buildReadinessProgressView(SCREENSHOT_86_BREAKDOWN);

  test('accepts a recap that only cites known percents', () => {
    const text =
      'Your readiness score is 86%. Resume and engagement are complete. Training is 60% and interview is 83% because applications are not at three yet. Next: apply to at least 3 jobs.';
    expect(readinessSummaryLooksGrounded(text, view)).toBe(true);
  });

  test('rejects invented percents', () => {
    const text =
      'Great work — you are 92% ready and have finished 100% of training this week.';
    expect(readinessSummaryLooksGrounded(text, view)).toBe(false);
  });

  test('rejects empty or tiny model output', () => {
    expect(readinessSummaryLooksGrounded('Looks good.', view)).toBe(false);
  });
});

describe('buildReadinessSummaryPrompt', () => {
  test('prompt carries the live numbers as JSON facts', () => {
    const { system, user } = buildReadinessSummaryPrompt(
      buildReadinessProgressView(SCREENSHOT_86_BREAKDOWN),
    );
    expect(system).toContain('Do not invent');
    const facts = JSON.parse(user) as { overallScorePct: number; nextAction: string };
    expect(facts.overallScorePct).toBe(86);
    expect(facts.nextAction).toContain('Apply to at least 3 jobs');
  });
});

describe('cleanReadinessSummary', () => {
  test('strips markdown wrappers', () => {
    expect(cleanReadinessSummary('**Your score is 86%.**')).toBe('Your score is 86%.');
  });
});
