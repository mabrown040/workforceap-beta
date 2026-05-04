import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourseraLaunchUrl, getCourseraConfig } from './configCore';

const keysToRestore = [
  'COURSERA_COURSE_URL_TEMPLATE',
  'COURSERA_PROGRAM_URL_TEMPLATE',
  'COURSERA_PROGRAM_HOME_URL',
  'COURSERA_PROGRAM_ID',
  'COURSERA_PROGRAM_ID_MAP',
  'COURSERA_COURSE_ID_MAP',
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
  t.after(() => restoreEnv(prev));
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_COURSE_URL_TEMPLATE =
    'https://www.coursera.org/learn/{courseId}?enroll=true';

  const url = buildCourseraLaunchUrl({
    programSlug: 'comptia-a-professional-certificate',
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
  t.after(() => restoreEnv(prev));
  for (const k of keysToRestore) delete process.env[k];
  process.env.COURSERA_COURSE_URL_TEMPLATE = 'https://example.org/c/{courseId}';

  const url = buildCourseraLaunchUrl({
    programSlug: 'comptia-a-professional-certificate',
    userId: 'u',
    email: 'e@e.com',
    currentCourseIndex: 0,
  });
  assert.ok(url?.startsWith('https://example.org/c/'));
});

test('getCourseraConfig: default API base', (t) => {
  const prev = snapshotEnv();
  t.after(() => restoreEnv(prev));
  delete process.env.COURSERA_API_BASE_URL;
  const c = getCourseraConfig();
  assert.equal(c.apiBaseUrl, 'https://api.coursera.com/ent/api/rest/v1');
});
