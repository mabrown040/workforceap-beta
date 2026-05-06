import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourseraLaunchUrl, getCourseraConfig, getCourseraReadiness, _resetCourseraConfigForTesting } from './configCore';

const keysToRestore = [
  'COURSERA_COURSE_URL_TEMPLATE',
  'COURSERA_PROGRAM_URL_TEMPLATE',
  'COURSERA_PROGRAM_HOME_URL',
  'COURSERA_PROGRAM_ID',
  'COURSERA_PROGRAM_ID_MAP',
  'COURSERA_COURSE_ID_MAP',
  'COURSERA_API_TOKEN',
  'COURSERA_APP_KEY',
  'COURSERA_APP_SECRET',
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(keysToRestore.map((k) => [k, process.env[k]]));
}

function restoreEnv(prev: Record<string, string | undefined>) {
  for (const k of keysToRestore) {
    const v = prev[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test('buildCourseraLaunchUrl: learn template uses coursera.org/learn with enroll', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_COURSE_URL_TEMPLATE =
    'https://www.coursera.org/learn/{courseId}?enroll=true';
  process.env.COURSERA_COURSE_ID_MAP = JSON.stringify({ 'test-program': ['course-enroll-001'] });

  const url = buildCourseraLaunchUrl({
    programSlug: 'test-program',
    userId: 'user-1',
    email: 'm@example.com',
    currentCourseIndex: 0,
  });
  assert.ok(url);
  const u = new URL(url!);
  assert.equal(u.hostname, 'www.coursera.org');
  assert.match(u.pathname, /^\/learn\//);
  assert.equal(u.searchParams.get('enroll'), 'true');
});

test('buildCourseraLaunchUrl: custom template interpolates courseId', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_COURSE_URL_TEMPLATE = 'https://example.org/c/{courseId}';
  process.env.COURSERA_COURSE_ID_MAP = JSON.stringify({ 'test-program': ['course-custom-001'] });

  const url = buildCourseraLaunchUrl({
    programSlug: 'test-program',
    userId: 'u',
    email: 'e@e.com',
    currentCourseIndex: 0,
  });
  assert.ok(url?.startsWith('https://example.org/c/'));
});

test('getCourseraConfig: default API base', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  delete process.env.COURSERA_API_BASE_URL;
  const c = getCourseraConfig();
  assert.equal(c.apiBaseUrl, 'https://api.coursera.com/ent/api/rest/v1');
});

test('buildCourseraLaunchUrl: deep-links via course URL template when courseId is available', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_COURSE_URL_TEMPLATE = 'https://www.coursera.org/learn/{courseId}';
  process.env.COURSERA_COURSE_ID_MAP = JSON.stringify({ 'test-program': ['course-abc-123'] });

  const url = buildCourseraLaunchUrl({
    programSlug: 'test-program',
    userId: 'u1',
    email: 'u@test.com',
    currentCourseIndex: 0,
  });
  assert.ok(url);
  assert.match(url!, /course-abc-123/);
});

test('buildCourseraLaunchUrl: falls back to program URL template when no course template or ID', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_PROGRAM_URL_TEMPLATE = 'https://www.coursera.org/programs/{programId}';
  process.env.COURSERA_PROGRAM_ID = 'prog-xyz-789';

  const url = buildCourseraLaunchUrl({
    programSlug: 'nonexistent-program',
    userId: 'u1',
    email: 'u@test.com',
    currentCourseIndex: 0,
  });
  assert.ok(url);
  assert.match(url!, /prog-xyz-789/);
});

test('buildCourseraLaunchUrl: returns program home URL when only COURSERA_PROGRAM_HOME_URL is set', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_PROGRAM_HOME_URL = 'https://www.coursera.org/programs/home-page';

  const url = buildCourseraLaunchUrl({
    programSlug: null,
    userId: 'u1',
    email: 'u@test.com',
  });
  assert.equal(url, 'https://www.coursera.org/programs/home-page');
});

test('buildCourseraLaunchUrl: returns null when no URL configuration is set', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];

  const url = buildCourseraLaunchUrl({
    programSlug: null,
    userId: 'u1',
    email: 'u@test.com',
  });
  assert.equal(url, null);
});

test('getCourseraReadiness: canLaunch is false when no URL is configured', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];

  const result = getCourseraReadiness(null);
  assert.equal(result.canLaunch, false);
});

test('getCourseraReadiness: canDeepLink is true when course URL template and course IDs are available', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_COURSE_URL_TEMPLATE = 'https://www.coursera.org/learn/{courseId}';
  process.env.COURSERA_COURSE_ID_MAP = JSON.stringify({ 'deep-link-program': ['course-id-001'] });

  const result = getCourseraReadiness('deep-link-program');
  assert.equal(result.canDeepLink, true);
});

test('getCourseraReadiness: canSync is false when no API token or key is configured', (t) => {
  const prev = snapshotEnv();
  t.after(() => { restoreEnv(prev); _resetCourseraConfigForTesting(); });
  _resetCourseraConfigForTesting();
  for (const k of keysToRestore) delete process.env[k];

  const result = getCourseraReadiness(null);
  assert.equal(result.canSync, false);
});
