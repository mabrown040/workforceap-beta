import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const programPage = fs.readFileSync(
  path.join(process.cwd(), 'app/(portal)/dashboard/program/page.tsx'),
  'utf8',
);
const programKit = fs.readFileSync(
  path.join(process.cwd(), 'components/portal/kit/pages/member/MemberProgramKit.tsx'),
  'utf8',
);

test('live program CTAs launch the selected Coursera course and keep Learning Hub separate', () => {
  assert.match(programPage, /getActiveProgramForDashboard/);
  assert.match(programPage, /const enrolledSlug = activeProgramView\.activeProgramSlug/);
  assert.doesNotMatch(programPage, /const enrolledSlug = dbUser\?\.enrolledProgram/);
  assert.match(programPage, /slug:\s*c\.slug/);
  assert.match(
    programPage,
    /launchHref:\s*launchableCourseSlugs\.has\(c\.slug\)[\s\S]{0,160}`\/api\/member\/coursera\/launch\?course=\$\{encodeURIComponent\(c\.slug\)\}`/,
  );
  assert.match(programPage, /courseraLaunchHref=\{nextCourseLaunchHref\}/);
  assert.match(programPage, /resumeHref="\/dashboard\/learning"/);
  assert.match(programPage, /const launchableCourseSlugs = new Set/);
  assert.match(programPage, /launchableCourseSlugs\.has\(nextCourseSlug\)/);
  assert.match(programPage, /launchableCourseSlugs\.has\(c\.slug\)/);

  assert.match(
    programKit,
    /import TrackedCourseraLaunchLink from ['"]@\/components\/portal\/TrackedCourseraLaunchLink['"]/,
  );
  assert.match(
    programKit,
    /courseraLaunchHref\s*\?\s*\(\s*<TrackedCourseraLaunchLink\s+href=\{courseraLaunchHref\}/,
  );
  assert.match(
    programKit,
    /m\.launchHref\s*\?\s*\(\s*<TrackedCourseraLaunchLink\s+href=\{moduleHref\}/,
  );
  assert.match(
    programKit,
    />Modules<\/h3>[\s\S]{0,500}href=\{resumeHref\}[\s\S]{0,300}>\s*Learning Hub/,
  );
});
