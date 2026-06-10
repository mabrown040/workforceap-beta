import { describe, expect, test } from 'vitest';
import { buildNextBestActions } from './nextBestActions';

describe('buildNextBestActions', () => {
  test('prioritizes new application on file', () => {
    const actions = buildNextBestActions({
      state: 'A',
      noApplicationOnFile: true,
      enrolledProgram: null,
      assessmentCompleted: false,
      starterProfileReviewRequired: false,
      hasResume: false,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 20,
      jobApplicationCount: 0,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });
    expect(actions[0]?.id).toBe('submit_application');
  });

  test('prioritizes counselor unread when application exists', () => {
    const actions = buildNextBestActions({
      state: 'C',
      noApplicationOnFile: false,
      enrolledProgram: 'ai-software',
      assessmentCompleted: true,
      completedCourseCount: 0,
      starterProfileReviewRequired: false,
      hasResume: true,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 80,
      jobApplicationCount: 2,
      counselorUnreadCount: 3,
      weeklyRecapUnopened: false,
    });
    expect(actions[0]?.id).toBe('counselor_messages');
  });

  test('suggests tracker when eligible and no applications', () => {
    const actions = buildNextBestActions({
      state: 'D',
      noApplicationOnFile: false,
      enrolledProgram: 'ai-software',
      assessmentCompleted: true,
      completedCourseCount: 1,
      starterProfileReviewRequired: false,
      hasResume: true,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 90,
      jobApplicationCount: 0,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });
    expect(actions.some((a) => a.id === 'job_tracker')).toBe(true);
  });

  test('adds state-D readiness actions', () => {
    const actions = buildNextBestActions({
      state: 'D',
      noApplicationOnFile: false,
      enrolledProgram: 'ai-software',
      assessmentCompleted: true,
      completedCourseCount: 2,
      starterProfileReviewRequired: false,
      hasResume: true,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 90,
      jobApplicationCount: 1,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });

    expect(actions.some((a) => a.id === 'interview_practice')).toBe(true);
    expect(actions.some((a) => a.id === 'career_readiness')).toBe(true);
  });

  test('routes missing resume to resume rewriter', () => {
    const actions = buildNextBestActions({
      state: 'D',
      noApplicationOnFile: false,
      enrolledProgram: 'ai-software',
      assessmentCompleted: true,
      completedCourseCount: 2,
      starterProfileReviewRequired: false,
      hasResume: false,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 90,
      jobApplicationCount: 1,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });

    const resumeAction = actions.find((a) => a.id === 'upload_resume');
    expect(resumeAction?.href).toBe('/dashboard/ai-tools/resume-studio?view=rewrite');
  });

  test('prioritizes starter profile review for counselor-created members', () => {
    const actions = buildNextBestActions({
      state: 'B',
      noApplicationOnFile: false,
      enrolledProgram: 'it-support',
      assessmentCompleted: false,
      completedCourseCount: 0,
      starterProfileReviewRequired: true,
      starterProfileMissingFields: ['ZIP code', 'referral source'],
      hasResume: false,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 40,
      jobApplicationCount: 0,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });

    expect(actions[0]?.id).toBe('review_starter_profile');
    expect(actions[0]?.href).toBe('/dashboard/profile');
  });

  test('hides interview practice after true completion', () => {
    const actions = buildNextBestActions({
      state: 'D',
      noApplicationOnFile: false,
      enrolledProgram: 'ai-software',
      assessmentCompleted: true,
      completedCourseCount: 2,
      starterProfileReviewRequired: false,
      hasResume: true,
      hasCompletedInterviewPractice: true,
      profileCompletenessPct: 90,
      jobApplicationCount: 1,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });

    expect(actions.some((a) => a.id === 'interview_practice')).toBe(false);
  });

  test('adds first-course launch guidance before training starts', () => {
    const actions = buildNextBestActions({
      state: 'C',
      noApplicationOnFile: false,
      enrolledProgram: 'it-support',
      assessmentCompleted: true,
      completedCourseCount: 0,
      starterProfileReviewRequired: false,
      hasResume: true,
      hasCompletedInterviewPractice: false,
      profileCompletenessPct: 70,
      jobApplicationCount: 0,
      counselorUnreadCount: 0,
      weeklyRecapUnopened: false,
    });

    expect(actions.some((a) => a.id === 'launch_first_course')).toBe(true);
    expect(actions.some((a) => a.id === 'see_training_plan')).toBe(true);
  });
});
