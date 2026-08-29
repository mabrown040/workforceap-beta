import test from 'node:test';
import assert from 'node:assert/strict';

import { CourseProgressStatus } from '@prisma/client';

import {
  parseCourseraGradeScore,
  planCourseraProgressPromotion,
} from './progressPromotion';

test('identity promotion never demotes an existing COMPLETED local row', () => {
  const completedAt = new Date('2026-08-20T12:00:00.000Z');
  const lastActivityAt = new Date('2026-08-21T12:00:00.000Z');
  const planned = planCourseraProgressPromotion({
    mapping: {
      programSlug: 'comptia-a-plus',
      courseSlug: 'hardware-fundamentals',
    },
    existing: {
      status: CourseProgressStatus.COMPLETED,
      percentComplete: 100,
      lastActivityAt,
    },
    row: {
      courseraCourseId: 'coursera-course-1',
      overallProgress: 24,
      isCompleted: false,
      enrollmentTime: new Date('2026-08-01T12:00:00.000Z'),
      classStartTime: null,
      lastActivityTime: new Date('2026-08-22T12:00:00.000Z'),
      completionTime: completedAt,
      courseGrade: '91%',
    },
  });

  assert.equal(planned.programSlug, 'comptia-a-professional-certificate');
  assert.equal(planned.merged.status, CourseProgressStatus.COMPLETED);
  assert.equal(planned.merged.percentComplete, 100);
  assert.equal(planned.merged.lastActivityAt?.toISOString(), '2026-08-22T12:00:00.000Z');
  assert.equal(planned.scoreScaled, 0.91);
});

test('grade parsing accepts scaled and percent values and rejects non-numeric grades', () => {
  assert.equal(parseCourseraGradeScore('0.82'), 0.82);
  assert.equal(parseCourseraGradeScore('82%'), 0.82);
  assert.equal(parseCourseraGradeScore('PASS'), null);
});
