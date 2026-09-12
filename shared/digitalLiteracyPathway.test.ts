import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIGITALLEARN_LICENSE_NAME,
  DIGITALLEARN_LICENSE_URL,
  DIGITALLEARN_PROVIDER,
  DIGITALLEARN_TERMS_URL,
  DIGITAL_LITERACY_MODULES,
  DIGITAL_LITERACY_TOTAL_MINUTES,
  digitalLiteracyCatalogCourses,
} from './digitalLiteracyPathway';

const EXPECTED_MODULES = [
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
] as const;

function allDestinations(): string[] {
  return DIGITAL_LITERACY_MODULES.flatMap((module) =>
    module.lessons.flatMap((lesson) => [lesson.url, ...(lesson.fallbackUrl ? [lesson.fallbackUrl] : [])]),
  );
}

test('the pathway preserves the exact ten-module sequence and stable keys', () => {
  assert.deepEqual(DIGITAL_LITERACY_MODULES.map((module) => module.name), EXPECTED_MODULES);
  assert.equal(new Set(DIGITAL_LITERACY_MODULES.map((module) => module.key)).size, 10);
});

test('destinations are current DigitalLearn pages or explicitly labeled material fallbacks', () => {
  for (const pathwayModule of DIGITAL_LITERACY_MODULES) {
    assert.ok(pathwayModule.lessons.length > 0, pathwayModule.name);
    assert.ok(pathwayModule.topics.length > 0, pathwayModule.name);
    for (const lesson of pathwayModule.lessons) {
      assert.match(lesson.url, /^https:\/\/(?:www\.|training\.)digitallearn\.org\//, lesson.title);
      assert.ok(lesson.minutes > 0, lesson.title);
      assert.match(lesson.verificationLabel, /2026-09-12/, lesson.title);
      if (lesson.destinationKind !== 'verified-course') {
        assert.match(lesson.verificationLabel, /fallback|no playable lesson rows/i, lesson.title);
      }
    }
  }

  const destinations = allDestinations();
  const accounts = DIGITAL_LITERACY_MODULES.find((module) => module.key === 'accounts-and-passwords');
  assert.equal(accounts?.lessons[0]?.destinationKind, 'course-details-with-materials-fallback');
  assert.match(accounts?.lessons[0]?.verificationLabel ?? '', /no playable lesson rows/i);

  const video = DIGITAL_LITERACY_MODULES.find((module) => module.key === 'video-conferencing-basics');
  assert.equal(video?.lessons[0]?.destinationKind, 'course-details-with-materials-fallback');
  assert.match(video?.lessons[0]?.verificationLabel ?? '', /no playable lesson rows/i);

  assert.ok(destinations.includes('https://www.digitallearn.org/courses/basics-of-video-conferencing'));
  assert.ok(destinations.includes('https://training.digitallearn.org/courses/video-conferencing-basics'));
  assert.ok(destinations.includes('https://www.digitallearn.org/courses/online-frauds-and-scams-2025'));
  assert.ok(destinations.includes('https://training.digitallearn.org/courses/computer-basics-windows-10-87e0526c-b9a9-4d0b-9af2-e8db08ac85c0'));
  assert.ok(destinations.includes('https://www.digitallearn.org/courses/microsoft-word'));
  assert.ok(destinations.includes('https://www.digitallearn.org/courses/applying-for-jobs-online'));

  for (const unhealthy of [
    'https://www.digitallearn.org/courses/creating-documents',
    'https://www.digitallearn.org/courses/video-conferencing',
    'https://www.digitallearn.org/courses/online-scams',
  ]) {
    assert.equal(destinations.includes(unhealthy), false, unhealthy);
  }
});

test('the deterministic linked-learning estimate remains well under 25 hours', () => {
  assert.equal(DIGITAL_LITERACY_TOTAL_MINUTES, 235);
  assert.ok(DIGITAL_LITERACY_TOTAL_MINUTES / 60 < 25);
});

test('catalog modules retain WorkforceAP completion routing and truthful provider metadata', () => {
  const courses = digitalLiteracyCatalogCourses();
  assert.equal(courses.length, 10);
  assert.equal(courses[0].slug, 'digital-literacy-empowerment-class-course-1');
  assert.equal(courses[9].slug, 'digital-literacy-empowerment-class-course-10');
  for (const course of courses) {
    assert.equal(course.kind, 'workforceap');
    assert.ok(course.estimatedHours >= 0.25);
    assert.ok(course.lessons.length > 0);
    assert.equal(course.provider, DIGITALLEARN_PROVIDER);
  }
  assert.match(DIGITALLEARN_PROVIDER.accessNote, /account is optional/);
  assert.match(DIGITALLEARN_PROVIDER.languageNote, /English\/Español/);
  assert.match(DIGITALLEARN_PROVIDER.attribution, /does not imply DigitalLearn endorsement/);
  assert.equal(DIGITALLEARN_LICENSE_NAME, 'CC BY-NC-SA 4.0');
  assert.equal(DIGITALLEARN_LICENSE_URL, 'https://creativecommons.org/licenses/by-nc-sa/4.0/');
  assert.equal(DIGITALLEARN_TERMS_URL, 'https://training.digitallearn.org/terms_of_use');
});
