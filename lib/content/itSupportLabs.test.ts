import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { getProgramBySlug } from './programs';
import { getProgramCoursesForCurriculumVersion } from '../member/curriculumAssignment';
import { resolveWorkforceApModule } from './workforceApModule';
import {
  IT_SUPPORT_LAB_CONTENT_VERSION,
  IT_SUPPORT_LAB_COURSE_SLUG,
  IT_SUPPORT_LAB_PROGRAM_SLUG,
  IT_SUPPORT_LAB_SCOPE,
  getPracticeLab,
  listPracticeLabsForAssignment,
} from './itSupportLabs';

const assignment = {
  programSlug: IT_SUPPORT_LAB_PROGRAM_SLUG,
  curriculumVersion: 'legacy-v1',
  courseSlug: IT_SUPPORT_LAB_COURSE_SLUG,
};

describe('original IT support starter labs', () => {
  it('binds only the exact existing lab outline without rewriting its frozen assignment', () => {
    const program = getProgramBySlug(assignment.programSlug)!;
    const before = getProgramCoursesForCurriculumVersion(program, assignment.curriculumVersion);
    const labs = listPracticeLabsForAssignment(assignment);
    assert.deepEqual(labs.map((lab) => lab.id), ['ticket-triage', 'network-diagnosis', 'safe-recovery', 'support-handoff']);
    assert.deepEqual(getProgramCoursesForCurriculumVersion(program, assignment.curriculumVersion), before);
    assert.equal(before.length, 10);
    assert.equal(before.reduce((sum, course) => sum + course.estimatedHours, 0), 160);
    const outline = before.find((course) => course.slug === assignment.courseSlug)!;
    assert.equal(outline.estimatedHours, 58);
    assert.equal(outline.kind, undefined);
    // Adding written practice does not silently turn the outline into a provider or native completion route.
    assert.equal(resolveWorkforceApModule(assignment), null);
  });

  it('does not guess eligibility across programs, courses, versions, or legacy aliases', () => {
    for (const override of [
      { programSlug: 'it-support-and-entry-level-cyber-security-certificate' },
      { programSlug: 'unknown-program' },
      { courseSlug: 'introduction-to-technical-support' },
      { courseSlug: 'it-support-course-10' },
      { courseSlug: 'lab-project-test-preparation' },
      { curriculumVersion: '2026-approved-v2' },
      { curriculumVersion: 'catalog-v1' },
      { curriculumVersion: '' },
      { curriculumVersion: 'future-v3' },
    ]) {
      assert.deepEqual(listPracticeLabsForAssignment({ ...assignment, ...override }), [], JSON.stringify(override));
    }
  });

  it('keeps definition lookup version-specific and definitions immutable for evidence snapshots', () => {
    const lab = getPracticeLab('ticket-triage', IT_SUPPORT_LAB_CONTENT_VERSION)!;
    assert.ok(lab);
    assert.equal(getPracticeLab('ticket-triage', 'future-v2'), undefined);
    assert.equal(getPracticeLab('unknown-lab'), undefined);
    assert.equal(getPracticeLab('toString'), undefined);
    assert.ok(Object.isFrozen(lab));
    assert.ok(Object.isFrozen(lab.deliverables));
    assert.ok(Object.isFrozen(lab.rubric[0].scoring));
    assert.throws(() => { lab.rubric[0].scoring[2] = 'Different review standard'; }, TypeError);
    assert.notEqual(getPracticeLab('ticket-triage')!.rubric[0].scoring[2], 'Different review standard');
  });

  it('provides reviewable evidence prompts, defined scoring levels, and primary references for each lab', () => {
    const labs = listPracticeLabsForAssignment(assignment);
    for (const lab of labs) {
      assert.equal(lab.contentVersion, IT_SUPPORT_LAB_CONTENT_VERSION);
      assert.equal(lab.rubricVersion, '2026-09-09.v1');
      assert.equal(lab.deliverables.length, 4);
      assert.equal(new Set(lab.deliverables.map((item) => item.id)).size, 4);
      assert.equal(new Set(lab.materials.map((item) => item.id)).size, lab.materials.length);
      assert.deepEqual(lab.rubric.map((item) => item.id), ['evidence', 'reasoning', 'safe-action', 'verification', 'communication']);
      assert.equal(lab.rubric.reduce((sum, criterion) => sum + criterion.maxScore, 0), 10);
      for (const criterion of lab.rubric) {
        assert.deepEqual(Object.keys(criterion.scoring), ['0', '1', '2']);
        assert.equal(new Set(Object.values(criterion.scoring)).size, 3);
      }
      assert.ok(lab.sources.length > 0);
      for (const source of lab.sources) {
        const url = new URL(source.url);
        assert.equal(url.protocol, 'https:');
        assert.ok(['learn.microsoft.com', 'support.microsoft.com', 'www.rfc-editor.org'].includes(url.hostname));
        assert.ok(source.supports.length > 20);
      }
      assert.ok(lab.accessibilityAlternatives.some((text) => text.includes('no Windows computer')));
      assert.ok(lab.troubleshooting.length > 0);
    }
  });

  it('keeps activity estimates additive and clearly separate from the assigned 58-hour block', () => {
    const labs = listPracticeLabsForAssignment(assignment);
    assert.deepEqual(labs.map((lab) => lab.estimatedMinutes), [60, 75, 75, 90]);
    for (const lab of labs) {
      const steps = lab.steps.map((step) => Number(step.title.match(/about (\d+) minutes/)?.[1]));
      assert.ok(steps.every((minutes) => Number.isInteger(minutes) && minutes > 0));
      assert.equal(steps.reduce((sum, minutes) => sum + minutes, 0), lab.estimatedMinutes);
    }
    assert.equal(labs.reduce((sum, lab) => sum + lab.estimatedMinutes, 0), 300);
    assert.equal(IT_SUPPORT_LAB_SCOPE.status, 'starter-practice');
    assert.match(IT_SUPPORT_LAB_SCOPE.summary, /review.*pending/);
    assert.match(IT_SUPPORT_LAB_SCOPE.estimateNote, /not measured attendance/);
    assert.match(IT_SUPPORT_LAB_SCOPE.estimateNote, /do not supply the full 58-hour/);
  });

  it('supplies a reconstructable inventory with an independently valid checksum and changed records', () => {
    const lab = getPracticeLab('safe-recovery')!;
    const candidate = lab.materials.find((item) => item.id === 'backup-0945')!.content;
    const damaged = lab.materials.find((item) => item.id === 'current-1000')!.content;
    const card = lab.materials.find((item) => item.id === 'recovery-integrity')!.content;
    const expectedHash = card.match(/\b[a-f0-9]{64}\b/)?.[0];
    assert.ok(expectedHash);
    assert.equal(createHash('sha256').update(candidate, 'utf8').digest('hex'), expectedHash);
    assert.notEqual(createHash('sha256').update(damaged, 'utf8').digest('hex'), expectedHash);
    const rows = candidate.trimEnd().split('\n');
    assert.equal(rows[0], 'asset_id,room,status');
    assert.equal(rows.length, 6);
    assert.equal(new Set(rows.slice(1).map((line) => line.split(',')[0])).size, 5);
    assert.ok(rows.includes('CLC-102,A,loaned'));
    assert.ok(rows.includes('CLC-105,C,needs_repair'));
    assert.equal(damaged.trimEnd().split('\n').length, 3);
  });
});
