import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { POINT_VALUES } from '@/lib/member/pointsConfig';

import {
  planDemoMemberPoints,
  planDemoMemberProgress,
} from './demoProgressPlan';

describe('planDemoMemberProgress', () => {
  it('maps the IBM demo slug onto IBM catalog courses and live progress counts', () => {
    const plan = planDemoMemberProgress({
      program: 'ai-professional-developer-certificate-ibm',
      coursesCompleted: ['Module 1: Python Basics', 'Module 2: Data Structures', 'Module 3: ML Fundamentals'],
      assessmentScore: 84,
      status: 'enrolled',
    });

    assert.ok(plan);
    assert.equal(plan.programSlug, 'software-developer-professional-certificate-ibm');
    assert.equal(plan.partner, 'IBM');
    assert.match(plan.programTitle ?? '', /IBM/);
    assert.doesNotMatch(plan.programTitle ?? '', /AWS|Amazon/);
    assert.equal(plan.coursesCompletedCount, 3);
    assert.equal(plan.completedCourses.length, 3);
    assert.ok(plan.totalPoints > 0);
    assert.equal(plan.awardCertificate, false);
  });

  it('falls back to the first N catalog courses when seed names are stale', () => {
    const plan = planDemoMemberProgress({
      program: 'digital-literacy-empowerment-class',
      coursesCompleted: ['Module 1: Device Distribution & Setup', 'Module 2: Introduction to Emails'],
      assessmentScore: 68,
      status: 'enrolled',
    });
    assert.ok(plan);
    assert.equal(plan.completedCourses.length, 2);
    assert.equal(plan.programSlug, 'digital-literacy-empowerment-class');
  });

  it('awards a certificate and placement points for placed members', () => {
    const plan = planDemoMemberProgress({
      program: 'aws-cloud-technology-amazon',
      coursesCompleted: [
        'Module 1: Cloud Practitioner Essentials',
        'Module 2: AWS Core Services',
        'Module 3: Security on AWS',
        'Module 4: Architecting on AWS',
        'Module 5: AWS Solutions Architect Associate',
      ],
      assessmentScore: 91,
      status: 'placed',
    });

    assert.ok(plan);
    assert.equal(plan.awardCertificate, true);
    assert.ok(plan.pointsEvents.some((event) => event.event === 'placement_recorded'));
    assert.ok(plan.totalPoints >= POINT_VALUES.placement_recorded);
  });
});

describe('planDemoMemberPoints', () => {
  it('sums assessment, enrollment, and course events', () => {
    const result = planDemoMemberPoints({
      completedCourseSlugs: ['course-a', 'course-b'],
      assessmentScore: 80,
      status: 'enrolled',
      dailyStudyDays: 0,
    });
    assert.equal(
      result.totalPoints,
      POINT_VALUES.assessment_completed + POINT_VALUES.program_enrolled + POINT_VALUES.course_completed * 2,
    );
  });
});
