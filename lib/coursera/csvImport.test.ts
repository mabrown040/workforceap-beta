import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { parseCourseActivityCsv } from './csvImport';

const SAMPLE_PATH = path.resolve(
  process.cwd(),
  '..',
  '.coursera-csv-sample',
  'CourseActivity workforce-advancement - CourseraEnterpriseExport 2026-05-04 17-33-53 UTC.csv'
);

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
