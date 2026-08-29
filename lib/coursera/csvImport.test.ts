import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import {
  detectCourseraCsvKind,
  parseCourseActivityCsv,
  parseLearningPathActivityCsv,
} from './csvImport';

const SAMPLE_PATH = path.resolve(
  process.cwd(),
  '..',
  '.coursera-csv-sample',
  'CourseActivity workforce-advancement - CourseraEnterpriseExport 2026-05-04 17-33-53 UTC.csv'
);

const BADGE_SAMPLE_PATH = path.resolve(
  process.cwd(),
  '..',
  '.coursera-csv-sample',
  'LearningPathActivity workforce-advancement - CourseraEnterpriseExport 2026-05-04 17-33-53 UTC.csv'
);

const BADGE_HEADER =
  '"User Name","Email","Badge Title","Badge Slug","Badge Link","Badge Last Transaction Timestamp","Number of Courses","Progress in Badge (%)","Course Name","Course Enrollment Date","Is Course Completed","Course Completion Timestamp","Badge Completed","Badge Completion Timestamp","Last Activity Timestamp","List of Program","Collection ID","Collection Name","Total Estimated Learning Hours (since enrolled)","Manager Name","Manager Email","Job Title","Business Unit","Business Unit 2","Location City","Location Region","Location Country"';

const HEADER =
  '"Name","Email","External ID","Course","Course ID","Course Slug","University","Enrollment Time","Class Start Time","Class End Time","Last Course Activity Time","Overall Progress","Total Estimated Learning Hours (since enrolled)","Completed","Removed From Program","Program Slug","Program Name","Collection Name","Collection ID","Completion Time","Course Grade","Course Certificate URL","Contract","Is Enterprise Contract Active","Learning Hours","Course Type","Manager Name","Manager Email","Job Title","Job Type","Business Unit","Business Unit 2","Location City","Location Region","Location Country"';

test('parseCourseActivityCsv handles the real Coursera enterprise export sample', () => {
  if (!existsSync(SAMPLE_PATH)) {
    // Sample lives outside the repo (gitignored) — skip in CI but assert locally.
    console.warn(`[csvImport.test] sample CSV not found at ${SAMPLE_PATH}; skipping`);
    return;
  }

  const content = readFileSync(SAMPLE_PATH, 'utf8');
  const rows = parseCourseActivityCsv(content);

  assert.equal(rows.length, 3, 'expected 3 learner rows in sample CSV');

  const tarrance = rows.find((r) => r.name === 'Tarrance Hopkins');
  assert.ok(tarrance, 'Tarrance Hopkins row present');
  assert.equal(tarrance!.email, 'tarrancehopkins98@gmail.com');
  assert.equal(tarrance!.courseId, 'lgy789C8Ee6SjxKHxThXWw');
  assert.equal(tarrance!.courseSlug, 'project-management-fundamentals-microsoft');
  assert.equal(tarrance!.university, 'Microsoft');
  assert.equal(tarrance!.programSlug, 'workforce-advancement-project-8a3f0');
  assert.equal(tarrance!.collectionId, '1cvGr');
  assert.equal(tarrance!.overallProgress, 82.35);
  assert.equal(tarrance!.completed, false);
  assert.equal(tarrance!.removedFromProgram, false);
  assert.equal(tarrance!.isEnterpriseContractActive, true);
  assert.ok(tarrance!.enrollmentTime instanceof Date);
  assert.equal(tarrance!.completionTime, null);

  const robert = rows.find((r) => r.name === 'Robert Noel');
  assert.ok(robert);
  assert.equal(robert!.email, 'noel2764@gmail.com');
  assert.equal(robert!.overallProgress, 8.24);
  assert.equal(robert!.learningHours, 1.45);

  const clarence = rows.find((r) => r.name === 'Clarence B. Watson');
  assert.ok(clarence);
  assert.equal(clarence!.email, 'peacemycommunitybacktogether@gmail.com');
  assert.equal(clarence!.overallProgress, 9.41);
  assert.equal(clarence!.learningHours, 2.88);
  assert.equal(clarence!.contractName, 'SI New Partnership - Workforce Advancement Project');
});

test('parseCourseActivityCsv handles minimal inline CSV with quoted fields', () => {
  const csv = `${HEADER}
"Jane Doe","jane@example.com","","Sample Course","abc123","sample-course","TestU","2026-04-01T00:00:00","","","2026-04-15T12:00:00","45.5","2.5","No","No","prog-slug","Prog Name","Coll","collId","","","","Contract X","Yes","2.5","Course","","","","","","","","",""
`;

  const rows = parseCourseActivityCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'jane@example.com');
  assert.equal(rows[0].overallProgress, 45.5);
  assert.equal(rows[0].completed, false);
  assert.equal(rows[0].isEnterpriseContractActive, true);
  assert.equal(rows[0].completionTime, null);
  assert.equal(rows[0].classStartTime, null);
  assert.ok(rows[0].lastActivityTime instanceof Date);
});

test('parseCourseActivityCsv parses Yes/No completion flags correctly', () => {
  const csv = `${HEADER}
"Done Learner","done@example.com","","Course A","cid1","slug-a","U","2026-01-01T00:00:00","","","2026-02-01T00:00:00","100","5.0","Yes","No","prog","Prog","Coll","cid","2026-02-02T00:00:00","85","https://cert.example/abc","Contract","Yes","5.0","Course","","","","","","","","",""
`;

  const rows = parseCourseActivityCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].completed, true);
  assert.equal(rows[0].removedFromProgram, false);
  assert.equal(rows[0].overallProgress, 100);
  assert.ok(rows[0].completionTime instanceof Date);
  assert.equal(rows[0].courseGrade, '85');
  assert.equal(rows[0].courseCertificateUrl, 'https://cert.example/abc');
});

test('parseCourseActivityCsv clamps provider percentages to 0..100', () => {
  const csv = `${HEADER}\r
"Low","low@example.com","","Course","low-id","low","U","","","","","-12","0","No","No","prog","Prog","","","","","","","","0","Course","","","","","","","","",""\r
"High","high@example.com","","Course","high-id","high","U","","","","","140","0","No","No","prog","Prog","","","","","","","","0","Course","","","","","","","","",""\r
`;

  const rows = parseCourseActivityCsv(csv);
  assert.deepEqual(rows.map((row) => row.overallProgress), [0, 100]);
});

test('parseCourseActivityCsv handles fields with embedded commas inside quotes', () => {
  const csv = `${HEADER}
"Smith, John","john@example.com","","Project Mgmt, Advanced","cid2","slug-b","U","","","","","10","1","No","No","prog","Prog","Coll","cid","","","","","","1","Course","","","","","","","","",""
`;

  const rows = parseCourseActivityCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Smith, John');
  assert.equal(rows[0].course, 'Project Mgmt, Advanced');
});

test('parseCourseActivityCsv throws on unrecognized headers (wrong CSV tab)', () => {
  // ProgramActivity tab from the same export — different headers.
  const wrongHeader =
    '"Name","Email","External ID","Program Name","Program Slug","# Enrolled Courses","# Completed Courses","Member State","Join Date","Invitation Date","Last Program Activity Date","Contract(s)","Contract ID(s)","Learning Hours","Manager Name","Manager Email","Job Title","Job Type","Business Unit","Business Unit 2","Location City","Location Region","Location Country"';

  assert.throws(() => parseCourseActivityCsv(wrongHeader + '\n'), /missing required header/);
});

test('parseCourseActivityCsv skips rows missing email or course id', () => {
  const csv = `${HEADER}
"No Email","","","Course","cid","slug","U","","","","","10","1","No","No","prog","Prog","Coll","cid","","","","","","1","Course","","","","","","","","",""
"No Course Id","x@example.com","","Course","","slug","U","","","","","10","1","No","No","prog","Prog","Coll","cid","","","","","","1","Course","","","","","","","","",""
"Valid","valid@example.com","","Course","cid","slug","U","","","","","10","1","No","No","prog","Prog","Coll","cid","","","","","","1","Course","","","","","","","","",""
`;

  const rows = parseCourseActivityCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'valid@example.com');
});

test('parseLearningPathActivityCsv handles the real Coursera enterprise export sample', () => {
  if (!existsSync(BADGE_SAMPLE_PATH)) {
    console.warn(`[csvImport.test] sample CSV not found at ${BADGE_SAMPLE_PATH}; skipping`);
    return;
  }

  const content = readFileSync(BADGE_SAMPLE_PATH, 'utf8');
  const rows = parseLearningPathActivityCsv(content);

  assert.equal(rows.length, 3, 'expected 3 learner-badge rows in sample CSV');

  const robert = rows.find((r) => r.name === 'Robert Noel');
  assert.ok(robert, 'Robert Noel row present');
  assert.equal(robert!.email, 'Noel2764@gmail.com');
  assert.equal(
    robert!.badgeSlug,
    'project-management-and-pmp-certification-pathway-hr2it'
  );
  assert.equal(
    robert!.badgeTitle,
    'Project Management Professional Certificate (Microsoft)'
  );
  assert.equal(robert!.numberOfCourses, 10);
  assert.equal(robert!.progressPercent, 0.0);
  assert.equal(robert!.isCourseCompleted, false);
  assert.equal(robert!.badgeCompleted, false);
  assert.equal(robert!.collectionId, '1cvGr');
  assert.equal(robert!.totalLearningHours, 1.43);
  assert.ok(robert!.lastActivityTime instanceof Date);

  const tarrance = rows.find((r) => r.name === 'Tarrance Hopkins');
  assert.ok(tarrance);
  assert.equal(tarrance!.email, 'tarrancehopkins98@gmail.com');
  assert.equal(tarrance!.totalLearningHours, 10.04);

  const clarence = rows.find((r) => r.name === 'Clarence B. Watson');
  assert.ok(clarence);
  assert.equal(clarence!.email, 'peacemycommunitybacktogether@gmail.com');
  assert.equal(clarence!.totalLearningHours, 2.88);
});

test('parseLearningPathActivityCsv handles minimal inline CSV', () => {
  const csv = `${BADGE_HEADER}
"Jane Doe","jane@example.com","Test Badge","test-badge","https://link","2026-04-01T00:00:00","5","20.0","Course One","2026-04-01T00:00:00","Yes","2026-04-10T00:00:00","No","","2026-04-15T00:00:00","Prog","collId","Coll","2.5","","","","","","","",""
`;

  const rows = parseLearningPathActivityCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'jane@example.com');
  assert.equal(rows[0].badgeSlug, 'test-badge');
  assert.equal(rows[0].numberOfCourses, 5);
  assert.equal(rows[0].progressPercent, 20.0);
  assert.equal(rows[0].isCourseCompleted, true);
  assert.equal(rows[0].badgeCompleted, false);
  assert.ok(rows[0].courseCompletionTime instanceof Date);
});

test('parseLearningPathActivityCsv clamps provider percentages to 0..100', () => {
  const csv = `${BADGE_HEADER}\r
"Low","low@example.com","Low Badge","low-badge","","","1","-1","Course","","No","","No","","","","","","0","","","","","","","",""\r
"High","high@example.com","High Badge","high-badge","","","1","150","Course","","No","","No","","","","","","0","","","","","","","",""\r
`;

  const rows = parseLearningPathActivityCsv(csv);
  assert.deepEqual(rows.map((row) => row.progressPercent), [0, 100]);
});

test('parseLearningPathActivityCsv throws on unrecognized headers (wrong CSV tab)', () => {
  // CourseActivity headers — different from LearningPathActivity.
  const wrongHeader =
    '"Name","Email","External ID","Course","Course ID","Course Slug","University"';
  assert.throws(
    () => parseLearningPathActivityCsv(wrongHeader + '\n'),
    /missing required header/
  );
});

test('parseLearningPathActivityCsv skips rows missing email, badge slug, or badge title', () => {
  const csv = `${BADGE_HEADER}
"No Email","","Title","slug-x","","","5","0","CN","","No","","No","","","","","","1","","","","","","","",""
"No Slug","x@example.com","Title","","","","5","0","CN","","No","","No","","","","","","1","","","","","","","",""
"No Title","y@example.com","","slug-y","","","5","0","CN","","No","","No","","","","","","1","","","","","","","",""
"Valid","valid@example.com","Real Title","real-slug","","","5","0","CN","","No","","No","","","","","","1","","","","","","","",""
`;

  const rows = parseLearningPathActivityCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'valid@example.com');
});

test('detectCourseraCsvKind sniffs the CSV type from the header row', () => {
  const courseHeaderOnly = `${HEADER}\n`;
  const badgeHeaderOnly = `${BADGE_HEADER}\n`;
  const garbage = `"Foo","Bar"\n`;

  assert.equal(detectCourseraCsvKind(courseHeaderOnly), 'course-activity');
  assert.equal(detectCourseraCsvKind(badgeHeaderOnly), 'learning-path-activity');
  assert.equal(detectCourseraCsvKind(garbage), null);
});
