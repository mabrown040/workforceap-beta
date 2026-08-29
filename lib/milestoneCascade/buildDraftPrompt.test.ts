import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDraftPrompt,
  CASCADE_PROMPT_VERSION,
  type PromptInput,
} from './buildDraftPrompt';

const base: PromptInput = {
  milestoneType: 'course_completed',
  learnerFirstName: 'Drew',
  courseName: 'Project Management Fundamentals',
  courseSlug: 'project-management-fundamentals-microsoft',
  completedCount: 1,
  programSlug: 'pmp-certificate',
};

test('builds system + user prompt with the version stamp', () => {
  const built = buildDraftPrompt(base);
  assert.equal(built.promptVersion, CASCADE_PROMPT_VERSION);
  assert.ok(built.systemPrompt.length > 100, 'system prompt should be substantive');
  assert.ok(built.userPrompt.includes('Drew'), 'user prompt embeds learner first name');
  assert.ok(built.userPrompt.includes('Project Management Fundamentals'), 'embeds course');
});

test('system prompt declares the action allow-list (safety rail)', () => {
  const built = buildDraftPrompt(base);
  for (const t of [
    'celebrate_milestone',
    'suggest_next_course',
    'request_peer_pair',
    'flag_for_counselor_call',
  ]) {
    assert.ok(built.systemPrompt.includes(t), `system prompt mentions ${t}`);
  }
  // Negative: prompt explicitly tells the model NOT to invent new types.
  assert.match(built.systemPrompt, /NEVER invent/);
});

test('first-completion learners get the "first cert" energy note', () => {
  const built = buildDraftPrompt({ ...base, completedCount: 1 });
  assert.match(built.userPrompt, /FIRST completion/);
});

test('later completions do NOT get the first-cert note', () => {
  const built = buildDraftPrompt({ ...base, completedCount: 3 });
  assert.doesNotMatch(built.userPrompt, /FIRST completion/);
});

test('style examples are embedded in system prompt when provided', () => {
  const built = buildDraftPrompt({
    ...base,
    styleExamples: [
      { subject: 'Way to go on PMF', body: 'Drew, you put in the hours and it shows.' },
    ],
  });
  assert.match(built.systemPrompt, /Way to go on PMF/);
  assert.match(built.systemPrompt, /you put in the hours/);
});

test('style examples are capped at 3 to protect the prompt budget', () => {
  const examples = Array.from({ length: 5 }, (_, i) => ({
    subject: `subject-${i}`,
    body: `body-${i}`,
  }));
  const built = buildDraftPrompt({ ...base, styleExamples: examples });
  assert.match(built.systemPrompt, /subject-0/);
  assert.match(built.systemPrompt, /subject-2/);
  assert.doesNotMatch(built.systemPrompt, /subject-3/);
  assert.doesNotMatch(built.systemPrompt, /subject-4/);
});

test('voice baseline is used when no style examples are provided', () => {
  const built = buildDraftPrompt(base);
  assert.match(built.systemPrompt, /Voice baseline/);
});

test('null programSlug renders as "(unknown)"', () => {
  const built = buildDraftPrompt({ ...base, programSlug: null });
  assert.match(built.userPrompt, /\(unknown\)/);
});

test('halfway drafts explicitly prohibit member celebration spam', () => {
  const built = buildDraftPrompt({
    ...base,
    milestoneType: 'program_halfway',
    completedCount: 2,
    totalCourses: 4,
  });
  assert.match(built.userPrompt, /halfway point/);
  assert.match(built.userPrompt, /Do NOT draft a celebrate_milestone/);
  assert.match(built.userPrompt, /Validated courses in this program: 4/);
});
