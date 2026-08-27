import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSkillMissionDefinitionsForProgram } from '@/lib/content/skillMissionCatalog';
import { skillMissionEmptyState } from './skillMissionEmptyState';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('unenrolled members are sent to choose a program, not a training page', () => {
  const empty = skillMissionEmptyState({ programSlug: null, programTitle: null });
  assert.equal(empty.title, 'No program enrolled');
  assert.ok(empty.description.length <= 96);
  assert.doesNotMatch(empty.description, /Enroll in a training program and a skill mission unlocks/);
  assert.equal(empty.primaryAction.href, '/dashboard/program');
  assert.equal(empty.primaryAction.label, 'Choose program');
});

test('enrolled members without catalog missions keep training, not choose-a-program', () => {
  const empty = skillMissionEmptyState({
    programSlug: 'ai-professional-practitioner-certificate',
    programTitle: 'AI Professional Practitioner Certificate',
  });
  assert.equal(empty.title, 'No missions for AI Professional Practitioner Certificate yet');
  assert.doesNotMatch(empty.primaryAction.label, /Choose program/i);
  assert.equal(empty.primaryAction.href, '/dashboard/training');
  assert.equal(empty.primaryAction.label, 'Continue training');
});

test('falls back to "this program" when the catalog title is missing', () => {
  const empty = skillMissionEmptyState({
    programSlug: 'unknown-program',
    programTitle: null,
  });
  assert.equal(empty.title, 'No missions for this program yet');
  assert.equal(empty.primaryAction.href, '/dashboard/training');
});

test('missions page uses the dashboard program helper, not only User.enrolledProgram', () => {
  const src = readFileSync(join(ROOT, 'app/(portal)/dashboard/missions/page.tsx'), 'utf8');
  assert.match(src, /getActiveProgramForDashboard/);
  assert.match(src, /skillMissionEmptyState/);
  assert.doesNotMatch(src, /enrolledProgram:/);
});

test('staff training preview program has catalog missions so superadmins are not sent to choose-a-program', () => {
  const missions = getSkillMissionDefinitionsForProgram('comptia-a-professional-certificate');
  assert.ok(missions.length > 0);
});
