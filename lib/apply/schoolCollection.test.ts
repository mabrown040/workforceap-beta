import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHOOL_SKIPPED_ADULT_FIELDS,
  isSchoolCollectionSignup,
  schoolApplicationNotes,
  schoolDetailsComplete,
  schoolGuardianRequired,
  schoolPrimaryBarriers,
  schoolProfileBarriers,
  SCHOOL_STUDENT_BARRIER,
} from './schoolCollection';

const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

const base = {
  ageGroup: 'under_18',
  gradeLevel: '11',
  city: 'Austin',
  state: 'TX',
  zipOk: true,
  parentGuardianName: 'Alex Rader',
  parentGuardianEmail: 'parent@example.com',
};

test('school flow writes a student barrier instead of employment barriers', () => {
  assert.deepEqual(schoolPrimaryBarriers(), [SCHOOL_STUDENT_BARRIER]);
  assert.ok(SCHOOL_SKIPPED_ADULT_FIELDS.includes('eligibilityQ1'));
  assert.ok(SCHOOL_SKIPPED_ADULT_FIELDS.includes('primaryBarriers'));
});

test('guardian is required only for under-18 students', () => {
  assert.equal(schoolGuardianRequired('under_18'), true);
  assert.equal(schoolGuardianRequired('18_24'), false);
});

test('under-18 is incomplete without guardian email', () => {
  assert.equal(schoolDetailsComplete({ ...base, parentGuardianEmail: '' }, emailOk), false);
  assert.equal(schoolDetailsComplete(base, emailOk), true);
});

test('18–24 students do not need a guardian to continue', () => {
  assert.equal(
    schoolDetailsComplete(
      { ...base, ageGroup: '18_24', parentGuardianName: '', parentGuardianEmail: '' },
      emailOk,
    ),
    true,
  );
});

test('grade and city are required even when guardian is present', () => {
  assert.equal(schoolDetailsComplete({ ...base, gradeLevel: '' }, emailOk), false);
  assert.equal(schoolDetailsComplete({ ...base, zipOk: false }, emailOk), false);
});

test('signup detects school collection from partner type, barrier, or grade', () => {
  assert.equal(isSchoolCollectionSignup({ partnerType: 'high_school' }), true);
  assert.equal(isSchoolCollectionSignup({ primaryBarriers: [SCHOOL_STUDENT_BARRIER] }), true);
  assert.equal(isSchoolCollectionSignup({ gradeLevel: '11' }), true);
  assert.equal(isSchoolCollectionSignup({ partnerType: 'community', gradeLevel: '' }), false);
});

test('school profile barriers are not employment barriers', () => {
  assert.deepEqual(schoolProfileBarriers(), {
    barrierTypes: [SCHOOL_STUDENT_BARRIER],
    hasEmploymentBarrier: false,
  });
});

test('school application notes skip income screening and keep age group', () => {
  const notes = schoolApplicationNotes({
    ageGroup: 'under_18',
    gradeLevel: '11',
    schoolName: 'Concordia High School',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    parentGuardianName: 'Alex Rader',
    parentGuardianEmail: 'parent@example.com',
  });
  assert.match(notes, /high-school student/);
  assert.match(notes, /Age group: under_18/);
  assert.match(notes, /Grade: 11/);
  assert.doesNotMatch(notes, /Quick eligibility/);
  assert.doesNotMatch(notes, /Primary barrier/);
});
