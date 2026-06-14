import test from 'node:test';
import assert from 'node:assert/strict';

import { parseOgShareCardParams } from './shareCards';

test('parses a skill checkpoint share card and trims overly long text', () => {
  const params = new URLSearchParams({
    type: 'skill-checkpoint',
    skill: 'Clinical Documentation Foundations with Extra Detail That Should Be Trimmed Past The Visual Limit',
    name: '  Maya Johnson  ',
  });

  const card = parseOgShareCardParams(params);

  assert.equal(card.kind, 'skill-checkpoint');
  assert.equal(card.userDisplayName, 'Maya Johnson');
  assert.equal(card.skillName, 'Clinical Documentation Foundations with Extra Detail That Shoul…');
});

test('parses a certificate share card with issuer and ISO date formatting', () => {
  const params = new URLSearchParams({
    type: 'certificate',
    title: 'Medical Billing Professional Certificate',
    name: 'Jordan Lee',
    issuer: 'WorkforceAP Academy',
    date: '2026-06-14',
  });

  const card = parseOgShareCardParams(params);

  assert.deepEqual(card, {
    kind: 'certificate',
    certificateTitle: 'Medical Billing Professional Certificate',
    userDisplayName: 'Jordan Lee',
    issuer: 'WorkforceAP Academy',
    displayDate: 'June 14, 2026',
  });
});

test('falls back safely when invalid card type and fields are provided', () => {
  const card = parseOgShareCardParams(new URLSearchParams({ type: 'unknown', name: '<script>' }));

  assert.deepEqual(card, {
    kind: 'skill-checkpoint',
    skillName: 'Career Readiness Skill',
    userDisplayName: 'WorkforceAP Member',
  });
});
