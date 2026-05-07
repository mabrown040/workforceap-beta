import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NUDGE_TEMPLATES,
  listTemplates,
  getTemplate,
  renderNudge,
} from './nudgeTemplates';

test('listTemplates returns all three templates', () => {
  const templates = listTemplates();
  assert.equal(templates.length, 3);
  const ids = templates.map((t) => t.id).sort();
  assert.deepEqual(ids, ['check_in', 'milestone_celebrate', 'stalled_step']);
});

test('getTemplate returns null for unknown id', () => {
  // Cast to bypass the type guard; we want to verify runtime behavior.
  assert.equal(getTemplate('does_not_exist' as never), null);
});

test('renderNudge fills firstName placeholder with first word', () => {
  const out = renderNudge(NUDGE_TEMPLATES.check_in, { firstName: 'Maria Gonzalez' });
  assert.ok(out.startsWith('Hi Maria —'), `expected "Hi Maria —" prefix, got: ${out.slice(0, 30)}`);
});

test('renderNudge falls back to "there" when firstName is blank', () => {
  const out = renderNudge(NUDGE_TEMPLATES.check_in, { firstName: null });
  assert.ok(out.startsWith('Hi there —'));
});

test('renderNudge fills programLabel placeholder', () => {
  const out = renderNudge(NUDGE_TEMPLATES.stalled_step, {
    firstName: 'Sam',
    programLabel: 'your IT Support track',
  });
  assert.ok(out.includes('your IT Support track'));
});

test('renderNudge falls back to "your training" when programLabel is missing', () => {
  const out = renderNudge(NUDGE_TEMPLATES.stalled_step, { firstName: 'Sam' });
  assert.ok(out.includes('your training'));
});

test('renderNudge fills milestone placeholder', () => {
  const out = renderNudge(NUDGE_TEMPLATES.milestone_celebrate, {
    firstName: 'James',
    milestone: 'finishing your AWS Cloud course',
  });
  assert.ok(out.includes('finishing your AWS Cloud course'));
  assert.ok(out.includes('James'));
});

test('renderNudge leaves no unreplaced {{placeholders}}', () => {
  for (const template of listTemplates()) {
    const out = renderNudge(template, { firstName: 'A', programLabel: 'B', milestone: 'C' });
    assert.ok(!out.includes('{{'), `template ${template.id} still has placeholders: ${out}`);
    assert.ok(!out.includes('}}'), `template ${template.id} still has placeholders: ${out}`);
  }
});

test('every template has an appliesTo array containing valid priorities', () => {
  for (const template of listTemplates()) {
    assert.ok(template.appliesTo.length > 0, `template ${template.id} should apply to at least one priority`);
    for (const p of template.appliesTo) {
      assert.ok(['red', 'yellow', 'blue'].includes(p), `unknown priority ${p} on ${template.id}`);
    }
  }
});
