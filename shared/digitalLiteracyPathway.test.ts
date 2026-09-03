import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIGITAL_LITERACY_MODULES,
  DIGITAL_LITERACY_TOTAL_MINUTES,
  digitalLiteracyCatalogCourses,
} from './digitalLiteracyPathway';

test('the pathway is the ten-module recommended sequence, in order', () => {
  assert.deepEqual(
    DIGITAL_LITERACY_MODULES.map((m) => m.name),
    [
      'Computer Basics',
      'File Management Basics',
      'Internet Basics',
      'Email Basics',
      'Accounts and Passwords',
      'Video Conferencing Basics',
      'Cybersecurity Basics: Online Scams and Fraud',
      'Cloud Storage',
      'Microsoft Word Basics',
      'Online Job Searching and Applications',
    ],
  );
  assert.equal(new Set(DIGITAL_LITERACY_MODULES.map((m) => m.key)).size, 10);
});

test('every lesson links to DigitalLearn.org over https and the total stays well under 25 hours', () => {
  for (const mod of DIGITAL_LITERACY_MODULES) {
    assert.ok(mod.lessons.length > 0, mod.name);
    assert.ok(mod.topics.length > 0, mod.name);
    for (const lesson of mod.lessons) {
      assert.match(lesson.url, /^https:\/\/www\.digitallearn\.org\/courses\/[a-z0-9-]+$/, lesson.title);
      assert.ok(lesson.minutes > 0, lesson.title);
    }
  }
  assert.equal(DIGITAL_LITERACY_TOTAL_MINUTES, 226);
  assert.ok(DIGITAL_LITERACY_TOTAL_MINUTES / 60 < 25);
});

test('catalog courses are WorkforceAP modules with stable slugs and lesson links', () => {
  const courses = digitalLiteracyCatalogCourses();
  assert.equal(courses.length, 10);
  assert.equal(courses[0].slug, 'digital-literacy-empowerment-class-course-1');
  assert.equal(courses[9].slug, 'digital-literacy-empowerment-class-course-10');
  for (const c of courses) {
    assert.equal(c.kind, 'workforceap');
    assert.ok(c.estimatedHours >= 0.25);
    assert.ok(c.lessons.length > 0);
  }
});
