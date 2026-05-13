import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDraftResponse } from './parseDraftResponse';

const validResponse = {
  counselorBrief: 'Drew completed PMF (first cert). Ready for Module 2.',
  actions: [
    {
      type: 'celebrate_milestone',
      channel: 'email',
      subject: 'You did it — PMF complete',
      body: 'Drew, you put in the hours and it shows. Congratulations on finishing Project Management Fundamentals.',
      rationale: 'First completion deserves explicit acknowledgement.',
      confidence: 0.95,
    },
    {
      type: 'suggest_next_course',
      courseSlug: 'team-building-and-leadership-in-project-management',
      rationale: 'Module 2 in the PMP path; logical next step.',
      confidence: 0.9,
    },
  ],
};

test('parses a clean JSON response', () => {
  const result = parseDraftResponse(JSON.stringify(validResponse));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.actions.length, 2);
  assert.equal(result.value.actions[0].type, 'celebrate_milestone');
});

test('strips ```json fences before parsing', () => {
  const raw = '```json\n' + JSON.stringify(validResponse) + '\n```';
  const result = parseDraftResponse(raw);
  assert.equal(result.ok, true);
});

test('strips plain ``` fences', () => {
  const raw = '```\n' + JSON.stringify(validResponse) + '\n```';
  const result = parseDraftResponse(raw);
  assert.equal(result.ok, true);
});

test('slices to outermost braces when wrapped in prose', () => {
  const raw = `Here's the JSON you asked for:\n${JSON.stringify(validResponse)}\n\nLet me know if you need anything else.`;
  const result = parseDraftResponse(raw);
  assert.equal(result.ok, true);
});

test('rejects malformed JSON', () => {
  const result = parseDraftResponse('{ this is not json');
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.reason, /JSON parse/);
});

test('rejects an action with an invented type (safety rail)', () => {
  const withInvention = {
    ...validResponse,
    actions: [
      {
        type: 'send_employer_email', // not in the allow-list
        rationale: 'evil',
        confidence: 1.0,
      },
    ],
  };
  const result = parseDraftResponse(JSON.stringify(withInvention));
  assert.equal(result.ok, false);
});

test('rejects when actions array is empty', () => {
  const result = parseDraftResponse(JSON.stringify({ ...validResponse, actions: [] }));
  assert.equal(result.ok, false);
});

test('rejects when actions array exceeds 5 items', () => {
  const six = Array(6).fill(validResponse.actions[0]);
  const result = parseDraftResponse(
    JSON.stringify({ ...validResponse, actions: six }),
  );
  assert.equal(result.ok, false);
});

test('rejects confidence outside [0,1]', () => {
  const overOne = JSON.parse(JSON.stringify(validResponse));
  overOne.actions[0].confidence = 1.5;
  const result = parseDraftResponse(JSON.stringify(overOne));
  assert.equal(result.ok, false);
});

test('rejects subject longer than 120 chars', () => {
  const longSubject = JSON.parse(JSON.stringify(validResponse));
  longSubject.actions[0].subject = 'x'.repeat(121);
  const result = parseDraftResponse(JSON.stringify(longSubject));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.reason, /subject/);
});

test('rejects body longer than 4000 chars', () => {
  const longBody = JSON.parse(JSON.stringify(validResponse));
  longBody.actions[0].body = 'x'.repeat(4001);
  const result = parseDraftResponse(JSON.stringify(longBody));
  assert.equal(result.ok, false);
});

test('rejects counselorBrief longer than 280 chars', () => {
  const result = parseDraftResponse(
    JSON.stringify({ ...validResponse, counselorBrief: 'x'.repeat(281) }),
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.reason, /counselorBrief/);
});

test('rejects non-email channel on celebrate_milestone (pilot is email-only)', () => {
  const sms = JSON.parse(JSON.stringify(validResponse));
  sms.actions[0].channel = 'sms';
  const result = parseDraftResponse(JSON.stringify(sms));
  assert.equal(result.ok, false);
});

test('error result includes a truncated raw sample for log spelunking', () => {
  const result = parseDraftResponse('not json at all'.repeat(100));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.rawSample.length <= 400);
});
